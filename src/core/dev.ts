import { watch } from "node:fs";
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import { buildSite, type BuildResult } from "./build.js";
import { LildocsError } from "./errors.js";
import { resolveInput } from "./input.js";
import { isHiddenOrSystemPath } from "./paths.js";
import { serveStaticFile } from "./server.js";
import type {
  BackgroundOptions,
  FontOverrides,
  LinkOptions,
  ThemeConfig,
} from "./theme.js";

export type DevOptions = {
  input: string;
  outDir: string;
  cwd: string;
  theme?: ThemeConfig;
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

  await addGitExclude(options.cwd, outDir);
  await mkdir(outDir, { recursive: true });
  let rebuildTimer: NodeJS.Timeout | undefined;
  let rebuilding = false;
  let pending = false;
  let lastSuccessfulBuild: BuildResult | undefined;
  const reloadClients = new Set<ServerResponse>();

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
        dev: true,
      });
      const elapsed = Math.round(performance.now() - started);
      console.log(
        `Rebuilt ${lastSuccessfulBuild.pages.length} page${lastSuccessfulBuild.pages.length === 1 ? "" : "s"} in ${elapsed}ms`,
      );
      if (emitReload) {
        for (const client of reloadClients) {
          client.write("data: reload\n\n");
        }
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

  await rebuild(false, true);
  const watcher = watch(
    input.docsRoot,
    { recursive: true },
    (_event, filename) => {
      if (filename) {
        const changedPath = path.resolve(input.docsRoot, filename);
        if (shouldIgnore(changedPath, input.docsRoot, outDir)) {
          return;
        }
      }
      scheduleRebuild();
    },
  );
  const server = createServer((request, response) => {
    if (request.url === "/__lildocs_reload") {
      response.writeHead(200, {
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "text/event-stream",
      });
      response.write("retry: 500\n\n");
      reloadClients.add(response);
      response.on("close", () => reloadClients.delete(response));
      return;
    }
    void serveStaticFile(request, response, outDir);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
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
      watcher.close();
      for (const client of reloadClients) {
        client.end();
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
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

async function addGitExclude(cwd: string, outDir: string) {
  try {
    const repository = await findGitRepository(cwd);
    if (!repository || !isInside(repository.root, outDir)) {
      return;
    }

    const relativeOutDir = path.relative(repository.root, outDir);
    if (!relativeOutDir) {
      return;
    }

    const pattern = `${relativeOutDir.split(path.sep).join("/")}/`;
    let contents = "";
    try {
      contents = await readFile(repository.excludePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      await mkdir(path.dirname(repository.excludePath), { recursive: true });
    }
    const entries = contents.split(/\r?\n/).map((entry) => entry.trim());
    const normalizedPattern = pattern.replace(/^\/|\/$/g, "");
    if (
      entries.some(
        (entry) => entry.replace(/^\/|\/$/g, "") === normalizedPattern,
      )
    ) {
      return;
    }

    const separator =
      contents.length > 0 && !contents.endsWith("\n") ? "\n" : "";
    await appendFile(repository.excludePath, `${separator}${pattern}\n`);
  } catch {
    // Git metadata may be absent, read-only, or managed outside the worktree.
  }
}

async function findGitRepository(start: string) {
  let current = path.resolve(start);
  while (true) {
    const dotGit = path.join(current, ".git");
    try {
      const metadata = await stat(dotGit);
      let gitDir = dotGit;
      if (!metadata.isDirectory()) {
        const pointer = await readFile(dotGit, "utf8");
        const match = /^gitdir:\s*(.+)\s*$/im.exec(pointer);
        if (!match?.[1]) {
          return undefined;
        }
        gitDir = path.resolve(current, match[1]);
      }

      let commonDir = gitDir;
      try {
        const pointer = (
          await readFile(path.join(gitDir, "commondir"), "utf8")
        ).trim();
        commonDir = path.resolve(gitDir, pointer);
      } catch {
        // Regular repositories keep their shared metadata in .git itself.
      }

      return {
        root: current,
        excludePath: path.join(commonDir, "info", "exclude"),
      };
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return undefined;
      }
      current = parent;
    }
  }
}
