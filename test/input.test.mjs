import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, runCli } from "./helpers/fixture.mjs";

test("uses directory input home page", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /Fixture Home/);
});

test("uses markdown file input as home page", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site-file");

  await runCli([path.join(docs, "guide.md"), "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /Guide Page/);
});

test("reports missing input paths", async () => {
  await assert.rejects(() => runCli(["./missing-docs"]), /Input path does not exist/);
});

test("reports unsupported file input types", async () => {
  const { workspace } = await fixtureWorkspace();
  const textFile = path.join(workspace, "notes.txt");
  await writeFile(textFile, "not markdown");

  await assert.rejects(() => runCli([textFile]), /Input file must be Markdown/);
});
