import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, runCli, writeDocFile } from "./helpers/fixture.mjs";

test("writes static html pages and copied assets", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  await access(path.join(outDir, "index.html"));
  await access(path.join(outDir, "guide.html"));
  await access(path.join(outDir, "quickstart.html"));
  await access(path.join(outDir, "assets", "images", "sample.svg"));
});

test("rewrites markdown links to generated html routes", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /href=".\/guide.html"/);
});

test("emits mermaid enhancement when diagrams are present", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /class="mermaid"/);
  assert.match(html, /mermaid\.initialize/);
});

test("renders gfm tables task lists and strikethrough", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "guide.html"), "utf8");
  assert.match(html, /<table>/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /<del>Removed copy<\/del>/);
});

test("omits frontmatter from rendered content", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "guide.html"), "utf8");
  assert.doesNotMatch(html, /title: Frontmatter Title/);
});

test("generates unique stable heading anchors", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "duplicates.md", "# Duplicate\n\n## Repeat\n\n## Repeat\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "duplicates.html"), "utf8");
  assert.match(html, /id="repeat"/);
  assert.match(html, /id="repeat-2"/);
});

test("copies nested assets with nested relative links", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/page.md", "# Nested\n\n![Sample](../images/sample.svg)\n\n[Home](../index.md)\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "nested", "page.html"), "utf8");
  assert.match(html, /src="..\/assets\/images\/sample.svg"/);
  assert.match(html, /href="..\/index.html"/);
});

test("reports missing referenced assets", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "missing-asset.md", "# Missing\n\n![Missing](missing.png)\n");

  await assert.rejects(() => runCli([docs, "--out", outDir]), /Referenced asset does not exist/);
});

test("writes to dist by default", async () => {
  const { docs, workspace } = await fixtureWorkspace();

  await runCli([docs], { cwd: workspace });

  await access(path.join(workspace, "dist", "index.html"));
});
