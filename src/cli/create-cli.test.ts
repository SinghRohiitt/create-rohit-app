import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectConfigPrompts } from "../config/resolve-project-config.js";
import type { ProjectConfig } from "../config/project-config.js";
import type { GenerationResult } from "../generators/template-types.js";
import { runCli, type CliRuntime } from "./create-cli.js";

const projectPath = "C:\\generated\\my-app";

function createPrompts(
  overrides: Partial<ProjectConfigPrompts> = {},
): ProjectConfigPrompts {
  return {
    selectProjectType: vi.fn().mockResolvedValue("fullstack"),
    selectFrontend: vi.fn().mockResolvedValue("react"),
    selectBackend: vi.fn().mockResolvedValue("express"),
    selectLanguage: vi.fn().mockResolvedValue("typescript"),
    selectDatabase: vi.fn().mockResolvedValue("none"),
    selectAuthentication: vi.fn().mockResolvedValue("none"),
    confirmInstallDependencies: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function createRuntime(overrides: Partial<CliRuntime> = {}): CliRuntime {
  return {
    stdinIsTTY: true,
    stdoutIsTTY: true,
    prompts: createPrompts(),
    generate: vi.fn(async (): Promise<GenerationResult> => ({
      projectPath,
      files: ["package.json"],
      dryRun: false,
    })),
    install: vi.fn(async () => {}),
    initializeGit: vi.fn(async () => {}),
    writeOut: vi.fn(),
    writeError: vi.fn(),
    ...overrides,
  };
}

function generatedConfig(runtime: CliRuntime): ProjectConfig {
  const calls = vi.mocked(runtime.generate).mock.calls;
  const config = calls.at(-1)?.[0];
  if (!config) {
    throw new Error("Expected project generation to be called.");
  }
  return config;
}

afterEach(() => {
  process.exitCode = 0;
});

describe("runCli", () => {
  it("uses equivalent configuration for prompts and complete CLI flags", async () => {
    const interactiveRuntime = createRuntime();
    await runCli(["my-app"], interactiveRuntime);

    const nonInteractiveRuntime = createRuntime({
      stdinIsTTY: false,
      stdoutIsTTY: false,
    });
    await runCli(
      [
        "my-app",
        "--frontend",
        "react",
        "--backend",
        "express",
        "--typescript",
        "--database",
        "none",
        "--auth",
        "none",
      ],
      nonInteractiveRuntime,
    );

    expect(generatedConfig(interactiveRuntime)).toEqual(
      generatedConfig(nonInteractiveRuntime),
    );
    expect(
      nonInteractiveRuntime.prompts.selectProjectType,
    ).not.toHaveBeenCalled();
    expect(nonInteractiveRuntime.install).toHaveBeenCalledOnce();
    expect(nonInteractiveRuntime.initializeGit).toHaveBeenCalledOnce();
  });

  it("uses defaults with --yes and skips installation and Git when requested", async () => {
    const runtime = createRuntime({
      stdinIsTTY: false,
      stdoutIsTTY: false,
    });

    await runCli(["my-app", "--yes", "--skip-install", "--skip-git"], runtime);

    expect(generatedConfig(runtime)).toMatchObject({
      projectType: "fullstack",
      frontend: "react",
      backend: "express",
      language: "typescript",
      database: "none",
      authentication: "none",
      installDependencies: false,
      initializeGit: false,
    });
    expect(runtime.prompts.selectProjectType).not.toHaveBeenCalled();
    expect(runtime.install).not.toHaveBeenCalled();
    expect(runtime.initializeGit).not.toHaveBeenCalled();
    expect(vi.mocked(runtime.writeOut).mock.calls.flat().join("\n")).toContain(
      "Frontend: http://localhost:5173",
    );
    expect(vi.mocked(runtime.writeOut).mock.calls.flat().join("\n")).toContain(
      "Backend:  http://localhost:3000",
    );
  });

  it("reports an actionable error for incomplete non-interactive input", async () => {
    const runtime = createRuntime({
      stdinIsTTY: false,
      stdoutIsTTY: false,
    });

    await runCli(["my-app", "--frontend", "react"], runtime);

    expect(runtime.generate).not.toHaveBeenCalled();
    expect(vi.mocked(runtime.writeError).mock.calls.flat().join("\n")).toMatch(
      /--yes to accept the defaults/,
    );
    expect(process.exitCode).toBe(1);
  });

  it("shows only URLs for selected application components", async () => {
    const runtime = createRuntime({
      stdinIsTTY: false,
      stdoutIsTTY: false,
    });

    await runCli(["my-app", "--frontend", "next", "--yes"], runtime);

    const output = vi.mocked(runtime.writeOut).mock.calls.flat().join("\n");
    expect(output).toContain("Frontend: http://localhost:3001");
    expect(output).not.toContain("Backend:");
  });

  it("reports post-generation install failure without losing the created path", async () => {
    const runtime = createRuntime({
      install: vi.fn().mockRejectedValue(new Error("network unavailable")),
    });

    await runCli(
      [
        "my-app",
        "--frontend",
        "react",
        "--typescript",
        "--database",
        "none",
        "--auth",
        "none",
      ],
      runtime,
    );

    const errorOutput = vi
      .mocked(runtime.writeError)
      .mock.calls.flat()
      .join("\n");
    expect(errorOutput).toContain("Project files were created");
    expect(errorOutput).toContain(projectPath);
    expect(errorOutput).not.toContain("Error: Error:");
    expect(process.exitCode).toBe(1);
  });

  it("prints stack traces only when debug mode is enabled", async () => {
    const regularRuntime = createRuntime({
      generate: vi.fn().mockRejectedValue(new Error("generation failed")),
    });
    await runCli(["my-app", "--yes"], regularRuntime);
    expect(
      vi.mocked(regularRuntime.writeError).mock.calls.flat().join("\n"),
    ).toBe("Error: generation failed");

    const debugRuntime = createRuntime({
      generate: vi.fn().mockRejectedValue(new Error("generation failed")),
    });
    await runCli(["my-app", "--yes", "--debug"], debugRuntime);
    expect(
      vi.mocked(debugRuntime.writeError).mock.calls.flat().join("\n"),
    ).toMatch(/Error: generation failed[\s\S]*at/);
  });
});
