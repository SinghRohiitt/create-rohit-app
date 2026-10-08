import type { ProjectConfig } from "../config/project-config.js";
import { InvalidTemplateError } from "./template-errors.js";

const placeholderPattern = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g;

export function renderTemplate(
  content: string,
  config: ProjectConfig,
  sourceName = "template",
): string {
  return content.replace(placeholderPattern, (placeholder, key: string) => {
    const value: unknown = config[key as keyof ProjectConfig];
    if (typeof value !== "string" && typeof value !== "boolean") {
      throw new InvalidTemplateError(
        `Unknown template variable "${key}" in "${sourceName}".`,
      );
    }

    return String(value);
  });
}
