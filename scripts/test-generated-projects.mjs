import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cliPath = path.join(projectRoot, "dist", "index.js");
const temporaryRoot = await mkdtemp(
  path.join(os.tmpdir(), "create-rohit-app-generated-integration-"),
);

const configurations = [
  {
    name: "react-typescript",
    args: [
      "--frontend",
      "react",
      "--typescript",
      "--database",
      "none",
      "--auth",
      "none",
    ],
    expectedFiles: [
      "src/App.tsx",
      "src/main.tsx",
      "vite.config.ts",
      ".env.example",
      "tests/scaffold.test.mjs",
    ],
    frontendDependency: "react",
    backendDependency: undefined,
  },
  {
    name: "nextjs-typescript",
    args: [
      "--frontend",
      "next",
      "--typescript",
      "--database",
      "none",
      "--auth",
      "none",
    ],
    expectedFiles: [
      "app/page.tsx",
      "app/layout.tsx",
      "next.config.mjs",
      ".env.example",
      "tests/scaffold.test.mjs",
    ],
    frontendDependency: "next",
    backendDependency: undefined,
  },
  {
    name: "express-typescript",
    args: [
      "--backend",
      "express",
      "--typescript",
      "--database",
      "none",
      "--auth",
      "none",
    ],
    expectedFiles: [
      "src/app.ts",
      "src/server.ts",
      "tests/app.test.ts",
      ".env.example",
    ],
    frontendDependency: undefined,
    backendDependency: "express",
  },
  {
    name: "express-postgres-jwt-typescript",
    args: [
      "--backend",
      "express",
      "--typescript",
      "--database",
      "postgres",
      "--auth",
      "jwt",
    ],
    expectedFiles: [
      "src/server.ts",
      "src/modules/auth/auth-service.ts",
      "prisma/schema.prisma",
      ".env.example",
    ],
    frontendDependency: undefined,
    backendDependency: "express",
    additionalBackendDependencies: ["@prisma/client", "jsonwebtoken"],
  },
  {
    name: "nestjs-mongodb-jwt-typescript",
    args: [
      "--backend",
      "nestjs",
      "--typescript",
      "--database",
      "mongodb",
      "--auth",
      "jwt",
    ],
    expectedFiles: [
      "src/main.ts",
      "src/auth/auth.controller.ts",
      "src/auth/auth.service.ts",
      ".env.example",
    ],
    frontendDependency: undefined,
    backendDependency: "@nestjs/core",
    additionalBackendDependencies: ["mongoose", "@nestjs/jwt"],
  },
  {
    name: "react-express-postgres-jwt-typescript",
    args: [
      "--frontend",
      "react",
      "--backend",
      "express",
      "--typescript",
      "--database",
      "postgres",
      "--auth",
      "jwt",
    ],
    expectedFiles: [
      "README.md",
      "frontend/src/App.tsx",
      "frontend/.env.example",
      "backend/src/server.ts",
      "backend/src/modules/auth/auth-service.ts",
      "backend/prisma/schema.prisma",
      "backend/.env.example",
    ],
    frontendDependency: "react",
    backendDependency: "express",
    additionalBackendDependencies: ["@prisma/client", "jsonwebtoken"],
    fullStack: true,
  },
];

function run(command, args, cwd) {
  process.stdout.write(`\n$ ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, [...args], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32" && command === "npm",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${String(result.status)}.`,
    );
  }
}

async function readPackage(projectPath, relativePath) {
  const packagePath = path.join(projectPath, relativePath);
  return JSON.parse(await readFile(packagePath, "utf8"));
}

async function assertFiles(projectPath, expectedFiles) {
  for (const relativePath of expectedFiles) {
    const filePath = path.resolve(projectPath, relativePath);
    const relative = path.relative(projectPath, filePath);
    assert.ok(
      relative !== ".." &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative),
      `Expected file path to remain inside generated project: ${relativePath}`,
    );
    assert.ok(
      (await stat(filePath)).isFile(),
      `Expected generated file to exist: ${relativePath}`,
    );
  }
}

async function verifyDependencies(projectPath, configuration) {
  const rootPackage = await readPackage(projectPath, "package.json");
  assert.equal(rootPackage.private, true, "Generated app must be private.");

  if (configuration.fullStack) {
    assert.deepEqual(rootPackage.workspaces, ["frontend", "backend"]);
    assert.match(rootPackage.scripts?.dev ?? "", /^concurrently -k\b/);
  }

  if (configuration.frontendDependency) {
    const frontendPackage = await readPackage(
      projectPath,
      configuration.fullStack ? "frontend/package.json" : "package.json",
    );
    assert.ok(
      frontendPackage.dependencies?.[configuration.frontendDependency],
      `Missing frontend dependency ${configuration.frontendDependency}.`,
    );
    assert.ok(frontendPackage.scripts?.test);
    assert.ok(frontendPackage.devDependencies?.typescript);
    if (frontendPackage.devDependencies.typescript) {
      assert.ok(frontendPackage.scripts?.typecheck);
    }
  }

  if (configuration.backendDependency) {
    const backendPackage = await readPackage(
      projectPath,
      configuration.fullStack ? "backend/package.json" : "package.json",
    );
    assert.ok(
      backendPackage.dependencies?.[configuration.backendDependency],
      `Missing backend dependency ${configuration.backendDependency}.`,
    );
    for (const dependency of configuration.additionalBackendDependencies ??
      []) {
      assert.ok(
        backendPackage.dependencies?.[dependency],
        `Missing backend dependency ${dependency}.`,
      );
    }
    assert.ok(backendPackage.scripts?.build);
    assert.ok(backendPackage.scripts?.test);
    assert.ok(backendPackage.scripts?.typecheck);
  }

  assert.ok(rootPackage.scripts?.build);
  assert.ok(rootPackage.scripts?.test);
}

async function verifyConfiguration(configuration) {
  const projectName = `generated-${configuration.name}`;
  const projectPath = path.join(temporaryRoot, projectName);
  process.stdout.write(`\n=== Generated project: ${configuration.name} ===\n`);

  run(
    process.execPath,
    [
      cliPath,
      projectName,
      ...configuration.args,
      "--skip-install",
      "--skip-git",
    ],
    temporaryRoot,
  );

  await assertFiles(projectPath, configuration.expectedFiles);
  await verifyDependencies(projectPath, configuration);

  run("npm", ["install", "--no-audit", "--no-fund"], projectPath);

  const packageJson = await readPackage(projectPath, "package.json");
  if (packageJson.scripts?.typecheck) {
    run("npm", ["run", "typecheck"], projectPath);
  }
  run("npm", ["test"], projectPath);
  run("npm", ["run", "build"], projectPath);
  process.stdout.write(`PASS ${configuration.name}\n`);
}

try {
  for (const configuration of configurations) {
    await verifyConfiguration(configuration);
  }
  process.stdout.write(
    `\nGenerated-project integration matrix passed (${configurations.length} configurations).\n`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
  process.stdout.write(`\nCleaned temporary projects: ${temporaryRoot}\n`);
}
