import type { ProjectConfig } from "../config/project-config.js";

export type ProjectConfigKey = keyof ProjectConfig;

export interface TemplateCondition {
  readonly key: ProjectConfigKey;
  readonly equals: string | boolean;
}

export interface TemplateFile {
  readonly source: string;
  readonly destination: string;
  readonly template?: boolean;
  readonly merge?: "json";
  readonly when?: TemplateCondition | readonly TemplateCondition[];
}

export type TemplateSelector = Partial<
  Pick<ProjectConfig, "projectType" | "frontend" | "backend" | "language">
>;

export interface TemplateManifest {
  readonly id: string;
  readonly description: string;
  readonly appliesTo?: TemplateSelector;
  readonly destinationPrefixByProjectType?: Partial<
    Record<ProjectConfig["projectType"], string>
  >;
  readonly order?: number;
  readonly files: readonly TemplateFile[];
}

export interface ResolvedTemplate {
  readonly root: string;
  readonly manifest: TemplateManifest;
}

export interface GenerationOptions {
  readonly cwd?: string;
  readonly templateRoot?: string;
  readonly dryRun?: boolean;
}

export interface GenerationResult {
  readonly projectPath: string;
  readonly files: readonly string[];
  readonly dryRun: boolean;
}
