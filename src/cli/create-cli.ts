import { CommanderError } from "commander";
import { resolveProjectConfig } from "../config/resolve-project-config.js";
import { generateProject } from "../generators/project-generator.js";
import { configurationPrompts } from "../prompts/configuration-prompts.js";
import { createCliProgram } from "./parse-cli-args.js";

export async function runCli(
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  try {
    const program = createCliProgram(args, async (request) => {
      const needsPrompts =
        (!request.providedOptions.frontend &&
          !request.providedOptions.backend) ||
        request.providedOptions.language === undefined ||
        request.providedOptions.database === undefined ||
        request.providedOptions.authentication === undefined ||
        request.providedOptions.installDependencies === undefined;
      if (needsPrompts && (!process.stdin.isTTY || !process.stdout.isTTY)) {
        throw new Error(
          "Interactive configuration requires a TTY. Provide all options to run non-interactively.",
        );
      }

      const config = await resolveProjectConfig(
        request.config.projectName,
        request.providedOptions,
        configurationPrompts,
      );
      const result = await generateProject(config, {
        dryRun: request.dryRun,
      });

      if (result.dryRun) {
        console.log("Dry run: no files were written.");
        console.log("Planned files:");
      } else {
        console.log(`\nCreated ${config.projectName} at ${result.projectPath}`);
      }
      for (const file of result.files) {
        console.log(`  ${file}`);
      }
    });
    program.exitOverride();
    await program.parseAsync([...args], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode;
      return;
    }

    if (error instanceof Error && error.name === "ExitPromptError") {
      console.log("\nCancelled. No files were created.");
      process.exitCode = 130;
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}
