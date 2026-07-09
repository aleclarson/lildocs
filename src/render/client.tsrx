import { createRoot } from "octane";
import { initCopyCode } from "./copy-code.js";
import { initNavigation } from "./navigation.js";
import { preloadRelativeUrl, SearchBox } from "./Search.tsrx";
import type { SearchEntry } from "./Search.tsrx";

declare global {
  interface Window {
    lildocsIssueUrl?: string;
    lildocsSearchUrl?: string;
  }
}

initCopyCode();
initNavigation();

void mountSearch();

async function mountSearch() {
  const root = document.querySelector("#lildocs-search-root");
  if (!root) {
    return;
  }

  const embeddedIndex = document.querySelector("#lildocs-search-index");
  const base = new URL(window.lildocsSearchUrl || "search-index.json", document.baseURI);
  const index = embeddedIndex?.textContent
    ? (JSON.parse(embeddedIndex.textContent) as SearchEntry[])
    : ((await fetch(base).then((response) => response.json())) as SearchEntry[]);
  const siteRoot = new URL(".", base);
  const preloadedUrls = new Set<string>();

  document.addEventListener("mouseover", (event) => {
    const link = (event.target as Element | null)?.closest?.("a[href]");
    if (!link) {
      return;
    }
    preloadRelativeUrl(link.getAttribute("href"), preloadedUrls);
  });

  createRoot(root).render(SearchBox, {
    anchorElement: root,
    index,
    siteRoot,
    preloadedUrls,
    issueUrl: window.lildocsIssueUrl,
  });
}
