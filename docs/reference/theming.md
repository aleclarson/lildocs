---
title: Themes And Styling
---

# Themes And Styling

Theme and styling options are resolved at build time and emitted as static CSS.

## Theme

`theme` selects the visual theme and syntax highlighting theme:

```json
{
  "theme": "github-dark"
}
```

Use `default`, `minimal`, or any bundled Shiki theme name, such as
`github-light` or `github-dark`.

If the docs root contains `theme.ts`, lildocs loads it when `theme` is not set
and no `--theme` flag is provided.

Theme resolution order is:

1. `--theme`
2. `theme` from `config.json`
3. `theme.ts` in the docs root
4. The built-in default theme

## Local Theme Files

Create `theme.ts` in the docs root when you need a local theme object instead of
a named built-in or Shiki theme:

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

Local themes keep the token surface small: colors, font families, and syntax
highlighting theme configuration.

## Fonts

`font` configures the generated site's font families:

```json
{
  "font": {
    "heading": "Inter",
    "body": "Source Sans 3",
    "code": "Roboto Mono"
  }
}
```

Font values can be Google Fonts family names or local `.woff2`, `.woff`, `.ttf`,
or `.otf` file paths.

`font.heading` sets the font used for page titles and headings.

`font.body` sets the font used for normal text and interface text.

`font.code` sets the font used for inline code and fenced code blocks.

## Favicon

`favicon` configures the generated site's browser icon:

```json
{
  "favicon": "./images/favicon.svg"
}
```

The value can be a URL, data URL, absolute URL path, or docs-relative image
file. Local image files are copied into the generated site's assets.

## Logo

`logo` configures the generated site's header brand:

```json
{
  "logo": {
    "image": "./images/logo.svg",
    "text": "Acme Docs",
    "font": "Onest"
  }
}
```

`logo.image` can be a URL, data URL, absolute URL path, or docs-relative image
file. Local image files are copied into the generated site's assets.

`logo.text` sets the visible brand text. When omitted, no brand text is
rendered.

`logo.font` sets the brand text font. Values can be Google Fonts family names or
local `.woff2`, `.woff`, `.ttf`, or `.otf` file paths.

## Background

`background` configures optional page background layers:

```json
{
  "background": {
    "image": "./images/background.svg",
    "gradient": "linear-gradient(135deg, rgb(121 184 255 / 0.14), transparent 38%)",
    "blendMode": "screen"
  }
}
```

`background.image` adds a background image from a URL or docs-relative file path.
Local image files are copied into the generated site's assets.

`background.gradient` adds a CSS background gradient.

`background.blendMode` sets `background-blend-mode` for the theme color and
configured background layers.

## Links

`link` configures link presentation in generated Markdown content:

```json
{
  "link": {
    "underline": "hover"
  }
}
```

`link.underline` controls generated content link underlines. Use `always`,
`hover`, or `none`.

## Navigation

`navigation` configures the feel of enhanced page navigation:

```json
{
  "navigation": {
    "transition": "slide",
    "duration": 160,
    "easing": "cubic-bezier(0.16, 1, 0.3, 1)"
  }
}
```

`navigation.transition` selects the transition preset. Use `fade`, `slide`,
`scale`, or `instant`.

`navigation.duration` sets the transition duration in milliseconds.

`navigation.easing` sets the CSS timing function used by transitions. Any valid
CSS timing function is supported.
