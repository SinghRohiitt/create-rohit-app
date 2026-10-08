import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../config/project-config.js";
import {
  InvalidTemplateError,
  TemplateNotFoundError,
} from "./template-errors.js";
import type {
  ProjectConfigKey,
  ResolvedTemplate,
  TemplateCondition,
  TemplateFile,
  TemplateManifest,
} from "./template-types.js";

const configKeys = new Set<ProjectConfigKey>([
  "projectName",
  "projectType",
  "frontend",
  "backend",
  "language",
  "database",
  "authentication",
  "packageManager",
  "installDependencies",
  "initializeGit",
]);
const selectorValues = {
  projectType: new Set(["frontend", "backend", "fullstack"]),
  frontend: new Set(["react", "next", "none"]),
  backend: new Set(["express", "nestjs", "none"]),
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeRelativePath(filePath: string): boolean {
  if (
    filePath.length === 0 ||
    filePath.includes("\0") ||
    path.posix.isAbsolute(filePath) ||
    path.win32.isAbsolute(filePath) ||
    /^[a-zA-Z]:/.test(filePath)
  ) {
    return false;
  }

  const normalized = filePath.replaceAll("\\", "/");
  return normalized
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function parseCondition(value: unknown, context: string): TemplateCondition {
  if (
    !isRecord(value) ||
    typeof value.key !== "string" ||
    !configKeys.has(value.key as ProjectConfigKey) ||
    (typeof value.equals !== "string" && typeof value.equals !== "boolean")
  ) {
    throw new InvalidTemplateError(
      `${context}: "when" must contain a ProjectConfig key and string or boolean equals value.`,
    );
  }
  const expectsBoolean =
    value.key === "installDependencies" || value.key === "initializeGit";
  if (expectsBoolean !== (typeof value.equals === "boolean")) {
    throw new InvalidTemplateError(
      `${context}: condition value type does not match ProjectConfig.${value.key}.`,
    );
  }

  return {
    key: value.key as ProjectConfigKey,
    equals: value.equals,
  };
}

function parseFile(
  value: unknown,
  templateId: string,
  index: number,
): TemplateFile {
  const context = `Template "${templateId}" file at index ${index}`;
  if (!isRecord(value)) {
    throw new InvalidTemplateError(`${context} must be an object.`);
  }

  if (
    typeof value.source !== "string" ||
    !isSafeRelativePath(value.source) ||
    typeof value.destination !== "string" ||
    !isSafeRelativePath(value.destination)
  ) {
    throw new InvalidTemplateError(
      `${context} must specify safe relative "source" and "destination" paths.`,
    );
  }
  if (value.template !== undefined && typeof value.template !== "boolean") {
    throw new InvalidTemplateError(`${context}: "template" must be a boolean.`);
  }

  return {
    source: value.source,
    destination: value.destination,
    ...(value.template === undefined ? {} : { template: value.template }),
    ...(value.when === undefined
      ? {}
      : { when: parseCondition(value.when, context) }),
  };
}

function parseManifest(value: unknown, manifestPath: string): TemplateManifest {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !/^[a-z0-9][a-z0-9-]*$/.test(value.id) ||
    typeof value.description !== "string" ||
    !Array.isArray(value.files)
  ) {
    throw new InvalidTemplateError(
      `Invalid template manifest at "${manifestPath}". Expected id, description, and files.`,
    );
  }
  const id = value.id;

  if (value.order !== undefined && typeof value.order !== "number") {
    throw new InvalidTemplateError(
      `Template "${id}": "order" must be a number.`,
    );
  }

  let appliesTo: TemplateManifest["appliesTo"];
  if (value.appliesTo !== undefined) {
    if (!isRecord(value.appliesTo)) {
      throw new InvalidTemplateError(
        `Template "${id}": "appliesTo" must be an object.`,
      );
    }

    const allowedKeys = ["projectType", "frontend", "backend"] as const;
    const selectors: {
      projectType?: ProjectConfig["projectType"];
      frontend?: ProjectConfig["frontend"];
      backend?: ProjectConfig["backend"];
    } = {};
    for (const key of Object.keys(value.appliesTo)) {
      if (!allowedKeys.includes(key as (typeof allowedKeys)[number])) {
        throw new InvalidTemplateError(
          `Template "${id}": unsupported appliesTo key "${key}".`,
        );
      }
      const rawSelectorValue = value.appliesTo[key];
      if (typeof rawSelectorValue !== "string") {
        throw new InvalidTemplateError(
          `Template "${id}": appliesTo.${key} must be a string.`,
        );
      }
      const selectorValue: string = rawSelectorValue;
      if (key === "projectType") {
        if (!selectorValues.projectType.has(selectorValue)) {
          throw new InvalidTemplateError(
            `Template "${id}": invalid projectType selector "${selectorValue}".`,
          );
        }
        selectors.projectType = selectorValue as ProjectConfig["projectType"];
      } else if (key === "frontend") {
        if (!selectorValues.frontend.has(selectorValue)) {
          throw new InvalidTemplateError(
            `Template "${id}": invalid frontend selector "${selectorValue}".`,
          );
        }
        selectors.frontend = selectorValue as ProjectConfig["frontend"];
      } else if (key === "backend") {
        if (!selectorValues.backend.has(selectorValue)) {
          throw new InvalidTemplateError(
            `Template "${id}": invalid backend selector "${selectorValue}".`,
          );
        }
        selectors.backend = selectorValue as ProjectConfig["backend"];
      }
    }
    appliesTo = selectors;
  }

  return {
    id,
    description: value.description,
    ...(appliesTo === undefined ? {} : { appliesTo }),
    ...(value.order === undefined ? {} : { order: value.order }),
    files: value.files.map((file, index) => parseFile(file, id, index)),
  };
}

async function getTemplateDirectories(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const directories = [root];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new InvalidTemplateError(
        `Template catalog cannot contain symbolic links: "${path.join(root, entry.name)}".`,
      );
    }
    if (entry.isDirectory()) {
      directories.push(
        ...(await getTemplateDirectories(path.join(root, entry.name))),
      );
    }
  }
  return directories;
}

export async function discoverTemplates(
  templateRoot: string,
): Promise<ResolvedTemplate[]> {
  const catalogPath = await realpath(templateRoot);
  const directories = await getTemplateDirectories(catalogPath);
  const templates: ResolvedTemplate[] = [];

  const seenIds = new Map<string, string>();
  for (const directory of directories) {
    const manifestPath = path.join(directory, "template.json");
    let manifestStat: Awaited<ReturnType<typeof lstat>> | undefined;
    try {
      manifestStat = await lstat(manifestPath);
    } catch (error) {
      if (isMissingPath(error)) {
        continue;
      }
      throw error;
    }
    if (manifestStat.isSymbolicLink()) {
      throw new InvalidTemplateError(
        `Template manifest cannot be a symbolic link: "${manifestPath}".`,
      );
    }
    if (!manifestStat.isFile()) {
      continue;
    }

    let manifestValue: unknown;
    try {
      manifestValue = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new InvalidTemplateError(
        `Could not read template manifest "${manifestPath}": ${detail}`,
      );
    }

    const manifest = parseManifest(manifestValue, manifestPath);
    const duplicateRoot = seenIds.get(manifest.id);
    if (duplicateRoot) {
      throw new InvalidTemplateError(
        `Duplicate template id "${manifest.id}" in "${duplicateRoot}" and "${directory}".`,
      );
    }

    seenIds.set(manifest.id, directory);
    templates.push({ root: directory, manifest });
  }

  return templates.sort(
    (left, right) =>
      (left.manifest.order ?? 0) - (right.manifest.order ?? 0) ||
      left.manifest.id.localeCompare(right.manifest.id),
  );
}

export async function resolveTemplate(
  templateRoot: string,
  templateId: string,
): Promise<ResolvedTemplate> {
  const templates = await discoverTemplates(templateRoot);
  const template = templates.find(({ manifest }) => manifest.id === templateId);
  if (!template) {
    throw new TemplateNotFoundError(templateId);
  }

  return template;
}

export function selectTemplates(
  templates: readonly ResolvedTemplate[],
  config: ProjectConfig,
): ResolvedTemplate[] {
  return templates.filter(({ manifest }) =>
    Object.entries(manifest.appliesTo ?? {}).every(
      ([key, value]) => config[key as keyof ProjectConfig] === value,
    ),
  );
}

export function conditionMatches(
  condition: TemplateCondition | undefined,
  config: ProjectConfig,
): boolean {
  return condition === undefined || config[condition.key] === condition.equals;
}

export async function resolveTemplateSource(
  template: ResolvedTemplate,
  source: string,
): Promise<string> {
  if (!isSafeRelativePath(source)) {
    throw new InvalidTemplateError(
      `Unsafe source path "${source}" in template "${template.manifest.id}".`,
    );
  }

  const sourcePath = path.resolve(template.root, source);
  const realSource = await realpath(sourcePath);
  const relativePath = path.relative(template.root, realSource);
  if (
    relativePath === "" ||
    relativePath.startsWith(`..${path.sep}`) ||
    relativePath === ".." ||
    path.isAbsolute(relativePath)
  ) {
    throw new InvalidTemplateError(
      `Template source "${source}" resolves outside template "${template.manifest.id}".`,
    );
  }

  return realSource;
}

export function resolveDestinationPath(
  projectPath: string,
  destination: string,
): string {
  if (!isSafeRelativePath(destination)) {
    throw new InvalidTemplateError(
      `Unsafe template destination path "${destination}".`,
    );
  }

  const resolvedPath = path.resolve(projectPath, destination);
  const relativePath = path.relative(projectPath, resolvedPath);
  if (
    relativePath === "" ||
    relativePath.startsWith(`..${path.sep}`) ||
    relativePath === ".." ||
    path.isAbsolute(relativePath)
  ) {
    throw new InvalidTemplateError(
      `Template destination "${destination}" resolves outside the project directory.`,
    );
  }

  return resolvedPath;
}

function isMissingPath(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}
