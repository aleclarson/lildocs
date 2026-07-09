import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, readFrontendBundle, runCli, writeDocFile } from "./helpers/fixture.mjs";

test("generates search index from titles headings and body text", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "details.md",
    `# Details

## Install

Install overview.

### Local Files

Unique local substring.
`,
  );

  await runCli([docs, "--out", outDir]);

  const index = JSON.parse(await readFile(path.join(outDir, "search-index.json"), "utf8"));
  assert.ok(index.some((entry) => entry.kind === "page" && entry.title === "Frontmatter Title"));
  assert.ok(index.some((entry) => entry.kind === "page" && entry.text.includes("searchable body copy")));

  const guideHeading = index.find((entry) => entry.kind === "section" && entry.title === "Guide Heading");
  assert.equal(guideHeading?.pageTitle, "Frontmatter Title");
  assert.equal(guideHeading?.route, "guide.html#guide-heading");
  assert.equal(guideHeading?.depth, 2);
  assert.ok(guideHeading?.headings.includes("Guide Heading"));
  assert.ok(guideHeading?.text.includes("Nested content"));

  const localFiles = index.find((entry) => entry.kind === "section" && entry.title === "Local Files");
  assert.equal(localFiles?.route, "details.html#local-files");
  assert.deepEqual(localFiles?.headings, ["Details", "Install", "Local Files"]);
  assert.ok(localFiles?.text.includes("Unique local substring"));
});
test("indexes Markdown links by label instead of destination", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "link-labels.md",
    "# Link labels\n\n## Example\n\nSee [Link label](https://example.com/hidden-link-target).\n",
  );

  await runCli([docs, "--out", outDir]);

  const index = JSON.parse(await readFile(path.join(outDir, "search-index.json"), "utf8"));
  const page = index.find((entry) => entry.kind === "page" && entry.title === "Link labels");
  const section = index.find((entry) => entry.kind === "section" && entry.title === "Example");
  assert.match(page?.text ?? "", /Link label/);
  assert.doesNotMatch(page?.text ?? "", /hidden link target/);
  assert.match(section?.text ?? "", /Link label/);
  assert.doesNotMatch(section?.text ?? "", /hidden link target/);
});

test("preserves paragraph and sentence boundaries for search result excerpts", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "excerpt.md",
    "# Excerpts\n\n## Example\n\nFirst paragraph. The matching phrase is here. Last sentence.\n\nSeparate paragraph.",
  );

  await runCli([docs, "--out", outDir]);

  const index = JSON.parse(await readFile(path.join(outDir, "search-index.json"), "utf8"));
  const section = index.find((entry) => entry.kind === "section" && entry.title === "Example");
  assert.equal(
    section?.excerpt,
    "First paragraph. The matching phrase is here. Last sentence.\n\nSeparate paragraph.",
  );
});

test("decodes HTML entities in search result text", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "entities.md",
    "# Encoded text\n\n## Vite And Browser\n\n`connect({ endpoint: '/__scoped_logs', scope: 'browser' })` & ©\n\n`<literal-element>`",
  );

  await runCli([docs, "--out", outDir]);

  const index = JSON.parse(await readFile(path.join(outDir, "search-index.json"), "utf8"));
  const section = index.find((entry) => entry.kind === "section" && entry.title === "Vite And Browser");
  assert.match(section?.excerpt ?? "", /endpoint: '\/__scoped_logs'/);
  assert.match(section?.excerpt ?? "", /scope: 'browser'/);
  assert.match(section?.excerpt ?? "", /& ©/);
  assert.match(section?.excerpt ?? "", /<literal-element>/);
  assert.doesNotMatch(section?.excerpt ?? "", /&(?:#\d+|#x[\da-f]+|\w+);/i);
});

test("emits search UI and Vite frontend bundle", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  const frontendScript = await readFrontendBundle(outDir);
  assert.match(html, /id="lildocs-search-input"/);
  assert.match(html, /id="lildocs-search-index"/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Rounded/);
  assert.match(html, /class="searchIcon ti ti-search"/);
  assert.match(html, /id="lildocs-overlay-root"/);
  assert.match(html, /<script type="module" src=".\/assets\/lildocs\/assets\/.*\.js"><\/script>/);
  assert.match(frontendScript, /matchEntry/);
  assert.match(frontendScript, /matchingSnippet/);
  assert.match(frontendScript, /containsTerms/);
  assert.match(frontendScript, /renderHighlighted/);
  assert.match(frontendScript, /titleMatches\.length < 4/);
  assert.match(frontendScript, /embeddedIndex/);
  assert.match(frontendScript, /searchResultsHeader/);
  assert.match(frontendScript, /searchResultType/);
  assert.match(frontendScript, /Create a GitHub issue/);
  assert.match(frontendScript, /issueUrlForQuery/);
  assert.doesNotMatch(html, /window\.lildocsIssueUrl/);
});

test("emits GitHub repository link at the bottom of the table of contents", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify({
      repository: {
        type: "git",
        url: "git+https://github.com/example/project.git",
      },
    }),
  );
  await writeDocFile(docs, "nested/page.md", "# Nested\n");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  const nestedHtml = await readFile(path.join(outDir, "nested", "page.html"), "utf8");
  const guideHtml = await readFile(path.join(outDir, "guide.html"), "utf8");
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const icon = await readFile(path.join(outDir, "assets", "github-icon.svg"), "utf8");
  assert.match(html, /class="tocRepoLink"/);
  assert.match(
    html,
    /<span class="repoIcon" aria-hidden="true" style="--ld-repo-icon: url\(\.\/assets\/github-icon\.svg\)"><\/span>/,
  );
  assert.match(nestedHtml, /--ld-repo-icon: url\(\.\.\/assets\/github-icon\.svg\)/);
  assert.match(html, /href="https:\/\/github\.com\/example\/project"/);
  assert.match(html, /window\.lildocsIssueUrl = "https:\/\/github\.com\/example\/project\/issues\/new"/);
  assert.match(html, /aria-label="View repository on GitHub"/);
  assert.match(html, /<span>example\/project<\/span>/);
  assert.ok(guideHtml.indexOf("On this page") < guideHtml.indexOf('class="tocRepoLink"'));
  assert.match(css, /mask: var\(--ld-repo-icon\) center \/ contain no-repeat/);
  assert.match(icon, /viewBox="0 0 256 250"/);
});

test("prefers GITHUB_REPOSITORY over package metadata for repository button", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify({
      repository: "github:package-owner/package-repo",
    }),
  );

  await runCli([docs, "--out", outDir], {
    env: {
      ...process.env,
      GITHUB_REPOSITORY: "env-owner/env-repo",
    },
  });

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /href="https:\/\/github\.com\/env-owner\/env-repo"/);
  assert.doesNotMatch(html, /package-owner\/package-repo/);
});

test("search script preloads links and supports keyboard result selection", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const frontendScript = await readFrontendBundle(outDir);
  assert.match(frontendScript, /document\.addEventListener\("mouseover"/);
  assert.match(frontendScript, /preload\.rel = "prefetch"/);
  assert.match(frontendScript, /event\.key === "ArrowDown"/);
  assert.match(frontendScript, /event\.key === "ArrowUp"/);
  assert.match(frontendScript, /event\.key === "Enter"/);
  assert.match(frontendScript, /event\.key\.toLowerCase\(\) === "k"/);
  assert.match(frontendScript, /lildocs:search-toggle/);
  assert.match(frontendScript, /selected\.click\(\)/);
  assert.match(frontendScript, /preloadRelativeUrl\(selected\.getAttribute\("href"\), preloadedUrls\)/);
  assert.match(frontendScript, /match\.entry\.kind === "section"/);
  assert.match(frontendScript, /lildocs:section-highlight/);
  assert.match(frontendScript, /lildocs:page-view/);
  assert.match(frontendScript, /sectionHighlight/);
  assert.match(frontendScript, /\.toc a\[href/);
  assert.match(frontendScript, /queueSectionHighlight\(link\.href\)/);
  assert.match(frontendScript, /Missing docs for/);
  assert.match(frontendScript, /I searched the docs for/);
});

test("uses theme colors for search input placeholder and focus styles", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /\.searchIcon \{[^}]*color: var\(--ld-color-muted-text\)/);
  assert.match(css, /padding: 9px 10px 9px 36px/);
  assert.match(css, /\.searchBox input::placeholder \{[^}]*color: var\(--ld-color-muted-text\)/);
  assert.match(css, /\.searchBox input:focus \{[^}]*border-color: var\(--ld-color-link\)/);
  assert.match(css, /\.searchBox input:focus \{[^}]*outline: none/);
  assert.match(css, /\.searchBox input \{[^}]*border-radius: 10px/);
  assert.match(css, /\.sidebarToggle \{[^}]*border-radius: 10px/);
  assert.match(css, /\.copyCodeButton \{[^}]*border-radius: 10px/);
  assert.match(css, /\.searchResults \{[^}]*font-family: var\(--ld-font-body\)/);
  assert.match(css, /\.searchResults \{[^}]*position: fixed/);
  assert.match(css, /\.searchResults \{[^}]*left: var\(--ld-sidebar-width\)/);
  assert.match(css, /\.searchResults \{[^}]*bottom: 0/);
  assert.match(css, /\.searchResultsContent \{[^}]*padding-top: 70px/);
  assert.match(css, /\.sidebar \{[^}]*z-index: 20/);
  assert.match(css, /\.searchResultsHeader h2 \{[^}]*font-family: var\(--ld-font-heading\)/);
  assert.match(css, /\.searchResultTitle \{[^}]*font-size: clamp\(1\.2rem, 2vw, 1\.5rem\)/);
  assert.match(css, /\.searchResult\.selected,\n\.searchResult:hover \{[^}]*background: color-mix/);
  assert.match(css, /\.searchResults \.searchEmpty a \{[^}]*color: var\(--ld-color-link\)/);
  assert.match(css, /\.searchResults \.searchEmpty a:hover,\n\.searchResults \.searchEmpty a:focus-visible \{[^}]*background: transparent/);
  assert.match(css, /\.searchResults mark \{[^}]*background: color-mix\(in srgb, var\(--ld-color-link\) 18%, transparent\)/);
  assert.match(css, /\.sectionHighlight \{[^}]*animation: section-highlight 2\.4s ease-out/);
  assert.match(css, /@keyframes section-highlight/);
  assert.match(css, /\.tocRepoLink \{[^}]*font-size: 0\.8rem/);
  assert.match(css, /\.tocRepoLink \.repoIcon \{[^}]*width: 16px/);
});

test("emits collapsible sidebar controls with Tabler icons", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const frontendScript = await readFrontendBundle(outDir);
  const icons = await readFile(path.join(outDir, "assets", "tabler-icons.css"), "utf8");
  assert.match(html, /id="lildocs-sidebar" class="sidebar"/);
  assert.match(html, /id="lildocs-sidebar-toggle"/);
  assert.match(html, /ti ti-layout-sidebar-left-collapse/);
  assert.match(html, /id="lildocs-sidebar-expand"/);
  assert.match(html, /ti ti-layout-sidebar-left-expand/);
  assert.match(html, /id="lildocs-floating-search"/);
  assert.match(css, /html\.sidebar-collapsed \.pageShell/);
  assert.match(css, /html\.sidebar-collapsed \.contentGrid/);
  assert.match(css, /padding-left: clamp\(180px, 14vw, 285px\)/);
  assert.match(css, /html\.sidebar-collapsed \.sidebarFloatingControls/);
  assert.match(frontendScript, /sidebar-collapsed/);
  assert.match(icons, /\.ti-layout-sidebar-left-collapse/);
  assert.match(icons, /\.ti-layout-sidebar-left-expand/);
});
