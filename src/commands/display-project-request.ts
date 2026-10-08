import type { ParsedProjectRequest } from "../config/project-config.js";

export function displayProjectRequest(request: ParsedProjectRequest): void {
  const modeLabel =
    request.mode === "interactive"
      ? "Interactive mode (prompt flow will be added later)"
      : "CLI mode";

  console.log(`${modeLabel}\n`);
  console.log(JSON.stringify(request.config, null, 2));
}
