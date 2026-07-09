import { mkdir } from "node:fs/promises";
import path from "node:path";
import { buildSite, type BuildResult } from "./build.js";
import { LildocsError } from "./errors.js";
import { createFrontendDevServer, frontendDevScriptPath } from "./frontend.js";
import { resolveInput } from "./input.js";
import { isHiddenOrSystemPath } from "./paths.js";
import type { BackgroundOptions, FontOverrides, LinkOptions } from "./theme.js";

export type DevOptions = {
  input: string;
  outDir: string;
  cwd: string;
  theme?: string;
  fonts?: FontOverrides;
  background?: BackgroundOptions;
  link?: LinkOptions;
  host: string;
  port: number;
};

export type DevServer = {
  url: string;
  close: () => Promise<void>;
};

export async function startDevServer(options: DevOptions): Promise<DevServer> {
  const input = await resolveInput(options.input, options.cwd, {
    homePagePreference: "readme-first",
  });
  const outDir = path.resolve(options.cwd, options.outDir);
  validateDevOutDir(options.cwd, input.docsRoot, outDir, options.outDir);

  await mkdir(outDir, { recursive: true });
  const vite = await createFrontendDevServer({
    cwd: options.cwd,
    root: outDir,
    host: options.host,
    port: options.port,
  });
  let rebuildTimer: NodeJS.Timeout | undefined;
  let rebuilding = false;
  let pending = false;
  let lastSuccessfulBuild: BuildResult | undefined;

  async function rebuild(emitReload: boolean, throwOnFailure = false) {
    if (rebuilding) {
      pending = true;
      return;
    }

    rebuilding = true;
    const started = performance.now();
    try {
      lastSuccessfulBuild = await buildSite({
        input: options.input,
        outDir,
        cwd: options.cwd,
        theme: options.theme,
        fonts: options.fonts,
        background: options.background,
        link: options.link,
        homePagePreference: "readme-first",
        dev: {
          clientScriptPath: frontendDevScriptPath(),
          viteServer: vite,
        },
      });
      const elapsed = Math.round(performance.now() - started);
      console.log(
        `Rebuilt ${lastSuccessfulBuild.pages.length} page${lastSuccessfulBuild.pages.length === 1 ? "" : "s"} in ${elapsed}ms`,
      );
      if (emitReload) {
        vite.ws.send({ type: "full-reload" });
      }
    } catch (error) {
      if (throwOnFailure) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error(`lildocs: rebuild failed: ${message}`);
    } finally {
      rebuilding = false;
      if (pending) {
        pending = false;
        await rebuild(true);
      }
    }
  }

  function scheduleRebuild() {
    if (rebuildTimer) {
      clearTimeout(rebuildTimer);
    }
    rebuildTimer = setTimeout(() => {
      void rebuild(true);
    }, 150);
  }

  vite.watcher.add(input.docsRoot);
  vite.watcher.on("all", (_event, file) => {
    const changedPath = path.resolve(file);
    if (
      !isInside(input.docsRoot, changedPath) ||
      shouldIgnore(changedPath, input.docsRoot, outDir)
    ) {
      return;
    }
    scheduleRebuild();
  });

  await rebuild(false, true);

  const address = vite.httpServer?.address();
  const actualPort =
    typeof address === "object" && address ? address.port : options.port;
  const url = `http://${options.host}:${actualPort}/`;
  console.log(`lildocs dev server listening at ${url}`);

  return {
    url,
    close: async () => {
      if (rebuildTimer) {
        clearTimeout(rebuildTimer);
      }
      await vite.close();
    },
  };
}

function validateDevOutDir(
  cwd: string,
  docsRoot: string,
  outDir: string,
  requestedOutDir: string,
) {
  const root = path.resolve(cwd);
  if (!path.isAbsolute(requestedOutDir) && !isInside(root, outDir)) {
    throw new LildocsError(
      "Relative dev output directory must stay inside the current workspace.",
    );
  }
  if (outDir === root) {
    throw new LildocsError(
      "Dev output directory cannot be the repository root.",
    );
  }
  if (outDir === docsRoot) {
    throw new LildocsError("Dev output directory cannot be the docs root.");
  }
  if (isAncestor(outDir, docsRoot)) {
    throw new LildocsError(
      "Dev output directory cannot contain the docs root.",
    );
  }
}

function shouldIgnore(candidate: string, docsRoot: string, outDir: string) {
  const resolved = path.resolve(candidate);
  if (resolved === outDir || isAncestor(outDir, resolved)) {
    return true;
  }
  const relative = path.relative(docsRoot, resolved);
  return (
    relative === "dist" ||
    relative.startsWith(`dist${path.sep}`) ||
    relative === "node_modules" ||
    relative.startsWith(`node_modules${path.sep}`) ||
    isHiddenOrSystemPath(relative)
  );
}

function isAncestor(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
