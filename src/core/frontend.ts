import { existsSync } from "node:fs";
import { cp, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import type { Page } from "./content.js";
import { LildocsError } from "./errors.js";
import type { ResolvedLogo } from "./logo.js";
import type { NavItem } from "./nav.js";
import { toPosixPath } from "./paths.js";
import type { NavigationOptions } from "./theme.js";
import type { PageNavigation } from "../render/types.js";

export type FrontendAssets = {
  scriptPath: string;
  stylePaths: string[];
};

export type RenderPageProps = {
  page: Page;
  nav: NavItem[];
  pageNavigation?: PageNavigation;
  css: string;
  searchIndexJson: string;
  logo: ResolvedLogo;
  favicon?: string;
  repositoryUrl?: string;
  projectName?: string;
  navigation?: NavigationOptions;
  clientScriptPath: string;
  clientStylePaths: string[];
  dev?: boolean;
};

export type RenderPage = (props: RenderPageProps) => string;

export type FrontendRenderer = {
  renderPage: RenderPage;
  close: () => Promise<void>;
};

type ManifestChunk = {
  file?: string;
  css?: string[];
  isEntry?: boolean;
};

const sourceDir = path.dirname(fileURLToPath(import.meta.url));

export async function readRenderAsset(name: string) {
  return readFile(path.join(renderOutputDir(), name), "utf8");
}

export async function buildFrontendAssets(options: {
  outDir: string;
}): Promise<FrontendAssets> {
  const source = path.join(renderOutputDir(), "client");
  const outDir = path.join(options.outDir, "assets", "lildocs");
  await cp(source, outDir, { recursive: true });

  const manifestPath = path.join(outDir, ".vite", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<
    string,
    ManifestChunk
  >;
  const entry = Object.values(manifest).find(
    (chunk): chunk is Required<Pick<ManifestChunk, "file">> & ManifestChunk =>
      chunk.isEntry === true && typeof chunk.file === "string",
  );
  if (!entry) {
    throw new LildocsError("Lildocs package is missing its frontend entry.");
  }

  return {
    scriptPath: toPosixPath(path.join("assets", "lildocs", entry.file)),
    stylePaths: (entry.css ?? []).map((file) =>
      toPosixPath(path.join("assets", "lildocs", file)),
    ),
  };
}

export async function createFrontendRenderer(): Promise<FrontendRenderer> {
  const rendererPath = path.join(renderOutputDir(), "server", "renderer.mjs");
  const mod = (await import(pathToFileURL(rendererPath).href)) as unknown;
  return {
    renderPage: renderPageExport(mod),
    close: async () => {},
  };
}

function renderOutputDir() {
  const nested = path.resolve(sourceDir, "render");
  if (existsSync(path.join(nested, "server", "renderer.mjs"))) {
    return nested;
  }
  return path.resolve(sourceDir, "../../dist/render");
}

function renderPageExport(mod: unknown): RenderPage {
  const renderPage =
    mod && typeof mod === "object" && "renderPage" in mod
      ? (mod.renderPage as unknown)
      : undefined;
  if (typeof renderPage !== "function") {
    throw new LildocsError(
      "Lildocs package renderer did not export renderPage.",
    );
  }
  return renderPage as RenderPage;
}
