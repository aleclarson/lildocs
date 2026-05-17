(async () => {
  const input = document.querySelector("#lildocs-search-input");
  const results = document.querySelector("#lildocs-search-results");
  if (!input || !results) {
    return;
  }

  const embeddedIndex = document.querySelector("#lildocs-search-index");
  const base = new URL(window.lildocsSearchUrl || "search-index.json", document.baseURI);
  const index = embeddedIndex?.textContent
    ? JSON.parse(embeddedIndex.textContent)
    : await fetch(base).then((response) => response.json());
  const siteRoot = new URL(".", base);
  let selectedIndex = -1;
  const preloadedUrls = new Set();

  document.addEventListener("mouseover", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) {
      return;
    }
    preloadRelativeUrl(link.getAttribute("href"));
  });

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    results.replaceChildren();
    selectedIndex = -1;

    if (!query) {
      results.classList.remove("open");
      return;
    }

    const terms = query.split(/\s+/);
    const matches = index
      .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
      .filter((result) => result.score > 0)
      .toSorted((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, 8);

    results.classList.add("open");
    if (matches.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No results";
      results.append(empty);
      return;
    }

    for (const match of matches) {
      const link = document.createElement("a");
      link.href = new URL(match.entry.route, siteRoot).href;
      link.dataset.searchResult = "true";
      link.textContent = match.entry.title;
      const detail = document.createElement("span");
      detail.textContent = match.entry.headings.slice(0, 3).join(" · ");
      link.append(detail);
      link.addEventListener("mouseover", () => {
        selectResult(resultLinks().indexOf(link));
      });
      results.append(link);
    }

    selectResult(0);
  });

  input.addEventListener("keydown", (event) => {
    const links = resultLinks();
    if (!results.classList.contains("open") || links.length === 0) {
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
      const selected = links[selectedIndex] ?? links[0];
      if (selected) {
        preloadRelativeUrl(selected.getAttribute("href"));
        window.location.href = selected.href;
      }
      return;
    }

    if (event.key === "Escape") {
      results.classList.remove("open");
    }
  });

  function resultLinks() {
    return [...results.querySelectorAll("a[data-search-result]")];
  }

  function selectResult(nextIndex) {
    const links = resultLinks();
    if (links.length === 0) {
      selectedIndex = -1;
      return;
    }

    selectedIndex = (nextIndex + links.length) % links.length;
    for (const [linkIndex, link] of links.entries()) {
      const selected = linkIndex === selectedIndex;
      link.classList.toggle("selected", selected);
      link.setAttribute("aria-selected", String(selected));
    }

    const selected = links[selectedIndex];
    selected?.scrollIntoView({ block: "nearest" });
    preloadRelativeUrl(selected?.getAttribute("href"));
  }

  function preloadRelativeUrl(href) {
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

  function scoreEntry(entry, terms) {
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
})();
