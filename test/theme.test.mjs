import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, runCli, writeDocFile } from "./helpers/fixture.mjs";

test("supports the minimal built-in theme", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "custom");

  await runCli(["build", docs, "--out", outDir, "--theme", "minimal"]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-color-link: #0f766e/);
});

test("uses the default built-in theme with no config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-color-link: #2563eb/);
});

test("loads local theme files", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "theme.ts",
    `export default {
  color: {
    background: "#ffffff",
    text: "#111111",
    mutedText: "#555555",
    border: "#dddddd",
    link: "#dc2626",
    codeBackground: "#f8fafc",
  },
  font: {
    body: "system-ui, sans-serif",
    mono: "ui-monospace, monospace",
  },
};`,
  );

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-color-link: #dc2626/);
});

test("cli theme takes precedence over local theme files", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "theme.ts",
    `export default {
  color: {
    background: "#ffffff",
    text: "#111111",
    mutedText: "#555555",
    border: "#dddddd",
    link: "#dc2626",
    codeBackground: "#f8fafc",
  },
  font: {
    body: "system-ui, sans-serif",
    mono: "ui-monospace, monospace",
  },
};`,
  );

  await runCli([docs, "--out", outDir, "--theme", "minimal"]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-color-link: #0f766e/);
  assert.doesNotMatch(css, /#dc2626/);
});

test("reports unknown theme names", async () => {
  const { docs } = await fixtureWorkspace();

  await assert.rejects(() => runCli([docs, "--theme", "unknown"]), /Unknown theme/);
});

test("applies google font cli overrides", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([
    docs,
    "--out",
    outDir,
    "--font.heading",
    "Inter",
    "--font.body",
    "Source Sans 3",
    "--font.code",
    "Roboto Mono",
  ]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /family=Inter:wght@400;500;600;700&display=swap/);
  assert.match(css, /family=Source\+Sans\+3:wght@400;500;600;700&display=swap/);
  assert.match(css, /family=Roboto\+Mono:wght@400&display=swap/);
  assert.match(css, /--ld-font-heading: "Inter"/);
  assert.match(css, /--ld-font-body: "Source Sans 3"/);
  assert.match(css, /--ld-font-code: "Roboto Mono"/);
});

test("copies local font cli overrides", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "fonts/local.woff2", "fake font bytes");

  await runCli([docs, "--out", outDir, "--font.body", path.join(docs, "fonts", "local.woff2")]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /@font-face/);
  assert.match(css, /font-family: "Lildocs Body Font"/);
  assert.match(css, /src: url\("\.\/fonts\/local\.woff2"\) format\("woff2"\)/);
  assert.match(css, /--ld-font-body: "Lildocs Body Font"/);
  await access(path.join(outDir, "assets", "fonts", "local.woff2"));
});

test("reports missing local font files", async () => {
  const { docs } = await fixtureWorkspace();

  await assert.rejects(
    () => runCli([docs, "--font.body", "./missing/font.woff2"]),
    /Font file does not exist/,
  );
});
