# Local Search

> Give readers fast section-level search without a hosted service.

Search is generated locally at build time from page titles, headings, and body
text. The generated `search-index.json` is emitted with the static site, so no
external search service is required.

## Section Results

`h2` and `h3` sections get their own search entries. Results can link directly
to the most useful section instead of only opening the top of a page:

```md
## Install

Run the package manager command.

### Local Files

Place screenshots in the docs folder and reference them with relative paths.
```

## Search Interface

The search UI highlights matching terms and supports Arrow Up, Arrow Down,
Enter, and Escape. It also prefetches local result pages while readers browse
results.
