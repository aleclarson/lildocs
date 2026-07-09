import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, readFrontendBundle, runCli, writeDocFile } from "./helpers/fixture.mjs";

test("writes static html pages and copied assets", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  await access(path.join(outDir, "index.html"));
  await access(path.join(outDir, "guide.html"));
  await access(path.join(outDir, "quickstart.html"));
  await access(path.join(outDir, "assets", "images", "sample.svg"));
});

test("emits only bundled icon masks for tabler icons", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  const css = await readFile(path.join(outDir, "assets", "tabler-icons.css"), "utf8");
  assert.match(html, /<link rel="stylesheet" href=".\/assets\/tabler-icons\.css"\/>/);
  assert.match(css, /\.ti \{/);
  assert.match(css, /\.ti-search \{/);
  assert.match(css, /\.ti-copy-check \{/);
  assert.match(css, /\.ti-alert-triangle \{/);
  assert.match(css, /\.ti-arrows-maximize \{/);
  assert.match(css, /\.ti-arrows-minimize \{/);
  assert.doesNotMatch(css, /@font-face/);
  assert.doesNotMatch(css, /tabler-icons\.(?:woff2?|ttf)/);
  await assert.rejects(() => access(path.join(outDir, "assets", "fonts", "tabler-icons.woff2")), {
    code: "ENOENT",
  });
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

test("links header brand text to the home page", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeFile(path.join(workspace, "package.json"), JSON.stringify({ name: "fixture-docs" }));
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");

  await runCli([docs, "--out", outDir]);

  const homeHtml = await readFile(path.join(outDir, "index.html"), "utf8");
  const nestedHtml = await readFile(path.join(outDir, "nested", "page.html"), "utf8");
  assert.match(
    homeHtml,
    /<a class="brand" href="\.\/index\.html"><span>fixture-docs<\/span><\/a>/,
  );
  assert.match(
    nestedHtml,
    /<a class="brand" href="\.\.\/index\.html"><span>fixture-docs<\/span><\/a>/,
  );
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

test("generates API reference pages from sibling package exports", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeExportedDeclarations(workspace);

  await runCli([docs, "--out", outDir]);

  const referenceHtml = await readFile(path.join(outDir, "reference", "index.html"), "utf8");
  const searchIndex = await readFile(path.join(outDir, "search-index.json"), "utf8");
  assert.match(referenceHtml, /<title>fixture-lib • fixture-lib<\/title>/);
  assert.match(referenceHtml, /<h1 id="fixture-lib">fixture-lib<\/h1>/);
  assert.match(referenceHtml, /greet/);
  assert.match(searchIndex, /Greets a person/);
});

test("generates API reference pages from configured package exports", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  const packageRoot = path.join(workspace, "packages", "fixture-lib");
  await writeExportedDeclarations(packageRoot);
  await writeFile(
    path.join(docs, "config.json"),
    JSON.stringify({ reference: { packageJson: "../packages/fixture-lib/package.json" } }),
  );
  await writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify({ repository: "github:acme/fixture-lib" }),
  );

  await runCli([docs, "--out", outDir]);

  const referenceHtml = await readFile(path.join(outDir, "reference", "index.html"), "utf8");
  assert.match(referenceHtml, /<h1 id="fixture-lib">fixture-lib<\/h1>/);
  assert.match(referenceHtml, /FixtureOptions/);
  assert.match(referenceHtml, /<strong>Properties<\/strong>/);
  assert.match(referenceHtml, /The display name\./);
  assert.match(referenceHtml, /github\.com\/search\?q=repo%3Aacme\/fixture-lib/);
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

async function writeExportedDeclarations(packageRoot) {
  await mkdir(path.join(packageRoot, "dist"), { recursive: true });
  await writeFile(
    path.join(packageRoot, "package.json"),
    JSON.stringify({
      name: "fixture-lib",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          default: "./dist/index.js",
        },
      },
    }),
  );
  await writeFile(
    path.join(packageRoot, "dist", "index.d.ts"),
    `/**
 * Options for fixture generation.
 */
export interface FixtureOptions {
  /**
   * The display name.
   */
  name: string;
}

/**
 * Greets a person.
 */
export declare function greet(options: FixtureOptions): string;
`,
  );
}

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
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const frontendScript = await readFrontendBundle(outDir);
  assert.match(html, /<table>/);
  assert.match(css, /\.content table \{[^}]*display: block;[^}]*max-width: 100%;[^}]*overflow-x: auto/);
  assert.match(css, /\.tableFullscreenDialog \{[^}]*width: 100vw;[^}]*height: 100vh/);
  assert.match(css, /\.tableFullscreenViewport \{[^}]*overflow: auto/);
  assert.match(frontendScript, /Expand table/);
  assert.match(frontendScript, /ti ti-arrows-maximize/);
  assert.match(frontendScript, /ti ti-arrows-minimize/);
  assert.match(frontendScript, /table\.cloneNode\(true\)/);
  assert.match(frontendScript, /dialog\.showModal\(\)/);
  assert.match(frontendScript, /dialog\.addEventListener\("cancel"/);
  assert.match(frontendScript, /event\.preventDefault\(\)/);
  assert.match(frontendScript, /lildocs:page-view/);
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
  assert.match(html, /<span class="ti ti-info-circle markdown-alert-icon" aria-hidden="true"><\/span>/);
  assert.match(html, /Useful context\./);
  assert.match(html, /<div class="markdown-alert markdown-alert-warning">/);
  assert.match(
    html,
    /<span class="ti ti-alert-triangle markdown-alert-icon" aria-hidden="true"><\/span>/,
  );
  assert.match(html, /Check this first\./);
  assert.doesNotMatch(html, /octicon/);
});

test("renders regular blockquotes", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "quotes.md", "# Quotes\n\nIntro copy.\n\n> A quoted note.\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "quotes.html"), "utf8");
  assert.match(html, /<blockquote>\s*<p>A quoted note\.<\/p>\s*<\/blockquote>/);
});

test("renders h1-adjacent blockquotes before body copy", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "subtitle.md", "# Title\n\n> Short supporting copy.\n\nBody copy.\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "subtitle.html"), "utf8");
  assert.match(
    html,
    /<h1 id="title">Title<\/h1>\s*<blockquote>\s*<p>Short supporting copy\.<\/p>\s*<\/blockquote>\s*<p>Body copy\.<\/p>/,
  );
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
  assert.match(html, /--shiki-light:/);
  assert.match(html, /--shiki-dark:/);
});

test("emits copy-to-clipboard controls for code blocks", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "code.md", "# Code\n\n```ts\nconst message = \"hello\";\n```\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "code.html"), "utf8");
  const frontendScript = await readFrontendBundle(outDir);
  assert.match(html, /<script type="module" src=".\/assets\/lildocs\/assets\/.*\.js"><\/script>/);
  assert.match(frontendScript, /navigator\.clipboard\?\.writeText/);
  assert.match(frontendScript, /ti ti-copy copyCodeIcon/);
  assert.match(frontendScript, /ti ti-copy-check copyCodeIcon/);
});

test("copies heading links with fragments except for the page heading", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const frontendScript = await readFrontendBundle(outDir);
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(frontendScript, /heading\.tagName === "H1" \? "" : heading\.id/);
  assert.match(frontendScript, /navigator\.clipboard/);
  assert.match(frontendScript, /document\.execCommand\("copy"\)/);
  assert.match(frontendScript, /headingLinkCopied/);
  assert.match(css, /\[id\] \{[^}]*cursor: copy/);
  assert.match(css, /\.headingLinkCopied::after \{[^}]*content: "Link copied"/);
});

test("emits swup navigation enhancement assets", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  const frontendScript = await readFrontendBundle(outDir);
  assert.match(html, /<div id="swup" class="contentGrid">/);
  assert.match(html, /id="lildocs-sidebar-navigation" aria-label="Documentation navigation"/);
  assert.match(html, /<main class="content transition-fade">/);
  assert.match(html, /<aside class="toc transition-fade">/);
  assert.match(html, /<script type="module" src=".\/assets\/lildocs\/assets\/.*\.js"><\/script>/);
  assert.match(frontendScript, /window\.location\.protocol === "file:"/);
  assert.match(frontendScript, /#lildocs-sidebar-navigation/);
  assert.match(frontendScript, /page:view/);
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
  await writeDocFile(docs, "duplicates.md", "# Duplicate\n\n## Repeat\n\n## Repeat\n\n## user_name\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "duplicates.html"), "utf8");
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(html, /id="repeat"/);
  assert.match(html, /id="repeat-2"/);
  assert.match(html, /id="user_name"/);
  assert.match(html, /<a href="#user_name">user_name<\/a>/);
  assert.match(css, /:target \{[^}]*scroll-margin-top: 70px/);
  assert.match(css, /:where\(h1, h2, h3, h4, h5, h6\) \{[^}]*letter-spacing: -0\.018em/);
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

test("renders next page links in generated navigation order", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");

  await runCli([docs, "--out", outDir]);

  const homeHtml = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(homeHtml, /<nav class="pageNav" aria-label="Page navigation">/);
  assert.doesNotMatch(homeHtml, /rel="prev"/);
  assert.match(homeHtml, /Next: /);
  assert.match(homeHtml, /rel="next" href=".\/guide.html"/);
  assert.match(homeHtml, /Frontmatter Title/);

  const nestedHtml = await readFile(path.join(outDir, "nested", "page.html"), "utf8");
  assert.doesNotMatch(nestedHtml, /rel="prev"/);
  assert.match(nestedHtml, /Frontmatter Title/);
  assert.match(nestedHtml, /Next: /);
  assert.match(nestedHtml, /rel="next" href="..\/quickstart.html"/);
  assert.match(nestedHtml, /Quickstart/);

  const lastHtml = await readFile(path.join(outDir, "quickstart.html"), "utf8");
  assert.doesNotMatch(lastHtml, /<nav class="pageNav"/);
  assert.doesNotMatch(lastHtml, /rel="prev"/);
  assert.doesNotMatch(lastHtml, /rel="next"/);
});

test("hoists entry point links in referenced sidebar order", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");
  await writeDocFile(
    docs,
    "index.md",
    `# Fixture Home

[Quickstart](quickstart.md)
[Guide](guide.md)
[Nested](nested/page.md)
[Missing](missing.md)
[External](https://example.com/docs.md)
[Section](#welcome)
`,
  );

  await runCli([docs, "--out", outDir]);

  const homeHtml = await readFile(path.join(outDir, "index.html"), "utf8");
  const sidebar = documentationNavigation(homeHtml);
  assert.doesNotMatch(sidebar, /Fixture Home/);
  assert.doesNotMatch(sidebar, /href="\.\/index\.html"/);
  assert.match(
    sidebar,
    /<a href="\.\/quickstart\.html">Quickstart<\/a>[\s\S]*<a href="\.\/guide\.html">Frontmatter Title<\/a>[\s\S]*<span class="navFolder">Nested<\/span>[\s\S]*<a href="\.\/nested\/page\.html">Nested Page<\/a>/,
  );
  assert.match(homeHtml, /rel="next" href=".\/quickstart.html"/);

  const quickstartHtml = await readFile(path.join(outDir, "quickstart.html"), "utf8");
  assert.doesNotMatch(quickstartHtml, /rel="prev"/);
  assert.match(quickstartHtml, /rel="next" href=".\/guide.html"/);
});

test("keeps manual navigation order ahead of entry point link order", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");
  await writeDocFile(
    docs,
    "index.md",
    `# Fixture Home

[Quickstart](quickstart.md)
[Nested](nested/page.md)
[Guide](guide.md)
`,
  );
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      navigation: {
        order: ["index.md", "nested/", "guide.md"],
      },
    }),
  );

  await runCli([docs, "--out", outDir]);

  const homeHtml = await readFile(path.join(outDir, "index.html"), "utf8");
  const sidebar = documentationNavigation(homeHtml);
  assert.doesNotMatch(sidebar, /Fixture Home/);
  assert.doesNotMatch(sidebar, /href="\.\/index\.html"/);
  assert.match(
    sidebar,
    /<span class="navFolder">Nested<\/span>[\s\S]*<a href="\.\/nested\/page\.html">Nested Page<\/a>[\s\S]*<a href="\.\/guide\.html">Frontmatter Title<\/a>[\s\S]*<a href="\.\/quickstart\.html">Quickstart<\/a>/,
  );
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
  const sidebar = documentationNavigation(homeHtml);
  assert.doesNotMatch(sidebar, /Fixture Home/);
  assert.doesNotMatch(sidebar, /href="\.\/index\.html"/);
  assert.match(
    sidebar,
    /<a href="\.\/quickstart\.html">Quickstart<\/a>[\s\S]*<span class="navFolder">Nested<\/span>[\s\S]*<a href="\.\/guide\.html">Frontmatter Title<\/a>/,
  );
  assert.doesNotMatch(homeHtml, /<nav class="pageNav"/);
  assert.doesNotMatch(homeHtml, /rel="prev"/);
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

test("renders group breadcrumbs before grouped page content", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested-section/deep/page.md", "# Nested Page\n\nNested content.");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "nested-section", "deep", "page.html"), "utf8");
  assert.match(
    html,
    /<article><p class="groupBreadcrumbs">Nested Section \/ Deep<\/p><div><h1 id="nested-page">Nested Page<\/h1>/,
  );
});

test("does not indent nested sidebar pages", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "nested/page.md", "# Nested Page\n\nNested content.");

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.doesNotMatch(css, /\.navList \.navList\s*{\s*padding-left:/);
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

function documentationNavigation(html) {
  const match = html.match(/<nav aria-label="Documentation navigation">([\s\S]*?)<\/nav>/);
  assert.ok(match?.[1]);
  return match[1];
}
