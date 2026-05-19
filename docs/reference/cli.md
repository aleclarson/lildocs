---
title: CLI Reference
---

# Command Line

Use one of the supported command shapes:

```bash
lildocs <path>
lildocs build <path>
lildocs dev <path>
```

## Options

`--out <dir>` changes the output directory.

`--theme <name>` selects a built-in theme.

`--font.heading <name-or-file>` selects a heading font from Google Fonts or a local font file.

`--font.body <name-or-file>` selects a body font from Google Fonts or a local font file.

`--font.code <name-or-file>` selects a code font from Google Fonts or a local font file.

`--background.image <url-or-file>` sets a page background image from a URL or docs-relative file.

`--background.gradient <gradient>` sets a CSS background gradient.

`--background.blendMode <mode>` sets the CSS background blend mode.

`--link.underline always|hover|none` controls content link underlines.

## Config

`docs/config.json` can declare the same theme and font settings:

```json
{
  "$schema": "https://raw.githubusercontent.com/aleclarson/lildocs/main/schemas/config.schema.json",
  "theme": "github-dark",
  "font": {
    "heading": "Inter",
    "body": "Source Sans 3",
    "code": "Roboto Mono"
  },
  "background": {
    "gradient": "linear-gradient(135deg, rgb(121 184 255 / 0.14), transparent 38%)",
    "blendMode": "screen"
  },
  "link": {
    "underline": "hover"
  }
}
```

`theme` accepts `default`, `minimal`, or a bundled Shiki theme name. CLI flags override config values.

Backgrounds support `background.image`, `background.gradient`, and `background.blendMode`.
Image values can be URLs, `url(...)` values, or docs-relative file paths.

## Repository Link

Generated sites include a GitHub icon button before the search field when lildocs can detect a GitHub repository.

During GitHub Actions builds, lildocs reads `GITHUB_REPOSITORY` as `<owner>/<repo>`. For local builds, it walks up from the docs root to the nearest `package.json` and uses the `repository` field when it points to GitHub.
