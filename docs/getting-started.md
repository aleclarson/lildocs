---
title: Getting Started
---

# Getting Started

Run lildocs directly with `pnpm dlx`:

```bash
pnpm dlx lildocs ./docs
```

Or add it to a project:

```bash
pnpm add -D lildocs
```

Then call it from package scripts:

```json
{
  "scripts": {
    "docs:build": "lildocs build ./docs",
    "docs:dev": "lildocs dev ./docs"
  }
}
```

## Build A Site

The shortest build command is:

```bash
lildocs ./docs
```

This treats `./docs` as the docs root, finds a home page, generates navigation
from the folder structure, builds a local search index, copies assets, and writes
the site to `dist`.

Use the explicit `build` subcommand when a script or CI job should make the
intent obvious:

```bash
lildocs build ./docs
```

If the input path points to a Markdown file, that file becomes the home page and
its parent folder becomes the docs root:

```bash
lildocs ./docs/index.md
```

The output is self-contained. Page links are relative, local assets are copied
into the output folder, and `search-index.json` is generated next to the HTML
files.

## Preview Locally

Use the development server while writing:

```bash
lildocs dev ./docs
```

The dev server writes generated files to `.lildocs` by default, serves them from
`127.0.0.1:3000`, and injects a small live-reload client while developing.

Choose a different output folder when you want to inspect the generated files:

```bash
lildocs dev ./docs --out ./.docs-preview
```

Choose the host or port when the defaults conflict with another local service:

```bash
lildocs dev ./docs --host 0.0.0.0 --port 4173
```

The dev output directory must stay inside the current workspace, cannot be the
repository root, and cannot contain the docs root.

## Next Steps

Read [Authoring docs](guides/authoring.md) to structure Markdown content, then
use the [CLI reference](reference/cli.md) and
[configuration reference](reference/configuration.md) for command and option
details.
