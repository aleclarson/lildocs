import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
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
  assert.match(html, /fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Rounded/);
  assert.match(html, /class="searchIcon material-symbols-rounded"/);
  assert.match(html, />search<\/span>/);
  assert.match(html, /id="lildocs-overlay-root"/);
  assert.match(html, /<script type="module" src=".\/assets\/search\.js"><\/script>/);
  assert.match(searchScript, /scoreEntry/);
  assert.match(searchScript, /embeddedIndex/);
  assert.match(searchScript, /setOverlayPortalRoots/);
});

test("emits GitHub repository button from nearest package metadata", async () => {
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

  await runCli([docs, "--out", outDir]);

  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(html, /class="repoButton"/);
  assert.match(html, /<svg class="repoIcon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">/);
  assert.match(html, /fill="currentColor"/);
  assert.match(html, /href="https:\/\/github\.com\/example\/project"/);
  assert.match(html, /aria-label="View repository on GitHub"/);
  assert.ok(html.indexOf('class="repoButton"') < html.indexOf('class="searchBox"'));
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

  const searchScript = await readFile(path.join(outDir, "assets", "search.js"), "utf8");
  assert.match(searchScript, /document\.addEventListener\("mouseover"/);
  assert.match(searchScript, /preload\.rel = "prefetch"/);
  assert.match(searchScript, /event\.key === "ArrowDown"/);
  assert.match(searchScript, /event\.key === "ArrowUp"/);
  assert.match(searchScript, /event\.key === "Enter"/);
  assert.match(searchScript, /selected\.click\(\)/);
  assert.match(searchScript, /preloadRelativeUrl\(selected\.getAttribute\("href"\), preloadedUrls\)/);
  assert.match(searchScript, /onClick: clearSearch/);
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
  assert.match(css, /outline: 2px solid color-mix\(in srgb, var\(--ld-color-link\) 45%, transparent\)/);
  assert.match(css, /\.searchResults \{[^}]*font-family: var\(--ld-font-body\)/);
  assert.match(css, /\.searchResults a\.selected,\n\.searchResults a:hover \{[^}]*background: var\(--ld-color-code-background\)/);
});
