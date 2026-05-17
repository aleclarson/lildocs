import type { Page } from "./content.js";

export type SearchEntry = {
  title: string;
  route: string;
  headings: string[];
  text: string;
};

export function buildSearchIndex(pages: Page[]): SearchEntry[] {
  return pages.map((page) => ({
    title: page.title,
    route: page.route,
    headings: page.headings.map((heading) => heading.text),
    text: normalizeSearchText(page.searchText ?? page.markdown),
  }));
}

export function normalizeSearchText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
