# lildocs

`lildocs` turns a folder of Markdown files into a static searchable documentation site.

## Usage

```bash
pnpm install
pnpm run build
node dist/cli.mjs ./docs
node dist/cli.mjs ./docs/index.md
node dist/cli.mjs build ./docs --out dist --theme minimal
node dist/cli.mjs build ./docs --font.heading Inter --font.body "Source Sans 3" --font.code "Roboto Mono"
node dist/cli.mjs deploy ./docs
node dist/cli.mjs deploy ./docs --workflow
```

Generated HTML is written to `dist` by default and can be opened directly from disk.

Docs folders can include `config.json` for theme and font defaults:

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
  }
}
```

`theme` accepts `default`, `minimal`, or a bundled Shiki theme name. CLI flags override config values.

Backgrounds support `background.image`, `background.gradient`, and `background.blendMode`.

## Development

```bash
pnpm run format
pnpm run lint
pnpm run build
pnpm test
```

The v1 CLI supports:

- `lildocs <path>`
- `lildocs build <path>`
- `lildocs dev <path>`
- `--out <dir>`
- `--theme <name>`
- `--font.heading <name-or-file>`
- `--font.body <name-or-file>`
- `--font.code <name-or-file>`
- `--background.image <url-or-file>`
- `--background.gradient <gradient>`
- `--background.blendMode <mode>`

Font options accept either a Google Fonts family name or a local `.woff2`, `.woff`, `.ttf`, or `.otf` file path.

## GitHub Pages

`lildocs deploy <path>` builds the same static site as `build`, then adds GitHub Pages deployment files:

- `.nojekyll`
- `lildocs-deploy.json`

The command prepares output only. It does not commit, push, or publish the site directly.

```bash
node dist/cli.mjs deploy ./docs --out dist
node dist/cli.mjs deploy ./docs --base /repo-name/
```

Use `--base /repo-name/` for GitHub project pages when you want deployment metadata to record the project path. Generated page links remain relative so the site can still be opened from disk.

To generate a GitHub Actions workflow:

```bash
node dist/cli.mjs deploy ./docs --workflow
```

This creates `.github/workflows/lildocs-pages.yml` if it does not already exist. The workflow installs dependencies with pnpm, builds the CLI, generates the site, uploads the output with `actions/upload-pages-artifact`, and deploys with `actions/deploy-pages`. In your repository settings, set Pages source to **GitHub Actions** before relying on the workflow.
