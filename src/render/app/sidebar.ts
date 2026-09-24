export function initSidebar() {
  const sidebar = document.querySelector("#lildocs-sidebar");
  const collapseButton = document.querySelector<HTMLButtonElement>(
    "#lildocs-sidebar-toggle",
  );
  const expandButton = document.querySelector<HTMLButtonElement>(
    "#lildocs-sidebar-expand",
  );
  const searchButton = document.querySelector<HTMLButtonElement>(
    "#lildocs-floating-search",
  );

  if (!sidebar || !collapseButton || !expandButton || !searchButton) {
    return;
  }

  const mobileQuery = window.matchMedia("(max-width: 860px)");

  const setMenuOpen = (open: boolean) => {
    document.documentElement.classList.toggle("sidebar-menu-open", open);
    collapseButton.setAttribute("aria-expanded", String(open));
    collapseButton.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu",
    );
  };

  const setCollapsed = (collapsed: boolean) => {
    document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
    collapseButton.setAttribute(
      "aria-label",
      collapsed ? "Expand sidebar" : "Collapse sidebar",
    );
  };

  const syncResponsiveState = () => {
    document.documentElement.classList.remove("sidebar-menu-open");
    collapseButton.setAttribute("aria-expanded", "false");
    collapseButton.setAttribute(
      "aria-label",
      mobileQuery.matches ? "Open navigation menu" : "Collapse sidebar",
    );
  };

  collapseButton.addEventListener("click", () => {
    if (mobileQuery.matches) {
      setMenuOpen(
        !document.documentElement.classList.contains("sidebar-menu-open"),
      );
      return;
    }
    setCollapsed(true);
  });
  expandButton.addEventListener("click", () => setCollapsed(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileQuery.matches) {
      setMenuOpen(false);
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      if (mobileQuery.matches) {
        setMenuOpen(
          !document.documentElement.classList.contains("sidebar-menu-open"),
        );
        return;
      }
      setCollapsed(
        !document.documentElement.classList.contains("sidebar-collapsed"),
      );
    }
  });
  sidebar.addEventListener("click", (event) => {
    if (
      mobileQuery.matches &&
      event.target instanceof Element &&
      event.target.closest("a[href]")
    ) {
      setMenuOpen(false);
    }
  });
  searchButton.addEventListener("click", () => {
    setCollapsed(false);
    document.dispatchEvent(new CustomEvent("lildocs:search-toggle"));
  });
  document.addEventListener("lildocs:sidebar-menu-open", () => {
    if (mobileQuery.matches) {
      setMenuOpen(true);
    }
  });
  mobileQuery.addEventListener("change", syncResponsiveState);
  syncResponsiveState();
}
