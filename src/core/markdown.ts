import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Marked, Parser, Renderer } from "marked";
import markedShiki from "marked-shiki";
import { markedAlert } from "../vendor/marked-alert/index.js";
import { codeToHtml } from "shiki";
import type { ContentModel, Heading, Page } from "./content.js";
import { LildocsError } from "./errors.js";
import type { MermaidRenderer } from "./mermaid.js";
import {
  isExternalOrAnchorUrl,
  resolveMarkdownDocumentPath,
  rootRelativeUrl,
  toPosixPath,
} from "./paths.js";
import { markdownToPlainText } from "./search.js";

export type AssetCopy = {
  from: string;
  to: string;
};

export type RenderedMarkdown = {
  html: string;
  assets: AssetCopy[];
  text: string;
};

export type MarkdownRenderOptions = {
  mermaid?: MermaidRenderer;
  shikiTheme?: {
    light?: string;
    dark?: string;
  };
};

export async function renderMarkdownPage(
  model: ContentModel,
  page: Page,
  outDir: string,
  options: MarkdownRenderOptions = {},
): Promise<RenderedMarkdown> {
  const assets: AssetCopy[] = [];
  const headingIds = [...page.headings];
  let mermaidDiagramIndex = 0;
  const renderer = new Renderer();

  renderer.heading = ({ tokens, depth }) => {
    const text = Parser.parseInline(tokens);
    const plain = stripHtml(text);
    const heading = nextHeading(headingIds, depth, plain);
    return `<h${depth} id="${heading?.id ?? ""}">${text}</h${depth}>`;
  };

  renderer.link = ({ href, title, tokens }) => {
    const text = Parser.parseInline(tokens);
    const rewritten = rewriteLink(model, page, href);
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(rewritten)}"${titleAttribute}>${text}</a>`;
  };

  renderer.image = ({ href, title, text }) => {
    const rewritten = registerAsset(model, page, outDir, href, assets);
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(rewritten)}" alt="${escapeHtml(text)}"${titleAttribute}>`;
  };

  const marked = new Marked({
    async: true,
    gfm: true,
    renderer,
  }).use(
    markedAlert(),
    markedShiki({
      async highlight(code, lang, props) {
        if (lang?.toLowerCase() === "mermaid") {
          mermaidDiagramIndex += 1;
          if (!options.mermaid) {
            throw new LildocsError(`No Mermaid renderer configured for ${page.relativePath}`);
          }

          try {
            return await options.mermaid.render(
              code,
              `mermaid-${stableIdPart(page.route)}-${mermaidDiagramIndex}`,
            );
          } catch (error) {
            throw new LildocsError(
              `Failed to render Mermaid diagram ${mermaidDiagramIndex} in ${page.relativePath}: ${errorMessage(error)}`,
            );
          }
        }

        return highlightCode(code, lang, props, options.shikiTheme);
      },
    }),
  );

  const html = await marked.parse(page.markdown);
  return {
    html,
    assets,
    text: markdownToPlainText(page.markdown),
  };
}

async function highlightCode(
  code: string,
  lang: string,
  props: string[],
  theme: MarkdownRenderOptions["shikiTheme"] = {},
) {
  const lightTheme = theme.light ?? "github-light";
  const darkTheme = theme.dark;
  const themeOptions = darkTheme
    ? {
        themes: {
          light: lightTheme,
          dark: darkTheme,
        },
        defaultColor: false as const,
      }
    : {
        theme: lightTheme,
      };

  try {
    return normalizeShikiBackground(
      await codeToHtml(code, {
        lang: lang || "text",
        ...themeOptions,
        meta: {
          __raw: props.join(" "),
        },
      }),
    );
  } catch {
    return normalizeShikiBackground(
      await codeToHtml(code, {
        lang: "text",
        ...themeOptions,
      }),
    );
  }
}

function normalizeShikiBackground(html: string) {
  return html
    .replace(/background-color:[^;"]+;?/, "background-color:var(--ld-color-code-background);")
    .replace(/--shiki-light-bg:[^;"]+/, "--shiki-light-bg:var(--ld-color-code-background)")
    .replace(/--shiki-dark-bg:[^;"]+/, "--shiki-dark-bg:var(--ld-color-code-background)");
}

export async function copyAssets(assets: AssetCopy[]) {
  const uniqueAssets = new Map(assets.map((asset) => [asset.to, asset]));

  await Promise.all(
    [...uniqueAssets.values()].map(async (asset) => {
      let assetStat;
      try {
        assetStat = await stat(asset.from);
      } catch {
        throw new LildocsError(`Referenced asset does not exist: ${asset.from}`);
      }

      if (!assetStat.isFile()) {
        throw new LildocsError(`Referenced asset is not a file: ${asset.from}`);
      }

      await mkdir(path.dirname(asset.to), { recursive: true });
      await copyFile(asset.from, asset.to);
    }),
  );
}

function nextHeading(headings: Heading[], depth: number, text: string) {
  const index = headings.findIndex((heading) => heading.depth === depth && heading.text === text);
  if (index === -1) {
    return undefined;
  }

  return headings.splice(index, 1)[0];
}

function rewriteLink(model: ContentModel, page: Page, href: string) {
  const targetPath = resolveMarkdownDocumentPath(page.relativePath, href);
  if (!targetPath) {
    return href;
  }

  const targetPage = model.byRelativePath.get(targetPath);
  if (!targetPage) {
    return href;
  }

  const relative = path.posix.relative(path.posix.dirname(page.route), targetPage.route);
  const url = relative.startsWith(".") ? relative : `./${relative}`;
  const hash = href.includes("#") ? href.slice(href.indexOf("#") + 1) : undefined;
  return hash ? `${url}#${hash}` : url;
}

function registerAsset(
  model: ContentModel,
  page: Page,
  outDir: string,
  href: string,
  assets: AssetCopy[],
) {
  if (isExternalOrAnchorUrl(href)) {
    return href;
  }

  const source = path.resolve(model.docsRoot, path.dirname(page.relativePath), href);
  const assetRelativePath = toPosixPath(path.relative(model.docsRoot, source));
  const outputRelativePath = `assets/${assetRelativePath}`;
  assets.push({
    from: source,
    to: path.join(outDir, outputRelativePath),
  });

  return rootRelativeUrl(page.route, outputRelativePath);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

function stableIdPart(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
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
