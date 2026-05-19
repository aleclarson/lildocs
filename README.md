# lildocs

`lildocs` is a small Node/TypeScript CLI that turns Markdown files into a static,
searchable documentation site.

It is built for projects that already keep docs in a repository and want a
complete site without MDX, hosted search, or a large theme system. Point it at a
folder or a single Markdown file and it finds the home page, infers navigation
from the folder structure, renders Markdown and Mermaid, copies local assets,
and writes self-contained HTML.

```bash
lildocs ./docs
```

Generated sites use relative links and a local search index, so they work from
disk or from any static file host.

## What it covers

- Markdown folders or individual Markdown entry files
- Generated navigation, page titles, heading anchors, and table-of-contents data
- GitHub-flavored Markdown, frontmatter, callouts, code highlighting, images,
  assets, and Mermaid diagrams
- Local static search with no external service
- Build, development server, and GitHub Pages output modes
- Lightweight theming with built-in themes, Shiki themes, local `theme.ts`, and
  font/background/link options

## Documentation

- [Getting started](https://aleclarson.github.io/lildocs/getting-started.html)
- [Authoring docs](https://aleclarson.github.io/lildocs/guides/authoring.html)
- [GitHub Pages deployment](https://aleclarson.github.io/lildocs/guides/github-pages.html)
- [CLI reference](https://aleclarson.github.io/lildocs/reference/cli.html)
- [Configuration reference](https://aleclarson.github.io/lildocs/reference/configuration.html)
- [Themes and styling](https://aleclarson.github.io/lildocs/reference/theming.html)
- [Contributing](https://aleclarson.github.io/lildocs/contributing.html)

`lildocs` is intentionally narrow: no manual nav config, versioned docs, MDX,
plugin system, hosted search, auth, CMS features, i18n, redirects, analytics, or
API reference generation.
