import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "vitest";
import { fixtureWorkspace, runCli, writeDocFile } from "./helpers/fixture.mjs";

test("builds with bare path invocation", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  const result = await runCli([docs, "--out", outDir]);

  assert.match(result.stdout, /Built 3 pages/);
});

test("builds with explicit build command", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "custom");

  const result = await runCli(["build", docs, "--out", outDir, "--theme", "minimal"]);

  assert.match(result.stdout, /Built 3 pages/);
});

test("build command prefers README.md when input is a directory", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "README.md", "# Readme Home\n\nPreferred in build.");

  await runCli(["build", docs, "--out", outDir]);

  const home = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(home, /<title>Readme Home<\/title>/);
  assert.match(home, /Preferred in build\./);
});

test("dev command serves and rebuilds the generated site", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, ".dev-site");
  const server = await startDevCli(["dev", docs, "--out", outDir, "--port", "0"]);

  try {
    const home = await fetchText(server.url);
    assert.match(home, /Fixture Home/);
    assert.match(home, /window\.lildocsDev = true/);
    assert.doesNotMatch(home, /\/@vite\/client/);
    const clientPath = home.match(/<script type="module" src="([^"]+)"/)?.[1];
    assert.ok(clientPath);
    const client = await fetchText(new URL(clientPath, server.url));
    assert.match(client, /EventSource/);

    await writeDocFile(docs, "index.md", "# Updated Home\n\nChanged content.");
    await waitFor(async () => {
      const updated = await fetchText(server.url);
      return updated.includes("Updated Home");
    });
  } finally {
    await server.close();
  }
});

test("dev command locally excludes its generated output from Git", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const excludePath = path.join(workspace, ".git", "info", "exclude");
  await mkdir(path.dirname(excludePath), { recursive: true });
  await writeFile(excludePath, "# Local excludes\n");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const server = await startDevCli(["dev", docs, "--port", "0"], {
      cwd: workspace,
    });
    await server.close();
  }

  const exclude = await readFile(excludePath, "utf8");
  assert.equal(exclude, "# Local excludes\n.lildocs/\n");
});

test("dev command opens the generated site when requested", { skip: process.platform === "win32" }, async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, ".dev-site");
  const binDir = path.join(workspace, "bin");
  const openLog = path.join(workspace, "opened.txt");
  const openerName = process.platform === "darwin" ? "open" : "xdg-open";
  await mkdir(binDir);
  await writeFile(
    path.join(binDir, openerName),
    "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$LILDOCS_OPEN_LOG\"\n",
    { mode: 0o755 },
  );

  const server = await startDevCli(["dev", docs, "--out", outDir, "--port", "0", "--open"], {
    env: {
      ...process.env,
      LILDOCS_OPEN_LOG: openLog,
      PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
    },
  });

  try {
    const openedUrl = await waitFor(async () => (await readFile(openLog, "utf8")).trim());
    assert.equal(openedUrl, server.url);
  } finally {
    await server.close();
  }
});

test("dev command prefers README.md when serving a directory", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, ".dev-site");
  await writeDocFile(docs, "README.md", "# Readme Home\n\nPreferred in dev.");

  const server = await startDevCli(["dev", docs, "--out", outDir, "--port", "0"]);

  try {
    const home = await fetchText(server.url);
    assert.match(home, /<title>Readme Home<\/title>/);
    assert.match(home, /Readme Home/);
    assert.match(home, /Preferred in dev\./);
  } finally {
    await server.close();
  }
});

test("unknown commands report usage errors", async () => {
  await assert.rejects(() => runCli(["publish", "./docs"]), /Unknown arguments|Not a valid subcommand/);
});

test("unsupported options report usage errors", async () => {
  const { docs } = await fixtureWorkspace();

  await assert.rejects(() => runCli([docs, "--wat"]), /Unknown option|Unknown argument/);
});

async function startDevCli(args, options = {}) {
  const child = spawn(process.execPath, [path.resolve("dist/cli.mjs"), ...args], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const url = await waitFor(() => {
    const match = stdout.match(/listening at (http:\/\/[^\s]+)/);
    return match?.[1];
  }, 5000).catch((error) => {
    child.kill();
    throw new Error(`${error.message}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  });

  return {
    url,
    stderr: () => stderr,
    close: async () => {
      if (child.exitCode !== null) {
        return;
      }
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    },
  };
}

async function fetchText(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.text();
}

async function waitFor(callback, timeout = 3000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const result = await callback();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error("Timed out waiting for condition");
}
