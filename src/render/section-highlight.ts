const sectionHighlightStorageKey = "lildocs:section-highlight";
let pendingSectionUrl: string | undefined;

export function initSectionHighlights() {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const link = event.target.closest<HTMLAnchorElement>('.toc a[href^="#"]');
    if (link) {
      queueSectionHighlight(link.href);
    }
  });
  document.addEventListener("lildocs:page-view", highlightPendingSection);
  window.addEventListener("hashchange", highlightPendingSection);
  highlightPendingSection();
}

export function queueSectionHighlight(href: string) {
  pendingSectionUrl = href;
  try {
    window.sessionStorage.setItem(sectionHighlightStorageKey, href);
  } catch {}
  window.requestAnimationFrame(highlightPendingSection);
}

function highlightPendingSection() {
  let href = pendingSectionUrl;
  if (!href) {
    try {
      href =
        window.sessionStorage.getItem(sectionHighlightStorageKey) ?? undefined;
    } catch {}
  }
  if (!href) {
    return;
  }

  const targetUrl = new URL(href, document.baseURI);
  if (
    targetUrl.origin !== window.location.origin ||
    targetUrl.pathname !== window.location.pathname ||
    targetUrl.search !== window.location.search ||
    targetUrl.hash !== window.location.hash
  ) {
    return;
  }

  const target = document.getElementById(
    decodeURIComponent(targetUrl.hash.slice(1)),
  );
  if (!target) {
    return;
  }

  pendingSectionUrl = undefined;
  try {
    window.sessionStorage.removeItem(sectionHighlightStorageKey);
  } catch {}
  target.classList.remove("sectionHighlight");
  window.requestAnimationFrame(() => target.classList.add("sectionHighlight"));
}
