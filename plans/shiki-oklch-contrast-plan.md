# Shiki OKLCH Contrast Tuning Plan

## Goal

Use `culori` and OKLCH color adjustments when mapping bundled Shiki themes into lildocs theme values, especially where contrast controls readability and visual separation. The immediate priority is the relationship between the page background and Shiki code block background, because code blocks should remain legible and distinct without relying on CSS borders.

This should keep lildocs' public theme API small. The implementation should improve generated CSS variables from Shiki themes rather than introduce broad design tokens or user-facing theme knobs.

## Current State

`src/core/theme.ts` maps a requested bundled Shiki theme into lildocs color variables in `mapShikiThemeToTheme`.

Important existing values:

- `background` comes from `editor.background`, `background`, or `sideBar.background`.
- `text` comes from editor or sidebar foreground values.
- `codeBackground` comes from `textCodeBlock.background`, editor widget/line highlight colors, or falls back to `background`.
- `border` is still generated as a theme variable for the rest of the UI.

`src/render/styles.css` applies `--ld-color-code-background` to `.content pre`. Code blocks should no longer use a CSS border for separation, so the background itself needs to carry enough perceptual contrast against the page.

## Dependency

Add `culori` as a runtime dependency.

Reason: lildocs already does build-time theme normalization, and `culori` gives a focused, well-tested way to parse CSS colors, convert to OKLCH, compute contrast, and serialize colors. This is preferable to hand-rolling color math and keeps the change contained to theme mapping.

## Contrast Policy

Use OKLCH tuning only when the input color can be parsed safely. If parsing fails, preserve the original Shiki value.

Target behavior:

- Preserve Shiki colors when contrast is already acceptable.
- If `codeBackground` is too close to `background`, adjust only `codeBackground`.
- For light themes, make the code background slightly darker than the page background.
- For dark themes, make the code background slightly lighter than the page background.
- Keep chroma low for adjusted backgrounds so code blocks do not take on strong color casts from token themes.
- Clamp OKLCH values to valid displayable sRGB output.

Suggested thresholds:

- Minimum page/code background contrast: `1.08`.
- Preferred page/code background contrast: `1.14`.
- Maximum adjustment attempts: small bounded loop, for example 12 steps.
- Lightness step size: `0.015` in OKLCH `l`.
- Chroma cap for generated code backgrounds: `0.03`.

These numbers should be validated visually across `github-light`, `github-dark`, and at least one high-color bundled theme. The threshold should create visible separation without making code blocks look like callouts.

## Implementation Shape

Create small helpers in `src/core/theme.ts`, or a narrow `src/core/color.ts` if the helper set grows:

- `parseOklchColor(value: string)` parses with `culori`.
- `contrastRatio(a: string, b: string)` delegates to `culori` contrast utilities.
- `ensureBackgroundContrast(options)` returns the original candidate when contrast passes, otherwise returns a tuned color.
- `serializeThemeColor(color)` emits hex or stable CSS color syntax for generated variables.

Use the helper in `mapShikiThemeToTheme` after `background` and the raw `codeBackground` have been selected:

```ts
const codeBackground = ensureBackgroundContrast({
  background,
  candidate: rawCodeBackground,
  mode: shikiTheme.type === "dark" ? "dark" : "light",
});
```

Keep all public theme fields unchanged.

## Algorithm

1. Parse `background` and `candidate` with `culori`.
2. If either color cannot be converted to OKLCH, return `candidate`.
3. Measure contrast between the two original colors.
4. If contrast is at or above the minimum threshold, return `candidate`.
5. Convert the candidate to OKLCH.
6. Determine adjustment direction:
   - Light theme: reduce `l`.
   - Dark theme: increase `l`.
7. Cap chroma to avoid saturated block backgrounds.
8. Step lightness until the preferred threshold is reached or bounds/attempts are exhausted.
9. Return the best adjusted color found, serialized consistently.

The helper should choose the highest-contrast successful candidate if the preferred threshold cannot be reached within the bounds.

## Tests

Add focused unit or integration coverage in `test/theme.test.mjs`:

- A Shiki theme whose `textCodeBlock.background` equals `editor.background` produces a different `--ld-color-code-background`.
- Light theme adjustment makes code background darker than page background.
- Dark theme adjustment makes code background lighter than page background.
- Unparseable colors are preserved rather than throwing.
- Existing built-in lildocs themes are unchanged unless they opt into the helper later.

Add a static output assertion that `.content pre` no longer has a CSS `border` rule if the stylesheet is covered by tests, or keep this as a reviewed stylesheet change if there is no CSS test harness.

## Rollout

1. Remove the code block CSS border.
2. Add `culori`.
3. Implement and test OKLCH background contrast helpers.
4. Wire the helper into Shiki theme mapping only.
5. Run:

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm test
```

6. Preview generated docs with a light and dark Shiki theme and check that code blocks are visibly distinct without looking framed.

## Non-Goals

- Do not add user-facing contrast configuration yet.
- Do not change local `theme.ts` validation shape.
- Do not retune token foreground colors in this pass.
- Do not remove the general `border` theme color, because tables, search UI, and layout still use it.
