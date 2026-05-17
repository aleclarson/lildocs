# lildocs Test Plan

This file captures implementation test coverage. Deferred cases have been converted into automated integration coverage where practical, with visual/browser checks left as manual verification items.

## CLI Behavior

- Running `lildocs <path>` with a folder path routes to the build flow.
- Running `lildocs <path>` with a Markdown file path routes to the build flow.
- Running `lildocs build <path>` routes to the build flow.
- Unknown commands report clear usage errors.
- Unsupported options report clear usage errors.

## Input Resolution

- Directory inputs are resolved relative to the current working directory.
- Markdown file inputs use the file as the home page and parent folder as docs root.
- Missing paths fail with a clear error.
- Unsupported file types fail with a clear error.

## Markdown Rendering

- Standard Markdown renders to HTML.
- GitHub-flavored Markdown tables, task lists, and strikethrough render correctly.
- Frontmatter is parsed without appearing in rendered page content.
- Code blocks render with syntax highlighting.
- Heading anchors are unique and stable.

## Assets

- Relative image assets are copied into the output site.
- Missing referenced assets produce a clear diagnostic.
- Asset links work from nested generated pages.

## Search

- Page titles are included in the static search index.
- Headings are included in the static search index.
- Body text is included in the static search index.
- Search works without an external service.

## Theming

- The default built-in theme is used when no theme is configured.
- `--theme minimal` selects the minimal built-in theme.
- Local `theme.ts` is discovered when no CLI theme is provided.
- CLI theme selection takes precedence over local `theme.ts`.
- Unknown theme names produce a clear error.

## Static Output

- Generated HTML works when opened directly from disk.
- Nested pages use correct relative links.
- The default output directory is `dist`.
- `--out <dir>` changes the output directory.
