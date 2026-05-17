import path from "node:path";

export type WorkflowOptions = {
  input: string;
  outDir: string;
};

export function normalizeBasePath(value?: string): string {
  const basePath = value ?? "/";

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(basePath)) {
    throw new Error("GitHub Pages base path must be a path, not a URL.");
  }

  if (basePath === "" || basePath === "/") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function repoRelativeInputPath(input: string, cwd: string): string {
  const absoluteInput = path.resolve(cwd, input);
  const relativeInput = path.relative(cwd, absoluteInput);

  if (relativeInput.startsWith("..") || path.isAbsolute(relativeInput)) {
    throw new Error("Workflow generation requires the docs path to be inside the repository.");
  }

  return relativeInput.startsWith(".") ? relativeInput : `./${relativeInput}`;
}

export function renderGitHubPagesWorkflow(options: WorkflowOptions): string {
  return `name: Deploy lildocs to GitHub Pages

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
      - run: node dist/cli.mjs build ${options.input} --out ${options.outDir}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ${options.outDir}
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;
}
