import {
  open,
  lstat,
  mkdir,
  readFile,
  readdir,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  isCompleteProjectConfig,
  validateProjectName,
} from "../config/project-config.js";
import type { ProjectConfig } from "../config/project-config.js";
import { resolveBackendTemplates } from "./backend-generator.js";
import { resolveFrontendTemplates } from "./frontend-generator.js";
import { resolveFullStackTemplates } from "./fullstack-generator.js";
import {
  DestinationConflictError,
  GenerationError,
  InvalidTemplateError,
  TemplateEngineError,
} from "./template-errors.js";
import { renderTemplate } from "./template-renderer.js";
import {
  conditionMatches,
  discoverTemplates,
  resolveDestinationPath,
  resolveTemplateSource,
  selectTemplates,
} from "./template-resolver.js";
import type {
  GenerationOptions,
  GenerationResult,
  ResolvedTemplate,
} from "./template-types.js";

interface PlannedFile {
  readonly template: ResolvedTemplate;
  readonly source: string;
  readonly destination: string;
  readonly templateContent: boolean;
  readonly mergeJson: boolean;
}

const defaultTemplateRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../templates/catalog",
);

export async function generateProject(
  config: ProjectConfig,
  options: GenerationOptions = {},
): Promise<GenerationResult> {
  const nameError = validateProjectName(config.projectName);
  if (nameError) {
    throw new InvalidTemplateError(`Invalid project name: ${nameError}`);
  }
  if (!isCompleteProjectConfig(config)) {
    throw new InvalidTemplateError(
      "The supplied project configuration is incomplete or incompatible.",
    );
  }

  const cwd = path.resolve(options.cwd ?? process.cwd());
  const projectPath = path.resolve(cwd, config.projectName);
  const rootRelativePath = path.relative(cwd, projectPath);
  if (
    rootRelativePath === "" ||
    rootRelativePath === ".." ||
    rootRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(rootRelativePath)
  ) {
    throw new InvalidTemplateError(
      "Project destination must be a directory within the current working directory.",
    );
  }

  const templates = await discoverTemplates(
    path.resolve(options.templateRoot ?? defaultTemplateRoot),
  );
  const selectedTemplates =
    config.projectType === "fullstack"
      ? resolveFullStackTemplates(templates, config)
      : [
          ...selectTemplates(templates, config).filter(
            ({ manifest }) =>
              manifest.appliesTo?.frontend === undefined &&
              manifest.appliesTo?.backend === undefined,
          ),
          ...(config.frontend !== "none"
            ? resolveFrontendTemplates(templates, config)
            : resolveBackendTemplates(templates, config)),
        ].sort(
          (left, right) =>
            (left.manifest.order ?? 0) - (right.manifest.order ?? 0) ||
            left.manifest.id.localeCompare(right.manifest.id),
        );
  if (selectedTemplates.length === 0) {
    throw new TemplateEngineError(
      `No templates are available for project type "${config.projectType}".`,
    );
  }

  const plannedFiles = await createFilePlan(
    selectedTemplates,
    config,
    projectPath,
  );
  const destinationExists = await validateDestination(
    projectPath,
    plannedFiles,
  );
  const files = [
    ...new Set(plannedFiles.map(({ destination }) => destination)),
  ];

  if (options.dryRun) {
    return { projectPath, files, dryRun: true };
  }

  await writeProject(projectPath, plannedFiles, config, destinationExists);
  return { projectPath, files, dryRun: false };
}

async function createFilePlan(
  templates: readonly ResolvedTemplate[],
  config: ProjectConfig,
  projectPath: string,
): Promise<PlannedFile[]> {
  const plannedFiles: PlannedFile[] = [];
  const destinations = new Map<string, boolean>();

  for (const template of templates) {
    for (const file of template.manifest.files) {
      if (!conditionMatches(file.when, config)) {
        continue;
      }

      const source = await resolveTemplateSource(template, file.source);
      const destinationPrefix =
        template.manifest.destinationPrefixByProjectType?.[config.projectType];
      const destination = resolveDestinationPath(
        projectPath,
        destinationPrefix
          ? `${destinationPrefix}/${file.destination}`
          : file.destination,
      );
      const normalizedDestination =
        process.platform === "win32"
          ? destination.toLocaleLowerCase("en-US")
          : destination;
      const mergeJson = file.merge === "json";
      const previousMergeJson = destinations.get(normalizedDestination);
      if (
        previousMergeJson !== undefined &&
        (!mergeJson || !previousMergeJson)
      ) {
        throw new InvalidTemplateError(
          `Multiple templates generate the same destination "${file.destination}".`,
        );
      }
      destinations.set(normalizedDestination, mergeJson);

      plannedFiles.push({
        template,
        source,
        destination,
        templateContent: file.template ?? true,
        mergeJson,
      });
    }
  }

  return plannedFiles;
}

async function validateDestination(
  projectPath: string,
  files: readonly PlannedFile[],
): Promise<boolean> {
  let destinationExists = false;
  let rootInfo: Awaited<ReturnType<typeof lstat>> | undefined;
  try {
    rootInfo = await lstat(projectPath);
  } catch (error) {
    if (!isErrorCode(error, "ENOENT")) {
      throw error;
    }
  }

  if (rootInfo) {
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
      throw new DestinationConflictError(
        `Destination "${projectPath}" exists and is not a regular directory.`,
      );
    }

    const existingEntries = await readdir(projectPath);
    if (existingEntries.length > 0) {
      throw new DestinationConflictError(
        `Destination "${projectPath}" already contains files. Choose another project name or an empty directory.`,
      );
    }
    destinationExists = true;
  }

  for (const { destination } of files) {
    await assertNoSymlinkParents(projectPath, destination);
    let destinationInfo: Awaited<ReturnType<typeof lstat>> | undefined;
    try {
      destinationInfo = await lstat(destination);
    } catch (error) {
      if (!isErrorCode(error, "ENOENT")) {
        throw error;
      }
    }
    if (destinationInfo) {
      throw new DestinationConflictError(
        `Cannot generate project because "${destination}" already exists.`,
      );
    }
  }

  return destinationExists;
}

async function assertNoSymlinkParents(
  projectPath: string,
  destination: string,
): Promise<void> {
  let currentPath = projectPath;
  const relative = path.relative(projectPath, path.dirname(destination));
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment);
    let info: Awaited<ReturnType<typeof lstat>>;
    try {
      info = await lstat(currentPath);
    } catch (error) {
      if (isErrorCode(error, "ENOENT")) {
        return;
      }
      throw error;
    }
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new DestinationConflictError(
        `Destination path contains a non-directory or symbolic link: "${currentPath}".`,
      );
    }
  }
}

async function writeProject(
  projectPath: string,
  files: readonly PlannedFile[],
  config: ProjectConfig,
  destinationExists: boolean,
): Promise<void> {
  const createdDirectories: string[] = [];
  const createdFiles: string[] = [];
  const mergedFiles = new Map<
    string,
    { readonly handle: FileHandle; value: Record<string, unknown> }
  >();

  try {
    if (destinationExists) {
      await assertExistingDirectory(projectPath);
    } else {
      await createDirectory(projectPath, createdDirectories);
    }
    const writtenDestinations = new Set<string>();
    for (const file of files) {
      const parentPath = path.dirname(file.destination);
      await createDirectoryTree(parentPath, projectPath, createdDirectories);

      const fileContent = await readFile(file.source);
      let content: string | Buffer = fileContent;
      if (file.templateContent) {
        content = renderTemplate(
          fileContent.toString("utf8"),
          config,
          file.source,
        );
      }
      const alreadyWritten = writtenDestinations.has(file.destination);
      if (file.mergeJson) {
        const overlayValue: unknown = JSON.parse(content.toString());
        if (!isJsonRecord(overlayValue)) {
          throw new InvalidTemplateError(
            'Files using "merge": "json" must contain JSON objects.',
          );
        }
        const existing = mergedFiles.get(file.destination);
        if (alreadyWritten && existing) {
          const mergedValue = mergeJsonObjects(existing.value, overlayValue);
          const serialized = `${JSON.stringify(mergedValue, null, 2)}\n`;
          await existing.handle.truncate(0);
          await existing.handle.write(serialized, 0, "utf8");
          await existing.handle.truncate(Buffer.byteLength(serialized));
          existing.value = mergedValue;
        } else {
          const handle = await open(file.destination, "wx");
          createdFiles.push(file.destination);
          mergedFiles.set(file.destination, { handle, value: overlayValue });
          await handle.writeFile(`${JSON.stringify(overlayValue, null, 2)}\n`);
        }
      } else {
        await writeFile(file.destination, content, {
          flag: "wx",
        });
        createdFiles.push(file.destination);
      }
      writtenDestinations.add(file.destination);
    }
    const closeErrors = await closeMergedFiles(mergedFiles);
    if (closeErrors.length > 0) {
      throw new AggregateError(
        closeErrors,
        "Could not close generated JSON files.",
      );
    }
  } catch (error) {
    const closeErrors = await closeMergedFiles(mergedFiles);
    const cleanupErrors = [
      ...closeErrors,
      ...(await rollback(createdFiles, createdDirectories)),
    ];
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "Project generation failed and cleanup was incomplete.",
        { cause: error },
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new GenerationError(message, { cause: error });
  }
}

function mergeJsonObjects(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const mergedValue =
      isJsonRecord(result[key]) && isJsonRecord(value)
        ? mergeJsonObjects(result[key], value)
        : value;
    Object.defineProperty(result, key, {
      value: mergedValue,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return result;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function closeMergedFiles(
  files: Map<
    string,
    { readonly handle: FileHandle; value: Record<string, unknown> }
  >,
): Promise<string[]> {
  const errors: string[] = [];
  for (const [filePath, file] of files) {
    try {
      await file.handle.close();
      files.delete(filePath);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`Could not close "${filePath}": ${detail}`);
    }
  }
  return errors;
}

async function assertExistingDirectory(directory: string): Promise<void> {
  let info: Awaited<ReturnType<typeof lstat>>;
  try {
    info = await lstat(directory);
  } catch (error) {
    if (!isErrorCode(error, "ENOENT")) {
      throw error;
    }
    throw new DestinationConflictError(
      `Destination "${directory}" changed before generation began.`,
    );
  }
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new DestinationConflictError(
      `Destination "${directory}" is not a safe directory.`,
    );
  }
}

async function createDirectory(
  directory: string,
  createdDirectories: string[],
): Promise<void> {
  await mkdir(directory);
  createdDirectories.push(directory);
}

async function createDirectoryTree(
  directory: string,
  projectPath: string,
  createdDirectories: string[],
): Promise<void> {
  const relative = path.relative(projectPath, directory);
  if (relative === "") {
    return;
  }

  let currentPath = projectPath;
  for (const segment of relative.split(path.sep)) {
    currentPath = path.join(currentPath, segment);
    let info: Awaited<ReturnType<typeof lstat>> | undefined;
    try {
      info = await lstat(currentPath);
    } catch (error) {
      if (!isErrorCode(error, "ENOENT")) {
        throw error;
      }
    }
    if (!info) {
      await createDirectory(currentPath, createdDirectories);
      continue;
    }
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new DestinationConflictError(
        `Destination parent is not a safe directory: "${currentPath}".`,
      );
    }
  }
}

async function rollback(
  createdFiles: readonly string[],
  createdDirectories: readonly string[],
): Promise<Error[]> {
  const errors: Error[] = [];
  for (const filePath of [...createdFiles].reverse()) {
    try {
      await unlink(filePath);
    } catch (error) {
      if (!isErrorCode(error, "ENOENT")) {
        errors.push(toError(error));
      }
    }
  }
  for (const directory of [...createdDirectories].reverse()) {
    try {
      await rmdir(directory);
    } catch (error) {
      if (!isErrorCode(error, "ENOENT")) {
        errors.push(toError(error));
      }
    }
  }
  return errors;
}

function isErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
