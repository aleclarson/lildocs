import { pathToFileURL } from "node:url";
import { access } from "node:fs/promises";
import path from "node:path";
import { createJiti } from "jiti";
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
    body: string;
    mono: string;
  };
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
      body: "system-ui, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
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
      body: "Arial, sans-serif",
      mono: "Menlo, Consolas, monospace",
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

export function themeToCssVariables(theme: Theme) {
  return `:root {
  --ld-color-background: ${theme.color.background};
  --ld-color-text: ${theme.color.text};
  --ld-color-muted-text: ${theme.color.mutedText};
  --ld-color-border: ${theme.color.border};
  --ld-color-link: ${theme.color.link};
  --ld-color-code-background: ${theme.color.codeBackground};
  --ld-color-sidebar-background: ${theme.color.sidebarBackground ?? theme.color.background};
  --ld-font-body: ${theme.font.body};
  --ld-font-mono: ${theme.font.mono};
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
    theme.font?.mono,
  ];

  if (required.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new LildocsError(
      `Local theme is missing required color or font string values: ${themePath}`,
    );
  }

  return theme;
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
