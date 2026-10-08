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
    });
  });

  it("rejects conflicting language flags", () => {
    expect(() =>
      parseCliArgs(["my-app", "--typescript", "--javascript"]),
    ).toThrow(/cannot be used with option/i);
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
    });
  });

  it("supports disabling installation and Git initialization", () => {
    const parsed = parseCliArgs(["my-app", "--no-install", "--no-git"]);

    expect(parsed.config.installDependencies).toBe(false);
    expect(parsed.config.initializeGit).toBe(false);
  });

  it("rejects unknown options", () => {
    expect(() => parseCliArgs(["my-app", "--wat"])).toThrow(/unknown option/i);
  });
});
