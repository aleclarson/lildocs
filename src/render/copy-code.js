(() => {
  const icons = {
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M5 15V7a2 2 0 0 1 2-2h8"></path></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>',
    error:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle></svg>',
  };

  initCopyCode();
  document.addEventListener("lildocs:page-view", initCopyCode);

  function initCopyCode() {
    const blocks = document.querySelectorAll(".content article pre");
    if (!blocks.length || !navigator.clipboard?.writeText) {
      return;
    }

    for (const block of blocks) {
      if (block.querySelector(":scope > .copyCodeButton")) {
        continue;
      }

      const copyText = block.textContent ?? "";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copyCodeButton";
      button.setAttribute("aria-label", "Copy code");
      button.title = "Copy code";
      button.innerHTML = icons.copy;

      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(copyText);
          button.innerHTML = icons.check;
          button.setAttribute("aria-label", "Copied");
          button.title = "Copied";
          window.setTimeout(() => {
            button.innerHTML = icons.copy;
            button.setAttribute("aria-label", "Copy code");
            button.title = "Copy code";
          }, 1600);
        } catch {
          button.innerHTML = icons.error;
          button.setAttribute("aria-label", "Copy failed");
          button.title = "Copy failed";
        }
      });

      block.append(button);
    }
  }
})();
