# lildocs

`lildocs` turns Markdown files into a static, searchable documentation site.

Point it at a docs folder or a single Markdown file and it emits plain HTML, CSS, assets, Mermaid diagrams, and a local search index. The generated site works without a server, so it can be opened from disk or hosted on any static file host.

## Install

Run `lildocs` directly with `pnpm dlx`:

```bash
pnpm dlx lildocs ./docs
```

Or add it to a project:

```bash
pnpm add -D lildocs
```

Then call it from a package script:

```json
{
  "scripts": {
    "docs:build": "lildocs build ./docs",
    "docs:dev": "lildocs dev ./docs"
  }
}
```

## Commands

### `lildocs <path>`

Build a static documentation site from a Markdown folder or a single Markdown file.

```bash
pnpm dlx lildocs ./docs
```

This is the shortest form of the build command. It treats `./docs` as the documentation root, finds the home page, generates navigation from the folder structure, builds a search index, and writes the site to `dist`.

If the path points to a Markdown file, that file becomes the home page and its parent folder becomes the docs root:

```bash
pnpm dlx lildocs ./docs/index.md
```

Use this form when you want the simplest possible command in local scripts, CI jobs, or one-off builds.

### `lildocs build <path>`

Build a static documentation site with the explicit `build` subcommand.

```bash
pnpm dlx lildocs build ./docs
```

`build` does the same generation work as the bare `lildocs <path>` form, but it is clearer in package scripts and CI configuration:

```bash
pnpm lildocs build ./docs
```

The output is self-contained. Page links are relative, local assets are copied into the output folder, and `search-index.json` is generated next to the HTML files.

When lildocs can detect a GitHub repository, the generated header includes a GitHub icon button before search. During GitHub Actions builds, lildocs uses the `GITHUB_REPOSITORY` environment variable. Otherwise, it walks up from the docs root to the nearest `package.json` and uses its `repository` field when it points to GitHub.

### `lildocs dev <path>`

Start a local development server that rebuilds the generated site when docs files change.

```bash
pnpm lildocs dev ./docs
```

The dev server writes generated files to `.lildocs` by default, serves them from `127.0.0.1:3000`, and injects a small live-reload client while developing.

Choose a different output folder when you want to inspect the generated files:

```bash
pnpm lildocs dev ./docs --out ./.docs-preview
```

Choose the host or port when the defaults conflict with another local service:

```bash
pnpm lildocs dev ./docs --host 0.0.0.0 --port 4173
```

The dev output directory must stay inside the current workspace, cannot be the repository root, and cannot contain the docs root.

### `lildocs deploy <path>`

Build GitHub Pages-ready output.

```bash
pnpm lildocs deploy ./docs
```

`deploy` builds the same static site as `build`, then adds GitHub Pages deployment metadata:

- `.nojekyll`
- `lildocs-deploy.json`

The command prepares files only. It does not commit, push, or publish your site.

Use `--base` for GitHub project pages metadata:

```bash
pnpm lildocs deploy ./docs --out ./site --base /repo-name/
```

Generated page links remain relative so the site can still be opened directly from disk.

To create a GitHub Actions workflow for Pages:

```bash
pnpm lildocs deploy ./docs --out ./site --workflow
```

This writes `.github/workflows/lildocs-pages.yml` if it does not already exist. The workflow installs dependencies with pnpm, builds the project, generates the site, uploads the output with `actions/upload-pages-artifact`, and deploys with `actions/deploy-pages`. In the repository settings, set Pages source to **GitHub Actions** before relying on the workflow.

## Configuration

`lildocs` works without configuration. Add `config.json` to the docs root when you want persistent defaults:

```json
{
  "$schema": "https://raw.githubusercontent.com/aleclarson/lildocs/main/schemas/config.schema.json",
  "theme": "github-dark",
  "font": {
    "heading": "Inter",
    "body": "Source Sans 3",
    "code": "Roboto Mono"
  },
  "background": {
    "gradient": "linear-gradient(135deg, rgb(121 184 255 / 0.14), transparent 38%)",
    "blendMode": "screen"
  },
  "link": {
    "underline": "hover"
  }
}
```

CLI flags override `config.json` values.

### `$schema`

`$schema` points editors and language servers at the lildocs JSON schema.

```json
{
  "$schema": "https://raw.githubusercontent.com/aleclarson/lildocs/main/schemas/config.schema.json"
}
```

This field is optional and does not change build behavior.

### `theme`

`theme` selects the visual theme and syntax highlighting theme.

```json
{
  "theme": "github-dark"
}
```

Use `default`, `minimal`, or any bundled Shiki theme name, such as `github-light` or `github-dark`.

If the docs root contains `theme.ts`, lildocs loads it when `theme` is not set and no `--theme` flag is provided.

Theme resolution order is:

1. `--theme`
2. `theme` from `config.json`
3. `theme.ts` in the docs root
4. the built-in default theme

### `font`

`font` configures the generated site's font families.

```json
{
  "font": {
    "heading": "Inter",
    "body": "Source Sans 3",
    "code": "Roboto Mono"
  }
}
```

Font values can be Google Fonts family names or local `.woff2`, `.woff`, `.ttf`, or `.otf` file paths.

#### `font.heading`

`font.heading` sets the font used for page titles and headings.

#### `font.body`

`font.body` sets the font used for normal text and interface text.

#### `font.code`

`font.code` sets the font used for inline code and fenced code blocks.

### `background`

`background` configures optional page background layers.

```json
{
  "background": {
    "image": "./images/background.svg",
    "gradient": "linear-gradient(135deg, rgb(121 184 255 / 0.14), transparent 38%)",
    "blendMode": "screen"
  }
}
```

#### `background.image`

`background.image` adds a background image from a URL or docs-relative file path. Local image files are copied into the generated site's assets.

#### `background.gradient`

`background.gradient` adds a CSS background gradient.

#### `background.blendMode`

`background.blendMode` sets `background-blend-mode` for the theme color and configured background layers.

### `link`

`link` configures link presentation in generated Markdown content.

```json
{
  "link": {
    "underline": "hover"
  }
}
```

#### `link.underline`

`link.underline` controls generated content link underlines. Use `always`, `hover`, or `none`.

### CLI Flag Mappings

CLI flags override their matching `config.json` values for one command run.

| Flag | JSON config |
| --- | --- |
| `--theme <name>` | `theme` |
| `--font.heading <name-or-file>` | `font.heading` |
| `--font.body <name-or-file>` | `font.body` |
| `--font.code <name-or-file>` | `font.code` |
| `--background.image <url-or-file>` | `background.image` |
| `--background.gradient <gradient>` | `background.gradient` |
| `--background.blendMode <mode>` | `background.blendMode` |
| `--link.underline always\|hover\|none` | `link.underline` |

`--out <dir>` has no JSON config equivalent. It sets the generated site directory for the current command. Build and deploy default to `dist`; dev defaults to `.lildocs`.

`--host <address>` and `--port <number>` are dev-only server options and have no JSON config equivalent.

`--base <path>` and `--workflow` are deploy-only options and have no JSON config equivalent.

### Local Theme Files

Create `theme.ts` in the docs root when you need a local theme object instead of a named built-in or Shiki theme.

```ts
export default {
  color: {
    background: "#ffffff",
    text: "#111111",
    mutedText: "#666666",
    border: "#e5e5e5",
    link: "#2563eb",
    codeBackground: "#f6f8fa",
  },
  font: {
    body: "system-ui, sans-serif",
    code: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
};
```

## Markdown Support

Pages can use standard Markdown, GitHub-flavored Markdown, GitHub-style callouts, frontmatter, fenced code blocks, relative Markdown links, images, and Mermaid diagrams.

Page titles are inferred from frontmatter first, then the first `h1`, then the filename. Navigation is generated from the folder structure, nested folders are supported, and hidden or system files are ignored.

Local search is generated at build time from page titles, headings, and body text. No external search service is required.

## Development

For contributing to lildocs itself:

```bash
pnpm install
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm test
```
