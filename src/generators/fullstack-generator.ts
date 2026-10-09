import type { ProjectConfig } from "../config/project-config.js";
import type { ResolvedTemplate } from "./template-types.js";
import { resolveBackendTemplates } from "./backend-generator.js";
import { resolveFrontendTemplates } from "./frontend-generator.js";
import { selectTemplates } from "./template-resolver.js";

export function resolveFullStackTemplates(
  templates: readonly ResolvedTemplate[],
  config: ProjectConfig,
): ResolvedTemplate[] {
  const sharedTemplates = selectTemplates(templates, config).filter(
    ({ manifest }) =>
      manifest.appliesTo?.frontend === undefined &&
      manifest.appliesTo?.backend === undefined,
  );

  return [
    ...sharedTemplates,
    ...resolveFrontendTemplates(templates, config),
    ...resolveBackendTemplates(templates, config),
  ].sort(
    (left, right) =>
      (left.manifest.order ?? 0) - (right.manifest.order ?? 0) ||
      left.manifest.id.localeCompare(right.manifest.id),
  );
}
