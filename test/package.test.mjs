import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
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
const externalDependencies = ["beautiful-mermaid", "shiki"];

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
  for (const dependency of ["octane", "swup", "vite"]) {
    assert.equal(manifest.dependencies?.[dependency], undefined);
    assert.equal(manifest.peerDependencies?.[dependency], undefined);
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

  const dev = spawn(
    process.execPath,
    [
      path.join(packageDir, "dist", "cli.mjs"),
      "dev",
      docs,
      "--out",
      path.join(workspace, ".preview"),
      "--port",
      "0",
    ],
    { cwd: workspace, stdio: ["ignore", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  dev.stdout.setEncoding("utf8");
  dev.stderr.setEncoding("utf8");
  dev.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  dev.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  try {
    const url = await waitFor(() => stdout.match(/listening at (http:\/\/[^\s]+)/)?.[1]);
    assert.match(await fetch(url).then((response) => response.text()), /Packed docs/);
  } catch (error) {
    throw new Error(`${error.message}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  } finally {
    dev.kill();
    await new Promise((resolve) => dev.once("exit", resolve));
  }
});

async function waitFor(callback, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const result = callback();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for condition");
}
