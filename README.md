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
```

Generated HTML is written to `dist` by default and can be opened directly from disk.

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
- `lildocs dev <path>` currently returns a clear not-implemented message.
- `--out <dir>`
- `--theme <name>`
- `--font.heading <name-or-file>`
- `--font.body <name-or-file>`
- `--font.code <name-or-file>`

Font options accept either a Google Fonts family name or a local `.woff2`, `.woff`, `.ttf`, or `.otf` file path.
