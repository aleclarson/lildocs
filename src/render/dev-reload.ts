export function initDevReload() {
  if (!window.lildocsDev || typeof EventSource === "undefined") {
    return;
  }

  const events = new EventSource("/__lildocs_reload");
  events.addEventListener("message", () => {
    window.location.reload();
  });
}
