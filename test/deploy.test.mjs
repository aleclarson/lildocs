import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, runCli } from "./helpers/fixture.mjs";

test("deploy builds GitHub Pages-ready output", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  const result = await runCli(["deploy", docs, "--out", outDir, "--base", "repo"]);

  assert.match(result.stdout, /Built GitHub Pages site/);
  await access(path.join(outDir, "index.html"));
  await access(path.join(outDir, "assets", "lildocs.css"));
  await access(path.join(outDir, "assets", "search.js"));
  await access(path.join(outDir, "search-index.json"));
  await access(path.join(outDir, ".nojekyll"));

  const metadata = JSON.parse(await readFile(path.join(outDir, "lildocs-deploy.json"), "utf8"));
  assert.equal(metadata.target, "github-pages");
  assert.equal(metadata.basePath, "/repo/");
  assert.match(metadata.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("deploy preserves build options", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "custom");

  await runCli([
    "deploy",
    docs,
    "--out",
    outDir,
    "--theme",
    "minimal",
    "--font.heading",
    "Inter",
    "--font.body",
    "Source Sans 3",
    "--font.code",
    "Roboto Mono",
  ]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /Inter/);
  assert.match(html, /Source Sans 3/);
  assert.match(html, /Roboto Mono/);
});

test("init github-pages writes a GitHub Pages workflow", async () => {
  const { workspace } = await fixtureWorkspace();

  await runCli(["init", "github-pages", "./docs", "--out", "site"], { cwd: workspace });

  const workflow = await readFile(path.join(workspace, ".github", "workflows", "lildocs-pages.yml"), "utf8");
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /pnpm exec lildocs deploy \.\/docs --out site/);
});

test("init github-pages preserves base paths in the workflow", async () => {
  const { workspace } = await fixtureWorkspace();

  await runCli(["init", "github-pages", "./docs", "--out", "site", "--base", "repo"], { cwd: workspace });

  const workflow = await readFile(path.join(workspace, ".github", "workflows", "lildocs-pages.yml"), "utf8");
  assert.match(workflow, /pnpm exec lildocs deploy \.\/docs --out site --base \/repo\//);
});

test("init github-pages does not overwrite an existing workflow", async () => {
  const { workspace } = await fixtureWorkspace();
  const workflowPath = path.join(workspace, ".github", "workflows", "lildocs-pages.yml");
  await mkdir(path.dirname(workflowPath), { recursive: true });
  await writeFile(workflowPath, "existing");

  await assert.rejects(
    () => runCli(["init", "github-pages", "./docs"], { cwd: workspace }),
    /Refusing to overwrite existing workflow/,
  );

  assert.equal(await readFile(workflowPath, "utf8"), "existing");
});

test("init github-pages rejects absolute input outside the repository", async () => {
  const { workspace } = await fixtureWorkspace();
  const outsideDocs = path.join(path.dirname(workspace), "outside-docs");

  await assert.rejects(
    () => runCli(["init", "github-pages", outsideDocs, "--out", "site"], { cwd: workspace }),
    /inside the repository/,
  );
});

test("build output does not include deploy artifacts", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli(["build", docs, "--out", outDir]);

  await assert.rejects(() => access(path.join(outDir, ".nojekyll")));
  await assert.rejects(() => access(path.join(outDir, "lildocs-deploy.json")));
});
