let activeDialog: HTMLDialogElement | undefined;

export function initTableViewer() {
  enhanceTables();
  document.addEventListener("lildocs:page-view", () => {
    activeDialog?.close();
    enhanceTables();
  });
}

function enhanceTables() {
  const tables = document.querySelectorAll<HTMLTableElement>(
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

    button.addEventListener("click", () => openTableDialog(table, button));
    table.before(frame);
    toolbar.append(button);
    viewport.append(table);
    frame.append(viewport, toolbar);
  }
}

function openTableDialog(table: HTMLTableElement, opener: HTMLButtonElement) {
  activeDialog?.close();

  const dialog = document.createElement("dialog");
  dialog.className = "tableFullscreenDialog";
  dialog.setAttribute("aria-label", "Full screen table");
  const content = document.createElement("div");
  content.className = "tableFullscreenContent";
  const header = document.createElement("header");
  header.className = "tableFullscreenHeader";
  const title = document.createElement("strong");
  title.textContent =
    table.querySelector("caption")?.textContent?.trim() || "Table";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "tableFullscreenClose";
  closeButton.title = "Minimize table";
  closeButton.setAttribute("aria-label", "Minimize table");
  closeButton.innerHTML =
    '<span class="ti ti-arrows-minimize" aria-hidden="true"></span>';
  const viewport = document.createElement("div");
  viewport.className = "tableFullscreenViewport content";
  viewport.append(table.cloneNode(true));

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
      document.documentElement.classList.remove("tableFullscreenOpen");
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
  document.documentElement.classList.add("tableFullscreenOpen");
  activeDialog = dialog;
  dialog.showModal();
}
