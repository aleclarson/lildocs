import { renderToStaticMarkup } from "octane/server";
import type { RenderPageProps } from "../core/frontend.js";
import { Layout } from "./Layout.tsrx";

export function renderPage(props: RenderPageProps) {
  const { html, css } = renderToStaticMarkup(Layout, props);
  const bodyStart = html.indexOf('<div class="pageShell">');
  const head = bodyStart >= 0 ? html.slice(0, bodyStart) : "";
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html;
  return (
    `<!doctype html><html lang="en"><head>${head}<style>${props.css}</style>${css}</head>` +
    `<body>${body}</body></html>`
  );
}
