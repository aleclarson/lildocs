import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, runCli } from "./helpers/fixture.mjs";

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
