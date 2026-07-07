import { pathToFileURL } from "node:url";
import { access } from "node:fs/promises";
import path from "node:path";
import { clampGamut, converter, formatHex, parse, wcagContrast } from "culori";
import { createJiti } from "jiti";
import { bundledThemes } from "shiki";
import type { AssetCopy } from "./markdown.js";
import type { MermaidThemeConfig } from "./mermaid.js";
import { LildocsError } from "./errors.js";

export type Theme = {
  color: {
    background: string;
    text: string;
    mutedText: string;
    border: string;
    link: string;
    codeBackground: string;
    codeForeground?: string;
    sidebarBackground?: string;
  };
  font: {
    heading?: string;
    body: string;
    code?: string;
    mono?: string;
  };
  shiki?: {
    theme: string;
  };
  background?: {
    gradient?: string;
    blendMode?: string;
  };
};

export type ThemeConfig =
  | string
  | {
      light?: string;
      dark?: string;
    };

export type ResolvedTheme = {
  light: Theme;
  dark?: Theme;
};

export type ThemeFonts = {
  heading: string;
  body: string;
  code: string;
};

export type FontOverrides = {
  heading?: string;
  body?: string;
  code?: string;
};

export type BackgroundOptions = {
  image?: string;
  gradient?: string;
  blendMode?: string;
};

export type LinkOptions = {
  underline?: "always" | "hover" | "none";
};

export type NavigationOptions = {
  transition?: "fade" | "slide" | "scale" | "instant";
  duration?: number;
  easing?: string;
};

export type ResolvedBackground = {
  css: string;
  assets: AssetCopy[];
};

const MIN_BACKGROUND_CONTRAST = 1.08;
const PREFERRED_BACKGROUND_CONTRAST = 1.14;
const MIN_DARK_BORDER_CONTRAST = 1.35;
const MAX_BACKGROUND_CONTRAST_STEPS = 12;
const BACKGROUND_LIGHTNESS_STEP = 0.015;
const MAX_BACKGROUND_CHROMA = 0.03;

const toOklch = converter("oklch");
const clampToRgb = clampGamut("rgb");

const themes: Record<string, Theme> = {
  default: {
    color: {
      background: "#ffffff",
      text: "#171717",
      mutedText: "#666666",
      border: "#e5e5e5",
      link: "#2563eb",
      codeBackground: "#f6f8fa",
      codeForeground: "#24292e",
      sidebarBackground: "#fafafa",
    },
    font: {
      heading: "system-ui, sans-serif",
      body: "system-ui, sans-serif",
      code: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    },
    shiki: {
      theme: "github-light",
    },
    background: {
      gradient: "linear-gradient(180deg, rgb(37 99 235 / 0.045), transparent 220px)",
    },
  },
  minimal: {
    color: {
      background: "#ffffff",
      text: "#111111",
      mutedText: "#707070",
      border: "#dddddd",
      link: "#0f766e",
      codeBackground: "#f7f7f7",
      codeForeground: "#24292e",
      sidebarBackground: "#ffffff",
    },
    font: {
      heading: "Arial, sans-serif",
      body: "Arial, sans-serif",
      code: "Menlo, Consolas, monospace",
    },
    shiki: {
      theme: "github-light",
    },
    background: {
      gradient: "linear-gradient(180deg, rgb(15 118 110 / 0.04), transparent 220px)",
    },
  },
};

export async function resolveTheme(options: {
  cwd: string;
  docsRoot: string;
  requestedTheme?: ThemeConfig;
}): Promise<ResolvedTheme> {
  if (options.requestedTheme) {
    if (typeof options.requestedTheme === "string") {
      return {
        light: await resolveThemeName(options.requestedTheme),
      };
    }

    return {
      light: await resolveThemeName(options.requestedTheme.light ?? "default"),
      dark: await resolveThemeName(options.requestedTheme.dark ?? "github-dark"),
    };
  }

  const localThemePath = path.join(options.docsRoot, "theme.ts");
  if (await exists(localThemePath)) {
    const jiti = createJiti(pathToFileURL(options.cwd).href);
    const module = await jiti.import(localThemePath, { default: true });
    return {
      light: validateTheme(module, localThemePath),
    };
  }

  return {
    light: themes.default,
    dark: await resolveThemeName("github-dark"),
  };
}

async function resolveThemeName(themeName: string): Promise<Theme> {
  const theme = themes[themeName];
  if (theme) {
    return theme;
  }

  return resolveShikiTheme(themeName);
}

async function resolveShikiTheme(themeName: string): Promise<Theme> {
  const themeLoader = bundledThemes[themeName as keyof typeof bundledThemes];
  if (!themeLoader) {
    throw new LildocsError(
      `Unknown theme "${themeName}". Use a built-in lildocs theme (${Object.keys(themes).join(", ")}) or a bundled Shiki theme.`,
    );
  }

  const themeModule = await themeLoader();
  const shikiTheme = "default" in themeModule ? themeModule.default : themeModule;

  return mapShikiThemeToTheme(shikiTheme, themeName);
}

export async function resolveFontOverrides(options: {
  cwd: string;
  docsRoot: string;
  outDir: string;
  fonts?: FontOverrides;
}) {
  const css: string[] = [];
  const assets: AssetCopy[] = [];
  const themeFonts: Partial<ThemeFonts> = {};

  const resolved = await Promise.all(
    (["heading", "body", "code"] as const).map(async (target) => {
      const value = options.fonts?.[target];
      return {
        target,
        value,
        localFontPath: value ? await resolveLocalFontPath(value, options) : undefined,
      };
    }),
  );

  for (const { target, value, localFontPath } of resolved) {
    if (!value) {
      continue;
    }

    if (localFontPath) {
      const family = `Lildocs ${capitalize(target)} Font`;
      const outputRelativePath = `assets/fonts/${path.basename(localFontPath)}`;
      assets.push({
        from: localFontPath,
        to: path.join(options.outDir, outputRelativePath),
      });
      css.push(`@font-face {
  font-family: ${quoteCssString(family)};
  src: url("./fonts/${path.basename(localFontPath)}") format("${fontFormat(localFontPath)}");
  font-display: swap;
}`);
      themeFonts[target] = quoteCssString(family);
      continue;
    }

    css.push(
      `@import url("${googleFontsCssUrl(value, target === "code" ? "400" : "400;500;600;700")}");`,
    );
    themeFonts[target] = quoteCssString(value);
  }

  return {
    assets,
    css: css.length > 0 ? `${css.join("\n")}\n` : "",
    themeFonts,
  };
}

export function themeToCssVariables(
  theme: ResolvedTheme,
  fontOverrides: Partial<ThemeFonts> = {},
  linkOptions: LinkOptions = {},
  navigationOptions: NavigationOptions = {},
) {
  const linkDecoration = linkTextDecoration(linkOptions.underline);
  const navigationDuration = navigationOptions.duration ?? 180;
  const rootVariables = themeToCssVariableBlock(theme.light, fontOverrides);
  const darkVariables = theme.dark ? themeToCssVariableBlock(theme.dark, fontOverrides) : undefined;
  const rootBackgroundVariables = themeToBackgroundVariableBlock(theme.light);
  const darkBackgroundVariables = theme.dark
    ? themeToBackgroundVariableBlock(theme.dark)
    : undefined;

  return `:root {
${theme.dark ? "  color-scheme: light dark;\n" : ""}${rootVariables}
${rootBackgroundVariables}
  --ld-font-logo: var(--ld-font-heading);
  --ld-link-text-decoration: ${linkDecoration.default};
  --ld-link-hover-text-decoration: ${linkDecoration.hover};
  --ld-navigation-duration: ${navigationDuration}ms;
  --ld-navigation-easing: ${navigationOptions.easing ?? "ease"};
}${
    darkVariables
      ? `

@media (prefers-color-scheme: dark) {
  :root {
${darkVariables}${darkBackgroundVariables}    color-scheme: dark;
  }
}`
      : ""
  }`;
}

export function resolveBackgroundOptions(options: {
  cwd: string;
  docsRoot: string;
  outDir: string;
  background?: BackgroundOptions;
}): ResolvedBackground {
  const assets: AssetCopy[] = [];
  const layers: string[] = [];

  if (options.background?.gradient) {
    layers.push(options.background.gradient);
  }

  if (options.background?.image) {
    layers.push(backgroundImageValue(options.background.image, options, assets));
  }

  if (layers.length === 0 && !options.background?.blendMode) {
    return {
      assets,
      css: "",
    };
  }

  return {
    assets,
    css: `:root {
  --ld-background-image: ${layers.length > 0 ? layers.join(", ") : "none"};
  --ld-background-blend-mode: ${options.background?.blendMode ?? "normal"};
}
`,
  };
}

export function themeToMermaidConfig(
  theme: ResolvedTheme,
  fontOverrides: Partial<ThemeFonts> = {},
): MermaidThemeConfig {
  const fonts = resolveThemeFonts(theme.light, fontOverrides);
  return {
    bg: theme.light.color.background,
    fg: theme.light.color.text,
    accent: theme.light.color.link,
    muted: theme.light.color.mutedText,
    surface: theme.light.color.codeBackground,
    border: theme.light.color.border,
    fontFamily: fonts.body,
  };
}

function themeToCssVariableBlock(theme: Theme, fontOverrides: Partial<ThemeFonts>) {
  const fonts = resolveThemeFonts(theme, fontOverrides);
  const color = normalizeThemeColors(theme.color);
  return `  --ld-color-background: ${color.background};
  --ld-color-text: ${color.text};
  --ld-color-muted-text: ${color.mutedText};
  --ld-color-border: ${color.border};
  --ld-color-link: ${color.link};
  --ld-color-accent: ${color.link};
  --ld-color-code-background: ${color.codeBackground};
  --ld-color-code-foreground: ${color.codeForeground ?? color.text};
  --ld-color-sidebar-background: ${color.sidebarBackground ?? color.background};
  --ld-font-heading: ${fonts.heading};
  --ld-font-body: ${fonts.body};
  --ld-font-code: ${fonts.code};
`;
}

function themeToBackgroundVariableBlock(theme: Theme) {
  return `  --ld-background-image: ${theme.background?.gradient ?? "none"};
  --ld-background-blend-mode: ${theme.background?.blendMode ?? "normal"};
`;
}

function normalizeThemeColors(color: Theme["color"]): Theme["color"] {
  return {
    ...color,
    border: ensureDarkBorderLightness({
      background: color.background,
      text: color.text,
      candidate: color.border,
    }),
  };
}

function validateTheme(value: unknown, themePath: string): Theme {
  if (!value || typeof value !== "object") {
    throw new LildocsError(`Local theme must export an object: ${themePath}`);
  }

  const theme = value as Theme;
  const required = [
    theme.color?.background,
    theme.color?.text,
    theme.color?.mutedText,
    theme.color?.border,
    theme.color?.link,
    theme.color?.codeBackground,
    theme.font?.body,
    theme.font?.code ?? theme.font?.mono,
  ];

  if (required.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new LildocsError(
      `Local theme is missing required color or font string values: ${themePath}`,
    );
  }

  if (theme.background !== undefined) {
    if (!theme.background || typeof theme.background !== "object") {
      throw new LildocsError(`Local theme "background" must be an object: ${themePath}`);
    }

    if (
      theme.background.gradient !== undefined &&
      (typeof theme.background.gradient !== "string" || theme.background.gradient.length === 0)
    ) {
      throw new LildocsError(
        `Local theme "background.gradient" must be a non-empty string: ${themePath}`,
      );
    }

    if (
      theme.background.blendMode !== undefined &&
      (typeof theme.background.blendMode !== "string" || theme.background.blendMode.length === 0)
    ) {
      throw new LildocsError(
        `Local theme "background.blendMode" must be a non-empty string: ${themePath}`,
      );
    }
  }

  return theme;
}

function mapShikiThemeToTheme(
  shikiTheme: {
    colors?: Record<string, string>;
    tokenColors?: Array<{
      scope?: string | string[];
      settings?: {
        foreground?: string;
      };
    }>;
    bg?: string;
    fg?: string;
    type?: string;
  },
  themeName: string,
): Theme {
  const colors = shikiTheme.colors ?? {};
  const tokenColors = shikiTheme.tokenColors ?? [];
  const background = pickColor(
    colors,
    ["editor.background", "background", "sideBar.background"],
    shikiTheme.bg ?? (shikiTheme.type === "dark" ? "#111111" : "#ffffff"),
  );
  const text = pickColor(
    colors,
    ["editor.foreground", "foreground", "sideBar.foreground"],
    shikiTheme.fg ?? (shikiTheme.type === "dark" ? "#f5f5f5" : "#111111"),
  );
  const mutedText = pickColor(
    colors,
    [
      "descriptionForeground",
      "breadcrumb.foreground",
      "editorLineNumber.foreground",
      "sideBar.foreground",
    ],
    tokenForeground(tokenColors, "comment") ?? text,
  );
  const border = pickColor(
    colors,
    ["panel.border", "sideBar.border", "editorGroup.border", "tab.border"],
    shikiTheme.type === "dark" ? "#333333" : "#e5e5e5",
  );
  const link = pickColor(
    colors,
    ["textLink.foreground", "terminal.ansiBlue", "activityBarBadge.background"],
    tokenForeground(tokenColors, "markup.inline.raw") ??
      (shikiTheme.type === "dark" ? "#79b8ff" : "#2563eb"),
  );
  const rawCodeBackground = pickColor(
    colors,
    [
      "textCodeBlock.background",
      "editorWidget.background",
      "editor.lineHighlightBackground",
      "editor.background",
    ],
    background,
  );
  const codeBackground = ensureBackgroundContrast({
    background,
    candidate: rawCodeBackground,
    isDark: shikiTheme.type === "dark",
  });
  const sidebarBackground = pickColor(
    colors,
    ["sideBar.background", "activityBar.background", "editorGroupHeader.tabsBackground"],
    background,
  );

  return {
    color: {
      background,
      text,
      mutedText,
      border,
      link,
      codeBackground,
      codeForeground: text,
      sidebarBackground,
    },
    font: {
      heading: "system-ui, sans-serif",
      body: "system-ui, sans-serif",
      code: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    },
    shiki: {
      theme: themeName,
    },
    background: {
      gradient:
        shikiTheme.type === "dark"
          ? `linear-gradient(180deg, color-mix(in srgb, ${link} 16%, transparent), transparent 240px)`
          : `linear-gradient(180deg, color-mix(in srgb, ${link} 9%, transparent), transparent 220px)`,
    },
  };
}

function pickColor(colors: Record<string, string>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = colors[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeColor(value);
    }
  }

  return normalizeColor(fallback);
}

function tokenForeground(
  tokenColors: Array<{
    scope?: string | string[];
    settings?: {
      foreground?: string;
    };
  }>,
  scope: string,
) {
  const token = tokenColors.find((item) => {
    const scopes = Array.isArray(item.scope) ? item.scope : [item.scope];
    return scopes.includes(scope);
  });

  return token?.settings?.foreground;
}

function normalizeColor(value: string) {
  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    return value;
  }

  return value;
}

function linkTextDecoration(underline: LinkOptions["underline"] = "always") {
  if (underline === "hover") {
    return {
      default: "none",
      hover: "underline",
    };
  }
  if (underline === "none") {
    return {
      default: "none",
      hover: "none",
    };
  }
  return {
    default: "underline",
    hover: "underline",
  };
}

function backgroundImageValue(
  value: string,
  options: {
    cwd: string;
    docsRoot: string;
    outDir: string;
  },
  assets: AssetCopy[],
) {
  const trimmed = value.trim();
  if (isCssImageFunction(trimmed)) {
    return trimmed;
  }
  if (
    /^(?:[a-z]+:)?\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  ) {
    return `url(${quoteCssString(trimmed)})`;
  }

  const source = path.resolve(options.docsRoot, trimmed);
  const assetRelativePath = path.relative(options.docsRoot, source).split(path.sep).join("/");
  assets.push({
    from: source,
    to: path.join(options.outDir, "assets", assetRelativePath),
  });
  return `url(${quoteCssString(`./${assetRelativePath}`)})`;
}

function isCssImageFunction(value: string) {
  return /^(?:url|linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient|repeating-conic-gradient)\(/i.test(
    value,
  );
}

function ensureBackgroundContrast(options: {
  background: string;
  candidate: string;
  isDark: boolean;
}): string {
  const background = parse(options.background);
  const candidate = parse(options.candidate);
  if (!background || !candidate) {
    return options.candidate;
  }

  const currentContrast = wcagContrast(background, candidate);
  if (currentContrast >= MIN_BACKGROUND_CONTRAST) {
    return options.candidate;
  }

  const candidateOklch = toOklch(candidate);
  if (!candidateOklch || typeof candidateOklch.l !== "number") {
    return options.candidate;
  }

  const direction = options.isDark ? 1 : -1;
  let bestColor = options.candidate;
  let bestContrast = currentContrast;

  for (let step = 1; step <= MAX_BACKGROUND_CONTRAST_STEPS; step += 1) {
    const adjusted = {
      ...candidateOklch,
      l: clamp(candidateOklch.l + direction * BACKGROUND_LIGHTNESS_STEP * step, 0, 1),
      c:
        typeof candidateOklch.c === "number"
          ? Math.min(candidateOklch.c, MAX_BACKGROUND_CHROMA)
          : candidateOklch.c,
    };
    const clampedColor = clampToRgb(adjusted);
    if (!clampedColor) {
      continue;
    }

    const adjustedColor = formatHex(clampedColor);
    const adjustedParsedColor = parse(adjustedColor);
    if (!adjustedParsedColor) {
      continue;
    }
    const adjustedContrast = wcagContrast(background, adjustedParsedColor);

    if (adjustedContrast > bestContrast) {
      bestColor = adjustedColor;
      bestContrast = adjustedContrast;
    }

    if (adjustedContrast >= PREFERRED_BACKGROUND_CONTRAST) {
      return adjustedColor;
    }
  }

  return bestColor;
}

function ensureDarkBorderLightness(options: {
  background: string;
  text: string;
  candidate: string;
}): string {
  const background = parse(options.background);
  const text = parse(options.text);
  const candidate = parse(options.candidate);
  if (!background || !text || !candidate) {
    return options.candidate;
  }

  const backgroundOklch = toOklch(background);
  const textOklch = toOklch(text);
  const candidateOklch = toOklch(candidate);
  if (
    !backgroundOklch ||
    !textOklch ||
    !candidateOklch ||
    typeof backgroundOklch.l !== "number" ||
    typeof textOklch.l !== "number" ||
    typeof candidateOklch.l !== "number"
  ) {
    return options.candidate;
  }

  if (backgroundOklch.l >= textOklch.l) {
    return options.candidate;
  }

  const currentContrast = wcagContrast(background, candidate);
  if (candidateOklch.l > backgroundOklch.l && currentContrast >= MIN_DARK_BORDER_CONTRAST) {
    return options.candidate;
  }

  let bestColor = options.candidate;
  let bestContrast = currentContrast;
  for (let step = 1; step <= MAX_BACKGROUND_CONTRAST_STEPS; step += 1) {
    const adjusted = {
      ...candidateOklch,
      l: clamp(candidateOklch.l + BACKGROUND_LIGHTNESS_STEP * step, 0, 1),
      c:
        typeof candidateOklch.c === "number"
          ? Math.min(candidateOklch.c, MAX_BACKGROUND_CHROMA)
          : candidateOklch.c,
    };
    const clampedColor = clampToRgb(adjusted);
    if (!clampedColor) {
      continue;
    }

    const adjustedColor = formatHex(clampedColor);
    const adjustedParsedColor = parse(adjustedColor);
    if (!adjustedParsedColor) {
      continue;
    }
    const adjustedOklch = toOklch(adjustedParsedColor);
    if (!adjustedOklch || typeof adjustedOklch.l !== "number") {
      continue;
    }
    const adjustedContrast = wcagContrast(background, adjustedParsedColor);

    if (adjustedOklch.l > backgroundOklch.l && adjustedContrast > bestContrast) {
      bestColor = adjustedColor;
      bestContrast = adjustedContrast;
    }

    if (adjustedOklch.l > backgroundOklch.l && adjustedContrast >= MIN_DARK_BORDER_CONTRAST) {
      return adjustedColor;
    }
  }

  return bestColor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveThemeFonts(theme: Theme, overrides: Partial<ThemeFonts>): ThemeFonts {
  const body = overrides.body ?? theme.font.body;
  return {
    heading: overrides.heading ?? theme.font.heading ?? body,
    body,
    code:
      overrides.code ??
      theme.font.code ??
      theme.font.mono ??
      "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  };
}

async function resolveLocalFontPath(
  value: string,
  options: {
    cwd: string;
    docsRoot: string;
  },
) {
  const candidates = [path.resolve(options.cwd, value), path.resolve(options.docsRoot, value)];

  const existingCandidates = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      exists: isFontFile(candidate) && (await exists(candidate)),
    })),
  );
  const existingCandidate = existingCandidates.find((candidate) => candidate.exists);
  if (existingCandidate) {
    return existingCandidate.candidate;
  }

  if (isFontFile(value) && path.basename(value) !== value) {
    throw new LildocsError(`Font file does not exist: ${value}`);
  }

  return undefined;
}

function isFontFile(value: string) {
  return /\.(?:woff2?|ttf|otf)$/i.test(value);
}

function fontFormat(value: string) {
  const extension = path.extname(value).toLowerCase();
  if (extension === ".woff2") {
    return "woff2";
  }
  if (extension === ".woff") {
    return "woff";
  }
  if (extension === ".ttf") {
    return "truetype";
  }
  if (extension === ".otf") {
    return "opentype";
  }
  return "woff2";
}

function googleFontsCssUrl(fontName: string, weights: string) {
  const family = fontName.trim().replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
}

function quoteCssString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
