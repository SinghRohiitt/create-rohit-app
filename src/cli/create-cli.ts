import { spawn } from "node:child_process";
import { CommanderError } from "commander";
import {
  hasCompleteProjectSelections,
  createCliProgram,
} from "./parse-cli-args.js";
import {
  resolveProjectConfig,
  type ProjectConfigPrompts,
} from "../config/resolve-project-config.js";
import type {
  ParsedProjectRequest,
  ProjectConfig,
} from "../config/project-config.js";
import { generateProject } from "../generators/project-generator.js";
import type {
  GenerationOptions,
  GenerationResult,
} from "../generators/template-types.js";
import { configurationPrompts } from "../prompts/configuration-prompts.js";

export interface CliRuntime {
  readonly stdinIsTTY: boolean;
  readonly stdoutIsTTY: boolean;
  readonly prompts: ProjectConfigPrompts;
  readonly generate: (
    config: ProjectConfig,
    options: GenerationOptions,
  ) => Promise<GenerationResult>;
  readonly install: (
    config: ProjectConfig,
    projectPath: string,
  ) => Promise<void>;
  readonly initializeGit: (projectPath: string) => Promise<void>;
  readonly writeOut: (message: string) => void;
  readonly writeError: (message: string) => void;
}

class PostGenerationError extends Error {
  constructor(
    message: string,
    readonly projectPath: string,
  ) {
    super(message);
    this.name = "PostGenerationError";
  }
}

function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.once("error", (error) => {
      reject(new Error(`Unable to start "${command}": ${error.message}`));
    });
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          signal
            ? `"${command}" was stopped by signal ${signal}.`
            : `"${command}" exited with code ${String(code)}.`,
        ),
      );
    });
  });
}

async function installDependencies(
  config: ProjectConfig,
  projectPath: string,
): Promise<void> {
  const commands = {
    npm: ["npm", ["install"]],
    pnpm: ["pnpm", ["install"]],
    yarn: ["yarn", ["install"]],
  } as const;
  const [command, args] = commands[config.packageManager];
  await runCommand(command, args, projectPath);
}

async function initializeGit(projectPath: string): Promise<void> {
  await runCommand("git", ["init"], projectPath);
}

function createDefaultRuntime(): CliRuntime {
  return {
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
    prompts: configurationPrompts,
    generate: generateProject,
    install: installDependencies,
    initializeGit,
    writeOut: (message) => console.log(message),
    writeError: (message) => console.error(message),
  };
}

function buildNonInteractiveError(): string {
  return [
    "Interactive configuration requires a terminal.",
    "Run with --yes to accept the defaults, or provide the framework, language, database, and auth options.",
    "Example: create-rohit-app my-app --frontend react --backend express --typescript --database none --auth none",
  ].join("\n");
}

function successSummary(config: ProjectConfig): string {
  const lines = [
    "\nProject created successfully!",
    "",
    "Next steps:",
    "",
    `  cd ${config.projectName}`,
    `  ${config.packageManager} run dev`,
  ];

  if (config.frontend === "react") {
    lines.push("", "Frontend: http://localhost:5173");
  } else if (config.frontend === "next") {
    lines.push("", "Frontend: http://localhost:3001");
  }

  if (config.backend !== "none") {
    lines.push("Backend:  http://localhost:3000");
  }

  return lines.join("\n");
}

async function handleRequest(
  request: ParsedProjectRequest,
  runtime: CliRuntime,
): Promise<void> {
  const selectionsAreComplete = hasCompleteProjectSelections(
    request.providedOptions,
  );
  const useDefaults = request.yes || selectionsAreComplete;
  const needsPrompts = !useDefaults;

  if (needsPrompts && (!runtime.stdinIsTTY || !runtime.stdoutIsTTY)) {
    throw new Error(buildNonInteractiveError());
  }

  const config = await resolveProjectConfig(
    request.config.projectName,
    request.providedOptions,
    runtime.prompts,
    { useDefaults },
  );

  runtime.writeOut("Creating project...");
  const result = await runtime.generate(config, {
    dryRun: request.dryRun,
  });

  if (result.dryRun) {
    runtime.writeOut("\nDry run: no files were written.");
    runtime.writeOut("Planned files:");
    for (const file of result.files) {
      runtime.writeOut(`  ${file}`);
    }
    return;
  }

  runtime.writeOut("✔ Project created");

  if (config.installDependencies) {
    runtime.writeOut("Installing dependencies...");
    try {
      await runtime.install(config, result.projectPath);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new PostGenerationError(
        `Project files were created, but dependency installation failed: ${detail}\nRetry with "${config.packageManager} install" in "${result.projectPath}".`,
        result.projectPath,
      );
    }
    runtime.writeOut("✔ Dependencies installed");
  } else {
    runtime.writeOut("Dependency installation skipped");
  }

  if (config.initializeGit) {
    runtime.writeOut("Initializing Git...");
    try {
      await runtime.initializeGit(result.projectPath);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new PostGenerationError(
        `Project files were created, but Git initialization failed: ${detail}\nRun "git init" in "${result.projectPath}" to retry.`,
        result.projectPath,
      );
    }
    runtime.writeOut("✔ Git initialized");
  } else {
    runtime.writeOut("Git initialization skipped");
  }

  runtime.writeOut(successSummary(config));
}

export async function runCli(
  args: readonly string[] = process.argv.slice(2),
  runtime: CliRuntime = createDefaultRuntime(),
): Promise<void> {
  try {
    const program = createCliProgram(args, (request) =>
      handleRequest(request, runtime),
    );
    program.exitOverride();
    await program.parseAsync([...args], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode;
      return;
    }

    if (error instanceof Error && error.name === "ExitPromptError") {
      runtime.writeOut("\nCancelled. No files were created.");
      process.exitCode = 130;
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    runtime.writeError(`Error: ${message}`);
    if (args.includes("--debug") && error instanceof Error && error.stack) {
      runtime.writeError(error.stack);
    }
    process.exitCode = 1;
  }
}
