---
name: lildocs
description: Use when writing, editing, reviewing, or restructuring lildocs documentation sites, Markdown technical docs, docs-root config, navigation, authoring guides, CLI references, release docs, or conceptual documentation that should build into a static lildocs site.
---

# Lildocs Documentation

> Use this skill to turn technical knowledge into lildocs-ready Markdown that is navigable, searchable, example-driven, and clear about what each page helps readers accomplish.

## Work From The Site Shape

Start by identifying the docs root, home page, folder hierarchy, and any
`config.json`. lildocs generates navigation from files and folders, so structure
is part of the user experience.

```text
docs/
  index.md
  getting-started.md
  guides/
    authoring.md
  reference/
    cli.md
  config.json
```

Use `navigation.order` only when generated order does not match the reader's
path. Keep paths docs-root-relative.

```json
{
  "navigation": {
    "order": ["index.md", "getting-started.md", "guides/", "reference/"]
  }
}
```

## Page Skeleton

Every page should have frontmatter when the sidebar label or browser title needs
to differ from the visible heading. Every H1 must be followed immediately by a
purpose blockquote that explains the page's actual job for the reader.

```md
---
title: CLI Reference
---

 # Command Line

> Use this page to choose the right lildocs command, understand which flags apply
> to each command, and copy the smallest command that fits your publishing flow.
```

Do not write a purpose blockquote that merely repeats the heading.

```md
 # Configuration

> Learn about configuration.
```

Prefer a purpose blockquote that narrows scope, reader intent, and outcome.

```md
 # Configuration

> Use this page to decide which settings belong in `config.json`, which options
> should stay as one-off CLI flags, and how those choices affect generated HTML.
```

## Code Blocks For Concepts

Every new, non-trivial concept needs a minimal code block example close to the
first explanation. This applies to configuration fields, commands, Markdown
patterns, folder layout, workflow steps, API shapes, and troubleshooting cases.

````md
Set `link.underline` when content links should only show underlines on hover:

```json
{
  "link": {
    "underline": "hover"
  }
}
```
````

For prose-only concepts, use a realistic before-and-after snippet instead of
leaving the concept abstract.

```md
Before:
The build failed.

After:
The build failed because `docs/config.json` contains invalid JSON.
```

## Explain Behavior, Not Internals

Document the behavior readers can rely on, then add implementation details only
when they change authoring decisions. lildocs readers usually need to know what
goes in Markdown, what appears in generated HTML, and what works from disk.

````md
Mermaid diagrams are rendered during the build, so generated pages contain
static SVG and do not need a Mermaid CDN script.

```mermaid
flowchart LR
  Markdown --> Build
  Build --> StaticSVG[Static SVG]
```
````

## Navigation And Search

Write navigation guidance around the generated file tree. Mention that the home
page is reached through the header brand, nested folders become sidebar groups,
and previous/next links follow generated page order.

```text
docs/
  index.md
  guide.md
  reference/
    cli.md
```

Search guidance should explain what authors can influence: page titles,
headings, and body text. Use H2/H3 headings for useful search destinations.

```md
 ## Install

Install the package before adding docs scripts.

 ### Package Scripts

Add one script for builds and one script for local preview.
```

## Links, Assets, And Static Output

Use normal relative Markdown links to other Markdown pages. lildocs rewrites
known Markdown links to generated HTML routes.

```md
Read the [CLI reference](../reference/cli.md).
```

Use normal Markdown image syntax for docs-local assets. lildocs copies local
assets into the generated site.

```md
![Generated navigation example](../images/navigation.svg)
```

## Configuration And Themes

Keep persistent choices in `docs/config.json`; keep one-off build choices as CLI
flags. Prefer the smallest configuration that communicates intent.

```json
{
  "theme": {
    "light": "github-light",
    "dark": "github-dark"
  },
  "font": {
    "body": "Inter",
    "code": "Roboto Mono"
  }
}
```

Use local `theme.ts` only when named themes and config fields cannot express the
site's visual requirements.

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

## Technical Writing Standards

Lead with the reader's task, then give the command, config, or Markdown pattern
that completes it. Avoid conceptual buildup before the reader can act.

````md
Build the docs into `dist`:

```bash
lildocs build ./docs
```
````

Prefer specific nouns and observable outcomes over vague claims.

```md
Weak:
This makes deployment easier.

Strong:
`lildocs deploy` adds `.nojekyll` and `lildocs-deploy.json` to the output
directory for GitHub Pages workflows.
```

Keep terminology stable across pages. If a term changes, update the nearby
examples and references in the same patch.

```md
Use `docs root` consistently.
Avoid switching between `content folder`, `source folder`, and `docs directory`
unless each term has a distinct meaning.
```

## Reference Pages

Reference pages should optimize for lookup speed: brief description, command or
field table, then examples for uncommon cases.

```md
| Option | Applies to | Description |
| --- | --- | --- |
| `--out <dir>` | build, dev, deploy | Output directory for generated files. |
```

When documenting errors, include the smallest failing input and the expected fix.

```json
{
  "navigation": {
    "order": ["missing.md"]
  }
}
```

```text
Fix: remove the entry or create `docs/missing.md`.
```

## Review Checklist

Before finishing docs changes, verify the page has a useful H1 purpose
blockquote, every non-trivial concept has a nearby minimal example, relative
links point to Markdown files, and docs behavior matches README, source, and
tests.

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm test
```
