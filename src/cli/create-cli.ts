import { Command } from "commander";
import { showWelcome } from "../commands/welcome.js";
import { packageConfig } from "../config/package-config.js";

export function runCli(): void {
  const program = new Command();

  program
    .name(packageConfig.name)
    .description(packageConfig.description)
    .version(packageConfig.version)
    .argument("[project-name]", "name of the project you plan to create")
    .action((projectName?: string) => {
      showWelcome(projectName);
    });

  program.parse();
}
