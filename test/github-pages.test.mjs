import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  normalizeBasePath,
  renderGitHubPagesWorkflow,
  repoRelativeInputPath,
} from "../dist/core/github-pages.mjs";

test("normalizes GitHub Pages base paths", () => {
  assert.equal(normalizeBasePath(), "/");
  assert.equal(normalizeBasePath("/"), "/");
  assert.equal(normalizeBasePath("repo"), "/repo/");
  assert.equal(normalizeBasePath("/repo"), "/repo/");
  assert.equal(normalizeBasePath("/repo/"), "/repo/");
});

test("rejects protocol URLs for GitHub Pages base paths", () => {
  assert.throws(() => normalizeBasePath("https://example.com/repo/"), /must be a path/);
});

test("converts absolute workflow input paths to repo-relative paths", () => {
  const cwd = path.join(path.sep, "repo");

  assert.equal(repoRelativeInputPath(path.join(cwd, "docs"), cwd), "./docs");
});

test("rejects workflow input paths outside the repository", () => {
  const cwd = path.join(path.sep, "repo");

  assert.throws(() => repoRelativeInputPath(path.join(path.sep, "other", "docs"), cwd), /inside the repository/);
});

test("renders GitHub Pages workflow with official actions and pnpm", () => {
  const workflow = renderGitHubPagesWorkflow({
    input: "./docs",
    outDir: "dist",
  });

  assert.match(workflow, /actions\/checkout@v4/);
  assert.match(workflow, /pnpm\/action-setup@v4/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /node dist\/cli\.mjs build \.\/docs --out dist/);
});
