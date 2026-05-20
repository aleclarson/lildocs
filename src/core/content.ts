import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { collectMarkdownPaths, type ResolvedInput } from "./input.js";
import { LildocsError } from "./errors.js";
import { toPosixPath } from "./paths.js";

export type Heading = {
  depth: number;
  text: string;
  id: string;
};

export type Page = {
  sourcePath: string;
  relativePath: string;
  route: string;
  outputPath: string;
  title: string;
  rawMarkdown: string;
  markdown: string;
  metadata: Record<string, unknown>;
  headings: Heading[];
  html?: string;
  searchText?: string;
};

export type ContentModel = {
  docsRoot: string;
  homePage: string;
  pages: Page[];
  bySourcePath: Map<string, Page>;
  byRelativePath: Map<string, Page>;
};

export async function buildContentModel(
  input: ResolvedInput,
  outDirName: string,
  navigationOrder: string[] = [],
): Promise<ContentModel> {
  const paths = await collectMarkdownPaths(input.docsRoot);
  const pages = await Promise.all(paths.map((sourcePath) => readPage(input, sourcePath)));
  const orderEntries = normalizeNavigationOrder(navigationOrder);
  const sortedPages = pages
    .filter((page) => !isInsideOutput(page.relativePath, outDirName))
    .toSorted(
      (a, b) =>
        navigationRank(a, orderEntries) - navigationRank(b, orderEntries) ||
        routeRank(a, input.homePage) - routeRank(b, input.homePage) ||
        a.route.localeCompare(b.route),
    );
  validateNavigationOrder(orderEntries, sortedPages);
  ensureUniqueRoutes(sortedPages);

  return {
    docsRoot: input.docsRoot,
    homePage: input.homePage,
    pages: sortedPages,
    bySourcePath: new Map(sortedPages.map((page) => [page.sourcePath, page])),
    byRelativePath: new Map(sortedPages.map((page) => [page.relativePath, page])),
  };
}

async function readPage(input: ResolvedInput, sourcePath: string): Promise<Page> {
  const rawMarkdown = await readFile(sourcePath, "utf8");
  const parsed = matter(rawMarkdown);
  const relativePath = toPosixPath(path.relative(input.docsRoot, sourcePath));
  const isHome = sourcePath === input.homePage;
  const route = isHome ? "index.html" : markdownPathToRoute(relativePath);
  const headings = extractHeadings(parsed.content);
  const title = inferTitle(parsed.data, parsed.content, sourcePath);

  return {
    sourcePath,
    relativePath,
    route,
    outputPath: route,
    title,
    rawMarkdown,
    markdown: parsed.content,
    metadata: parsed.data,
    headings,
  };
}

export function inferTitle(
  metadata: Record<string, unknown>,
  markdown: string,
  sourcePath: string,
) {
  if (typeof metadata.title === "string" && metadata.title.trim()) {
    return metadata.title.trim();
  }

  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1?.[1]) {
    return stripMarkdownInline(h1[1]).trim();
  }

  return formatFilename(path.basename(sourcePath, path.extname(sourcePath)));
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

export function extractHeadings(markdown: string): Heading[] {
  const seen = new Map<string, number>();
  const headings: Heading[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match?.[1] || !match[2]) {
      continue;
    }

    const baseId = slugify(stripMarkdownInline(match[2]));
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    headings.push({
      depth: match[1].length,
      text: stripMarkdownInline(match[2]).trim(),
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
    });
  }

  return headings;
}

function stripMarkdownInline(value: string) {
  return value.replace(/[`*_~]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1");
}

function formatFilename(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function markdownPathToRoute(relativePath: string) {
  const parsed = path.posix.parse(relativePath);
  const slug = slugify(parsed.name);
  const dir = parsed.dir ? `${parsed.dir}/` : "";
  return `${dir}${slug}.html`;
}

function routeRank(page: Page, homePage: string) {
  return page.sourcePath === homePage ? -1 : 0;
}

type NavigationOrderEntry = {
  value: string;
  index: number;
  kind: "file" | "directory";
};

function normalizeNavigationOrder(order: string[]): NavigationOrderEntry[] {
  const seen = new Map<string, number>();

  return order.map((value, index) => {
    const normalized = normalizeNavigationOrderPath(value);
    const previous = seen.get(normalized);
    if (previous !== undefined) {
      throw new LildocsError(
        `Docs config "navigation.order[${index}]" duplicates "navigation.order[${previous}]"`,
      );
    }
    seen.set(normalized, index);

    return {
      value: normalized,
      index,
      kind: normalized.endsWith("/") ? "directory" : "file",
    };
  });
}

function normalizeNavigationOrderPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function navigationRank(page: Page, order: NavigationOrderEntry[]) {
  const entry = order.find((item) => navigationOrderEntryMatchesPage(item, page));
  return entry?.index ?? order.length;
}

function validateNavigationOrder(order: NavigationOrderEntry[], pages: Page[]) {
  for (const entry of order) {
    if (pages.some((page) => navigationOrderEntryMatchesPage(entry, page))) {
      continue;
    }

    throw new LildocsError(
      `Docs config "navigation.order[${entry.index}]" does not match a page or folder`,
    );
  }
}

function navigationOrderEntryMatchesPage(entry: NavigationOrderEntry, page: Page) {
  if (entry.kind === "directory") {
    return page.relativePath.startsWith(entry.value);
  }

  return page.relativePath === entry.value;
}

function isInsideOutput(relativePath: string, outDirName: string) {
  return relativePath === outDirName || relativePath.startsWith(`${outDirName}/`);
}

function ensureUniqueRoutes(pages: Page[]) {
  const seen = new Map<string, number>();

  for (const page of pages) {
    const count = seen.get(page.route) ?? 0;
    seen.set(page.route, count + 1);
    if (count === 0) {
      continue;
    }

    const parsed = path.posix.parse(page.route);
    page.route = `${parsed.dir ? `${parsed.dir}/` : ""}${parsed.name}-${count + 1}.html`;
    page.outputPath = page.route;
  }
}
