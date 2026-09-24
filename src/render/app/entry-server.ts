import { importRoute } from "virtual:flamefront/server-routes";
import { createOctaneDocuments } from "flamefront/octane";
import { createRouteRuntime } from "flamefront/server";
import { createApp } from "./app.ts";
import type { DocsData } from "./data.ts";

/**
 * Create the render pipeline for one site build. The docs data is injected
 * as loader context so loaders can resolve pages without filesystem access.
 */
export function createSiteRenderer(options: {
  basename?: string;
  data: DocsData;
}) {
  const app = createApp(options.basename ?? "/");
  const runtime = createRouteRuntime({
    app,
    importRoute,
    requestContext: () => options.data,
  });
  return createOctaneDocuments({ app, runtime });
}
