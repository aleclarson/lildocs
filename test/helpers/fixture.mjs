import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("dist/cli.mjs");

export async function fixtureWorkspace() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "lildocs-"));
  const docs = path.join(workspace, "docs");
  await mkdir(path.join(docs, "images"), { recursive: true });
  await writeFile(
    path.join(docs, "index.md"),
    `# Fixture Home

Welcome with searchable body copy.

![Sample](images/sample.svg)

[Guide](guide.md)

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`
`,
  );
  await writeFile(
    path.join(docs, "guide.md"),
    `---
title: Frontmatter Title
---

# Guide Page

## Guide Heading

Nested content.

| Feature | Status |
| --- | --- |
| Tables | Works |

- [x] Task lists

~~Removed copy~~
`,
  );
  await writeFile(path.join(docs, "quickstart.md"), "# Quickstart\n\nFast path.");
  await writeFile(path.join(docs, "images", "sample.svg"), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await writeFile(path.join(docs, ".hidden.md"), "# Hidden\n");

  return {
    workspace,
    docs,
  };
}

export async function writeDocFile(docs, relativePath, contents) {
  const filePath = path.join(docs, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
  return filePath;
}

export async function runCli(args, options = {}) {
  const env = { ...process.env };
  delete env.GITHUB_REPOSITORY;

  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    env,
    ...options,
  });
}
