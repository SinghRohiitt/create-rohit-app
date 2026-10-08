import { CommanderError } from "commander";
import { displayProjectRequest } from "../commands/display-project-request.js";
import { createCliProgram } from "./parse-cli-args.js";

export function runCli(args: readonly string[] = process.argv.slice(2)): void {
  try {
    const program = createCliProgram(args, displayProjectRequest);
    program.exitOverride();
    program.parse([...args], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode;
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}
