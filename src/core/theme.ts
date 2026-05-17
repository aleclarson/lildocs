import { pathToFileURL } from "node:url";
import { access } from "node:fs/promises";
import path from "node:path";
import { createJiti } from "jiti";
import type { AssetCopy } from "./markdown.js";
import { LildocsError } from "./errors.js";

export type Theme = {
  color: {
    background: string;
    text: string;
    mutedText: string;
    border: string;
    link: string;
    codeBackground: string;
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

const themes: Record<string, Theme> = {
  default: {
    color: {
      background: "#ffffff",
      text: "#171717",
      mutedText: "#666666",
      border: "#e5e5e5",
      link: "#2563eb",
      codeBackground: "#f6f8fa",
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
  },
  minimal: {
    color: {
      background: "#ffffff",
      text: "#111111",
      mutedText: "#707070",
      border: "#dddddd",
      link: "#0f766e",
      codeBackground: "#f7f7f7",
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
  },
};

export async function resolveTheme(options: {
  cwd: string;
  docsRoot: string;
  requestedTheme?: string;
}) {
  if (options.requestedTheme) {
    const theme = themes[options.requestedTheme];
    if (!theme) {
      throw new LildocsError(
        `Unknown theme "${options.requestedTheme}". Available themes: ${Object.keys(themes).join(", ")}`,
      );
    }
    return theme;
  }

  const localThemePath = path.join(options.docsRoot, "theme.ts");
  if (await exists(localThemePath)) {
    const jiti = createJiti(pathToFileURL(options.cwd).href);
    const module = await jiti.import(localThemePath, { default: true });
    return validateTheme(module, localThemePath);
  }

  return themes.default;
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

export function themeToCssVariables(theme: Theme, fontOverrides: Partial<ThemeFonts> = {}) {
  const fonts = resolveThemeFonts(theme, fontOverrides);
  return `:root {
  --ld-color-background: ${theme.color.background};
  --ld-color-text: ${theme.color.text};
  --ld-color-muted-text: ${theme.color.mutedText};
  --ld-color-border: ${theme.color.border};
  --ld-color-link: ${theme.color.link};
  --ld-color-code-background: ${theme.color.codeBackground};
  --ld-color-sidebar-background: ${theme.color.sidebarBackground ?? theme.color.background};
  --ld-font-heading: ${fonts.heading};
  --ld-font-body: ${fonts.body};
  --ld-font-code: ${fonts.code};
}`;
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

  return theme;
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
