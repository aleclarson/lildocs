import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, runCli } from "./helpers/fixture.mjs";

test("generates search index from titles headings and body text", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const index = JSON.parse(await readFile(path.join(outDir, "search-index.json"), "utf8"));
  assert.equal(index.length, 3);
  assert.ok(index.some((entry) => entry.title === "Frontmatter Title"));
  assert.ok(index.some((entry) => entry.headings.includes("Guide Heading")));
  assert.ok(index.some((entry) => entry.text.includes("searchable body copy")));
});

test("emits search UI and static search script", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  const searchScript = await readFile(path.join(outDir, "assets", "search.js"), "utf8");
  assert.match(html, /id="lildocs-search-input"/);
  assert.match(html, /id="lildocs-search-index"/);
  assert.match(searchScript, /scoreEntry/);
  assert.match(searchScript, /embeddedIndex/);
});

test("uses theme colors for search input placeholder and focus styles", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /\.searchBox input::placeholder \{[^}]*color: var\(--ld-color-muted-text\)/);
  assert.match(css, /\.searchBox input:focus \{[^}]*border-color: var\(--ld-color-link\)/);
  assert.match(css, /outline: 2px solid color-mix\(in srgb, var\(--ld-color-link\) 45%, transparent\)/);
});
