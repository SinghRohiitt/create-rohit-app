import { describe, expect, it, vi } from "vitest";
import {
  ProjectConfigurationError,
  resolveProjectConfig,
  type ProjectConfigPrompts,
} from "./resolve-project-config.js";

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

describe("resolveProjectConfig", () => {
  it("resolves a full-stack selection with both frameworks", async () => {
    const prompts = createPrompts();
    const config = await resolveProjectConfig("my-app", {}, prompts);

    expect(config.projectType).toBe("fullstack");
    expect(config.frontend).toBe("react");
    expect(config.backend).toBe("express");
    expect(prompts.selectFrontend).toHaveBeenCalledOnce();
    expect(prompts.selectBackend).toHaveBeenCalledOnce();
  });

  it("retains CLI choices and skips their corresponding prompts", async () => {
    const prompts = createPrompts();
    const config = await resolveProjectConfig(
      "my-app",
      {
        frontend: "next",
        backend: "nestjs",
        language: "javascript",
        database: "mongodb",
        authentication: "jwt",
        installDependencies: false,
      },
      prompts,
    );

    expect(config).toMatchObject({
      projectType: "fullstack",
      frontend: "next",
      backend: "nestjs",
      language: "javascript",
      database: "mongodb",
      authentication: "jwt",
      installDependencies: false,
    });
    expect(prompts.selectProjectType).not.toHaveBeenCalled();
    expect(prompts.selectFrontend).not.toHaveBeenCalled();
    expect(prompts.selectBackend).not.toHaveBeenCalled();
    expect(prompts.selectLanguage).not.toHaveBeenCalled();
    expect(prompts.selectDatabase).not.toHaveBeenCalled();
    expect(prompts.selectAuthentication).not.toHaveBeenCalled();
    expect(prompts.confirmInstallDependencies).not.toHaveBeenCalled();
  });

  it("uses an explicit frontend selection and prompts for missing settings", async () => {
    const prompts = createPrompts();
    const config = await resolveProjectConfig(
      "my-app",
      { frontend: "react" },
      prompts,
    );

    expect(config.projectType).toBe("frontend");
    expect(config.backend).toBe("none");
    expect(prompts.selectProjectType).not.toHaveBeenCalled();
    expect(prompts.selectFrontend).not.toHaveBeenCalled();
    expect(prompts.selectDatabase).toHaveBeenCalledWith(false);
    expect(prompts.selectAuthentication).toHaveBeenCalledOnce();
  });

  it("configures backend-only projects without selecting a frontend", async () => {
    const prompts = createPrompts({
      selectProjectType: vi.fn().mockResolvedValue("backend"),
      selectBackend: vi.fn().mockResolvedValue("nestjs"),
    });
    const config = await resolveProjectConfig("my-app", {}, prompts);

    expect(config.projectType).toBe("backend");
    expect(config.frontend).toBe("none");
    expect(config.backend).toBe("nestjs");
    expect(prompts.selectFrontend).not.toHaveBeenCalled();
  });

  it("rejects database choices without a backend", async () => {
    const prompts = createPrompts();

    await expect(
      resolveProjectConfig(
        "my-app",
        { frontend: "react", database: "postgres" },
        prompts,
      ),
    ).rejects.toThrow(ProjectConfigurationError);

    expect(prompts.selectLanguage).not.toHaveBeenCalled();
  });

  it("requires a persistent database for Express JWT authentication", async () => {
    await expect(
      resolveProjectConfig(
        "my-app",
        { backend: "express", database: "none", authentication: "jwt" },
        createPrompts(),
      ),
    ).rejects.toThrow("JWT authentication requires a persistent database");
  });

  it("allows frontend-only JWT configuration without inventing a backend", async () => {
    const prompts = createPrompts();
    const config = await resolveProjectConfig(
      "my-app",
      { frontend: "react", authentication: "jwt" },
      prompts,
    );

    expect(config.projectType).toBe("frontend");
    expect(config.backend).toBe("none");
    expect(config.authentication).toBe("jwt");
  });

  it("restricts project types to those that support explicitly requested backend features", async () => {
    const prompts = createPrompts();

    await resolveProjectConfig("my-app", { database: "postgres" }, prompts);

    expect(prompts.selectProjectType).toHaveBeenCalledWith(true);
  });

  it("returns default selections when prompts use their defaults", async () => {
    const config = await resolveProjectConfig("my-app", {}, createPrompts());

    expect(config).toEqual({
      projectName: "my-app",
      projectType: "fullstack",
      frontend: "react",
      backend: "express",
      language: "typescript",
      database: "none",
      authentication: "none",
      packageManager: "npm",
      installDependencies: true,
      initializeGit: true,
    });
  });
});
