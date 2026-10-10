import {
  createProjectConfig,
  isCompleteProjectConfig,
  validateProjectConfig,
  type Authentication,
  type Backend,
  type Database,
  type PackageManager,
  type Frontend,
  type Language,
  type ProjectConfig,
  type ProjectConfigOptions,
  type ProjectType,
} from "./project-config.js";

export interface ProjectConfigPrompts {
  selectProjectType(requireBackend: boolean): Promise<ProjectType>;
  selectFrontend(): Promise<Exclude<Frontend, "none">>;
  selectBackend(): Promise<Exclude<Backend, "none">>;
  selectLanguage(): Promise<Language>;
  selectDatabase(allowDatabase: boolean): Promise<Database>;
  selectAuthentication(): Promise<Authentication>;
  confirmInstallDependencies(): Promise<boolean>;
}

export interface ResolveProjectConfigOptions {
  readonly useDefaults?: boolean;
}

export class ProjectConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectConfigurationError";
  }
}

export async function resolveProjectConfig(
  projectName: string,
  providedOptions: ProjectConfigOptions,
  prompts: ProjectConfigPrompts,
  resolveOptions: ResolveProjectConfigOptions = {},
): Promise<ProjectConfig> {
  const options: {
    frontend?: Exclude<Frontend, "none">;
    backend?: Exclude<Backend, "none">;
    language?: Language;
    database?: Database;
    authentication?: Authentication;
    packageManager?: PackageManager;
    installDependencies?: boolean;
    initializeGit?: boolean;
  } = { ...providedOptions };

  let projectType: Exclude<ProjectType, "empty">;
  const requireBackend =
    options.database !== undefined && options.database !== "none";
  const useDefaults = resolveOptions.useDefaults ?? false;

  if (options.frontend && options.backend) {
    projectType = "fullstack";
  } else if (options.frontend) {
    if (requireBackend) {
      throw new ProjectConfigurationError("A database requires a backend.");
    }
    projectType = "frontend";
  } else if (options.backend) {
    projectType = "backend";
  } else if (useDefaults) {
    projectType = "fullstack";
  } else {
    projectType = await prompts.selectProjectType(requireBackend);
  }

  if (
    (projectType === "frontend" || projectType === "fullstack") &&
    options.frontend === undefined
  ) {
    options.frontend = useDefaults ? "react" : await prompts.selectFrontend();
  }

  if (
    (projectType === "backend" || projectType === "fullstack") &&
    options.backend === undefined
  ) {
    options.backend = useDefaults ? "express" : await prompts.selectBackend();
  }

  const hasBackend = projectType === "backend" || projectType === "fullstack";
  if (
    !hasBackend &&
    options.database !== undefined &&
    options.database !== "none"
  ) {
    throw new ProjectConfigurationError(
      "A database requires a backend. Choose a backend or select no database.",
    );
  }
  options.language ??= useDefaults
    ? "typescript"
    : await prompts.selectLanguage();
  options.database ??= useDefaults
    ? "none"
    : await prompts.selectDatabase(hasBackend);
  options.authentication ??= useDefaults
    ? "none"
    : await prompts.selectAuthentication();
  options.installDependencies ??= useDefaults
    ? true
    : await prompts.confirmInstallDependencies();

  const config = createProjectConfig(projectName, options);
  const configError = validateProjectConfig(config);
  if (configError) {
    throw new ProjectConfigurationError(configError);
  }
  if (!isCompleteProjectConfig(config)) {
    throw new ProjectConfigurationError(
      "Select a frontend, backend, or full-stack project.",
    );
  }

  return config;
}
