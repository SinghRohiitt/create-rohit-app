import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  isCompleteProjectConfig,
  validateProjectName,
} from "../config/project-config.js";
import type { ProjectConfig } from "../config/project-config.js";
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
  const selectedTemplates = selectTemplates(templates, config);
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
  const files = plannedFiles.map(({ destination }) => destination);

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
  const destinations = new Set<string>();

  for (const template of templates) {
    for (const file of template.manifest.files) {
      if (!conditionMatches(file.when, config)) {
        continue;
      }

      const source = await resolveTemplateSource(template, file.source);
      const destination = resolveDestinationPath(projectPath, file.destination);
      const normalizedDestination =
        process.platform === "win32"
          ? destination.toLocaleLowerCase("en-US")
          : destination;
      if (destinations.has(normalizedDestination)) {
        throw new InvalidTemplateError(
          `Multiple templates generate the same destination "${file.destination}".`,
        );
      }
      destinations.add(normalizedDestination);

      plannedFiles.push({
        template,
        source,
        destination,
        templateContent: file.template ?? true,
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

  try {
    if (destinationExists) {
      await assertExistingDirectory(projectPath);
    } else {
      await createDirectory(projectPath, createdDirectories);
    }
    for (const file of files) {
      const parentPath = path.dirname(file.destination);
      await createDirectoryTree(parentPath, projectPath, createdDirectories);

      const fileContent = await readFile(file.source);
      if (file.templateContent) {
        const rendered = renderTemplate(
          fileContent.toString("utf8"),
          config,
          file.source,
        );
        await writeFile(file.destination, rendered, {
          encoding: "utf8",
          flag: "wx",
        });
      } else {
        await writeFile(file.destination, fileContent, { flag: "wx" });
      }
      createdFiles.push(file.destination);
    }
  } catch (error) {
    const cleanupErrors = await rollback(createdFiles, createdDirectories);
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
