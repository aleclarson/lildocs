export function initSidebar() {
  const sidebar = document.querySelector("#lildocs-sidebar");
  const collapseButton = document.querySelector<HTMLButtonElement>("#lildocs-sidebar-toggle");
  const expandButton = document.querySelector<HTMLButtonElement>("#lildocs-sidebar-expand");
  const searchButton = document.querySelector<HTMLButtonElement>("#lildocs-floating-search");

  if (!sidebar || !collapseButton || !expandButton || !searchButton) {
    return;
  }

  const setCollapsed = (collapsed: boolean) => {
    document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
    collapseButton.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  };

  collapseButton.addEventListener("click", () => setCollapsed(true));
  expandButton.addEventListener("click", () => setCollapsed(false));
  searchButton.addEventListener("click", () => {
    setCollapsed(false);
    document.dispatchEvent(new CustomEvent("lildocs:search-toggle"));
  });
}
