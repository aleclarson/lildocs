(() => {
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
      button.textContent = "copy";

      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(copyText);
          button.textContent = "check";
          button.setAttribute("aria-label", "Copied");
          button.title = "Copied";
          window.setTimeout(() => {
            button.textContent = "copy";
            button.setAttribute("aria-label", "Copy code");
            button.title = "Copy code";
          }, 1600);
        } catch {
          button.textContent = "error";
          button.setAttribute("aria-label", "Copy failed");
          button.title = "Copy failed";
        }
      });

      block.append(button);
    }
  }
})();
