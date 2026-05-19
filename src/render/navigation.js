(() => {
  if (!window.Swup || window.location.protocol === "file:") {
    return;
  }

  const swup = new window.Swup({
    containers: ["#swup"],
    animationSelector: '[class*="transition-"]',
  });

  swup.hooks.on("page:view", () => {
    document.dispatchEvent(new CustomEvent("lildocs:page-view"));
  });
})();
