import {
  fromShikiTheme,
  renderMermaidSVG,
  type DiagramColors,
  type RenderOptions,
} from "beautiful-mermaid";
import { bundledThemes } from "shiki";
import { LildocsError } from "./errors.js";

export type MermaidRenderOptions = {
  themeConfig: MermaidThemeConfig;
};

export type MermaidThemeConfig = {
  light: string;
  dark?: string;
  fontFamily?: string;
};

export type MermaidRenderer = {
  css: string;
  render: (source: string, idHint: string) => Promise<string>;
  close: () => Promise<void>;
};

export async function createMermaidRenderer(
  options: MermaidRenderOptions,
): Promise<MermaidRenderer> {
  const lightColors = await loadShikiColors(options.themeConfig.light);
  const darkColors = options.themeConfig.dark
    ? await loadShikiColors(options.themeConfig.dark)
    : undefined;
  const colorKeys = sharedColorKeys(lightColors, darkColors);
  const renderOptions = toRenderOptions(
    colorKeys,
    options.themeConfig.fontFamily,
  );

  return {
    css: toThemeCss(lightColors, darkColors, colorKeys),
    async render(source, idHint) {
      try {
        const svg = addImageRole(renderMermaidSVG(source, renderOptions));
        return `<figure class="mermaidDiagram" id="${escapeHtml(idHint)}">${svg}</figure>`;
      } catch (error) {
        throw new LildocsError(
          `Failed to render Mermaid diagram ${idHint}: ${errorMessage(error)}`,
        );
      }
    },
    async close() {},
  };
}

type DiagramColorKey = keyof Omit<DiagramColors, "bg" | "fg">;

const optionalColorKeys: DiagramColorKey[] = [
  "line",
  "accent",
  "muted",
  "surface",
  "border",
];

async function loadShikiColors(themeName: string) {
  const themeLoader = bundledThemes[themeName as keyof typeof bundledThemes];
  if (!themeLoader) {
    throw new LildocsError(`Unknown bundled Shiki theme: ${themeName}`);
  }

  const themeModule = await themeLoader();
  const theme = "default" in themeModule ? themeModule.default : themeModule;
  return fromShikiTheme(theme);
}

function sharedColorKeys(
  light: DiagramColors,
  dark?: DiagramColors,
): DiagramColorKey[] {
  // Omitting a one-sided enrichment lets beautiful-mermaid derive it from
  // each palette instead of leaking a light-only value into dark mode.
  return optionalColorKeys.filter(
    (key) => light[key] !== undefined && (!dark || dark[key] !== undefined),
  );
}

function toRenderOptions(
  colorKeys: DiagramColorKey[],
  fontFamily?: string,
): RenderOptions {
  return {
    bg: "var(--ld-mermaid-bg)",
    fg: "var(--ld-mermaid-fg)",
    ...Object.fromEntries(
      colorKeys.map((key) => [key, `var(--ld-mermaid-${key})`]),
    ),
    font: fontFamily,
  };
}

function toThemeCss(
  light: DiagramColors,
  dark: DiagramColors | undefined,
  colorKeys: DiagramColorKey[],
) {
  const lightVariables = toCssVariables(light, colorKeys, "  ");
  const darkVariables = dark
    ? toCssVariables(dark, colorKeys, "    ")
    : undefined;
  return `.mermaidDiagram {
${lightVariables}
}${
    darkVariables
      ? `

@media (prefers-color-scheme: dark) {
  .mermaidDiagram {
${darkVariables}
  }
}`
      : ""
  }
`;
}

function toCssVariables(
  colors: DiagramColors,
  colorKeys: DiagramColorKey[],
  indent: string,
) {
  return [
    `${indent}--ld-mermaid-bg: ${colors.bg};`,
    `${indent}--ld-mermaid-fg: ${colors.fg};`,
    ...colorKeys.map(
      (key) => `${indent}--ld-mermaid-${key}: ${colors[key] as string};`,
    ),
  ].join("\n");
}

function addImageRole(svg: string) {
  return svg.replace("<svg", '<svg role="img"');
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
