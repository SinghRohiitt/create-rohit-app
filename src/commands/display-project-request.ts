import type { ProjectConfig } from "../config/project-config.js";

export function displayProjectRequest(config: ProjectConfig): void {
  console.log("Project configuration:\n");
  console.log(JSON.stringify(config, null, 2));
}
