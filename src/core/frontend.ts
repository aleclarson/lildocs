import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rootRelativeUrl } from "./paths.js";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));

/** Placeholder baked into prebuilt bundles; replaced per docs build. */
const basenamePlaceholder = "/__lildocs_base__";

export type RenderedDocument = {
  html: string;
  routeData?: unknown;
  status: number;
};

export type RouteFragmentArtifact = {
  protocol: number;
  route: string;
  boundary: string;
  html: string;
  routeData: unknown;
  boundaries: unknown[];
  hydration: unknown;
  status: number;
};

export type SiteDocuments = {
  renderDocument(
    template: string,
    request: Request,
    options?: { mode?: "server" | "static" | "shell" | "client" },
  ): Promise<RenderedDocument>;
  renderFragment(request: Request): Promise<RouteFragmentArtifact>;
};

type RendererModule = {
  createSiteRenderer(options: {
    basename?: string;
    data: unknown;
  }): SiteDocuments;
};

let modulePromise: Promise<RendererModule> | undefined;

export function rendererModuleUrl() {
  return pathToFileURL(path.join(renderOutputDir(), "server", "renderer.mjs"))
    .href;
}

export function renderDistDir() {
  return renderOutputDir();
}

export function loadRendererModule() {
  modulePromise ??= import(rendererModuleUrl()) as Promise<RendererModule>;
  return modulePromise;
}

export async function createSiteRenderer(options: {
  basename: string;
  data: unknown;
}) {
  const module = await loadRendererModule();
  return module.createSiteRenderer(options);
}

export function readClientTemplate() {
  return readFile(path.join(renderOutputDir(), "client", "index.html"), "utf8");
}

export async function readRenderAsset(name: string) {
  return readFile(path.join(renderOutputDir(), name), "utf8");
}

/**
 * Copy the prebuilt client bundle into the site and rewrite the baked
 * basename placeholder to the deployment basename.
 */
export async function installClientAssets(outDir: string, basename: string) {
  const source = path.join(renderOutputDir(), "client", "assets");
  const target = path.join(outDir, "assets", "lildocs");
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });

  for (const name of await readdir(target)) {
    if (!name.endsWith(".js") && !name.endsWith(".css")) {
      continue;
    }

    const filePath = path.join(target, name);
    const source = await readFile(filePath, "utf8");
    await writeFile(filePath, source.replaceAll(basenamePlaceholder, basename));
  }
}

/** Rewrite the placeholder asset prefix in an emitted document. */
export function rewriteDocumentAssets(
  html: string,
  route: string,
  basename: string,
) {
  const assetsPrefix = `${rootRelativeUrl(route, "assets/lildocs")}/`;
  return html
    .replaceAll(`${basenamePlaceholder}/assets/`, assetsPrefix)
    .replaceAll(basenamePlaceholder, basename);
}

function renderOutputDir() {
  const nested = path.resolve(sourceDir, "render");
  if (existsSync(path.join(nested, "server", "renderer.mjs"))) {
    return nested;
  }
  return path.resolve(sourceDir, "../../dist/render");
}
