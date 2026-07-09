import { renderMermaidSVG, type RenderOptions } from "beautiful-mermaid";
import { LildocsError } from "./errors.js";

export type MermaidRenderOptions = {
  themeConfig: MermaidThemeConfig;
};

export type MermaidThemeConfig = {
  bg: string;
  fg: string;
  accent?: string;
  muted?: string;
  surface?: string;
  border?: string;
  fontFamily?: string;
};

export type MermaidRenderer = {
  render: (source: string, idHint: string) => Promise<string>;
  close: () => Promise<void>;
};

export async function createMermaidRenderer(
  options: MermaidRenderOptions,
): Promise<MermaidRenderer> {
  return {
    async render(source, idHint) {
      try {
        const svg = addImageRole(
          renderMermaidSVG(source, toRenderOptions(options.themeConfig)),
        );
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

function toRenderOptions(themeConfig: MermaidThemeConfig): RenderOptions {
  return {
    bg: themeConfig.bg,
    fg: themeConfig.fg,
    accent: themeConfig.accent,
    muted: themeConfig.muted,
    surface: themeConfig.surface,
    border: themeConfig.border,
    font: themeConfig.fontFamily,
  };
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
