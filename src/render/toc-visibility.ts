let animationFrame: number | undefined;

export function initTocVisibility() {
  window.addEventListener("scroll", scheduleTocVisibilityUpdate, {
    passive: true,
  });
  window.addEventListener("resize", scheduleTocVisibilityUpdate);
  document.addEventListener("lildocs:page-view", scheduleTocVisibilityUpdate);
  void document.fonts?.ready.then(scheduleTocVisibilityUpdate);
  scheduleTocVisibilityUpdate();
}

function scheduleTocVisibilityUpdate() {
  if (animationFrame !== undefined) {
    return;
  }

  animationFrame = window.requestAnimationFrame(() => {
    animationFrame = undefined;
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
  const viewport = container.closest<HTMLElement>(".toc");
  const availableHeight = viewport
    ? viewport.clientHeight - container.offsetTop
    : window.innerHeight;
  const containerBounds = container.getBoundingClientRect();

  if (visibleItems.length === 0 || container.scrollHeight <= availableHeight) {
    indicator.classList.remove("isVisible");
    return;
  }

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
