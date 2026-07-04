---
title: Configuration
---

# Configuration

lildocs works without configuration. Add `config.json` to the docs root when you
want persistent defaults:

```json
{
  "$schema": "https://raw.githubusercontent.com/aleclarson/lildocs/main/schemas/config.schema.json",
  "projectName": "Acme Docs",
  "theme": {
    "light": "github-light",
    "dark": "github-dark"
  },
  "favicon": "./images/favicon.svg",
  "font": {
    "heading": "Inter",
    "body": "Source Sans 3",
    "code": "Roboto Mono"
  },
  "logo": {
    "image": "./images/logo.svg",
    "text": "Acme Docs",
    "font": "Onest"
  },
  "background": {
    "gradient": "linear-gradient(135deg, rgb(121 184 255 / 0.14), transparent 38%)",
    "blendMode": "screen"
  },
  "link": {
    "underline": "hover"
  },
  "reference": {
    "packageJson": "../package.json"
  },
  "navigation": {
    "order": ["index.md", "getting-started.md", "guides/", "reference/"],
    "transition": "fade",
    "duration": 160,
    "easing": "cubic-bezier(0.16, 1, 0.3, 1)"
  }
}
```

CLI flags override `config.json` values for one command run.

## Schema

`$schema` points editors and language servers at the lildocs JSON schema:

```json
{
  "$schema": "https://raw.githubusercontent.com/aleclarson/lildocs/main/schemas/config.schema.json"
}
```

This field is optional and does not change build behavior.

## Fields

| Field | Description |
| --- | --- |
| `projectName` | Project name appended to each browser document title. Defaults to the nearest `package.json` `name`. |
| `theme` | Built-in lildocs theme, bundled Shiki theme name, or `{ "light": "...", "dark": "..." }` system theme pair. |
| `favicon` | Browser icon from a URL, data URL, absolute URL path, or docs-relative image path. |
| `font.heading` | Font used for page titles and headings. |
| `font.body` | Font used for normal text and interface text. |
| `font.code` | Font used for inline code and fenced code blocks. |
| `logo.image` | Header logo image from a URL, data URL, absolute URL path, or docs-relative image path. |
| `logo.text` | Header brand text. |
| `logo.font` | Font used for header brand text. |
| `background.image` | Background image from a URL or docs-relative file path. |
| `background.gradient` | CSS background gradient. |
| `background.blendMode` | CSS `background-blend-mode` for the theme color and configured background layers. |
| `link.underline` | Content link underline behavior: `always`, `hover`, or `none`. |
| `reference.packageJson` | Docs-root-relative path to a `package.json` whose exported TypeScript declarations generate `/reference/` API pages. |
| `navigation.order` | Docs-root-relative Markdown files or folders, in generated navigation order. Unlisted pages keep entry-point link order, then generated order after listed siblings. |
| `navigation.transition` | Enhanced navigation transition preset: `fade`, `slide`, `scale`, or `instant`. |
| `navigation.duration` | Enhanced navigation transition duration in milliseconds. |
| `navigation.easing` | CSS timing function used by enhanced navigation transitions. |

See [Themes and styling](theming.md) for field-specific examples and theme
resolution behavior.

## CLI Flag Mappings

| Flag | JSON config |
| --- | --- |
| `--theme <name>` | `theme` |
| `--font.heading <name-or-file>` | `font.heading` |
| `--font.body <name-or-file>` | `font.body` |
| `--font.code <name-or-file>` | `font.code` |
| `--background.image <url-or-file>` | `background.image` |
| `--background.gradient <gradient>` | `background.gradient` |
| `--background.blendMode <mode>` | `background.blendMode` |
| `--link.underline <style>` | `link.underline` |

`--out <dir>` has no JSON config equivalent. It sets the generated site
directory for the current command. Build and deploy default to `dist`; dev
defaults to `.lildocs`.

`--host <address>`, `--port <number>`, and `--open` are dev-only server options
and have no JSON config equivalent.

`--base <path>` and `--workflow` are deploy-only options and have no JSON config
equivalent.

`favicon`, `logo.image`, `logo.text`, `logo.font`, and
`reference.packageJson` are configuration-only and have no CLI flag equivalents.

## API Reference

When `reference.packageJson` points to a package manifest with TypeScript
declaration exports, lildocs uses those exports to generate static API pages
under `/reference/`.

If `reference.packageJson` is not configured, lildocs also checks for a
`package.json` next to the docs root. Sibling package manifests without an
`exports` field are ignored.
