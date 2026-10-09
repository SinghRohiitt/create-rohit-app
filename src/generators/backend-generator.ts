import type { ProjectConfig } from "../config/project-config.js";
import type { ResolvedTemplate } from "./template-types.js";
import { selectTemplates } from "./template-resolver.js";

export function resolveBackendTemplates(
  templates: readonly ResolvedTemplate[],
  config: ProjectConfig,
): ResolvedTemplate[] {
  return selectTemplates(templates, config).filter(({ manifest }) => {
    const appliesTo = manifest.appliesTo ?? {};
    return appliesTo.backend === config.backend;
  });
}
