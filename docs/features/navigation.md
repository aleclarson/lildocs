# Navigation And Page Structure

> Turn a Markdown file tree into a home page, sidebar groups, breadcrumbs, and
> previous and next links.

## Docs Root And Home Page

When the input is a folder, lildocs treats that folder as the docs root and
looks for a home page in this order:

1. `README.md`
2. `readme.md`
3. `index.md`
4. `intro.md`
5. `introduction.md`
6. `getting-started.md`
7. `quickstart.md`

If none of those files exists, the first Markdown file found in the folder tree
is used as the home page.

When the input is a Markdown file, that file becomes the home page and its
parent folder becomes the docs root:

```bash
lildocs ./docs/index.md
```

## Generated Navigation

Nested folders become nested navigation groups, and hidden or system files are
ignored.

```text
docs/
  index.md
  getting-started.md
  guides/
    github-pages.md
  reference/
    cli.md
```

This tree creates a top-level sidebar link for `getting-started.md`, plus
`Guides` and `Reference` groups. The home page is not repeated in the sidebar;
the generated header brand links back to it instead.

Pages inside folders show a small group breadcrumb above the page content. The
label comes from the folder name.

## Ordering Pages

When the home page links to local Markdown documents, those pages are hoisted in
the sidebar in first-reference order. Unlinked pages continue to use generated
folder order.

Use `navigation.order` when you want to make the order explicit:

```json
{
  "navigation": {
    "order": ["getting-started.md", "features/", "reference/"]
  }
}
```

Entries are docs-root-relative Markdown files or folders. Unlisted pages keep
home-page link order, then generated order after listed siblings.

Multi-page sites also get previous and next links at the bottom of each page.
Those links follow the same order as the sidebar.

## Page Transitions

Enhanced page navigation can use a transition preset and custom timing:

```json
{
  "navigation": {
    "transition": "slide",
    "duration": 160,
    "easing": "cubic-bezier(0.16, 1, 0.3, 1)"
  }
}
```

`navigation.transition` accepts `fade`, `slide`, `scale`, or `instant`.
`navigation.duration` is measured in milliseconds, and `navigation.easing`
accepts any valid CSS timing function.

See the [configuration reference](../reference/configuration.md#navigation) for
the complete field summary.
