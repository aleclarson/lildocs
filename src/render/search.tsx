import { signal } from "@preact/signals";
import { Popover, setOverlayPortalRoots } from "@goddard-ai/ui-primitives";
import { hydrate } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

type SearchEntry = {
  route: string;
  title: string;
  headings: string[];
  text: string;
};

declare global {
  interface Window {
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
    />,
    root,
  );
})();

function SearchBox({
  anchorElement,
  index,
  siteRoot,
  preloadedUrls,
}: {
  anchorElement: Element;
  index: SearchEntry[];
  siteRoot: URL;
  preloadedUrls: Set<string>;
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
      <span className="searchIcon material-symbols-rounded" aria-hidden="true">
        search
      </span>
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
            <p>No results</p>
          ) : (
            matches.map((match, matchIndex) => {
              const selected = matchIndex === selectedIndex;
              return (
                <a
                  ref={selected ? selectedRef : undefined}
                  href={new URL(match.entry.route, siteRoot).href}
                  data-search-result="true"
                  className={selected ? "selected" : undefined}
                  aria-selected={selected}
                  onMouseOver={() => setSelectedIndex(matchIndex)}
                  onClick={clearSearch}
                >
                  {match.entry.title}
                  <span>{match.entry.headings.slice(0, 3).join(" · ")}</span>
                </a>
              );
            })
          )}
        </div>
      </Popover>
    </>
  );
}

function searchIndex(index: SearchEntry[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const terms = normalizedQuery.split(/\s+/);
  return index
    .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
    .filter((result) => result.score > 0)
    .toSorted((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
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

function scoreEntry(entry: SearchEntry, terms: string[]) {
  const title = entry.title.toLowerCase();
  const headings = entry.headings.join(" ").toLowerCase();
  const text = entry.text.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (title.includes(term)) score += 10;
    if (headings.includes(term)) score += 5;
    if (text.includes(term)) score += 1;
  }

  return score;
}
