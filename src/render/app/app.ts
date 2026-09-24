import { defineApp, route } from "flamefront";

/**
 * Placeholder baked into the generated bundles. `buildSite` rewrites it to
 * the deployment basename in client assets, while server rendering always
 * uses `createApp` with the real basename.
 */
export const basenamePlaceholder = "/__lildocs_base__";

export function createApp(basename: string) {
  return defineApp({
    document: "/app/Document.tsrx",
    shell: "/app/AppShell.tsrx",
    routing: { basename },
    routes: [route("/*", "/app/DocsPage.tsrx", { render: "static" })],
  });
}

export const app = createApp(basenamePlaceholder);
