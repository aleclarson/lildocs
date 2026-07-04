import path from "node:path";

export type WorkflowOptions = {
  input: string;
  outDir: string;
  basePath?: string;
  pnpmVersion?: string | false;
};

const DEFAULT_PNPM_VERSION = "10.29.3";

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
  const pnpmVersion = options.pnpmVersion ?? DEFAULT_PNPM_VERSION;
  const pnpmActionSetupOptions =
    pnpmVersion === false
      ? ""
      : `        with:
          version: ${pnpmVersion}
`;
  const deployArgs = [
    "deploy",
    options.input,
    "--out",
    options.outDir,
    ...(options.basePath ? ["--base", normalizeBasePath(options.basePath)] : []),
  ];

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
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: pnpm/action-setup@7088e561eb65bb68695d245aa206f005ef30921d
${pnpmActionSetupOptions}      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - run: pnpm exec lildocs ${deployArgs.map(shellQuote).join(" ")}
      - uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b
      - uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa
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
        uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e
`;
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}
