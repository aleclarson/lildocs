Build a lightweight CLI that turns a folder of Markdown files into a static, searchable documentation website. Primary audience is engineering/docs teams maintaining coding docs. The user-facing model should be simple:

```bash
lildocs ./docs
lildocs ./docs/index.md
lildocs build ./docs --out dist
```

The tool should be **zero-config for now**. A user should be able to point it at Markdown and get a complete static site.

## Core behavior

Input handling:

* If the CLI receives a **folder path**, treat that folder as the docs root.
* Find the home page by checking a long ordered list of common names, for example:

  * `index.md`
  * `intro.md`
  * `introduction.md`
  * `getting-started.md`
  * `quickstart.md`
  * `readme.md`
  * `README.md`
* If the CLI receives a **`.md` file path**, treat that file as the home page and its parent folder as the docs root.

Navigation:

* Generate navigation from the folder structure.
* Use Markdown frontmatter when present, but do not require it.
* Infer page titles from frontmatter, first `h1`, or filename, in that order.
* Support nested folders.
* Ignore hidden/system files.
* Punt on complex manual nav configuration for now.

Output:

* Generate a static site into `dist` by default.
* Static HTML should work without a server.
* Prioritize zero client-side JavaScript where possible.

## Frontend architecture

Use:

* **Preact SSR** for rendering.
* **CSS Modules** for component-scoped styles.
* **CSS variables** for theme values.
* Prefer no client-side JS unless required for search, Mermaid, or progressive enhancement.

The user should not need to know or care that Preact is used internally.

Vite-Node is worth evaluating for the SSG runtime, especially for loading TypeScript theme files and running build-time rendering code.

## Theming

Theming should be minimal and build-time driven.

Support:

```bash
lildocs ./docs --theme minimal
```

And optionally:

```text
theme.ts
```

Theme resolution:

1. If `--theme` is provided, use a built-in theme.
2. Else, if local `theme.ts` exists, load it.
3. Else, use the default built-in theme.

Generate CSS variables at build time.

Keep design tokens limited to:

* colors
* font families
* font sizes / font scale, only if needed

Do **not** create broad design-token systems for spacing, borders, shadows, layout, etc.

Example theme shape:

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
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
};
```

## UI direction

Keep the UI extremely simple:

* left sidebar navigation
* main content column
* optional right-side table of contents if easy
* responsive mobile layout
* readable code blocks
* search entry point
* minimal header

Use `vw` heavily for responsive widths, then constrain with `max-width` on wide screens.

Example layout philosophy:

```css
.page {
  width: 92vw;
  max-width: 1280px;
  margin-inline: auto;
}
```

Avoid elaborate visual styling. Fewer color tokens are better.

## Markdown support

Essential Markdown features:

* standard Markdown
* GitHub-flavored Markdown
* frontmatter
* syntax-highlighted code blocks
* heading anchors
* relative Markdown links
* images/assets
* Mermaid diagrams by default

Mermaid should work out of the box. Prefer rendering diagrams at build time if practical; otherwise use the least amount of client-side JS necessary.

## Search

Search is required.

Initial implementation should be local/static search:

* build a search index at compile time
* search page titles, headings, and body text
* expose a minimal search UI
* no external service dependency
* no hosted search requirement

Keep it simple. It does not need Algolia-level ranking in v1.

## Build pipeline

Suggested pipeline:

1. Resolve input path.
2. Determine docs root and home page.
3. Recursively collect Markdown files.
4. Parse frontmatter and Markdown.
5. Infer titles, slugs, routes, and nav tree.
6. Transform Markdown to HTML.
7. Process Mermaid blocks.
8. Generate search index.
9. Render pages with Preact SSR.
10. Emit static HTML, CSS, assets, and search index.

## CLI surface

Keep the CLI tiny:

```bash
lildocs <path>
lildocs build <path>
lildocs dev <path>
```

Options:

```bash
--out dist
--theme <name>
```

Nice-to-have but not essential:

```bash
lildocs check <path>
```

`check` can come later. Do not block v1 on validation tooling.

## Punt for v1

Do not build yet:

* manual nav config
* versioned docs
* MDX
* plugin system
* API reference generators
* hosted search integrations
* auth
* CMS features
* complex theme APIs
* component overrides
* multi-language/i18n
* redirects
* advanced analytics
* edit-this-page links
* deploy integrations

## Success criteria

A developer can run:

```bash
lildocs ./docs
```

against a normal folder of Markdown files and get:

* a static documentation website
* generated navigation
* a working home page
* searchable content
* Mermaid diagrams
* readable code docs
* minimal responsive UI
* no required config
* no need to understand the frontend implementation

