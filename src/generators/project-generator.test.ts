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

  it("rejects unsafe project-type destination prefixes", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, {
      ...baseManifest,
      destinationPrefixByProjectType: { fullstack: "../outside" },
    });

    await expect(discoverTemplates(templateRoot)).rejects.toThrow(
      InvalidTemplateError,
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
  it.each([
    { database: "none", authentication: "none" },
    { database: "postgres", authentication: "none" },
    { database: "postgres", authentication: "jwt" },
    { database: "mongodb", authentication: "none" },
    { database: "mongodb", authentication: "jwt" },
  ] as const)(
    "generates Express backend configuration for $database with $authentication auth",
    async ({ database, authentication }) => {
      const temporaryDirectory = await createTemporaryDirectory();
      const templateRoot = path.resolve(
        process.cwd(),
        "src",
        "templates",
        "catalog",
      );
      const config = createValidProjectConfig({
        backend: "express",
        database,
        authentication,
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
      const environment = await readFile(
        path.join(result.projectPath, ".env.example"),
        "utf8",
      );

      expect(generatedFiles).toContain("src/app.ts");
      expect(generatedFiles).toContain("src/server.ts");
      expect(generatedFiles).toContain("src/config/database.ts");
      expect(generatedFiles).toContain("src/routes/health.ts");
      expect(generatedFiles).toContain("src/middleware/error-handler.ts");
      expect(generatedFiles).toContain("tests/app.test.ts");
      expect(generatedFiles).toContain("README.backend.md");
      expect(generatedFiles).not.toContain(".env.auth.example");
      expect(generatedFiles).not.toContain(".env.database.example");
      expect(packageJson.dependencies).toHaveProperty("express");
      expect(environment).toContain("PORT=3000");

      if (database === "postgres") {
        expect(packageJson.dependencies).toHaveProperty("@prisma/client");
        expect(packageJson.dependencies).not.toHaveProperty("mongoose");
        expect(packageJson.devDependencies).toHaveProperty("prisma");
        expect(packageJson.scripts).toHaveProperty("db:migrate:dev");
        expect(generatedFiles).toContain("prisma/schema.prisma");
        expect(environment).toContain("DATABASE_URL=");
      } else if (database === "mongodb") {
        expect(packageJson.dependencies).toHaveProperty("mongoose");
        expect(packageJson.dependencies).not.toHaveProperty("@prisma/client");
        expect(generatedFiles).not.toContain("prisma/schema.prisma");
        expect(environment).toContain("DATABASE_URL=mongodb://");
      } else {
        expect(packageJson.dependencies).not.toHaveProperty("mongoose");
        expect(packageJson.dependencies).not.toHaveProperty("@prisma/client");
        expect(environment).not.toContain("DATABASE_URL");
      }

      if (authentication === "jwt") {
        expect(packageJson.dependencies).toHaveProperty("bcryptjs");
        expect(packageJson.dependencies).toHaveProperty("jsonwebtoken");
        expect(generatedFiles).toContain("src/modules/auth/auth-service.ts");
        expect(generatedFiles).toContain("src/modules/auth/auth-middleware.ts");
        expect(generatedFiles).toContain("src/modules/auth/auth-router.ts");
        expect(generatedFiles).toContain("tests/auth.test.ts");
        expect(environment).toContain("JWT_SECRET=");
        expect(environment).not.toContain("replace-with");
      } else {
        expect(packageJson.dependencies).not.toHaveProperty("bcryptjs");
        expect(packageJson.dependencies).not.toHaveProperty("jsonwebtoken");
        expect(generatedFiles).not.toContain("tests/auth.test.ts");
        expect(environment).not.toContain("JWT_SECRET");
      }
    },
  );

  it.each([
    { database: "none", authentication: "none" },
    { database: "postgres", authentication: "none" },
    { database: "postgres", authentication: "jwt" },
    { database: "mongodb", authentication: "none" },
    { database: "mongodb", authentication: "jwt" },
  ] as const)(
    "generates NestJS $database with $authentication authentication",
    async ({ database, authentication }) => {
      const temporaryDirectory = await createTemporaryDirectory();
      const templateRoot = path.resolve(
        process.cwd(),
        "src",
        "templates",
        "catalog",
      );
      const config = createValidProjectConfig({
        backend: "nestjs",
        database,
        authentication,
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
      const environment = await readFile(
        path.join(result.projectPath, ".env.example"),
        "utf8",
      );

      expect(generatedFiles).toContain("src/main.ts");
      expect(generatedFiles).toContain("src/app.module.ts");
      expect(generatedFiles).toContain("test/app.controller.spec.ts");
      expect(generatedFiles).toContain("README.backend.md");
      expect(packageJson.dependencies).toHaveProperty("@nestjs/core");
      expect(packageJson.dependencies).not.toHaveProperty("express");
      expect(environment).toContain("PORT=3000");
      expect(environment).not.toContain("{{");

      if (database === "postgres") {
        expect(packageJson.dependencies).toHaveProperty("@prisma/client");
        expect(packageJson.devDependencies).toHaveProperty("prisma");
        expect(generatedFiles).toContain("prisma/schema.prisma");
        expect(generatedFiles).toContain("src/database/prisma.module.ts");
        expect(environment).toContain("DATABASE_URL=postgresql://");
      } else if (database === "mongodb") {
        expect(packageJson.dependencies).toHaveProperty("@nestjs/mongoose");
        expect(packageJson.dependencies).toHaveProperty("mongoose");
        expect(generatedFiles).not.toContain("prisma/schema.prisma");
        expect(environment).toContain("DATABASE_URL=mongodb://");
      } else {
        expect(packageJson.dependencies).not.toHaveProperty("mongoose");
        expect(packageJson.dependencies).not.toHaveProperty("@prisma/client");
        expect(environment).not.toContain("DATABASE_URL");
      }

      if (authentication === "jwt") {
        expect(packageJson.dependencies).toHaveProperty("@nestjs/jwt");
        expect(packageJson.dependencies).toHaveProperty("bcryptjs");
        expect(packageJson.dependencies).toHaveProperty("passport-jwt");
        expect(generatedFiles).toContain("src/auth/jwt.strategy.ts");
        expect(generatedFiles).toContain("src/auth/jwt-auth.guard.ts");
        expect(generatedFiles).toContain("src/auth/auth.module.ts");
        expect(generatedFiles).toContain("src/users/user.module.ts");
        expect(generatedFiles).toContain("test/auth.service.spec.ts");
        expect(environment).toContain("JWT_SECRET=");
      } else {
        expect(packageJson.dependencies).not.toHaveProperty("@nestjs/jwt");
        expect(generatedFiles).not.toContain("src/auth/auth.module.ts");
        expect(generatedFiles).not.toContain("src/users/user.module.ts");
        expect(environment).not.toContain("JWT_SECRET");
      }
    },
  );

  it.each(["typescript", "javascript"] as const)(
    "generates an Express %s backend",
    async (language) => {
      const temporaryDirectory = await createTemporaryDirectory();
      const templateRoot = path.resolve(
        process.cwd(),
        "src",
        "templates",
        "catalog",
      );
      const config = createValidProjectConfig({
        backend: "express",
        language,
        database: "postgres",
        authentication: "jwt",
      });
      const result = await generateProject(config, {
        cwd: temporaryDirectory,
        templateRoot,
      });
      const packageJson = JSON.parse(
        await readFile(path.join(result.projectPath, "package.json"), "utf8"),
      ) as {
        dependencies: Record<string, string>;
        scripts: Record<string, string>;
      };
      const generatedFiles = new Set(
        result.files.map((filePath) =>
          path.relative(result.projectPath, filePath).replaceAll("\\", "/"),
        ),
      );

      expect(generatedFiles).toContain(
        language === "typescript" ? "src/app.ts" : "src/app.js",
      );
      expect(generatedFiles).toContain(
        language === "typescript" ? "tsconfig.json" : "jsconfig.json",
      );
      expect(packageJson.scripts).toHaveProperty("test", "vitest run");
      expect(packageJson.scripts).toHaveProperty("build");
      if (language === "typescript") {
        expect(packageJson.scripts).toHaveProperty("typecheck");
        expect(generatedFiles).toContain("tests/auth.test.ts");
      } else {
        expect(packageJson.scripts).not.toHaveProperty("typecheck");
        expect(generatedFiles).toContain("tests/auth.test.js");
      }
    },
  );

  it("generates a JavaScript MongoDB JWT backend without duplicate destinations", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = path.resolve(
      process.cwd(),
      "src",
      "templates",
      "catalog",
    );
    const config = createValidProjectConfig({
      backend: "express",
      language: "javascript",
      database: "mongodb",
      authentication: "jwt",
    });
    const result = await generateProject(config, {
      cwd: temporaryDirectory,
      templateRoot,
    });

    expect(
      result.files.filter(
        (filePath) => path.basename(filePath) === "user-model.js",
      ),
    ).toHaveLength(1);
    expect(result.files).toContain(
      path.join(result.projectPath, "src", "config", "database.js"),
    );
  });

  it("deep-merges JSON package overlays while preserving nested dependencies", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = await createCatalog(temporaryDirectory, {
      id: "shared-base",
      description: "Composable JSON package files",
      files: [
        {
          source: "package.json.tpl",
          destination: "package.json",
          template: true,
          merge: "json",
        },
        {
          source: "package.overlay.json.tpl",
          destination: "package.json",
          template: false,
          merge: "json",
        },
      ],
    });
    const templateDirectory = path.join(templateRoot, "shared", "base");
    await writeFile(
      path.join(templateDirectory, "package.json.tpl"),
      '{"name":"{{projectName}}","dependencies":{"express":"1"},"scripts":{"dev":"start"}}',
    );
    await writeFile(
      path.join(templateDirectory, "package.overlay.json.tpl"),
      '{"dependencies":{"mongoose":"2"},"scripts":{"test":"test"}}',
    );
    const config = createValidProjectConfig({ frontend: "react" });

    const result = await generateProject(config, {
      cwd: temporaryDirectory,
      templateRoot,
    });

    expect(
      result.files.filter(
        (filePath) => path.basename(filePath) === "package.json",
      ),
    ).toHaveLength(1);
    expect(
      JSON.parse(
        await readFile(path.join(result.projectPath, "package.json"), "utf8"),
      ),
    ).toEqual({
      name: "my-app",
      dependencies: { express: "1", mongoose: "2" },
      scripts: { dev: "start", test: "test" },
    });
  });

  it("composes React and Express as independent full-stack workspaces", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const templateRoot = path.resolve(
      process.cwd(),
      "src",
      "templates",
      "catalog",
    );
    const config = createValidProjectConfig({
      frontend: "react",
      backend: "express",
      database: "none",
      authentication: "none",
    });
    const result = await generateProject(config, {
      cwd: temporaryDirectory,
      templateRoot,
    });
    const relativeFiles = result.files.map((filePath) =>
      path.relative(result.projectPath, filePath).replaceAll("\\", "/"),
    );
    const rootPackage = JSON.parse(
      await readFile(path.join(result.projectPath, "package.json"), "utf8"),
    ) as {
      name: string;
      workspaces: string[];
      scripts: Record<string, string>;
    };
    const frontendPackage = JSON.parse(
      await readFile(
        path.join(result.projectPath, "frontend", "package.json"),
        "utf8",
      ),
    ) as { name: string };
    const backendPackage = JSON.parse(
      await readFile(
        path.join(result.projectPath, "backend", "package.json"),
        "utf8",
      ),
    ) as { name: string };

    expect(rootPackage.workspaces).toEqual(["frontend", "backend"]);
    expect(rootPackage.scripts.dev).toContain("concurrently");
    expect(rootPackage.scripts).toHaveProperty("dev:frontend");
    expect(rootPackage.scripts).toHaveProperty("dev:backend");
    expect(rootPackage.scripts).toHaveProperty("db:migrate:dev");
    expect(
      new Set([rootPackage.name, frontendPackage.name, backendPackage.name])
        .size,
    ).toBe(3);
    expect(relativeFiles).toContain("frontend/src/main.tsx");
    expect(relativeFiles).toContain("backend/src/server.ts");
    expect(relativeFiles).toContain("frontend/.env.example");
    expect(relativeFiles).toContain("backend/.env.example");
    expect(relativeFiles).toContain("README.md");
    expect(relativeFiles).not.toContain("README.fullstack.md");
    const rootReadme = await readFile(
      path.join(result.projectPath, "README.md"),
      "utf8",
    );
    expect(rootReadme).toContain("frontend/");
    expect(rootReadme).toContain("backend/");
    expect(rootReadme).toContain("run dev");
  });

  it.each([
    {
      frontend: "react",
      backend: "express",
      database: "postgres",
      expectedFrontendApi: "VITE_API_URL",
      expectedOrm: "@prisma/client",
    },
    {
      frontend: "next",
      backend: "nestjs",
      database: "mongodb",
      expectedFrontendApi: "NEXT_PUBLIC_API_URL",
      expectedOrm: "mongoose",
    },
  ] as const)(
    "composes full stack $frontend + $backend with $database and JWT",
    async ({
      frontend,
      backend,
      database,
      expectedFrontendApi,
      expectedOrm,
    }) => {
      const temporaryDirectory = await createTemporaryDirectory();
      const templateRoot = path.resolve(
        process.cwd(),
        "src",
        "templates",
        "catalog",
      );
      const config = createValidProjectConfig({
        frontend,
        backend,
        language: "typescript",
        database,
        authentication: "jwt",
      });
      const result = await generateProject(config, {
        cwd: temporaryDirectory,
        templateRoot,
      });
      const frontendPackage = JSON.parse(
        await readFile(
          path.join(result.projectPath, "frontend", "package.json"),
          "utf8",
        ),
      ) as { dependencies: Record<string, string> };
      const backendPackage = JSON.parse(
        await readFile(
          path.join(result.projectPath, "backend", "package.json"),
          "utf8",
        ),
      ) as { dependencies: Record<string, string> };
      const frontendEnvironment = await readFile(
        path.join(result.projectPath, "frontend", ".env.example"),
        "utf8",
      );
      const backendEnvironment = await readFile(
        path.join(result.projectPath, "backend", ".env.example"),
        "utf8",
      );

      expect(frontendPackage.dependencies).toHaveProperty("react");
      expect(backendPackage.dependencies).toHaveProperty(expectedOrm);
      expect(frontendEnvironment).toContain(expectedFrontendApi);
      expect(backendEnvironment).toContain("JWT_SECRET=");
      expect(backendEnvironment).toContain("PORT=3000");
      expect(
        await readFile(path.join(result.projectPath, ".gitignore"), "utf8"),
      ).toContain(".env");
      if (frontend === "react") {
        expect(
          await readFile(
            path.join(result.projectPath, "frontend", "vite.config.ts"),
            "utf8",
          ),
        ).toContain("http://localhost:3000");
      } else {
        expect(frontendEnvironment).toContain(
          "NEXT_PUBLIC_API_URL=http://localhost:3000/api",
        );
      }
    },
  );

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

  it.each(["typescript", "javascript"] as const)(
    "generates a runnable Next.js %s project layout",
    async (language) => {
      const temporaryDirectory = await createTemporaryDirectory();
      const templateRoot = path.resolve(
        process.cwd(),
        "src",
        "templates",
        "catalog",
      );
      const config = createValidProjectConfig({
        frontend: "next",
        language,
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
        language === "typescript" ? "app/page.tsx" : "app/page.js",
      );
      expect(generatedFiles).toContain(
        language === "typescript" ? "app/layout.tsx" : "app/layout.js",
      );
      expect(generatedFiles).toContain(
        language === "typescript" ? "services/api.ts" : "services/api.js",
      );
      expect(generatedFiles).toContain(
        "components/api-status." + (language === "typescript" ? "tsx" : "js"),
      );
      expect(generatedFiles).toContain("public/.gitkeep");
      expect(generatedFiles).toContain("hooks/.gitkeep");
      expect(generatedFiles).toContain("lib/.gitkeep");
      expect(generatedFiles).toContain("types/.gitkeep");
      expect(generatedFiles).toContain(".env.example");
      expect(generatedFiles).toContain("eslint.config.mjs");
      expect(generatedFiles).toContain("next.config.mjs");
      expect(generatedFiles).toContain(".gitignore");
      expect(packageJson.dependencies).toHaveProperty("next");
      expect(packageJson.dependencies).toHaveProperty("react");
      expect(packageJson.dependencies).toHaveProperty("react-dom");
      expect(packageJson.dependencies).not.toHaveProperty("vite");
      expect(packageJson.scripts).toMatchObject({
        dev: "next dev --port 3001",
        build: "next build",
        start: "next start --port 3001",
        lint: "eslint .",
      });
      if (language === "typescript") {
        expect(generatedFiles).toContain("tsconfig.json");
        expect(packageJson.devDependencies).toHaveProperty("typescript");
        expect(packageJson.scripts).toHaveProperty("typecheck");
      } else {
        expect(generatedFiles).toContain("jsconfig.json");
        expect(packageJson.devDependencies).not.toHaveProperty("typescript");
        expect(packageJson.scripts).not.toHaveProperty("typecheck");
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
