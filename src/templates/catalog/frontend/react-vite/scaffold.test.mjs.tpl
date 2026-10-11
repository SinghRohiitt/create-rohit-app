import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("package metadata declares the generated React application", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(packageJson.private, true);
  assert.ok(packageJson.dependencies.react);
  assert.ok(packageJson.scripts.build);
  if (packageJson.devDependencies.typescript) {
    assert.ok(packageJson.scripts.typecheck);
  }
});

test("React entry points and API environment example are generated", async () => {
  await access("index.html");
  await access(".env.example");
  await access("src/App.tsx").catch(() => access("src/App.jsx"));
  await access("src/main.tsx").catch(() => access("src/main.jsx"));
});
