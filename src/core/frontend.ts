import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { InlineConfig, ViteDevServer } from "vite";
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
  return readFile(path.join(frontendSourceDir(), name), "utf8");
}

export function frontendDevScriptPath() {
  return `/@fs/${toVitePath(clientEntryPath())}`;
}

export async function buildFrontendAssets(options: {
  cwd: string;
  outDir: string;
}): Promise<FrontendAssets> {
  const vite = await loadVite();
  const outDir = path.join(options.outDir, "assets", "lildocs");
  await vite.build({
    ...(await frontendViteConfig(options.cwd, "build")),
    base: "./",
    build: {
      outDir,
      emptyOutDir: true,
      manifest: true,
      minify: false,
      target: "esnext",
      rollupOptions: {
        input: clientEntryPath(),
      },
    },
  });

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
    throw new LildocsError("Vite did not emit a frontend entry for the documentation site.");
  }

  return {
    scriptPath: toPosixPath(path.join("assets", "lildocs", entry.file)),
    stylePaths: (entry.css ?? []).map((file) => toPosixPath(path.join("assets", "lildocs", file))),
  };
}

export async function createFrontendRenderer(options: {
  cwd: string;
  viteServer?: ViteDevServer;
}): Promise<FrontendRenderer> {
  if (options.viteServer) {
    const mod = await options.viteServer.ssrLoadModule(serverEntryPath());
    return {
      renderPage: renderPageExport(mod),
      close: async () => {},
    };
  }

  const vite = await loadVite();
  const server = await vite.createServer({
    ...(await frontendViteConfig(options.cwd, "ssr")),
    appType: "custom",
    server: {
      middlewareMode: true,
      fs: {
        allow: [frontendSourceDir(), options.cwd],
      },
    },
  });
  const mod = await server.ssrLoadModule(serverEntryPath());
  return {
    renderPage: renderPageExport(mod),
    close: () => server.close(),
  };
}

export async function createFrontendDevServer(options: {
  cwd: string;
  root: string;
  host: string;
  port: number;
}) {
  const vite = await loadVite();
  const server = await vite.createServer({
    ...(await frontendViteConfig(options.cwd, "dev")),
    root: options.root,
    appType: "mpa",
    server: {
      host: options.host,
      port: options.port,
      strictPort: false,
      fs: {
        allow: [frontendSourceDir(), options.root, options.cwd],
      },
    },
  });
  await server.listen();
  return server;
}

function frontendSourceDir() {
  const nested = path.resolve(sourceDir, "render");
  if (existsSync(path.join(nested, "client.tsrx"))) {
    return nested;
  }

  return path.resolve(sourceDir, "../render");
}

function clientEntryPath() {
  return path.join(frontendSourceDir(), "client.tsrx");
}

function serverEntryPath() {
  return path.join(frontendSourceDir(), "renderPage.tsrx");
}

async function frontendViteConfig(cwd: string, mode: "build" | "dev" | "ssr"): Promise<InlineConfig> {
  const { octane } = await loadOctaneCompiler();
  return {
    configFile: false,
    root: frontendSourceDir(),
    publicDir: false,
    cacheDir: path.join(cwd, "node_modules", ".vite", `lildocs-${mode}`),
    clearScreen: false,
    logLevel: "warn",
    plugins: [octane()],
    optimizeDeps: {
      exclude: ["octane"],
    },
    ssr: {
      noExternal: [/^octane(?:$|\/)/],
    },
  };
}

async function loadVite() {
  try {
    return await import("vite");
  } catch (error) {
    throw new LildocsError(
      `Lildocs needs Vite to build and preview its frontend. Install vite in the project using Lildocs.\n${errorMessage(error)}`,
    );
  }
}

async function loadOctaneCompiler() {
  try {
    return (await import("octane/compiler/vite")) as typeof import("octane/compiler/vite");
  } catch (error) {
    throw new LildocsError(
      `Lildocs needs Octane to compile its frontend.\n${errorMessage(error)}`,
    );
  }
}

function renderPageExport(mod: unknown): RenderPage {
  const renderPage =
    mod && typeof mod === "object" && "renderPage" in mod ? (mod.renderPage as unknown) : undefined;
  if (typeof renderPage !== "function") {
    throw new LildocsError("Lildocs frontend renderer did not export renderPage.");
  }

  return renderPage as RenderPage;
}

function toVitePath(filePath: string) {
  return path.resolve(filePath).split(path.sep).join("/");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
