import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Marked, Renderer, parser } from "marked";
import markedShiki from "marked-shiki";
import { codeToHtml } from "shiki";
import type { ContentModel, Heading, Page } from "./content.js";
import { LildocsError } from "./errors.js";
import { rootRelativeUrl, toPosixPath } from "./paths.js";
import { normalizeSearchText } from "./search.js";

export type AssetCopy = {
  from: string;
  to: string;
};

export type RenderedMarkdown = {
  html: string;
  assets: AssetCopy[];
  needsMermaid: boolean;
  text: string;
};

export type MarkdownRenderOptions = {
  shikiTheme?: string;
};

export async function renderMarkdownPage(
  model: ContentModel,
  page: Page,
  outDir: string,
  options: MarkdownRenderOptions = {},
): Promise<RenderedMarkdown> {
  const assets: AssetCopy[] = [];
  const headingIds = [...page.headings];
  let needsMermaid = false;
  const renderer = new Renderer();

  renderer.heading = ({ tokens, depth }) => {
    const text = parser(tokens);
    const plain = stripHtml(text);
    const heading = nextHeading(headingIds, depth, plain);
    return `<h${depth} id="${heading?.id ?? ""}">${text}</h${depth}>`;
  };

  renderer.link = ({ href, title, tokens }) => {
    const text = parser(tokens);
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
    markedShiki({
      async highlight(code, lang, props) {
        if (lang?.toLowerCase() === "mermaid") {
          needsMermaid = true;
          return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
        }

        return highlightCode(code, lang, props, options.shikiTheme);
      },
    }),
  );

  const html = await marked.parse(page.markdown);
  return {
    html,
    assets,
    needsMermaid,
    text: normalizeSearchText(page.markdown),
  };
}

async function highlightCode(code: string, lang: string, props: string[], theme = "github-light") {
  try {
    return await codeToHtml(code, {
      lang: lang || "text",
      theme,
      meta: {
        __raw: props.join(" "),
      },
    });
  } catch {
    return codeToHtml(code, {
      lang: "text",
      theme,
    });
  }
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
  if (isExternalOrAnchor(href)) {
    return href;
  }

  const [hrefPath, hash] = href.split("#");
  if (!hrefPath?.toLowerCase().endsWith(".md")) {
    return href;
  }

  const targetPath = toPosixPath(
    path.normalize(path.join(path.posix.dirname(page.relativePath), hrefPath)),
  );
  const targetPage = model.byRelativePath.get(targetPath);
  if (!targetPage) {
    return href;
  }

  const relative = path.posix.relative(path.posix.dirname(page.route), targetPage.route);
  const url = relative.startsWith(".") ? relative : `./${relative}`;
  return hash ? `${url}#${hash}` : url;
}

function registerAsset(
  model: ContentModel,
  page: Page,
  outDir: string,
  href: string,
  assets: AssetCopy[],
) {
  if (isExternalOrAnchor(href)) {
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

function isExternalOrAnchor(href: string) {
  return /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("#") || href.startsWith("mailto:");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
