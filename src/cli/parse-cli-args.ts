import { Command, CommanderError, Option } from "commander";
import { packageConfig } from "../config/package-config.js";
import {
  createProjectConfig,
  type ParsedProjectRequest,
  type ProjectConfigDraft,
  type ProjectConfigOptions,
} from "../config/project-config.js";

const frontends = ["react", "next"] as const;
const backends = ["express", "nestjs"] as const;
const databases = ["postgres", "mongodb", "none"] as const;
const authenticationStrategies = ["jwt", "none"] as const;
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

function hasFlag(args: readonly string[], flag: string): boolean {
  return args.includes(flag);
}

function assertNoConflictingRepeatedOptions(args: readonly string[]): void {
  const skipsInstall =
    hasFlag(args, "--skip-install") || hasFlag(args, "--no-install");
  if (hasFlag(args, "--install-dependencies") && skipsInstall) {
    throw new CliArgumentError(
      "Use either --install-dependencies or --skip-install, not both.",
    );
  }

  const valueOptions = new Map<string, string>();
  const valueOptionNames = new Set([
    "--frontend",
    "-f",
    "--backend",
    "-b",
    "--database",
    "-d",
    "--auth",
    "-a",
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

    const canonicalOption =
      optionName === "-f"
        ? "--frontend"
        : optionName === "-b"
          ? "--backend"
          : optionName === "-d"
            ? "--database"
            : optionName === "-a"
              ? "--auth"
              : optionName;
    const previousValue = valueOptions.get(canonicalOption ?? "");
    if (previousValue && previousValue !== value) {
      throw new CliArgumentError(
        `Conflicting values for ${canonicalOption}: "${previousValue}" and "${value}".`,
      );
    }

    valueOptions.set(canonicalOption ?? "", value);
    if (inlineValue === undefined) {
      index += 1;
    }
  }
}

function assertNoConflictingLanguageOptions(args: readonly string[]): void {
  const requestsTypeScript =
    hasFlag(args, "--typescript") || hasFlag(args, "--ts");
  const requestsJavaScript =
    hasFlag(args, "--javascript") || hasFlag(args, "--js");
  if (requestsTypeScript && requestsJavaScript) {
    throw new CliArgumentError(
      "Use either --typescript/--ts or --javascript/--js, not both.",
    );
  }
}

function createProgram(
  args: readonly string[],
  onRequest: (request: ParsedProjectRequest) => void | Promise<void>,
): Command {
  assertNoConflictingRepeatedOptions(args);
  assertNoConflictingLanguageOptions(args);
  const program = new Command();

  program
    .name(packageConfig.name)
    .description(packageConfig.description)
    .version(packageConfig.version)
    .argument("<project-name>", "name of the project to create")
    .addOption(
      new Option("-f, --frontend <framework>", "frontend framework").choices(
        frontends,
      ),
    )
    .addOption(
      new Option("-b, --backend <framework>", "backend framework").choices(
        backends,
      ),
    )
    .option("--typescript", "use TypeScript")
    .option("--javascript", "use JavaScript")
    .option("--ts", "alias for --typescript")
    .option("--js", "alias for --javascript")
    .addOption(
      new Option("-d, --database <database>", "database to configure").choices(
        databases,
      ),
    )
    .addOption(
      new Option("-a, --auth <strategy>", "authentication strategy").choices(
        authenticationStrategies,
      ),
    )
    .addOption(
      new Option("--package-manager <manager>", "package manager").choices([
        ...packageManagers,
      ]),
    )
    .option("--install-dependencies", "install dependencies")
    .option("--skip-install", "skip dependency installation")
    .option("--no-install", "skip dependency installation")
    .option("--skip-git", "skip Git initialization")
    .option("--no-git", "skip Git initialization")
    .option("-y, --yes", "accept defaults and run without prompts")
    .option("--debug", "show diagnostic stack traces on errors")
    .option("--dry-run", "show planned output without writing files")
    .action((projectName: string, commandOptions: Record<string, unknown>) => {
      const skipsInstall =
        hasFlag(args, "--skip-install") || hasFlag(args, "--no-install");
      const options: ProjectConfigOptions = {
        ...(isOneOf(commandOptions.frontend, frontends)
          ? { frontend: commandOptions.frontend }
          : {}),
        ...(isOneOf(commandOptions.backend, backends)
          ? { backend: commandOptions.backend }
          : {}),
        ...(hasFlag(args, "--javascript") || hasFlag(args, "--js")
          ? { language: "javascript" as const }
          : hasFlag(args, "--typescript") || hasFlag(args, "--ts")
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
        ...(hasFlag(args, "--install-dependencies")
          ? { installDependencies: true }
          : skipsInstall
            ? { installDependencies: false }
            : {}),
        ...(hasFlag(args, "--no-git") || hasFlag(args, "--skip-git")
          ? { initializeGit: false }
          : {}),
      };

      let config: ProjectConfigDraft;
      try {
        config = createProjectConfig(projectName, options);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new CliArgumentError(message);
      }

      return onRequest({
        mode: hasExplicitOptions(args) ? "cli" : "interactive",
        config,
        providedOptions: options,
        dryRun: hasFlag(args, "--dry-run"),
        yes: commandOptions.yes === true,
        debug: commandOptions.debug === true,
      });
    });

  return program;
}

export function hasCompleteProjectSelections(
  options: ProjectConfigOptions,
): boolean {
  return (
    (options.frontend !== undefined || options.backend !== undefined) &&
    options.language !== undefined &&
    options.database !== undefined &&
    options.authentication !== undefined
  );
}

export function createCliProgram(
  args: readonly string[],
  onRequest: (request: ParsedProjectRequest) => void | Promise<void>,
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
    dryRun: hasFlag(args, "--dry-run"),
    yes: hasFlag(args, "--yes") || hasFlag(args, "-y"),
    debug: hasFlag(args, "--debug"),
  };
}
