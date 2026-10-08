import { Command, CommanderError, Option } from "commander";
import { packageConfig } from "../config/package-config.js";
import {
  createProjectConfig,
  type ParsedProjectRequest,
  type ProjectConfig,
  type ProjectConfigOptions,
} from "../config/project-config.js";

const frontends = ["react", "next"] as const;
const backends = ["express", "nestjs"] as const;
const databases = ["postgres", "mongodb"] as const;
const authenticationStrategies = ["jwt"] as const;
const packageManagers = ["npm", "pnpm", "yarn"] as const;

export class CliArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliArgumentError";
  }
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  choices: T,
): value is T[number] {
  return (
    typeof value === "string" && choices.some((choice) => choice === value)
  );
}

function hasExplicitOptions(args: readonly string[]): boolean {
  return args.some((arg) => arg.startsWith("-"));
}

function assertNoConflictingRepeatedOptions(args: readonly string[]): void {
  const valueOptions = new Map<string, string>();
  const valueOptionNames = new Set([
    "--frontend",
    "--backend",
    "--database",
    "--auth",
    "--package-manager",
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    const [optionName, inlineValue] = arg.split("=", 2);
    if (!valueOptionNames.has(optionName ?? "")) {
      continue;
    }

    const value = inlineValue ?? args[index + 1];
    if (!value || value.startsWith("-")) {
      continue;
    }

    const previousValue = valueOptions.get(optionName ?? "");
    if (previousValue && previousValue !== value) {
      throw new CliArgumentError(
        `Conflicting values for ${optionName}: "${previousValue}" and "${value}".`,
      );
    }

    valueOptions.set(optionName ?? "", value);
    if (inlineValue === undefined) {
      index += 1;
    }
  }
}

function createProgram(
  args: readonly string[],
  onRequest: (request: ParsedProjectRequest) => void,
): Command {
  assertNoConflictingRepeatedOptions(args);
  const program = new Command();

  program
    .name(packageConfig.name)
    .description(packageConfig.description)
    .version(packageConfig.version)
    .argument("<project-name>", "name of the project to create")
    .addOption(
      new Option("--frontend <framework>", "frontend framework").choices(
        frontends,
      ),
    )
    .addOption(
      new Option("--backend <framework>", "backend framework").choices(
        backends,
      ),
    )
    .addOption(
      new Option("--typescript", "use TypeScript").conflicts("javascript"),
    )
    .option("--javascript", "use JavaScript")
    .addOption(
      new Option("--database <database>", "database to configure").choices(
        databases,
      ),
    )
    .addOption(
      new Option("--auth <strategy>", "authentication strategy").choices(
        authenticationStrategies,
      ),
    )
    .addOption(
      new Option("--package-manager <manager>", "package manager").choices([
        ...packageManagers,
      ]),
    )
    .option("--no-install", "skip dependency installation")
    .option("--no-git", "skip Git initialization")
    .action((projectName: string, commandOptions: Record<string, unknown>) => {
      const options: ProjectConfigOptions = {
        ...(isOneOf(commandOptions.frontend, frontends)
          ? { frontend: commandOptions.frontend }
          : {}),
        ...(isOneOf(commandOptions.backend, backends)
          ? { backend: commandOptions.backend }
          : {}),
        ...(commandOptions.javascript === true
          ? { language: "javascript" as const }
          : commandOptions.typescript === true
            ? { language: "typescript" as const }
            : {}),
        ...(isOneOf(commandOptions.database, databases)
          ? { database: commandOptions.database }
          : {}),
        ...(isOneOf(commandOptions.auth, authenticationStrategies)
          ? { authentication: commandOptions.auth }
          : {}),
        ...(isOneOf(commandOptions.packageManager, packageManagers)
          ? { packageManager: commandOptions.packageManager }
          : {}),
        ...(typeof commandOptions.install === "boolean"
          ? { installDependencies: commandOptions.install }
          : {}),
        ...(typeof commandOptions.git === "boolean"
          ? { initializeGit: commandOptions.git }
          : {}),
      };

      let config: ProjectConfig;
      try {
        config = createProjectConfig(projectName, options);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new CliArgumentError(message);
      }

      onRequest({
        mode: hasExplicitOptions(args) ? "cli" : "interactive",
        config,
      });
    });

  return program;
}

export function createCliProgram(
  args: readonly string[],
  onRequest: (request: ParsedProjectRequest) => void,
): Command {
  return createProgram(args, onRequest);
}

export function parseCliArgs(args: readonly string[]): ParsedProjectRequest {
  let request: ParsedProjectRequest | undefined;
  const program = createCliProgram(args, (parsedRequest) => {
    request = parsedRequest;
  });

  program.exitOverride();
  program.configureOutput({
    writeErr: () => undefined,
    writeOut: () => undefined,
  });

  try {
    program.parse([...args], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      throw new CliArgumentError(error.message);
    }
    throw error;
  }

  if (!request) {
    throw new CliArgumentError("A project name is required.");
  }

  return {
    ...request,
    mode: hasExplicitOptions(args) ? "cli" : "interactive",
  };
}
