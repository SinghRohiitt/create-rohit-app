export type Frontend = "react" | "next" | "none";
export type Backend = "express" | "nestjs" | "none";
export type Language = "typescript" | "javascript";
export type Database = "postgres" | "mongodb" | "none";
export type Authentication = "jwt" | "none";
export type PackageManager = "npm" | "pnpm" | "yarn";
export type ProjectType = "frontend" | "backend" | "fullstack";

export interface ProjectConfig {
  readonly projectName: string;
  readonly projectType: ProjectType;
  readonly frontend: Frontend;
  readonly backend: Backend;
  readonly language: Language;
  readonly database: Database;
  readonly authentication: Authentication;
  readonly packageManager: PackageManager;
  readonly installDependencies: boolean;
  readonly initializeGit: boolean;
}

export interface ProjectConfigDraft extends Omit<ProjectConfig, "projectType"> {
  readonly projectType: ProjectType | "empty";
}

export type CliMode = "interactive" | "cli";

export interface ParsedProjectRequest {
  readonly mode: CliMode;
  readonly config: ProjectConfigDraft;
  readonly providedOptions: ProjectConfigOptions;
  readonly dryRun: boolean;
}

export interface ProjectConfigOptions {
  readonly frontend?: Exclude<Frontend, "none">;
  readonly backend?: Exclude<Backend, "none">;
  readonly language?: Language;
  readonly database?: Database;
  readonly authentication?: Authentication;
  readonly packageManager?: PackageManager;
  readonly installDependencies?: boolean;
  readonly initializeGit?: boolean;
}

export function validateProjectName(projectName: string): string | undefined {
  if (projectName.length === 0) {
    return "Project name cannot be empty.";
  }

  if (projectName.length > 214) {
    return "Project name cannot be longer than 214 characters.";
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/.test(projectName)) {
    return "Project name must start with a lowercase letter or number and contain only lowercase letters, numbers, dots, underscores, or hyphens.";
  }

  if (projectName.includes("..") || projectName.endsWith(".")) {
    return "Project name cannot contain consecutive dots or end with a dot.";
  }

  const windowsDeviceName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  if (windowsDeviceName.test(projectName)) {
    return `"${projectName}" is reserved by Windows and cannot be used as a project name.`;
  }

  return undefined;
}

export function createProjectConfig(
  projectName: string,
  options: ProjectConfigOptions,
): ProjectConfigDraft {
  const nameError = validateProjectName(projectName);
  if (nameError) {
    throw new Error(nameError);
  }

  const frontend = options.frontend ?? "none";
  const backend = options.backend ?? "none";
  const projectType: ProjectConfigDraft["projectType"] =
    frontend !== "none" && backend !== "none"
      ? "fullstack"
      : frontend !== "none"
        ? "frontend"
        : backend !== "none"
          ? "backend"
          : "empty";

  return {
    projectName,
    projectType,
    frontend,
    backend,
    language: options.language ?? "typescript",
    database: options.database ?? "none",
    authentication: options.authentication ?? "none",
    packageManager: options.packageManager ?? "npm",
    installDependencies: options.installDependencies ?? true,
    initializeGit: options.initializeGit ?? true,
  };
}

export function validateProjectConfig(
  config: ProjectConfigDraft,
): string | undefined {
  if (config.projectType === "empty") {
    return "Select a frontend, backend, or full-stack project.";
  }

  if (config.projectType === "frontend" && config.database !== "none") {
    return "A database requires a backend. Choose a backend or select no database.";
  }

  return undefined;
}

export function isCompleteProjectConfig(
  config: ProjectConfigDraft,
): config is ProjectConfig {
  return (
    config.projectType !== "empty" &&
    validateProjectConfig(config) === undefined
  );
}
