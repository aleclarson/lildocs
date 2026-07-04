---
title: CLI Reference
---

# Command Line

lildocs supports these command shapes:

```bash
lildocs <path>
lildocs build <path>
lildocs dev <path>
lildocs deploy <path>
```

`<path>` can be a Markdown folder or a single Markdown file.

## Bare Build Command

Build a static documentation site from a Markdown folder or file.

```bash
lildocs ./docs
```

This is the shortest form of the build command. It treats `./docs` as the
documentation root, finds the home page, generates navigation from the folder
structure, builds a search index, and writes the site to `dist`.

If the path points to a Markdown file, that file becomes the home page and its
parent folder becomes the docs root:

```bash
lildocs ./docs/index.md
```

Use this form for simple local scripts, CI jobs, or one-off builds.

## Build Command

Build a static documentation site with the explicit `build` subcommand.

```bash
lildocs build ./docs
```

`build` does the same generation work as the bare `lildocs <path>` form, but it
is clearer in package scripts and CI configuration:

```bash
pnpm lildocs build ./docs
```

Build output is self-contained. Page links are relative, local assets are copied
into the output folder, and `search-index.json` is generated next to the HTML
files.

## Dev Command

Start a local development server that rebuilds the generated site when docs
files change.

```bash
lildocs dev ./docs
```

The dev server writes generated files to `.lildocs` by default, serves them from
`127.0.0.1:3000`, and injects a small live-reload client while developing.
Add `--open` to launch the preview in your default browser.

Choose a different output folder when you want to inspect generated files:

```bash
lildocs dev ./docs --out ./.docs-preview
```

Choose the host or port when the defaults conflict with another local service:

```bash
lildocs dev ./docs --host 0.0.0.0 --port 4173
```

The dev output directory must stay inside the current workspace, cannot be the
repository root, and cannot contain the docs root.

## Deploy Command

Build GitHub Pages-ready output.

```bash
lildocs deploy ./docs
```

`deploy` builds the same static site as `build`, then adds Pages deployment
metadata. See [GitHub Pages](../guides/github-pages.md) for the full publishing
workflow.

## Options

| Option | Applies to | Description |
| --- | --- | --- |
| `--out <dir>` | build, dev, deploy | Output directory for generated files. Build and deploy default to `dist`; dev defaults to `.lildocs`. |
| `--theme <name>` | build, dev, deploy | Built-in lildocs theme or bundled Shiki theme name. |
| `--font.heading <name-or-file>` | build, dev, deploy | Heading font from Google Fonts or a local font file. |
| `--font.body <name-or-file>` | build, dev, deploy | Body and interface font from Google Fonts or a local font file. |
| `--font.code <name-or-file>` | build, dev, deploy | Code font from Google Fonts or a local font file. |
| `--background.image <url-or-file>` | build, dev, deploy | Background image URL or docs-relative image path. |
| `--background.gradient <gradient>` | build, dev, deploy | CSS background gradient. |
| `--background.blendMode <mode>` | build, dev, deploy | CSS `background-blend-mode` for the theme color and background layers. |
| `--link.underline <style>` | build, dev, deploy | Content link underline behavior: `always`, `hover`, or `none`. |
| `--host <address>` | dev | Host address for the local development server. |
| `--port <number>` | dev | Port for the local development server. |
| `--open` | dev | Open the local development server in the default browser. |
| `--base <path>` | deploy | GitHub Pages base path, such as `/repo/` for project pages. |
| `--workflow` | deploy | Create a GitHub Actions workflow for GitHub Pages deployment. |

CLI flags override matching `config.json` values. See
[Configuration](configuration.md) for persistent defaults.

Favicon and logo settings are configuration-only and do not have CLI flags. See
[Themes and styling](theming.md) for examples.
