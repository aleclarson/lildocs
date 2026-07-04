import type { Heading, Page } from "./content.js";

export type SearchEntry = {
  kind: "page" | "section";
  title: string;
  pageTitle: string;
  route: string;
  headings: string[];
  text: string;
  depth?: number;
};

export function buildSearchIndex(pages: Page[]): SearchEntry[] {
  return pages.flatMap((page) => [
    {
      kind: "page" as const,
      title: page.title,
      pageTitle: page.title,
      route: page.route,
      headings: page.headings.map((heading) => heading.text),
      text: normalizeSearchText(page.searchText ?? page.markdown),
    },
    ...buildSectionEntries(page),
  ]);
}

export function normalizeSearchText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSectionEntries(page: Page): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const headingQueue = [...page.headings];
  const headingPath: Heading[] = [];
  let activeSection: SectionDraft | undefined;

  const pushActiveSection = () => {
    if (!activeSection) {
      return;
    }

    entries.push({
      kind: "section",
      title: activeSection.heading.text,
      pageTitle: page.title,
      route: `${page.route}#${activeSection.heading.id}`,
      headings: activeSection.path.map((heading) => heading.text),
      text: normalizeSearchText(activeSection.lines.join("\n")),
      depth: activeSection.heading.depth,
    });
  };

  for (const line of page.markdown.split(/\r?\n/)) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match?.[1]) {
      activeSection?.lines.push(line);
      continue;
    }

    const heading = headingQueue.shift();
    if (!heading) {
      activeSection?.lines.push(line);
      continue;
    }

    while (headingPath.at(-1) && headingPath.at(-1)!.depth >= heading.depth) {
      headingPath.pop();
    }
    headingPath.push(heading);

    if (heading.depth === 2 || heading.depth === 3) {
      pushActiveSection();
      activeSection = {
        heading,
        path: [...headingPath],
        lines: [],
      };
      continue;
    }

    if (activeSection && heading.depth <= activeSection.heading.depth) {
      pushActiveSection();
      activeSection = undefined;
      continue;
    }

    activeSection?.lines.push(line);
  }

  pushActiveSection();
  return entries;
}

type SectionDraft = {
  heading: Heading;
  path: Heading[];
  lines: string[];
};
