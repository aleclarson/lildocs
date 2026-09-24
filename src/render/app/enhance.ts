/**
 * Progressive-enhancement helpers for rendered page content. Functions that
 * scan the DOM run from the page component's mount effect; delegated
 * listeners are registered once in `initGlobalBehaviors`.
 */

const headingSelector =
  ".content article h1[id], .content article h2[id], .content article h3[id], .content article h4[id], .content article h5[id], .content article h6[id]";
const headingLinkIcons = {
  link: '<span class="ti ti-link" aria-hidden="true"></span>',
  check: '<span class="ti ti-check" aria-hidden="true"></span>',
};
const copyCodeIcons = {
  copy: '<span class="ti ti-copy copyCodeIcon" aria-hidden="true"></span>',
  check:
    '<span class="ti ti-copy-check copyCodeIcon" aria-hidden="true"></span>',
  error:
    '<span class="ti ti-alert-circle copyCodeIcon" aria-hidden="true"></span>',
};
const sectionHighlightStorageKey = "lildocs:section-highlight";

let pendingSectionUrl: string | undefined;
let activeDialog: HTMLDialogElement | undefined;
let tocAnimationFrame: number | undefined;

/** Enhance newly rendered page content after each page mount. */
export function enhancePageContent(root: ParentNode = document) {
  enhanceCodeBlocks(root);
  enhanceHeadingLinks(root);
  enhanceTables(root);
  enhanceMermaidDiagrams(root);
  scheduleTocVisibilityUpdate();
  highlightPendingSection();
}

/** Register listeners that work for the lifetime of the document. */
export function initGlobalBehaviors() {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const tocLink =
      event.target.closest<HTMLAnchorElement>('.toc a[href^="#"]');
    if (tocLink) {
      queueSectionHighlight(tocLink.href);
      return;
    }

    if (event.target.closest("a")) {
      return;
    }

    const heading = event.target.closest<HTMLHeadingElement>(headingSelector);
    if (heading) {
      void copyHeadingLink(heading);
    }
  });
  window.addEventListener("scroll", scheduleTocVisibilityUpdate, {
    passive: true,
  });
  window.addEventListener("resize", scheduleTocVisibilityUpdate);
  window.addEventListener("hashchange", highlightPendingSection);
  void document.fonts?.ready.then(scheduleTocVisibilityUpdate);
}

function enhanceCodeBlocks(root: ParentNode) {
  const blocks = root.querySelectorAll(".content article pre");
  if (!blocks.length || !navigator.clipboard?.writeText) {
    return;
  }

  for (const block of Array.from(blocks)) {
    if (block.parentElement?.classList.contains("copyCodeBlock")) {
      continue;
    }

    const copyText = block.textContent ?? "";
    const wrapper = document.createElement("div");
    wrapper.className = "copyCodeBlock";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copyCodeButton";
    button.setAttribute("aria-label", "Copy code");
    button.title = "Copy code";
    button.innerHTML = copyCodeIcons.copy;

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copyText);
        button.innerHTML = copyCodeIcons.check;
        button.setAttribute("aria-label", "Copied");
        button.title = "Copied";
        window.setTimeout(() => {
          button.innerHTML = copyCodeIcons.copy;
          button.setAttribute("aria-label", "Copy code");
          button.title = "Copy code";
        }, 1600);
      } catch {
        button.innerHTML = copyCodeIcons.error;
        button.setAttribute("aria-label", "Copy failed");
        button.title = "Copy failed";
      }
    });

    block.before(wrapper);
    wrapper.append(block, button);
  }
}

function enhanceHeadingLinks(root: ParentNode) {
  const headings = root.querySelectorAll<HTMLHeadingElement>(headingSelector);

  for (const heading of Array.from(headings)) {
    if (heading.querySelector(".headingLinkIcon")) {
      continue;
    }

    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "headingLinkIcon";
    icon.setAttribute("aria-label", "Copy link to heading");
    icon.title = "Copy link to heading";
    icon.innerHTML = headingLinkIcons.link;
    heading.append(icon);
  }
}

async function copyHeadingLink(heading: HTMLHeadingElement) {
  const url = new URL(window.location.href);
  url.hash = heading.tagName === "H1" ? "" : heading.id;

  try {
    await writeClipboard(url.href);
    const icon = heading.querySelector<HTMLButtonElement>(".headingLinkIcon");
    if (!icon) {
      return;
    }

    icon.classList.add("headingLinkCopied");
    icon.innerHTML = headingLinkIcons.check;
    icon.setAttribute("aria-label", "Copied");
    icon.title = "Copied";
    window.setTimeout(() => {
      icon.classList.remove("headingLinkCopied");
      icon.innerHTML = headingLinkIcons.link;
      icon.setAttribute("aria-label", "Copy link to heading");
      icon.title = "Copy link to heading";
    }, 1600);
  } catch {}
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Unable to copy heading link");
  }
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

export function scheduleTocVisibilityUpdate() {
  if (tocAnimationFrame !== undefined) {
    return;
  }

  tocAnimationFrame = window.requestAnimationFrame(() => {
    tocAnimationFrame = undefined;
    updateTocVisibility();
  });
}

function updateTocVisibility() {
  const container = document.querySelector<HTMLElement>("[data-toc-links]");
  const indicator = container?.querySelector<HTMLElement>(
    "[data-toc-visibility]",
  );
  if (!container || !indicator) {
    return;
  }

  const items = Array.from(
    container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'),
  )
    .map((link) => {
      const heading = headingForLink(link);
      return heading ? { heading, link } : undefined;
    })
    .filter((item): item is { heading: HTMLElement; link: HTMLAnchorElement } =>
      Boolean(item),
    );
  const visibleItems = items.filter(({ heading }) => {
    const bounds = heading.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < window.innerHeight;
  });
  if (visibleItems.length === 0 || visibleItems.length === items.length) {
    indicator.classList.remove("isVisible");
    return;
  }

  const containerBounds = container.getBoundingClientRect();
  const firstBounds = visibleItems[0].link.getBoundingClientRect();
  const lastBounds =
    visibleItems.at(-1)?.link.getBoundingClientRect() ?? firstBounds;
  indicator.style.setProperty(
    "--ld-toc-visibility-top",
    `${firstBounds.top - containerBounds.top}px`,
  );
  indicator.style.setProperty(
    "--ld-toc-visibility-height",
    `${lastBounds.bottom - firstBounds.top}px`,
  );
  indicator.classList.add("isVisible");
}

function headingForLink(link: HTMLAnchorElement): HTMLElement | null {
  const id = link.hash.slice(1);
  if (!id) {
    return null;
  }

  try {
    return document.getElementById(decodeURIComponent(id));
  } catch {
    return document.getElementById(id);
  }
}

function enhanceTables(root: ParentNode) {
  const tables = root.querySelectorAll<HTMLTableElement>(
    ".content article table",
  );
  for (const table of Array.from(tables)) {
    if (table.closest(".tableFrame")) {
      continue;
    }

    const frame = document.createElement("div");
    frame.className = "tableFrame";
    const toolbar = document.createElement("div");
    toolbar.className = "tableToolbar";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tableExpandButton";
    button.title = "Expand table";
    button.setAttribute("aria-label", "View table in full screen");
    button.innerHTML =
      '<span class="ti ti-arrows-maximize" aria-hidden="true"></span>';
    const viewport = document.createElement("div");
    viewport.className = "tableViewport";

    button.addEventListener("click", () =>
      openFullscreenDialog(table, button, {
        dialogClass: "tableFullscreenDialog",
        dialogLabel: "Full screen table",
        title: table.querySelector("caption")?.textContent?.trim() || "Table",
        closeLabel: "Minimize table",
        viewportClass: "tableFullscreenViewport content",
        openClass: "tableFullscreenOpen",
      }),
    );
    table.before(frame);
    toolbar.append(button);
    viewport.append(table);
    frame.append(viewport, toolbar);
  }
}

function enhanceMermaidDiagrams(root: ParentNode) {
  const diagrams = root.querySelectorAll<HTMLElement>(
    ".content article .mermaidDiagram",
  );
  for (const diagram of Array.from(diagrams)) {
    if (diagram.closest(".mermaidFrame")) {
      continue;
    }

    const frame = document.createElement("div");
    frame.className = "mermaidFrame";
    const toolbar = document.createElement("div");
    toolbar.className = "mermaidToolbar";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mermaidExpandButton";
    button.title = "Expand diagram";
    button.setAttribute("aria-label", "View diagram in full screen");
    button.innerHTML =
      '<span class="ti ti-arrows-maximize" aria-hidden="true"></span>';
    const viewport = document.createElement("div");
    viewport.className = "mermaidViewport";

    button.addEventListener("click", () =>
      openFullscreenDialog(diagram, button, {
        dialogClass: "mermaidFullscreenDialog",
        dialogLabel: "Full screen diagram",
        title: "Diagram",
        closeLabel: "Minimize diagram",
        viewportClass: "mermaidFullscreenViewport content",
        openClass: "mermaidFullscreenOpen",
      }),
    );
    diagram.before(frame);
    toolbar.append(button);
    viewport.append(diagram);
    frame.append(viewport, toolbar);
  }
}

type FullscreenDialogOptions = {
  dialogClass: string;
  dialogLabel: string;
  title: string;
  closeLabel: string;
  viewportClass: string;
  openClass: string;
};

function openFullscreenDialog(
  source: HTMLElement,
  opener: HTMLButtonElement,
  options: FullscreenDialogOptions,
) {
  activeDialog?.close();

  const dialog = document.createElement("dialog");
  dialog.className = options.dialogClass;
  dialog.setAttribute("aria-label", options.dialogLabel);
  const content = document.createElement("div");
  content.className = "tableFullscreenContent";
  const header = document.createElement("header");
  header.className = "tableFullscreenHeader";
  const title = document.createElement("strong");
  title.textContent = options.title;
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "tableFullscreenClose";
  closeButton.title = options.closeLabel;
  closeButton.setAttribute("aria-label", options.closeLabel);
  closeButton.innerHTML =
    '<span class="ti ti-arrows-minimize" aria-hidden="true"></span>';
  const viewport = document.createElement("div");
  viewport.className = options.viewportClass;
  viewport.append(source.cloneNode(true));

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener(
    "close",
    () => {
      document.documentElement.classList.remove(options.openClass);
      dialog.remove();
      if (activeDialog === dialog) {
        activeDialog = undefined;
      }
      if (opener.isConnected) {
        opener.focus();
      }
    },
    { once: true },
  );

  header.append(title, closeButton);
  content.append(header, viewport);
  dialog.append(content);
  document.body.append(dialog);
  document.documentElement.classList.add(options.openClass);
  activeDialog = dialog;
  dialog.showModal();
}
