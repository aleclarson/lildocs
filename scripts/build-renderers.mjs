import { cp, mkdir, rm } from "node:fs/promises";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

// flamefront ships raw TypeScript sources; let the loader strip their types.
register(pathToFileURL(path.join(projectRoot, "scripts", "ts-loader.mjs")));
const { build } = await import("vite");

const renderSource = path.join(projectRoot, "src", "render");
const renderOutput = path.join(projectRoot, "dist", "render");

await rm(renderOutput, { recursive: true, force: true });
await mkdir(renderOutput, { recursive: true });

await build({
  configFile: path.join(renderSource, "vite.config.ts"),
  root: renderSource,
  logLevel: "warn",
  build: {
    outDir: path.join(renderOutput, "client"),
    emptyOutDir: true,
    minify: false,
    target: "esnext",
  },
});

await build({
  configFile: path.join(renderSource, "vite.config.ts"),
  root: renderSource,
  logLevel: "warn",
  build: {
    outDir: path.join(renderOutput, "server"),
    emptyOutDir: true,
    minify: false,
    ssr: path.join(renderSource, "app", "entry-server.ts"),
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
