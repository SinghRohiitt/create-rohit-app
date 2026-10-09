import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createProjectConfig,
  isCompleteProjectConfig,
  type ProjectConfig,
  type ProjectConfigOptions,
} from "../config/project-config.js";
import {
  DestinationConflictError,
  InvalidTemplateError,
  TemplateNotFoundError,
} from "./template-errors.js";
import { generateProject } from "./project-generator.js";
import { renderTemplate } from "./template-renderer.js";
import {
  discoverTemplates,
  resolveTemplate,
  selectTemplates,
} from "./template-resolver.js";

const temporaryDirectories: string[] = [];
const baseManifest = {
  id: "shared-base",
  description: "Base template",
  files: [
    {
      source: "README.tpl",
      destination: "README.md",
      template: true,
    },
  ],
};

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "create-rohit-app-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function createCatalog(
  directory: string,
  manifest: unknown,
  content = "Hello {{projectName}}",
): Promise<string> {
  const templateRoot = path.join(directory, "catalog");
  const templateDirectory = path.join(templateRoot, "shared", "base");
  await mkdir(templateDirectory, { recursive: true });
  await writeFile(
    path.join(templateDirectory, "template.json"),
    JSON.stringify(manifest),
  );
  await writeFile(path.join(templateDirectory, "README.tpl"), content);
  return templateRoot;
}

function createValidProjectConfig(
  options: ProjectConfigOptions,
): ProjectConfig {
  const config = createProjectConfig("my-app", options);
  if (!isCompleteProjectConfig(config)) {
    throw new Error("Test project configuration must be complete.");
  }
  return config;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("template resolver", () => {
  it("discovers and resolves manifests", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, baseManifest);

    const templates = await discoverTemplates(templateRoot);
    const template = await resolveTemplate(templateRoot, "shared-base");

    expect(templates).toHaveLength(1);
    expect(template.manifest.description).toBe("Base template");
  });

  it("reports an unknown template id", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, baseManifest);

    await expect(resolveTemplate(templateRoot, "missing")).rejects.toThrow(
      TemplateNotFoundError,
    );
  });

  it("selects templates by configuration selectors", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, baseManifest);
    const frontendDirectory = path.join(templateRoot, "frontend", "react-vite");
    await mkdir(frontendDirectory, { recursive: true });
    await writeFile(
      path.join(frontendDirectory, "template.json"),
      JSON.stringify({
        id: "react-vite",
        description: "React overlay",
        appliesTo: { frontend: "react" },
        order: 1,
        files: [],
      }),
    );

    const templates = await discoverTemplates(templateRoot);
    const selected = selectTemplates(
      templates,
      createValidProjectConfig({ frontend: "react" }),
    );

    expect(selected.map(({ manifest }) => manifest.id)).toEqual([
      "shared-base",
      "react-vite",
    ]);
  });
});

describe("template renderer", () => {
  it("replaces config variables without evaluating template content", () => {
    const config = createValidProjectConfig({
      frontend: "react",
      backend: "express",
    });

    expect(
      renderTemplate(
        "# {{projectName}}\n{{projectType}} - {{language}}",
        config,
      ),
    ).toBe("# my-app\nfullstack - typescript");
  });

  it("rejects unknown variables", () => {
    const config = createValidProjectConfig({
      frontend: "react",
      backend: "express",
    });

    expect(() => renderTemplate("{{unknown}}", config)).toThrow(
      InvalidTemplateError,
    );
  });
});

describe("generateProject", () => {
  it.each(["typescript", "javascript"] as const)(
    "generates a runnable React + Vite %s project layout",
    async (language) => {
      const temporaryDirectory = await createTemporaryDirectory();
      const templateRoot = path.resolve(
        process.cwd(),
        "src",
        "templates",
        "catalog",
      );
      const config = createValidProjectConfig({
        frontend: "react",
        language,
        authentication: "jwt",
      });

      const result = await generateProject(config, {
        cwd: temporaryDirectory,
        templateRoot,
      });
      const generatedFiles = new Set(
        result.files.map((filePath) =>
          path.relative(result.projectPath, filePath).replaceAll("\\", "/"),
        ),
      );
      const packageJson = JSON.parse(
        await readFile(path.join(result.projectPath, "package.json"), "utf8"),
      ) as {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
        scripts: Record<string, string>;
      };

      expect(generatedFiles).toContain(
        "src/App." + (language === "typescript" ? "tsx" : "jsx"),
      );
      expect(generatedFiles).toContain(
        "src/main." + (language === "typescript" ? "tsx" : "jsx"),
      );
      expect(generatedFiles).toContain(
        "src/services/api." + (language === "typescript" ? "ts" : "js"),
      );
      expect(generatedFiles).toContain(
        "src/services/auth." + (language === "typescript" ? "ts" : "js"),
      );
      expect(generatedFiles).toContain(".env.example");
      expect(generatedFiles).toContain("src/components/.gitkeep");
      expect(generatedFiles).not.toContain(".env.auth.example");
      expect(generatedFiles).toContain(
        "src/services/auth." + (language === "typescript" ? "ts" : "js"),
      );
      expect(packageJson.dependencies).toHaveProperty("react");
      expect(packageJson.dependencies).toHaveProperty("react-dom");
      expect(packageJson.devDependencies).toHaveProperty("vite");
      expect(packageJson.scripts).toHaveProperty("dev");
      expect(packageJson.scripts).toHaveProperty("build");
      expect(packageJson.scripts).toHaveProperty("lint");
      if (language === "typescript") {
        expect(packageJson.devDependencies).toHaveProperty("typescript");
        expect(packageJson.scripts).toHaveProperty("typecheck");
        expect(generatedFiles).toContain("tsconfig.json");
      } else {
        expect(packageJson.devDependencies).not.toHaveProperty("typescript");
        expect(packageJson.scripts).not.toHaveProperty("typecheck");
        expect(generatedFiles).not.toContain("tsconfig.json");
      }
    },
  );

  it("generates template files and applies conditional files", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, {
      ...baseManifest,
      files: [
        ...baseManifest.files,
        {
          source: "README.tpl",
          destination: ".env.database.example",
          template: true,
          when: { key: "database", equals: "postgres" },
        },
      ],
    });
    const config = createValidProjectConfig({
      frontend: "react",
      backend: "express",
      database: "postgres",
    });

    const result = await generateProject(config, {
      cwd: temporaryDirectory,
      templateRoot,
    });

    expect(result.dryRun).toBe(false);
    expect(result.files.map((filePath) => path.basename(filePath))).toEqual([
      "README.md",
      ".env.database.example",
    ]);
    expect(
      await readFile(path.join(result.projectPath, "README.md"), "utf8"),
    ).toBe("Hello my-app");
    expect(
      await readFile(
        path.join(result.projectPath, ".env.database.example"),
        "utf8",
      ),
    ).toBe("Hello my-app");
  });

  it("copies files without variable expansion when marked as non-template", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, {
      ...baseManifest,
      files: [
        {
          source: "README.tpl",
          destination: "literal.txt",
          template: false,
        },
      ],
    });
    const config = createValidProjectConfig({ frontend: "react" });

    const result = await generateProject(config, {
      cwd: temporaryDirectory,
      templateRoot,
    });

    expect(
      await readFile(path.join(result.projectPath, "literal.txt"), "utf8"),
    ).toBe("Hello {{projectName}}");
  });

  it("supports dry-run without creating the destination", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, baseManifest);
    const config = createValidProjectConfig({ frontend: "react" });

    const result = await generateProject(config, {
      cwd: temporaryDirectory,
      templateRoot,
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.files).toHaveLength(1);
    await expect(
      readFile(path.join(result.projectPath, "README.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects invalid templates before writing files", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, {
      ...baseManifest,
      files: [{ source: "README.tpl", destination: "../outside.txt" }],
    });
    const config = createValidProjectConfig({ frontend: "react" });

    await expect(
      generateProject(config, { cwd: temporaryDirectory, templateRoot }),
    ).rejects.toThrow(InvalidTemplateError);
  });

  it("rejects an existing non-empty destination without modifying it", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, baseManifest);
    const existingProject = path.join(temporaryDirectory, "my-app");
    await mkdir(existingProject);
    await writeFile(path.join(existingProject, "keep.txt"), "keep");
    const config = createValidProjectConfig({ frontend: "react" });

    await expect(
      generateProject(config, { cwd: temporaryDirectory, templateRoot }),
    ).rejects.toThrow(DestinationConflictError);
    expect(await readFile(path.join(existingProject, "keep.txt"), "utf8")).toBe(
      "keep",
    );
  });

  it("can generate into an existing empty destination directory", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, baseManifest);
    const existingProject = path.join(temporaryDirectory, "my-app");
    await mkdir(existingProject);
    const config = createValidProjectConfig({ frontend: "react" });

    const result = await generateProject(config, {
      cwd: temporaryDirectory,
      templateRoot,
    });

    expect(
      await readFile(path.join(result.projectPath, "README.md"), "utf8"),
    ).toBe("Hello my-app");
  });

  it("rejects project names that could escape the destination root", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, baseManifest);
    const config = {
      ...createValidProjectConfig({ frontend: "react" }),
      projectName: "../outside",
    };

    await expect(
      generateProject(config, { cwd: temporaryDirectory, templateRoot }),
    ).rejects.toThrow(InvalidTemplateError);
  });
});
