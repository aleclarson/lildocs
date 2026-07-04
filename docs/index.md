---
title: lildocs Documentation
---

# lildocs Documentation

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
- [Authoring docs](guides/authoring.md) explains Markdown support, page titles,
  navigation, assets, callouts, Mermaid, and search.
- [CLI reference](reference/cli.md) lists every command and flag.

## Configuration And Styling

- [Configuration](reference/configuration.md) documents `config.json`, schema
  support, and CLI flag mappings.
- [Themes and styling](reference/theming.md) covers built-in themes, Shiki
  themes, local `theme.ts`, fonts, backgrounds, and link styling.

## Publishing

- [GitHub Pages deployment](guides/github-pages.md) shows how to generate
  Pages-ready output and initialize a deployment workflow.
