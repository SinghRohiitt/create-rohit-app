import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cliPath = path.join(projectRoot, "dist", "index.js");
const backendOnly = process.argv.includes("--backend-only");
const temporaryRoot = await mkdtemp(
  path.join(os.tmpdir(), "create-rohit-app-template-smoke-"),
);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32" && command === "npm",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with ${result.status}.`,
    );
  }
}

async function verifyRunningBackend(projectPath, language) {
  const portProbe = net.createServer();
  await new Promise((resolve, reject) => {
    portProbe.once("error", reject);
    portProbe.listen(0, "127.0.0.1", resolve);
  });
  const address = portProbe.address();
  if (address === null || typeof address === "string") {
    throw new Error(
      "Could not reserve a local port for the Express smoke test.",
    );
  }
  await new Promise((resolve, reject) => {
    portProbe.close((error) => (error ? reject(error) : resolve()));
  });

  const entryPoint =
    language === "typescript" ? "dist/src/server.js" : "src/server.js";
  const child = spawn(process.execPath, [entryPoint], {
    cwd: projectPath,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      PORT: String(address.port),
      CORS_ORIGIN: "http://localhost:5173",
    },
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  try {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(
          `Express server exited before becoming ready: ${stderr}`,
        );
      }
      try {
        const response = await globalThis.fetch(
          `http://127.0.0.1:${address.port}/api/health`,
        );
        if (response.ok && (await response.json()).status === "ok") {
          return;
        }
      } catch {
        await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
      }
    }
    throw new Error(`Express server did not become healthy in time: ${stderr}`);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([
        once(child, "exit"),
        new Promise((resolve) => globalThis.setTimeout(resolve, 3000)),
      ]);
    }
  }
}

try {
  if (!backendOnly) {
    for (const frontend of ["react", "next"]) {
      for (const language of ["typescript", "javascript"]) {
        const projectName = `${frontend}-${language}`;
        const projectPath = path.join(temporaryRoot, projectName);
        const languageFlag =
          language === "typescript" ? "--typescript" : "--javascript";
        run(
          process.execPath,
          [
            cliPath,
            projectName,
            "--frontend",
            frontend,
            languageFlag,
            "--database",
            "none",
            "--auth",
            "jwt",
            "--install-dependencies",
            "--no-git",
          ],
          temporaryRoot,
        );

        const packageJson = JSON.parse(
          await readFile(path.join(projectPath, "package.json"), "utf8"),
        );
        if (packageJson.dependencies?.react === undefined) {
          throw new Error(
            `${frontend} ${language} project is missing React dependency.`,
          );
        }

        run("npm", ["install", "--no-audit", "--no-fund"], projectPath);
        if (packageJson.scripts.typecheck) {
          run("npm", ["run", "typecheck"], projectPath);
        }
        run("npm", ["run", "build"], projectPath);
        run("npm", ["run", "lint"], projectPath);
      }
    }
  }

  for (const language of ["typescript", "javascript"]) {
    const languageFlag =
      language === "typescript" ? "--typescript" : "--javascript";
    const backendConfigurations = [
      { database: "none", authentication: "none" },
      { database: "postgres", authentication: "none" },
      { database: "postgres", authentication: "jwt" },
      { database: "mongodb", authentication: "none" },
      { database: "mongodb", authentication: "jwt" },
    ];

    for (const { database, authentication } of backendConfigurations) {
      const projectName = `express-${database}-${authentication}-${language}`;
      const projectPath = path.join(temporaryRoot, projectName);
      run(
        process.execPath,
        [
          cliPath,
          projectName,
          "--backend",
          "express",
          languageFlag,
          "--database",
          database,
          "--auth",
          authentication,
          "--install-dependencies",
          "--no-git",
        ],
        temporaryRoot,
      );

      const packageJson = JSON.parse(
        await readFile(path.join(projectPath, "package.json"), "utf8"),
      );
      if (packageJson.dependencies?.express === undefined) {
        throw new Error(
          `Express ${language} project is missing the Express dependency.`,
        );
      }
      if (database === "postgres") {
        if (packageJson.dependencies?.["@prisma/client"] === undefined) {
          throw new Error(`${projectName} is missing Prisma Client.`);
        }
        await readFile(
          path.join(projectPath, "prisma", "schema.prisma"),
          "utf8",
        );
      } else if (database === "mongodb") {
        if (packageJson.dependencies?.mongoose === undefined) {
          throw new Error(`${projectName} is missing Mongoose.`);
        }
      }
      if (authentication === "jwt") {
        if (packageJson.dependencies?.jsonwebtoken === undefined) {
          throw new Error(
            `${projectName} is missing JWT authentication dependencies.`,
          );
        }
        const environment = await readFile(
          path.join(projectPath, ".env.example"),
          "utf8",
        );
        if (!environment.includes("JWT_SECRET=")) {
          throw new Error(
            `${projectName} is missing JWT_SECRET configuration.`,
          );
        }
      }

      run("npm", ["install", "--no-audit", "--no-fund"], projectPath);
      run("npm", ["test"], projectPath);
      run("npm", ["run", "lint"], projectPath);
      if (packageJson.scripts.typecheck) {
        run("npm", ["run", "typecheck"], projectPath);
      }
      run("npm", ["run", "build"], projectPath);
      if (database === "none" && authentication === "none") {
        await verifyRunningBackend(projectPath, language);
      }
    }

    const projectName = `fullstack-express-${language}`;
    const projectPath = path.join(temporaryRoot, projectName);
    run(
      process.execPath,
      [
        cliPath,
        projectName,
        "--frontend",
        "react",
        "--backend",
        "express",
        languageFlag,
        "--database",
        "none",
        "--auth",
        "none",
        "--install-dependencies",
        "--no-git",
      ],
      temporaryRoot,
    );
    const workspacePackage = JSON.parse(
      await readFile(path.join(projectPath, "package.json"), "utf8"),
    );
    if (
      JSON.stringify(workspacePackage.workspaces) !==
      JSON.stringify(["frontend", "backend"])
    ) {
      throw new Error(
        `${projectName} is missing its frontend/backend workspaces.`,
      );
    }

    run("npm", ["install", "--no-audit", "--no-fund"], projectPath);
    run("npm", ["test"], projectPath);
    run("npm", ["run", "lint"], projectPath);
    if (workspacePackage.scripts.typecheck) {
      run("npm", ["run", "typecheck"], projectPath);
    }
    run("npm", ["run", "build"], projectPath);
    await verifyRunningBackend(path.join(projectPath, "backend"), language);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
