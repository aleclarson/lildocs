import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
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

test("appends nearest package name to document titles", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeFile(path.join(workspace, "package.json"), JSON.stringify({ name: "fixture-docs" }));

  await runCli([docs, "--out", outDir]);

  const homeHtml = await readFile(path.join(outDir, "index.html"), "utf8");
  const guideHtml = await readFile(path.join(outDir, "guide.html"), "utf8");
  assert.match(homeHtml, /<title>Fixture Home • fixture-docs<\/title>/);
  assert.match(guideHtml, /<title>Frontmatter Title • fixture-docs<\/title>/);
});

test("uses configured project name in document titles", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeFile(path.join(workspace, "package.json"), JSON.stringify({ name: "fixture-docs" }));
  await writeFile(path.join(docs, "config.json"), JSON.stringify({ projectName: "Custom Docs" }));

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /<title>Fixture Home • Custom Docs<\/title>/);
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

test("styles regular blockquotes", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "quotes.md", "# Quotes\n\n> A quoted note.\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "quotes.html"), "utf8");
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(html, /<blockquote>\s*<p>A quoted note\.<\/p>\s*<\/blockquote>/);
  assert.match(css, /\.content blockquote \{[^}]*border-left: 4px solid var\(--ld-color-border\)/);
  assert.match(css, /\.content blockquote \{[^}]*background: color-mix/);
  assert.match(css, /\.content blockquote > :first-child \{[^}]*margin-top: 0/);
  assert.match(css, /\.content blockquote > :last-child \{[^}]*margin-bottom: 0/);
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

test("emits copy-to-clipboard controls for code blocks", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "code.md", "# Code\n\n```ts\nconst message = \"hello\";\n```\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "code.html"), "utf8");
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const script = await readFile(path.join(outDir, "assets", "copy-code.js"), "utf8");
  assert.match(html, /<script src=".\/assets\/copy-code\.js"><\/script>/);
  assert.match(css, /\.copyCodeButton \{/);
  assert.match(css, /\.copyCodeIcon \{/);
  assert.match(script, /navigator\.clipboard\?\.writeText/);
  assert.match(script, /const copyText = block\.textContent \?\? ""/);
  assert.match(script, /innerHTML = icons\.copy/);
  assert.match(script, /material-symbols-rounded copyCodeIcon/);
  assert.match(script, /content_copy/);
});

test("emits swup navigation enhancement assets", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const navigationScript = await readFile(path.join(outDir, "assets", "navigation.js"), "utf8");
  const swupScript = await readFile(path.join(outDir, "assets", "swup.umd.js"), "utf8");
  assert.match(html, /<div id="swup" class="contentGrid">/);
  assert.match(html, /<main class="content transition-fade">/);
  assert.match(html, /<aside class="toc transition-fade">/);
  assert.match(html, /<script src=".\/assets\/swup\.umd\.js"><\/script>/);
  assert.match(html, /<script src=".\/assets\/navigation\.js"><\/script>/);
  assert.match(css, /--ld-navigation-duration: 180ms/);
  assert.match(
    css,
    /html\.is-changing :where\(\.transition-fade, \.transition-slide, \.transition-scale\)/,
  );
  assert.match(navigationScript, /window\.location\.protocol === "file:"/);
  assert.match(navigationScript, /new window\.Swup/);
  assert.match(swupScript, /\(t\|\|self\)\.Swup=e\(\)/);
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

test("emits reset and whitespace-preserving code styles", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /:where\(\*, \*::before, \*::after\) \{[^}]*box-sizing: border-box/);
  assert.match(css, /:where\(input, button, textarea, select\) \{[^}]*font: inherit/);
  assert.match(css, /\.content pre \{[^}]*white-space: pre/);
  assert.match(css, /\.content pre code \{[^}]*white-space: inherit/);
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
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(homeHtml, /<nav class="pageNav" aria-label="Page navigation">/);
  assert.doesNotMatch(homeHtml, /rel="prev"/);
  assert.match(homeHtml, /rel="next" href=".\/guide.html"/);
  assert.match(homeHtml, /Frontmatter Title/);
  assert.match(css, /\.content \.pageNavLink,\n\.content \.pageNavLink:hover \{[^}]*text-decoration: none/);

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

test("uses docs config navigation order for pages folders and page links", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      navigation: {
        order: ["quickstart.md", "nested/", "guide.md", "index.md"],
      },
    }),
  );

  await runCli([docs, "--out", outDir]);

  const quickstartHtml = await readFile(path.join(outDir, "quickstart.html"), "utf8");
  assert.doesNotMatch(quickstartHtml, /rel="prev"/);
  assert.match(quickstartHtml, /rel="next" href=".\/nested\/page.html"/);

  const homeHtml = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(
    homeHtml,
    /<a href="\.\/quickstart\.html">Quickstart<\/a>[\s\S]*<span class="navFolder">Nested<\/span>[\s\S]*<a href="\.\/guide\.html">Frontmatter Title<\/a>[\s\S]*<a class="active" href="\.\/index\.html">Fixture Home<\/a>/,
  );
  assert.match(homeHtml, /rel="prev" href=".\/guide.html"/);
  assert.doesNotMatch(homeHtml, /rel="next"/);
});

test("reports unmatched docs config navigation order entries", async () => {
  const { docs } = await fixtureWorkspace();
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      navigation: {
        order: ["missing.md"],
      },
    }),
  );

  await assert.rejects(
    () => runCli([docs]),
    /Docs config "navigation\.order\[0\]" does not match a page or folder/,
  );
});

test("reports duplicate docs config navigation order entries", async () => {
  const { docs } = await fixtureWorkspace();
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      navigation: {
        order: ["./guide.md", "guide.md"],
      },
    }),
  );

  await assert.rejects(
    () => runCli([docs]),
    /Docs config "navigation\.order\[1\]" duplicates "navigation\.order\[0\]"/,
  );
});

test("renders sidebar folder names as title-cased labels instead of links", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested-section/page.md", "# Nested Page\n\nNested content.");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /<span class="navFolder">Nested Section<\/span>/);
  assert.doesNotMatch(html, /<span class="navFolder">nested section<\/span>/);
  assert.doesNotMatch(html, /<a[^>]+href="\.\/nested-section\/page\.html"[^>]*>\s*nested section\s*<\/a>/);
  assert.match(html, /<a href="\.\/nested-section\/page\.html">Nested Page<\/a>/);
});

test("does not indent nested sidebar pages", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.doesNotMatch(css, /\.navList \.navList\s*{\s*padding-left:/);
  assert.match(css, /\.navList > \.navGroup \{[^}]*margin-top: 12px/);
  assert.match(css, /\.sidebar \{[^}]*overscroll-behavior: contain/);
  assert.match(css, /padding-bottom: calc\(24px \+ 40vh\)/);
  assert.match(css, /@media \(max-width: 860px\) \{[\s\S]*\.sidebar \{[^}]*padding-bottom: 24px/);
});

test("renders folders with index pages as expandable page rows", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/index.md", "# Overview\n\nNested landing.");
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");

  await runCli([docs, "--out", outDir]);

  const homeHtml = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(
    homeHtml,
    /<details class="navDisclosure"><summary>Nested<\/summary><ul class="navList">/,
  );
  assert.doesNotMatch(homeHtml, /<a href="\.\/nested\/index\.html">Nested<\/a>/);
  assert.match(homeHtml, /<a href="\.\/nested\/page\.html">Nested Page<\/a>/);

  const nestedHtml = await readFile(path.join(outDir, "nested", "index.html"), "utf8");
  assert.match(nestedHtml, /<details class="navDisclosure" open><summary class="active">Nested<\/summary>/);
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
