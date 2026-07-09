let activeDialog: HTMLDialogElement | undefined;

export function initTableViewer() {
  enhanceTables();
  enhanceMermaidDiagrams();
  document.addEventListener("lildocs:page-view", () => {
    activeDialog?.close();
    enhanceTables();
    enhanceMermaidDiagrams();
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

    button.addEventListener("click", () =>
      openFullscreenDialog(table, button, {
        dialogClass: "tableFullscreenDialog",
        dialogLabel: "Full screen table",
        title: table.querySelector("caption")?.textContent?.trim() || "Table",
        closeLabel: "Minimize table",
        viewportClass: "tableFullscreenViewport content",
        openClass: "tableFullscreenOpen",
      }),
    );
    table.before(frame);
    toolbar.append(button);
    viewport.append(table);
    frame.append(viewport, toolbar);
  }
}

function enhanceMermaidDiagrams() {
  const diagrams = document.querySelectorAll<HTMLElement>(
    ".content article .mermaidDiagram",
  );
  for (const diagram of Array.from(diagrams)) {
    if (diagram.closest(".mermaidFrame")) {
      continue;
    }

    const frame = document.createElement("div");
    frame.className = "mermaidFrame";
    const toolbar = document.createElement("div");
    toolbar.className = "mermaidToolbar";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mermaidExpandButton";
    button.title = "Expand diagram";
    button.setAttribute("aria-label", "View diagram in full screen");
    button.innerHTML =
      '<span class="ti ti-arrows-maximize" aria-hidden="true"></span>';
    const viewport = document.createElement("div");
    viewport.className = "mermaidViewport";

    button.addEventListener("click", () =>
      openFullscreenDialog(diagram, button, {
        dialogClass: "mermaidFullscreenDialog",
        dialogLabel: "Full screen diagram",
        title: "Diagram",
        closeLabel: "Minimize diagram",
        viewportClass: "mermaidFullscreenViewport content",
        openClass: "mermaidFullscreenOpen",
      }),
    );
    diagram.before(frame);
    toolbar.append(button);
    viewport.append(diagram);
    frame.append(viewport, toolbar);
  }
}

type FullscreenDialogOptions = {
  dialogClass: string;
  dialogLabel: string;
  title: string;
  closeLabel: string;
  viewportClass: string;
  openClass: string;
};

function openFullscreenDialog(
  source: HTMLElement,
  opener: HTMLButtonElement,
  options: FullscreenDialogOptions,
) {
  activeDialog?.close();

  const dialog = document.createElement("dialog");
  dialog.className = options.dialogClass;
  dialog.setAttribute("aria-label", options.dialogLabel);
  const content = document.createElement("div");
  content.className = "tableFullscreenContent";
  const header = document.createElement("header");
  header.className = "tableFullscreenHeader";
  const title = document.createElement("strong");
  title.textContent = options.title;
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "tableFullscreenClose";
  closeButton.title = options.closeLabel;
  closeButton.setAttribute("aria-label", options.closeLabel);
  closeButton.innerHTML =
    '<span class="ti ti-arrows-minimize" aria-hidden="true"></span>';
  const viewport = document.createElement("div");
  viewport.className = options.viewportClass;
  viewport.append(source.cloneNode(true));

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
      document.documentElement.classList.remove(options.openClass);
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
  document.documentElement.classList.add(options.openClass);
  activeDialog = dialog;
  dialog.showModal();
}
