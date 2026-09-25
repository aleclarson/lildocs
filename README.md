# lildocs

`lildocs` is a small Node/TypeScript CLI that turns Markdown files into a static,
searchable documentation site.

It is built for projects that already keep docs in a repository and want a
complete site without MDX, hosted search, or a large theme system. Point it at a
folder or a single Markdown file and it finds the home page, infers navigation
from the folder structure and home page links, renders Markdown and Mermaid,
copies local assets, and writes self-contained HTML.

```bash
lildocs ./docs
```

Generated sites use relative links and a local search index, so they work from
disk or from any static file host.

## What it covers

- Markdown folders or individual Markdown entry files
- Plain Markdown URLs for every page, such as `guide.md` alongside `guide/`
- Generated navigation, page titles, heading anchors, and table-of-contents data
- GitHub-flavored Markdown, frontmatter, callouts, code highlighting, images,
  assets, and Mermaid diagrams
- Local static search with no external service
- Build, development server, visual shuffle, and GitHub Pages output modes
- Lightweight theming with system light/dark defaults, built-in themes, Shiki
  themes, local `theme.ts`, favicon/logo options, and font/background/link
  options

## Documentation

- [Getting started](https://aleclarson.github.io/lildocs/getting-started/)
- [Writing content](https://aleclarson.github.io/lildocs/features/content/)
- [Navigation and page structure](https://aleclarson.github.io/lildocs/features/navigation/)
- [Local search](https://aleclarson.github.io/lildocs/features/search/)
- [Mermaid diagrams](https://aleclarson.github.io/lildocs/features/mermaid/)
- [Generated API reference](https://aleclarson.github.io/lildocs/features/api-reference/)
- [GitHub Pages deployment](https://aleclarson.github.io/lildocs/guides/github-pages/)
- [CLI reference](https://aleclarson.github.io/lildocs/reference/cli/)
- [Configuration reference](https://aleclarson.github.io/lildocs/reference/configuration/)
- [Themes and styling](https://aleclarson.github.io/lildocs/reference/theming/)

`lildocs` is intentionally narrow: no manual nav config, versioned docs, MDX,
plugin system, hosted search, auth, CMS features, i18n, redirects, analytics, or
API reference generation.

## Contributing

Use these commands when working on lildocs itself:

```bash
pnpm install
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm test
```

Keep behavior aligned with the README, documentation, and existing tests.

The project uses:

- `cmd-ts` for CLI parsing
- Flamefront and Octane for prerendering and client navigation
- `marked` and `gray-matter` for Markdown and frontmatter
- native dynamic `import()` for local theme loading
- `tsdown` for the CLI bundle and Vite for the renderer bundle
- `oxlint` for linting
- Prettier with the TSRX plugin for formatting
- Vitest with the Octane Vite compiler plugin
