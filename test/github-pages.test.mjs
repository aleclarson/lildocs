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

test("renders GitHub Pages workflow with official actions pinned to SHAs and fallback pnpm version", () => {
  const workflow = renderGitHubPagesWorkflow({
    input: "./docs",
    outDir: "dist",
  });

  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/);
  assert.match(workflow, /pnpm\/action-setup@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/setup-node@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/configure-pages@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/upload-pages-artifact@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/deploy-pages@[a-f0-9]{40}/);
  assert.match(workflow, /version: 10\.29\.3/);
  assert.match(workflow, /pnpm exec lildocs deploy \.\/docs --out dist/);
});

test("renders GitHub Pages workflow without pnpm version when package manager should be inferred", () => {
  const workflow = renderGitHubPagesWorkflow({
    input: "./docs",
    outDir: "dist",
    pnpmVersion: false,
  });

  assert.doesNotMatch(workflow, /version: 10\.29\.3/);
  assert.doesNotMatch(workflow, /with:\n\s+version:/);
  assert.match(workflow, /pnpm\/action-setup@[a-f0-9]{40}/);
});

test("renders GitHub Pages workflow with project page base path", () => {
  const workflow = renderGitHubPagesWorkflow({
    input: "./docs",
    outDir: "dist",
    basePath: "repo",
  });

  assert.match(workflow, /pnpm exec lildocs deploy \.\/docs --out dist --base \/repo\//);
});
