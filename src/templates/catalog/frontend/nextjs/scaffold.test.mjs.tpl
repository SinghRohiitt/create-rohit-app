import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("package metadata declares the generated Next.js application", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(packageJson.private, true);
  assert.ok(packageJson.dependencies.next);
  assert.ok(packageJson.dependencies.react);
  assert.ok(packageJson.scripts.build);
  if (packageJson.devDependencies.typescript) {
    assert.ok(packageJson.scripts.typecheck);
  }
});

test("Next.js App Router entry points and environment example are generated", async () => {
  await access(".env.example");
  await access("app/layout.tsx").catch(() => access("app/layout.js"));
  await access("app/page.tsx").catch(() => access("app/page.js"));
});
