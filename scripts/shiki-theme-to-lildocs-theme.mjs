#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { themeNames } from "@shikijs/themes";

const args = parseArgs(process.argv.slice(2));

if (!args.input) {
  console.error("Usage: pnpm run shiki-theme:to-lildocs -- <theme-name-or-json> [--out theme.ts]");
  process.exitCode = 1;
} else {
  const theme = await loadTheme(args.input);
  const lildocsTheme = mapShikiThemeToLildocsTheme(theme);
  const outFile = path.resolve(process.cwd(), args.out ?? "theme.ts");

  await writeFile(outFile, renderThemeTs(lildocsTheme, theme), "utf8");
  console.log(`Wrote lildocs theme for ${theme.name ?? args.input} to ${outFile}`);
}

function parseArgs(rawArgs) {
  const parsed = {
    input: undefined,
    out: undefined,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--") {
      continue;
    }

    if (arg === "--out" || arg === "-o") {
      parsed.out = rawArgs[index + 1];
      index += 1;
      continue;
    }

    if (!parsed.input) {
      parsed.input = arg;
    }
  }

  return parsed;
}

async function loadTheme(input) {
  const inputPath = path.resolve(process.cwd(), input);
  if (await exists(inputPath)) {
    return JSON.parse(await readFile(inputPath, "utf8"));
  }

  if (!themeNames.includes(input)) {
    throw new Error(`Unknown Shiki theme "${input}". Use a theme name or a JSON file path.`);
  }

  const themeModule = await import(`@shikijs/themes/${input}`);
  return themeModule.default;
}

function mapShikiThemeToLildocsTheme(theme) {
  const colors = theme.colors ?? {};
  const tokenColors = theme.tokenColors ?? [];
  const background = pickColor(
    colors,
    ["editor.background", "background", "sideBar.background"],
    theme.bg ?? (theme.type === "dark" ? "#111111" : "#ffffff"),
  );
  const text = pickColor(
    colors,
    ["editor.foreground", "foreground", "sideBar.foreground"],
    theme.fg ?? (theme.type === "dark" ? "#f5f5f5" : "#111111"),
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
    theme.type === "dark" ? "#333333" : "#e5e5e5",
  );
  const link = pickColor(
    colors,
    ["textLink.foreground", "terminal.ansiBlue", "activityBarBadge.background"],
    tokenForeground(tokenColors, "markup.inline.raw") ??
      (theme.type === "dark" ? "#79b8ff" : "#2563eb"),
  );
  const codeBackground = pickColor(
    colors,
    [
      "textCodeBlock.background",
      "editorWidget.background",
      "editor.lineHighlightBackground",
      "editor.background",
    ],
    background,
  );
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
      sidebarBackground,
    },
    font: {
      heading: "system-ui, sans-serif",
      body: "system-ui, sans-serif",
      code: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    },
  };
}

function pickColor(colors, keys, fallback) {
  for (const key of keys) {
    const value = colors[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeColor(value);
    }
  }

  return normalizeColor(fallback);
}

function tokenForeground(tokenColors, scope) {
  const token = tokenColors.find((item) => {
    const scopes = Array.isArray(item.scope) ? item.scope : [item.scope];
    return scopes.includes(scope);
  });

  return token?.settings?.foreground;
}

function normalizeColor(value) {
  if (typeof value !== "string") {
    return "#000000";
  }

  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    return value;
  }

  return value;
}

function renderThemeTs(theme, sourceTheme) {
  return `// Generated from Shiki theme: ${sourceTheme.displayName ?? sourceTheme.name ?? "unknown"}
export default ${JSON.stringify(theme, null, 2)} as const;
`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
