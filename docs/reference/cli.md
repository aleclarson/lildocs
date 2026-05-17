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

## Config

`docs/config.json` can declare the same theme and font settings:

```json
{
  "$schema": "https://raw.githubusercontent.com/alec/lildocs/main/schemas/config.schema.json",
  "theme": "github-dark",
  "font": {
    "heading": "Inter",
    "body": "Source Sans 3",
    "code": "Roboto Mono"
  }
}
```

`theme` accepts `default`, `minimal`, or a bundled Shiki theme name. CLI flags override config values.
