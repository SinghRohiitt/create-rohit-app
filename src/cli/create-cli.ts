import { CommanderError } from "commander";
import { displayProjectRequest } from "../commands/display-project-request.js";
import { resolveProjectConfig } from "../config/resolve-project-config.js";
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
      displayProjectRequest(config);
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
