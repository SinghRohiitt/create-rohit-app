import { describe, expect, it } from "vitest";
import { CliArgumentError, parseCliArgs } from "./parse-cli-args.js";

describe("parseCliArgs", () => {
  it.each(["my-app", "app_2", "site.v2", "123-project"])(
    "accepts valid project name %s",
    (projectName) => {
      expect(parseCliArgs([projectName]).config.projectName).toBe(projectName);
    },
  );

  it.each([
    "My-App",
    "-app",
    "_app",
    "app name",
    "app/name",
    "app..name",
    "app.",
    "con",
    "a".repeat(215),
  ])("rejects invalid project name %s", (projectName) => {
    expect(() => parseCliArgs([projectName])).toThrow(CliArgumentError);
  });

  it("requires a project name", () => {
    expect(() => parseCliArgs([])).toThrow(/missing required argument/i);
  });

  it("parses explicit options into a typed project request", () => {
    expect(
      parseCliArgs([
        "my-app",
        "--frontend",
        "react",
        "--backend",
        "express",
        "--typescript",
        "--database",
        "postgres",
        "--auth",
        "jwt",
      ]),
    ).toEqual({
      mode: "cli",
      config: {
        projectName: "my-app",
        projectType: "fullstack",
        frontend: "react",
        backend: "express",
        language: "typescript",
        database: "postgres",
        authentication: "jwt",
        packageManager: "npm",
        installDependencies: true,
        initializeGit: true,
      },
      providedOptions: {
        frontend: "react",
        backend: "express",
        language: "typescript",
        database: "postgres",
        authentication: "jwt",
      },
      dryRun: false,
      yes: false,
      debug: false,
    });
  });

  it("rejects conflicting language flags", () => {
    expect(() =>
      parseCliArgs(["my-app", "--typescript", "--javascript"]),
    ).toThrow(/either --typescript\/--ts or --javascript\/--js/i);
  });

  it("rejects conflicting values for a repeated option", () => {
    expect(() =>
      parseCliArgs(["my-app", "--frontend", "react", "--frontend", "next"]),
    ).toThrow(/conflicting values for --frontend/i);
  });

  it("uses defaults and identifies the interactive flow when no options are set", () => {
    expect(parseCliArgs(["my-app"])).toEqual({
      mode: "interactive",
      config: {
        projectName: "my-app",
        projectType: "empty",
        frontend: "none",
        backend: "none",
        language: "typescript",
        database: "none",
        authentication: "none",
        packageManager: "npm",
        installDependencies: true,
        initializeGit: true,
      },
      providedOptions: {},
      dryRun: false,
      yes: false,
      debug: false,
    });
  });

  it("supports disabling installation and Git initialization", () => {
    const parsed = parseCliArgs(["my-app", "--no-install", "--no-git"]);

    expect(parsed.config.installDependencies).toBe(false);
    expect(parsed.config.initializeGit).toBe(false);
  });

  it("supports aliases for framework, language, database, auth, and skip flags", () => {
    const parsed = parseCliArgs([
      "my-app",
      "-f",
      "react",
      "-b",
      "express",
      "--ts",
      "-d",
      "none",
      "-a",
      "none",
      "--skip-install",
      "--skip-git",
      "-y",
    ]);

    expect(parsed.providedOptions).toMatchObject({
      frontend: "react",
      backend: "express",
      language: "typescript",
      database: "none",
      authentication: "none",
      installDependencies: false,
      initializeGit: false,
    });
    expect(parsed.yes).toBe(true);
    expect(parsed.config.installDependencies).toBe(false);
    expect(parsed.config.initializeGit).toBe(false);
  });

  it("records install choices only when the user supplied an install flag", () => {
    expect(parseCliArgs(["my-app"]).providedOptions).toEqual({});
    expect(
      parseCliArgs(["my-app", "--install-dependencies"]).providedOptions,
    ).toMatchObject({ installDependencies: true });
    expect(
      parseCliArgs(["my-app", "--no-install"]).providedOptions,
    ).toMatchObject({ installDependencies: false });
  });

  it("rejects conflicting dependency installation flags", () => {
    expect(() =>
      parseCliArgs(["my-app", "--install-dependencies", "--no-install"]),
    ).toThrow(/either --install-dependencies or --skip-install/i);
  });

  it("rejects conflicting install aliases", () => {
    expect(() =>
      parseCliArgs(["my-app", "--install-dependencies", "--skip-install"]),
    ).toThrow(/either --install-dependencies or --skip-install/i);
  });

  it("rejects unknown options", () => {
    expect(() => parseCliArgs(["my-app", "--wat"])).toThrow(/unknown option/i);
  });
});
