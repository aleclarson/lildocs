(() => {
  const icons = {
    copy: '<span class="ti ti-copy copyCodeIcon" aria-hidden="true"></span>',
    check: '<span class="ti ti-copy-check copyCodeIcon" aria-hidden="true"></span>',
    error: '<span class="ti ti-alert-circle copyCodeIcon" aria-hidden="true"></span>',
  };

  initCopyCode();
  document.addEventListener("lildocs:page-view", initCopyCode);

  function initCopyCode() {
    const blocks = document.querySelectorAll(".content article pre");
    if (!blocks.length || !navigator.clipboard?.writeText) {
      return;
    }

    for (const block of blocks) {
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

      block.before(wrapper);
      wrapper.append(block, button);
    }
  }
})();
