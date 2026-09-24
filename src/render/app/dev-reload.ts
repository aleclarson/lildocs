export function initDevReload() {
  const lildocs = (window as typeof window & { __lildocs?: { dev?: boolean } })
    .__lildocs;
  if (!lildocs?.dev || typeof EventSource === "undefined") {
    return;
  }

  const events = new EventSource("/__lildocs_reload");
  events.addEventListener("message", () => {
    window.location.reload();
  });
}
