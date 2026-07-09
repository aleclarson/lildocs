import Swup from "swup";

export function initNavigation() {
  if (window.location.protocol === "file:") {
    return;
  }

  const swup = new Swup({
    containers: ["#swup"],
    animationSelector: '[class*="transition-"]',
  });

  swup.hooks.on("page:view", () => {
    document.dispatchEvent(new CustomEvent("lildocs:page-view"));
  });
}
