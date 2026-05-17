import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("dist/cli.mjs");

test("builds a directory input into static html", async () => {
  const workspace = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  const result = await runCli([path.join(workspace, "docs"), "--out", outDir]);

  assert.match(result.stdout, /Built 3 pages/);
  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /Fixture Home/);
  assert.match(html, /href=".\/guide.html"/);
  await access(path.join(outDir, "assets", "images", "sample.svg"));
});

test("builds a markdown file input as the home page", async () => {
  const workspace = await fixtureWorkspace();
  const outDir = path.join(workspace, "site-file");

  await runCli([path.join(workspace, "docs", "guide.md"), "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /Guide Page/);
});

test("supports explicit build options and minimal theme", async () => {
  const workspace = await fixtureWorkspace();
  const outDir = path.join(workspace, "custom");

  await runCli(["build", path.join(workspace, "docs"), "--out", outDir, "--theme", "minimal"]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-color-link: #0f766e/);
});

test("generates search index from titles headings and body text", async () => {
  const workspace = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([path.join(workspace, "docs"), "--out", outDir]);

  const index = JSON.parse(await readFile(path.join(outDir, "search-index.json"), "utf8"));
  assert.equal(index.length, 3);
  assert.ok(index.some((entry) => entry.title === "Frontmatter Title"));
  assert.ok(index.some((entry) => entry.headings.includes("Guide Heading")));
  assert.ok(index.some((entry) => entry.text.includes("searchable body copy")));
});

test("reports missing input and unknown theme errors", async () => {
  await assert.rejects(() => runCli(["./missing-docs"]), /Input path does not exist/);

  const workspace = await fixtureWorkspace();
  await assert.rejects(() => runCli([path.join(workspace, "docs"), "--theme", "unknown"]), /Unknown theme/);
});

test("dev command returns a clear v1 message", async () => {
  const workspace = await fixtureWorkspace();

  await assert.rejects(() => runCli(["dev", path.join(workspace, "docs")]), /dev command is not implemented yet/);
});

async function fixtureWorkspace() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "lildocs-"));
  const docs = path.join(workspace, "docs");
  await mkdir(path.join(docs, "images"), { recursive: true });
  await writeFile(
    path.join(docs, "index.md"),
    `# Fixture Home

Welcome with searchable body copy.

![Sample](images/sample.svg)

[Guide](guide.md)

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`
`,
  );
  await writeFile(
    path.join(docs, "guide.md"),
    `---
title: Frontmatter Title
---

# Guide Page

## Guide Heading

Nested content.
`,
  );
  await writeFile(path.join(docs, "quickstart.md"), "# Quickstart\n\nFast path.");
  await writeFile(path.join(docs, "images", "sample.svg"), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await writeFile(path.join(docs, ".hidden.md"), "# Hidden\n");
  return workspace;
}

async function runCli(args) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
  });
}
