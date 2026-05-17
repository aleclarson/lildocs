(async () => {
  const input = document.querySelector("#lildocs-search-input");
  const results = document.querySelector("#lildocs-search-results");
  if (!input || !results) {
    return;
  }

  const base = new URL(window.lildocsSearchUrl || "search-index.json", document.baseURI);
  const index = await fetch(base).then((response) => response.json());
  const siteRoot = new URL(".", base);

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    results.replaceChildren();

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
      link.textContent = match.entry.title;
      const detail = document.createElement("span");
      detail.textContent = match.entry.headings.slice(0, 3).join(" · ");
      link.append(detail);
      results.append(link);
    }
  });

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
