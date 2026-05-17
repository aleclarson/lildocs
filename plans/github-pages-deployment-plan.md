# GitHub Pages Deployment Support Plan

## Goal

Add first-class support for publishing a generated `lildocs` site to GitHub Pages.

The feature should make the common case simple:

```bash
lildocs deploy ./docs
```

And keep the existing static build path unchanged:

```bash
lildocs build ./docs --out dist
```

## Current State

`lildocs` already generates static HTML, CSS, JavaScript, search index JSON, and copied assets into an output directory.

Generated files are designed to work without a server, which is compatible with GitHub Pages. The missing pieces are:

- A deployment-oriented CLI command.
- GitHub Pages base path support for project pages.
- Optional workflow generation.
- `.nojekyll` emission.
- Tests around Pages-specific paths and output.
- Documentation for manual and automated deployment.

## GitHub Pages Constraints

GitHub Pages has two common URL shapes:

- User or organization site: `https://<owner>.github.io/`
- Project site: `https://<owner>.github.io/<repo>/`

`lildocs` currently emits relative links. That is mostly compatible with both shapes, but deployment support still needs to handle:

- Search script and index paths from nested pages.
- Mermaid CDN usage under Pages.
- Static assets under nested pages.
- Optional canonical/base metadata if added later.
- `.nojekyll` so directories and files beginning with `_` are not processed by Jekyll.

## Recommended CLI Surface

Add a new command:

```bash
lildocs deploy <path>
```

Initial options:

```bash
--out <dir>
--theme <name>
--font.heading <name-or-file>
--font.body <name-or-file>
--font.code <name-or-file>
--base <path>
--no-workflow
--workflow
```

Defaults:

- `--out dist`
- `--base auto`
- Generate deployable output, but do not push to GitHub.
- Do not mutate repository workflow files unless `--workflow` is provided.

Avoid implementing a command that pushes directly to GitHub in the first pass. A generated GitHub Actions workflow is safer, easier to review, and works for private/public repos consistently.

## Base Path Support

Although current relative URLs work for many cases, explicit base path support is useful for future absolute URLs, canonical links, Open Graph assets, and deployment diagnostics.

Add optional build config:

```ts
type BuildOptions = {
  input: string;
  outDir: string;
  cwd: string;
  theme?: string;
  fonts?: FontOverrides;
  basePath?: string;
};
```

Rules:

- Empty base path means root deployment.
- `repo-name` and `/repo-name` normalize to `/repo-name/`.
- `/` remains `/`.
- Reject URLs with a protocol for now; GitHub Pages base path should be a path, not an origin.
- Keep generated page-to-page links relative unless a future feature needs absolute paths.

For the first implementation, base path may only be recorded in metadata or reserved for workflow docs. Do not rewrite working relative URLs unnecessarily.

## Deploy Command Behavior

`lildocs deploy <path>` should:

1. Run the same build pipeline as `build`.
2. Emit `.nojekyll` into the output directory.
3. Emit a small deployment metadata file:

```text
dist/lildocs-deploy.json
```

Suggested contents:

```json
{
  "target": "github-pages",
  "basePath": "/repo/",
  "generatedAt": "2026-05-17T00:00:00.000Z"
}
```

4. Print next-step instructions:

```text
Built GitHub Pages site to dist
Upload dist with actions/upload-pages-artifact or run with --workflow to create a workflow.
```

If `--workflow` is provided:

5. Create `.github/workflows/lildocs-pages.yml` if it does not exist.
6. Refuse to overwrite an existing workflow unless `--force` is added later.
7. Print the workflow path.

## Workflow Generation

Generated workflow should use official GitHub Pages actions:

```yaml
name: Deploy lildocs to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.29.3
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - run: node dist/cli.mjs build ./docs --out dist
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

The generated input path should match the user-provided path where practical. If the user passes an absolute path, convert it to a repo-relative path when possible; otherwise refuse workflow generation with a clear error.

## File Structure

Add modules:

```text
src/core/deploy.ts
src/core/github-pages.ts
```

Possible exports:

```ts
export type DeployOptions = BuildOptions & {
  basePath?: string;
  workflow?: boolean;
};

export async function deployGitHubPages(options: DeployOptions): Promise<DeployResult>;
```

```ts
export function normalizeBasePath(value?: string): string;
export function renderGitHubPagesWorkflow(options: WorkflowOptions): string;
```

## CLI Integration

Update `src/cli.ts`:

- Add `deployCommand`.
- Reuse build options: `--out`, `--theme`, font flags.
- Add `--base`.
- Add `--workflow`.
- Route to `deployGitHubPages`.

Keep bare `lildocs <path>` mapped to build, not deploy.

## Tests

Add focused test files:

```text
test/deploy.test.mjs
test/github-pages.test.mjs
```

### Deploy Output Tests

- `lildocs deploy <path>` builds the site.
- `.nojekyll` is emitted.
- `lildocs-deploy.json` is emitted.
- Custom `--out` is respected.
- `--theme` and font options still affect output.
- Generated output still includes search index, search JS, CSS, assets, and pages.

### Base Path Tests

- Missing base normalizes to `/`.
- `/` remains `/`.
- `repo` normalizes to `/repo/`.
- `/repo` normalizes to `/repo/`.
- `/repo/` remains `/repo/`.
- Protocol URLs are rejected.

### Workflow Tests

- `--workflow` writes `.github/workflows/lildocs-pages.yml`.
- Workflow contains official Pages actions.
- Workflow uses pnpm.
- Workflow uses the requested docs input path when repo-relative.
- Existing workflow is not overwritten.
- Absolute input outside the repo fails clearly for workflow generation.

### Regression Tests

- `lildocs build` output does not emit deploy metadata.
- `lildocs build` output does not emit `.nojekyll` unless separately requested in the future.
- Existing static relative links still work from nested pages.

## Documentation Updates

Update `README.md` with:

```bash
node dist/cli.mjs deploy ./docs
node dist/cli.mjs deploy ./docs --workflow
```

Document:

- How to enable GitHub Pages source as "GitHub Actions".
- What the generated workflow does.
- How to use `--base` for project pages if/when absolute metadata uses it.
- That `deploy` prepares output and workflow files; it does not push commits.

Update `AGENTS.md` only if new durable commands or product constraints are added.

## Dependency Decision

No new runtime dependency is needed.

Use:

- Node `fs/promises` for file emission.
- Existing CLI parsing with `cmd-ts`.
- Existing build pipeline.

YAML can be generated as a static string. Do not add a YAML dependency unless workflows become user-configurable.

## Implementation Steps

1. Add base path normalization helper and tests.
2. Add deploy module that wraps `buildSite`.
3. Emit `.nojekyll` and deploy metadata.
4. Add deploy CLI command and options.
5. Add workflow rendering helper.
6. Add `--workflow` file generation with overwrite protection.
7. Add deploy and workflow tests.
8. Update README.
9. Run `pnpm run lint`, `pnpm run typecheck`, `pnpm test`, and `pnpm run format:check`.
10. Manually inspect generated workflow for a fixture repo path.

## Open Questions

- Should `deploy` be named `github-pages` instead? Recommendation: use `deploy`, but keep implementation GitHub Pages-specific for now.
- Should `.nojekyll` be emitted for all builds? Recommendation: no, only deploy for now.
- Should `deploy` push to a `gh-pages` branch? Recommendation: no for the first implementation; GitHub Actions Pages is the safer default.
- Should `--base auto` detect repository name from `package.json` or `git remote`? Recommendation: not initially. Require explicit `--base` when it matters.

## Acceptance Criteria

- `lildocs deploy ./docs` creates GitHub Pages-ready output.
- Output contains `.nojekyll` and deployment metadata.
- `--workflow` creates a working GitHub Actions Pages workflow.
- Existing `build` behavior is unchanged.
- Tests cover deploy output, base path normalization, workflow generation, and build regressions.
