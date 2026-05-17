import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { converter, parse } from "culori";
import { fixtureWorkspace, runCli, writeDocFile } from "./helpers/fixture.mjs";

const toOklch = converter("oklch");

function cssVariable(css, name) {
  const match = css.match(new RegExp(`${name}: ([^;]+);`));
  assert.ok(match, `${name} should be present`);
  return match[1];
}

function oklchLightness(color) {
  const parsed = parse(color);
  assert.ok(parsed, `${color} should parse as a color`);
  const oklch = toOklch(parsed);
  assert.ok(oklch, `${color} should convert to OKLCH`);
  return oklch.l;
}

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

test("maps shiki theme names to lildocs css variables", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "code.md", "# Code\n\n```ts\nconst message = \"hello\";\n```\n");

  await runCli([docs, "--out", outDir, "--theme", "github-dark"]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const html = await readFile(path.join(outDir, "code.html"), "utf8");
  assert.match(css, /--ld-color-background: #24292e/);
  assert.match(css, /--ld-color-text: #e1e4e8/);
  assert.match(html, /class="shiki github-dark"/);
  assert.doesNotMatch(html, /class="shiki github-light"/);
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

test("cli shiki theme takes precedence over local theme files", async () => {
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

  await runCli([docs, "--out", outDir, "--theme", "github-dark"]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-color-background: #24292e/);
  assert.doesNotMatch(css, /#dc2626/);
});

test("reports unknown theme names", async () => {
  const { docs } = await fixtureWorkspace();

  await assert.rejects(() => runCli([docs, "--theme", "unknown"]), /bundled Shiki theme/);
});

test("darkens light shiki code backgrounds when contrast is too low", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir, "--theme", "github-light"]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const background = cssVariable(css, "--ld-color-background");
  const codeBackground = cssVariable(css, "--ld-color-code-background");

  assert.notEqual(codeBackground, background);
  assert.ok(oklchLightness(codeBackground) < oklchLightness(background));
});

test("preserves dark shiki code backgrounds that already have contrast", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  await runCli([docs, "--out", outDir, "--theme", "github-dark"]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const background = cssVariable(css, "--ld-color-background");
  const codeBackground = cssVariable(css, "--ld-color-code-background");

  assert.equal(background, "#24292e");
  assert.equal(codeBackground, "#2f363d");
  assert.ok(oklchLightness(codeBackground) > oklchLightness(background));
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
