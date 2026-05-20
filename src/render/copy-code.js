(() => {
  const icons = {
    copy: '<span class="material-symbols-rounded copyCodeIcon" aria-hidden="true">content_copy</span>',
    check: '<span class="material-symbols-rounded copyCodeIcon" aria-hidden="true">check</span>',
    error: '<span class="material-symbols-rounded copyCodeIcon" aria-hidden="true">error</span>',
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
