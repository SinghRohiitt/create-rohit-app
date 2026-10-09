import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
  path.join(os.tmpdir(), "create-rohit-app-react-smoke-"),
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

try {
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
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
