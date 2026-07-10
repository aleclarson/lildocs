import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { InlineConfig, Plugin, ViteDevServer } from "vite";
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
const require = createRequire(import.meta.url);
const virtualOctaneCssId = "\0lildocs-octane-css";

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
    throw new LildocsError(
      "Vite did not emit a frontend entry for the documentation site.",
    );
  }

  return {
    scriptPath: toPosixPath(path.join("assets", "lildocs", entry.file)),
    stylePaths: (entry.css ?? []).map((file) =>
      toPosixPath(path.join("assets", "lildocs", file)),
    ),
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

async function frontendViteConfig(
  cwd: string,
  mode: "build" | "dev" | "ssr",
): Promise<InlineConfig> {
  const { octane } = await loadOctaneCompiler();
  return {
    configFile: false,
    root: frontendSourceDir(),
    publicDir: false,
    cacheDir: path.join(cwd, "node_modules", ".vite", `lildocs-${mode}`),
    clearScreen: false,
    logLevel: "warn",
    plugins: [octaneRuntimeCompatibility(), octane()],
    optimizeDeps: {
      exclude: ["octane"],
      ...(mode === "dev" ? { noDiscovery: true } : {}),
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
    mod && typeof mod === "object" && "renderPage" in mod
      ? (mod.renderPage as unknown)
      : undefined;
  if (typeof renderPage !== "function") {
    throw new LildocsError(
      "Lildocs frontend renderer did not export renderPage.",
    );
  }

  return renderPage as RenderPage;
}

function octaneRuntimeCompatibility(): Plugin {
  return {
    name: "lildocs-octane-runtime-compatibility",
    enforce: "pre",
    resolveId(source, importer, options) {
      if (source === "octane/server" && options.ssr) {
        return resolveOctaneServerRuntime();
      }

      if (
        source === "./css.js" &&
        importer &&
        isOctaneRuntimeImport(importer)
      ) {
        return virtualOctaneCssId;
      }

      return null;
    },
    load(id) {
      if (id === virtualOctaneCssId) {
        return octaneCssHelpersSource;
      }

      return null;
    },
  };
}

function resolveOctaneServerRuntime() {
  const serverEntry = require.resolve("octane/server");
  const candidates = [
    serverEntry.replace(
      /[/\\]server[/\\]index\.js$/,
      `${path.sep}runtime.server.js`,
    ),
    serverEntry.replace(
      /[/\\]server[/\\]index\.ts$/,
      `${path.sep}runtime.server.ts`,
    ),
  ];
  const runtimePath = candidates.find(
    (candidate) => candidate !== serverEntry && existsSync(candidate),
  );
  if (!runtimePath) {
    throw new LildocsError(
      `Unable to locate Octane server runtime from ${serverEntry}.`,
    );
  }

  return runtimePath;
}

function isOctaneRuntimeImport(importer: string) {
  const [filePath] = importer.split("?", 1);
  const normalized = toPosixPath(filePath);
  return /\/octane\/(?:src|dist)\/runtime(?:\.server)?\.(?:ts|js)$/.test(
    normalized,
  );
}

const octaneCssHelpersSource = `
export function normalizeClass(value) {
  if (typeof value === "string") return value;
  if (typeof value !== "object") {
    return typeof value === "number" && value ? "" + value : "";
  }
  if (value === null) return "";
  let str = "";
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item) {
        const inner = normalizeClass(item);
        if (inner) str = str ? str + " " + inner : inner;
      }
    }
  } else {
    for (const key in value) {
      if (value[key]) str = str ? str + " " + key : key;
    }
  }
  return str;
}

const styleNameCache = new Map();

export function styleName(name) {
  const cached = styleNameCache.get(name);
  if (cached !== undefined) return cached;
  const result = hyphenateStyleName(name);
  styleNameCache.set(name, result);
  return result;
}

function hyphenateStyleName(name) {
  if (name.charCodeAt(0) === 45) return name;
  let hasUpper = false;
  for (let index = 0; index < name.length; index++) {
    const code = name.charCodeAt(index);
    if (code >= 65 && code <= 90) {
      hasUpper = true;
      break;
    }
  }
  if (!hasUpper) return name;
  let out = "";
  for (let index = 0; index < name.length; index++) {
    const code = name.charCodeAt(index);
    out += code >= 65 && code <= 90 ? "-" + String.fromCharCode(code + 32) : name[index];
  }
  if (out.charCodeAt(0) === 109 && out.charCodeAt(1) === 115 && out.charCodeAt(2) === 45) {
    out = "-" + out;
  }
  return out;
}
`;

function toVitePath(filePath: string) {
  return path.resolve(filePath).split(path.sep).join("/");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
