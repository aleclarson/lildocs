import { signal } from "@preact/signals";
import { Popover, setOverlayPortalRoots } from "@goddard-ai/ui-primitives";
import { hydrate } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

type SearchEntry = {
  kind: "page" | "section";
  route: string;
  title: string;
  pageTitle: string;
  headings: string[];
  text: string;
  depth?: number;
};

type SearchMatch = {
  entry: SearchEntry;
  title: string;
  subtitle: string;
  score: number;
  terms: string[];
  type: "title" | "body";
};

declare global {
  interface Window {
    lildocsIssueUrl?: string;
    lildocsSearchUrl?: string;
  }
}

const open = signal(false);

(async () => {
  const root = document.querySelector("#lildocs-search-root");
  if (!root) {
    return;
  }

  const embeddedIndex = document.querySelector("#lildocs-search-index");
  const base = new URL(window.lildocsSearchUrl || "search-index.json", document.baseURI);
  const index = embeddedIndex?.textContent
    ? JSON.parse(embeddedIndex.textContent)
    : await fetch(base).then((response) => response.json());
  const siteRoot = new URL(".", base);
  const preloadedUrls = new Set<string>();

  setOverlayPortalRoots({
    dialog: () => document.getElementById("lildocs-overlay-root"),
    menu: () => document.getElementById("lildocs-overlay-root"),
  });

  document.addEventListener("mouseover", (event) => {
    const link = (event.target as Element | null)?.closest?.("a[href]");
    if (!link) {
      return;
    }
    preloadRelativeUrl(link.getAttribute("href"), preloadedUrls);
  });

  hydrate(
    <SearchBox
      anchorElement={root}
      index={index}
      siteRoot={siteRoot}
      preloadedUrls={preloadedUrls}
      issueUrl={window.lildocsIssueUrl}
    />,
    root,
  );
})();

function SearchBox({
  anchorElement,
  index,
  siteRoot,
  preloadedUrls,
  issueUrl,
}: {
  anchorElement: Element;
  index: SearchEntry[];
  siteRoot: URL;
  preloadedUrls: Set<string>;
  issueUrl?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLAnchorElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const matches = useMemo(() => searchIndex(index, query), [index, query]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
    preloadRelativeUrl(selectedRef.current?.getAttribute("href"), preloadedUrls);
  }, [matches, preloadedUrls, selectedIndex]);

  const clearSearch = () => {
    setQuery("");
    setSelectedIndex(-1);
    open.value = false;
  };

  const selectResult = (nextIndex: number) => {
    if (matches.length === 0) {
      setSelectedIndex(-1);
      return;
    }

    setSelectedIndex((nextIndex + matches.length) % matches.length);
  };

  return (
    <>
      <span className="searchIcon ti ti-search" aria-hidden="true" />
      <input
        ref={inputRef}
        id="lildocs-search-input"
        type="search"
        placeholder="Search docs"
        aria-label="Search docs"
        aria-expanded={open.value}
        aria-controls="lildocs-search-results"
        value={query}
        onInput={(event) => {
          const nextQuery = event.currentTarget.value;
          setQuery(nextQuery);
          setSelectedIndex(nextQuery.trim() ? 0 : -1);
          open.value = Boolean(nextQuery.trim());
        }}
        onKeyDown={(event) => {
          if (!open.value || matches.length === 0) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            selectResult(selectedIndex + 1);
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            selectResult(selectedIndex - 1);
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            const selected = selectedRef.current;
            if (selected) {
              preloadRelativeUrl(selected.getAttribute("href"), preloadedUrls);
              selected.click();
            }
            return;
          }

          if (event.key === "Escape") {
            open.value = false;
          }
        }}
      />
      <Popover
        open={open}
        anchor={() => anchorElement}
        ariaLabel="Search results"
        class="searchResults"
        closeOnOutsidePointer
        blockOutsidePointer={false}
        focusOnOpen={false}
        restoreFocus={false}
        placement="bottom-end"
        sameWidth={false}
      >
        <div id="lildocs-search-results">
          {matches.length === 0 ? (
            <div className="searchEmpty">
              <p>No results</p>
              {issueUrl ? (
                <a href={issueUrlForQuery(issueUrl, query)}>Create a GitHub issue</a>
              ) : null}
            </div>
          ) : (
            matches.map((match, matchIndex) => {
              const selected = matchIndex === selectedIndex;
              return (
                <a
                  key={`${match.entry.route}:${match.title}`}
                  ref={selected ? selectedRef : undefined}
                  href={new URL(match.entry.route, siteRoot).href}
                  data-search-result="true"
                  className={selected ? "selected" : undefined}
                  aria-selected={selected}
                  onMouseOver={() => setSelectedIndex(matchIndex)}
                  onClick={clearSearch}
                >
                  {renderHighlighted(match.title, match.terms)}
                  <span>{renderHighlighted(match.subtitle, match.terms)}</span>
                </a>
              );
            })
          )}
        </div>
      </Popover>
    </>
  );
}

function issueUrlForQuery(issueUrl: string, query: string) {
  const url = new URL(issueUrl);
  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    url.searchParams.set("title", `Missing docs for ${trimmedQuery}`);
    url.searchParams.set(
      "body",
      `I searched the docs for "${trimmedQuery}" but did not find a result.`,
    );
  }

  return url.href;
}

function searchIndex(index: SearchEntry[], query: string) {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  const terms = normalizedQuery.split(/\s+/);
  const matches = index.map((entry) => matchEntry(entry, terms, normalizedQuery)).filter(isMatch);
  const titleMatches = matches.filter((match) => match.type === "title");
  const sectionBodyMatches = matches.filter(
    (match) => match.type === "body" && match.entry.kind === "section",
  );
  const bodyMatches =
    sectionBodyMatches.length > 0
      ? sectionBodyMatches
      : matches.filter((match) => match.type === "body");
  const visibleMatches = titleMatches.length < 4 ? [...titleMatches, ...bodyMatches] : titleMatches;

  return visibleMatches
    .toSorted((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 8);
}

function preloadRelativeUrl(href: string | null | undefined, preloadedUrls: Set<string>) {
  if (!href || href.startsWith("mailto:") || href.startsWith("#")) {
    return;
  }

  const url = new URL(href, document.baseURI);
  if (url.origin !== window.location.origin || preloadedUrls.has(url.href)) {
    return;
  }

  preloadedUrls.add(url.href);
  const preload = document.createElement("link");
  preload.rel = "prefetch";
  preload.href = url.href;
  document.head.append(preload);
}

function matchEntry(
  entry: SearchEntry,
  terms: string[],
  normalizedQuery: string,
): SearchMatch | undefined {
  const titleScore = scoreText(entry.title, terms, normalizedQuery);
  if (titleScore > 0) {
    return {
      entry,
      title: entry.title,
      subtitle: subtitleForEntry(entry),
      score: (entry.kind === "page" ? 300 : 250) + titleScore,
      terms,
      type: "title",
    };
  }

  const bodyScore = scoreText(entry.text, terms, normalizedQuery);
  if (bodyScore > 0) {
    return {
      entry,
      title: matchingSnippet(entry.text, terms),
      subtitle: subtitleForEntry(entry),
      score: 20 + bodyScore,
      terms,
      type: "body",
    };
  }

  return undefined;
}

function scoreText(value: string, terms: string[], normalizedQuery: string) {
  const text = value.toLowerCase();
  if (!text) {
    return 0;
  }

  let score = 0;
  if (text === normalizedQuery) {
    score += 80;
  } else if (text.includes(normalizedQuery)) {
    score += 40;
  }

  for (const term of terms) {
    if (text.includes(term)) {
      score += 10;
    }
  }

  return score;
}

function subtitleForEntry(entry: SearchEntry) {
  if (entry.kind === "page") {
    return entry.headings.slice(0, 3).join(" / ") || "Page";
  }

  const parents = entry.headings.slice(0, -1);
  return uniqueParts([entry.pageTitle, ...parents]).join(" / ");
}

function matchingSnippet(text: string, terms: string[]) {
  const lowerText = text.toLowerCase();
  const starts = terms
    .map((term) => lowerText.indexOf(term))
    .filter((index) => index >= 0)
    .toSorted((a, b) => a - b);
  const matchStart = starts[0] ?? 0;
  const start = Math.max(0, matchStart - 36);
  const end = Math.min(text.length, matchStart + 96);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function renderHighlighted(value: string, terms: string[]) {
  const matchingTerms = terms.filter(Boolean).toSorted((a, b) => b.length - a.length);
  if (matchingTerms.length === 0) {
    return value;
  }

  const pattern = new RegExp(`(${matchingTerms.map(escapeRegExp).join("|")})`, "gi");
  return value
    .split(pattern)
    .map((part) =>
      matchingTerms.some((term) => part.toLowerCase() === term) ? <mark>{part}</mark> : part,
    );
}

function normalizeQuery(value: string) {
  return value
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function uniqueParts(parts: string[]) {
  return parts.filter((part, index) => part && parts.indexOf(part) === index);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMatch(match: SearchMatch | undefined): match is SearchMatch {
  return Boolean(match);
}
