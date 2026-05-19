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

test("renders mermaid diagrams to static svg", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /<figure class="mermaidDiagram" id="mermaid-index-1">/);
  assert.match(html, /<svg role="img"/);
  assert.doesNotMatch(html, /mermaid\.initialize/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net\/npm\/mermaid/);
});

test("reports invalid mermaid diagrams during build", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "broken.md", "# Broken\n\n```mermaid\nnot a diagram\n```\n");

  await assert.rejects(
    () => runCli([docs, "--out", outDir]),
    /Failed to render Mermaid diagram 1 in broken\.md/,
  );
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

test("renders github-style callouts", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "callouts.md",
    "# Callouts\n\n> [!NOTE]\n> Useful context.\n\n> [!WARNING]\n> Check this first.\n",
  );

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "callouts.html"), "utf8");
  assert.match(html, /<div class="markdown-alert markdown-alert-note">/);
  assert.match(html, /<p class="markdown-alert-title">/);
  assert.match(html, /<span class="material-symbols-rounded markdown-alert-icon" aria-hidden="true">info<\/span>/);
  assert.match(html, /Useful context\./);
  assert.match(html, /<div class="markdown-alert markdown-alert-warning">/);
  assert.match(
    html,
    /<span class="material-symbols-rounded markdown-alert-icon" aria-hidden="true">warning<\/span>/,
  );
  assert.match(html, /Check this first\./);
  assert.doesNotMatch(html, /octicon/);
});

test("highlights code blocks with shiki", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "code.md",
    "# Code\n\n```ts\nconst message: string = \"hello\";\nconsole.log(message);\n```\n",
  );

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "code.html"), "utf8");
  assert.match(html, /class="shiki/);
  assert.match(html, /style="color:/);
});

test("uses lildocs code background for shiki blocks", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "code.md", "# Code\n\n```ts\nconst message = \"hello\";\n```\n");

  await runCli([docs, "--out", outDir, "--theme", "github-dark"]);

  const html = await readFile(path.join(outDir, "code.html"), "utf8");
  assert.match(html, /class="shiki github-dark"/);
  assert.match(html, /background-color:var\(--ld-color-code-background\)/);
  assert.doesNotMatch(html, /background-color:#24292e/);
});

test("emits code block styles without css borders", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const codeBlockRule = css.match(/\.content pre \{[^}]+\}/)?.[0] ?? "";
  assert.match(codeBlockRule, /background: var\(--ld-color-code-background\)/);
  assert.doesNotMatch(codeBlockRule, /border:/);
});

test("uses the local theme shiki theme for code blocks", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "theme.ts",
    `export default {
  color: {
    background: "#24292e",
    text: "#e1e4e8",
    mutedText: "#959da5",
    border: "#1b1f23",
    link: "#79b8ff",
    codeBackground: "#2f363d",
  },
  font: {
    body: "system-ui, sans-serif",
    code: "ui-monospace, monospace",
  },
  shiki: {
    theme: "github-dark",
  },
};`,
  );
  await writeDocFile(docs, "code.md", "# Code\n\n```ts\nconst message = \"hello\";\n```\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "code.html"), "utf8");
  assert.match(html, /class="shiki github-dark"/);
  assert.doesNotMatch(html, /class="shiki github-light"/);
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

test("renders previous and next page links in generated navigation order", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");

  await runCli([docs, "--out", outDir]);

  const homeHtml = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(homeHtml, /<nav class="pageNav" aria-label="Page navigation">/);
  assert.doesNotMatch(homeHtml, /rel="prev"/);
  assert.match(homeHtml, /rel="next" href=".\/guide.html"/);
  assert.match(homeHtml, /Frontmatter Title/);

  const nestedHtml = await readFile(path.join(outDir, "nested", "page.html"), "utf8");
  assert.match(nestedHtml, /rel="prev" href="..\/guide.html"/);
  assert.match(nestedHtml, /Frontmatter Title/);
  assert.match(nestedHtml, /rel="next" href="..\/quickstart.html"/);
  assert.match(nestedHtml, /Quickstart/);

  const lastHtml = await readFile(path.join(outDir, "quickstart.html"), "utf8");
  assert.match(lastHtml, /rel="prev" href=".\/nested\/page.html"/);
  assert.match(lastHtml, /Nested Page/);
  assert.doesNotMatch(lastHtml, /rel="next"/);
});

test("omits previous and next navigation for single page sites", async () => {
  const { workspace } = await fixtureWorkspace();
  const docs = path.join(workspace, "single");
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "index.md", "# Only Page\n\nSolo.");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.doesNotMatch(html, /aria-label="Page navigation"/);
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
