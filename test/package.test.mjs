import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "vitest";

const execFileAsync = promisify(execFile);
const bundledDependencies = [
  "cmd-ts",
  "culori",
  "entities",
  "exports-md",
  "gray-matter",
  "marked",
  "marked-shiki",
];
const externalDependencies = ["beautiful-mermaid", "octane", "shiki", "swup", "vite"];

test("builds Markdown and API reference from the packed package", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lildocs-package-"));
  const packDir = path.join(root, "pack");
  const workspace = path.join(root, "workspace");
  const docs = path.join(workspace, "docs");
  const outDir = path.join(workspace, "site");
  await mkdir(packDir, { recursive: true });
  await mkdir(path.join(docs), { recursive: true });
  await execFileAsync("pnpm", ["pack", "--pack-destination", packDir], {
    cwd: process.cwd(),
  });

  const tarball = (await readdir(packDir)).find((name) => name.endsWith(".tgz"));
  assert.ok(tarball, "pnpm pack should produce a tarball");
  await execFileAsync("tar", ["-xzf", path.join(packDir, tarball), "-C", packDir]);

  const packageDir = path.join(packDir, "package");
  const manifest = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
  for (const dependency of bundledDependencies) {
    assert.equal(manifest.dependencies?.[dependency], undefined);
  }

  await mkdir(path.join(packageDir, "node_modules"), { recursive: true });
  for (const dependency of externalDependencies) {
    await symlink(
      path.resolve("node_modules", dependency),
      path.join(packageDir, "node_modules", dependency),
      "junction",
    );
  }

  await writeFile(path.join(docs, "index.md"), "# Packed docs\n\nPacked package content.\n");
  await mkdir(path.join(workspace, "dist"), { recursive: true });
  await writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify({
      name: "packed-fixture",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          default: "./dist/index.js",
        },
      },
    }),
  );
  await writeFile(
    path.join(workspace, "dist", "index.d.ts"),
    "/** Returns a packed greeting. */\nexport declare function packedGreeting(): string;\n",
  );
  await mkdir(path.join(workspace, "node_modules"), { recursive: true });
  await symlink(
    path.resolve("node_modules", "typescript"),
    path.join(workspace, "node_modules", "typescript"),
    "junction",
  );

  await execFileAsync(
    process.execPath,
    [path.join(packageDir, "dist", "cli.mjs"), docs, "--out", outDir],
    { cwd: workspace },
  );

  assert.match(await readFile(path.join(outDir, "index.html"), "utf8"), /Packed docs/);
  assert.match(
    await readFile(path.join(outDir, "reference", "packed-fixture.html"), "utf8"),
    /packedGreeting/,
  );
});
