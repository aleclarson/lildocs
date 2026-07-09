import { useEffect, useMemo, useRef, useState } from "octane";

export type SearchEntry = {
  kind: "page" | "section";
  route: string;
  title: string;
  pageTitle: string;
  headings: string[];
  text: string;
  excerpt: string;
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

export function SearchBox({
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
}) @{
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedRef = useRef<HTMLAnchorElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const matches = useMemo(() => searchIndex(index, query), [index, query]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
    preloadRelativeUrl(selectedRef.current?.getAttribute("href"), preloadedUrls);
  }, [matches, preloadedUrls, selectedIndex]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchorElement.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [anchorElement]);

  useEffect(() => {
    const toggleSearch = () => {
      if (document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setOpen(false);
        return;
      }

      document.documentElement.classList.remove("sidebar-collapsed");
      inputRef.current?.focus();
      setOpen(Boolean(query.trim()));
    };
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleSearch();
      }
    };

    document.addEventListener("lildocs:search-toggle", toggleSearch);
    document.addEventListener("keydown", handleShortcut);
    return () => {
      document.removeEventListener("lildocs:search-toggle", toggleSearch);
      document.removeEventListener("keydown", handleShortcut);
    };
  }, [query]);

  const clearSearch = () => {
    setQuery("");
    setSelectedIndex(-1);
    setOpen(false);
  };

  const selectResult = (nextIndex: number) => {
    if (matches.length === 0) {
      setSelectedIndex(-1);
      return;
    }

    setSelectedIndex((nextIndex + matches.length) % matches.length);
  };

  <>
    <span class="searchIcon ti ti-search" aria-hidden="true" />
    <input
      ref={inputRef}
      id="lildocs-search-input"
      type="search"
      placeholder="Search docs"
      aria-label="Search docs"
      aria-expanded={open}
      aria-controls="lildocs-search-results"
      value={query}
      onInput={(event) => {
        const nextQuery = (event.currentTarget as HTMLInputElement).value;
        setQuery(nextQuery);
        setSelectedIndex(nextQuery.trim() ? 0 : -1);
        setOpen(Boolean(nextQuery.trim()));
      }}
      onFocus={() => {
        if (query.trim()) {
          setOpen(true);
        }
      }}
      onKeyDown={(event) => {
        if (!open || matches.length === 0) {
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
          setOpen(false);
        }
      }}
    />
    @if (open) {
      <div id="lildocs-search-results" class="searchResults" aria-live="polite">
        <div class="searchResultsContent">
          <header class="searchResultsHeader">
            <p class="searchResultsEyebrow">Search</p>
            <h2>
              Results for <span>{query as string}</span>
            </h2>
            <p class="searchResultsSummary">
              {matches.length} {matches.length === 1 ? "result" : "results"}
            </p>
          </header>
          @if (matches.length === 0) {
            <section class="searchEmpty">
              <p>No pages match this search.</p>
              @if (issueUrl) {
                <a href={issueUrlForQuery(issueUrl, query)}>Create a GitHub issue</a>
              }
            </section>
          } @else {
            <div class="searchResultList" role="listbox">
              @for (const match of matches; index matchIndex; key `${match.entry.route}:${match.title}`) {
                const selected = matchIndex === selectedIndex;
                <a
                  ref={selected ? selectedRef : undefined}
                  href={new URL(match.entry.route, siteRoot).href}
                  data-search-result="true"
                  class={`searchResult${selected ? " selected" : ""}`}
                  role="option"
                  aria-selected={selected}
                  onMouseOver={() => setSelectedIndex(matchIndex)}
                  onClick={clearSearch}
                >
                  <span class="searchResultType">
                    {match.entry.kind === "page" ? "Page" : "Section"}
                  </span>
                  <span class="searchResultTitle">{renderHighlighted(match.title, match.terms)}</span>
                  <span class="searchResultSnippet">
                    {renderHighlighted(match.subtitle, match.terms)}
                  </span>
                </a>
              }
            </div>
          }
        </div>
      </div>
    }
  </>
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

export function preloadRelativeUrl(href: string | null | undefined, preloadedUrls: Set<string>) {
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
      title: matchingSnippet(entry.excerpt, terms),
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
  const paragraphs = text.split(/\n{2,}/).map(normalizeSnippetPart).filter(Boolean);
  const paragraph = paragraphs.find((part) => containsTerms(part, terms)) ?? paragraphs[0] ?? "";
  const sentences = paragraph.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(normalizeSnippetPart) ?? [];

  return sentences.find((sentence) => containsTerms(sentence, terms)) ?? paragraph;
}

function containsTerms(value: string, terms: string[]) {
  const normalized = value.toLocaleLowerCase();
  return terms.every((term) => normalized.includes(term));
}

function normalizeSnippetPart(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function renderHighlighted(value: string, terms: string[]) {
  const matchingTerms = terms.filter(Boolean).toSorted((a, b) => b.length - a.length);
  if (matchingTerms.length === 0) {
    return value;
  }

  const pattern = new RegExp(`(${matchingTerms.map(escapeRegExp).join("|")})`, "gi");
  return value.split(pattern).map((part) =>
    matchingTerms.some((term) => part.toLowerCase() === term) ? (
      <mark>{part as string}</mark>
    ) : (
      part
    ),
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
