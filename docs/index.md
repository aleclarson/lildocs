# Introducing lildocs

> A map of the lildocs documentation, from first build through content,
> navigation, search, diagrams, configuration, and deployment.

`lildocs` builds a static, searchable documentation site from Markdown files.
The default path is intentionally short:

```bash
lildocs ./docs
```

Use this documentation to learn how lildocs resolves input, turns folders into
site navigation, applies configuration, and prepares output for local preview or
GitHub Pages.

## Start Here

- [Getting started](getting-started.md) covers installation, the first build, and
  local development.
- [CLI reference](reference/cli.md) lists every command and flag.

## Features

- [Writing content](features/content.md) covers Markdown, page metadata, links,
  assets, and callouts.
- [Navigation and page structure](features/navigation.md) explains home-page
  discovery, generated sidebars, ordering, breadcrumbs, and transitions.
- [Local search](features/search.md) covers the static index, section-level
  results, and keyboard navigation.
- [Mermaid diagrams](features/mermaid.md) explains build-time static rendering,
  themes, and error reporting.
- [Generated API reference](features/api-reference.md) turns exported TypeScript
  declarations into static reference pages.

## Configuration And Styling

- [Configuration reference](reference/configuration.md) lists `config.json`
  fields, schema support, precedence, and CLI flag mappings.
- [Themes and styling](reference/theming.md) covers built-in themes, Shiki
  themes, local `theme.ts`, fonts, backgrounds, and link styling.

## Publishing

- [GitHub Pages deployment](guides/github-pages.md) shows how to generate
  Pages-ready output and initialize a deployment workflow.
