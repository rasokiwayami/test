import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("webpack resolves NodeNext .js specifiers to TypeScript source", async () => {
  const [configSource, packageSource] = await Promise.all([
    readProjectFile("next.config.ts"),
    readProjectFile("package.json"),
  ]);
  const packageJson = JSON.parse(packageSource);

  assert.equal(packageJson.scripts.dev, "next dev --webpack");
  assert.equal(packageJson.scripts.build, "next build --webpack");
  assert.match(configSource, /webpack\s*\(config\)/);
  assert.match(configSource, /extensionAlias/);
  assert.match(
    configSource,
    /["']\.js["']\s*:\s*\[["']\.ts["']\s*,\s*["']\.tsx["']\s*,\s*["']\.js["']\]/,
  );
});

test("tsconfig already contains Next's mandatory runtime settings", async () => {
  const tsconfig = JSON.parse(await readProjectFile("tsconfig.json"));

  assert.equal(tsconfig.compilerOptions.jsx, "react-jsx");
  assert.ok(tsconfig.include.includes(".next/dev/types/**/*.ts"));
});
