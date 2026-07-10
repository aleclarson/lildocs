# Writing Content

> Use Markdown, frontmatter, links, assets, callouts, and page metadata to write
> lildocs pages.

Write normal Markdown files in your docs folder. lildocs supports standard and
GitHub-flavored Markdown, syntax-highlighted code blocks with copy buttons,
heading anchors, frontmatter, and local assets.

## Page Titles

Page titles are inferred in this order:

1. `title` in frontmatter
2. The first `h1`
3. The filename

Use frontmatter when the navigation label should differ from the visible page
heading:

```md
---
title: CLI Reference
---

# Command Line
```

## Page Subtitles

Place a plain blockquote immediately after the page `h1` to render short
supporting copy as a subtitle:

```md
# Command Line

> Choose the command and flags for building, previewing, or deploying docs.
```

Keep subtitles brief and descriptive. Blockquotes elsewhere on the page continue
to render as regular quoted notes unless they use GitHub-style callout syntax.

## Links And Assets

Use normal relative Markdown links:

```md
Read the [CLI reference](../reference/cli.md).
```

Use normal Markdown images for local assets:

```md
![Small example image](../images/example.svg)
```

![Small example image](../images/example.svg)

Local assets referenced by Markdown are copied into the generated site.

## Callouts

Use GitHub-style blockquote callouts to highlight notes, tips, important
details, warnings, and cautions:

```md
> [!NOTE]
> Useful context for readers who are skimming.

> [!WARNING]
> Something readers should check before continuing.
```

Supported callout types are `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and
`CAUTION`.

> [!TIP]
> Callouts are rendered as regular static HTML and work without client-side
> JavaScript.

## Related Features

- [Navigation and page structure](navigation.md) explains how files become a
  site hierarchy.
- [Mermaid diagrams](mermaid.md) covers build-time diagram rendering.
- [Local search](search.md) explains how page content is indexed.
