import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { octane } from "octane/compiler/vite";
import { build } from "vite";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const renderSource = path.join(projectRoot, "src", "render");
const renderOutput = path.join(projectRoot, "dist", "render");
const octaneCssHelpers = path.join(renderSource, "octane-css.ts");

await rm(renderOutput, { recursive: true, force: true });
await mkdir(renderOutput, { recursive: true });

await build({
  configFile: false,
  root: renderSource,
  publicDir: false,
  logLevel: "warn",
  plugins: [octaneRuntimeCompatibility(), octane()],
  build: {
    outDir: path.join(renderOutput, "client"),
    emptyOutDir: true,
    manifest: true,
    minify: false,
    target: "esnext",
    rollupOptions: {
      input: path.join(renderSource, "client.tsrx"),
    },
  },
});

await build({
  configFile: false,
  root: renderSource,
  publicDir: false,
  logLevel: "warn",
  plugins: [octaneRuntimeCompatibility(), octane()],
  build: {
    outDir: path.join(renderOutput, "server"),
    emptyOutDir: true,
    minify: false,
    ssr: path.join(renderSource, "renderPage.tsrx"),
    target: "node22.18",
    rollupOptions: {
      output: {
        entryFileNames: "renderer.mjs",
      },
    },
  },
  ssr: {
    noExternal: true,
  },
});

for (const asset of ["github-icon.svg", "styles.css", "tabler-icons.css"]) {
  await cp(path.join(renderSource, asset), path.join(renderOutput, asset));
}

function octaneRuntimeCompatibility() {
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
        return octaneCssHelpers;
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
    throw new Error(
      `Unable to locate Octane server runtime from ${serverEntry}.`,
    );
  }
  return runtimePath;
}

function isOctaneRuntimeImport(importer) {
  const [filePath] = importer.split("?", 1);
  const normalized = filePath.split(path.sep).join("/");
  return /\/octane\/(?:src|dist)\/runtime(?:\.server)?\.(?:ts|js)$/.test(
    normalized,
  );
}
