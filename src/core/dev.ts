import { watch, type FSWatcher } from "node:fs";
import { readdir } from "node:fs/promises";
import http, { type ServerResponse } from "node:http";
import path from "node:path";
import { buildSite, type BuildResult } from "./build.js";
import { LildocsError } from "./errors.js";
import { resolveInput } from "./input.js";
import { isHiddenOrSystemPath } from "./paths.js";
import { serveStaticFile } from "./server.js";
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

const DEV_CLIENT_PATH = "/__lildocs/client.js";
const DEV_EVENTS_PATH = "/__lildocs/events";
const DEV_CLIENT_SCRIPT = `
const events = new EventSource("${DEV_EVENTS_PATH}");
events.addEventListener("reload", () => location.reload());
events.onerror = () => console.debug("[lildocs] live reload disconnected");
`;

export async function startDevServer(options: DevOptions): Promise<DevServer> {
  const input = await resolveInput(options.input, options.cwd);
  const outDir = path.resolve(options.cwd, options.outDir);
  validateDevOutDir(options.cwd, input.docsRoot, outDir, options.outDir);

  const clients = new Set<ServerResponse>();
  let watchers: FSWatcher[] = [];
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
        dev: {
          clientScriptPath: DEV_CLIENT_PATH,
        },
      });
      await refreshWatchers();
      const elapsed = Math.round(performance.now() - started);
      console.log(
        `Rebuilt ${lastSuccessfulBuild.pages.length} page${lastSuccessfulBuild.pages.length === 1 ? "" : "s"} in ${elapsed}ms`,
      );
      if (emitReload) {
        sendReload(clients);
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

  async function refreshWatchers() {
    for (const watcher of watchers) {
      watcher.close();
    }
    watchers = [];

    const directories = await collectWatchDirectories(input.docsRoot, outDir);
    for (const directory of directories) {
      watchers.push(
        watch(directory, { persistent: true }, (_event, filename) => {
          if (
            filename &&
            shouldIgnore(path.join(directory, filename.toString()), input.docsRoot, outDir)
          ) {
            return;
          }
          scheduleRebuild();
        }),
      );
    }
  }

  await rebuild(false, true);

  const server = http.createServer((req, res) => {
    const pathname = requestPathname(req.url);
    if (pathname === DEV_CLIENT_PATH) {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      res.end(DEV_CLIENT_SCRIPT);
      return;
    }
    if (pathname === DEV_EVENTS_PATH) {
      connectEvents(res, clients);
      return;
    }
    void serveStaticFile(req, res, outDir);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : options.port;
  const url = `http://${options.host}:${actualPort}/`;
  console.log(`lildocs dev server listening at ${url}`);

  return {
    url,
    close: async () => {
      if (rebuildTimer) {
        clearTimeout(rebuildTimer);
      }
      for (const watcher of watchers) {
        watcher.close();
      }
      for (const client of clients) {
        client.end();
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

function validateDevOutDir(cwd: string, docsRoot: string, outDir: string, requestedOutDir: string) {
  const root = path.resolve(cwd);
  if (!path.isAbsolute(requestedOutDir) && !isInside(root, outDir)) {
    throw new LildocsError("Relative dev output directory must stay inside the current workspace.");
  }
  if (outDir === root) {
    throw new LildocsError("Dev output directory cannot be the repository root.");
  }
  if (outDir === docsRoot) {
    throw new LildocsError("Dev output directory cannot be the docs root.");
  }
  if (isAncestor(outDir, docsRoot)) {
    throw new LildocsError("Dev output directory cannot contain the docs root.");
  }
}

async function collectWatchDirectories(docsRoot: string, outDir: string) {
  const directories = new Set<string>();

  async function walk(directory: string) {
    if (shouldIgnore(directory, docsRoot, outDir)) {
      return;
    }
    directories.add(directory);
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory()) {
          return;
        }
        await walk(path.join(directory, entry.name));
      }),
    );
  }

  await walk(docsRoot);
  return [...directories];
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

function connectEvents(res: ServerResponse, clients: Set<ServerResponse>) {
  res.writeHead(200, {
    "cache-control": "no-cache",
    connection: "keep-alive",
    "content-type": "text/event-stream",
  });
  res.write(": connected\n\n");
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

function sendReload(clients: Set<ServerResponse>) {
  for (const client of clients) {
    client.write("event: reload\ndata: {}\n\n");
  }
}

function requestPathname(url: string | undefined) {
  try {
    return new URL(url ?? "/", "http://lildocs.local").pathname;
  } catch {
    return undefined;
  }
}

function isAncestor(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
