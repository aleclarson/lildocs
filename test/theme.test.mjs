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

test("loads theme and fonts from docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      theme: "github-dark",
      font: {
        heading: "Inter",
        body: "Source Sans 3",
        code: "Roboto Mono",
      },
    }),
  );

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-color-background: #24292e/);
  assert.match(css, /family=Inter:wght@400;500;600;700&display=swap/);
  assert.match(css, /family=Source\+Sans\+3:wght@400;500;600;700&display=swap/);
  assert.match(css, /family=Roboto\+Mono:wght@400&display=swap/);
});

test("cli theme and font options override docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      theme: "github-dark",
      font: {
        heading: "Inter",
        body: "Source Sans 3",
        code: "Roboto Mono",
      },
    }),
  );

  await runCli([
    docs,
    "--out",
    outDir,
    "--theme",
    "minimal",
    "--font.heading",
    "Lora",
    "--font.body",
    "Lato",
    "--font.code",
    "Fira Code",
  ]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-color-link: #0f766e/);
  assert.match(css, /family=Lora:wght@400;500;600;700&display=swap/);
  assert.match(css, /family=Lato:wght@400;500;600;700&display=swap/);
  assert.match(css, /family=Fira\+Code:wght@400&display=swap/);
  assert.doesNotMatch(css, /Source\+Sans\+3/);
});

test("reports invalid docs config", async () => {
  const { docs } = await fixtureWorkspace();
  await writeDocFile(docs, "config.json", "{");

  await assert.rejects(() => runCli([docs]), /Invalid docs config JSON/);
});

test("loads logo image text and font from docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "images/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      logo: {
        image: "images/logo.svg",
        text: "Acme Docs",
        font: "Onest",
      },
    }),
  );

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  const html = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(css, /family=Onest:wght@400;500;600;700&display=swap/);
  assert.match(css, /--ld-font-logo: "Onest"/);
  assert.match(html, /class="brandLogo" src="\.\/assets\/images\/logo\.svg" alt/);
  assert.match(html, /<span>Acme Docs<\/span>/);
  await access(path.join(outDir, "assets", "images", "logo.svg"));
});

test("copies local logo fonts from docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "fonts/logo.woff2", "fake font bytes");
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      logo: {
        text: "Local Font Docs",
        font: "fonts/logo.woff2",
      },
    }),
  );

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /font-family: "Lildocs Logo Font"/);
  assert.match(css, /src: url\("\.\/fonts\/logo\.woff2"\) format\("woff2"\)/);
  assert.match(css, /--ld-font-logo: "Lildocs Logo Font"/);
  await access(path.join(outDir, "assets", "fonts", "logo.woff2"));
});

test("loads background gradient from docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      background: {
        gradient: "linear-gradient(135deg, rgb(255 255 255 / 0.1), transparent)",
        blendMode: "screen",
      },
    }),
  );

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-background-image: linear-gradient\(135deg, rgb\(255 255 255 \/ 0\.1\), transparent\)/);
  assert.match(css, /--ld-background-blend-mode: screen/);
});

test("copies local background images from docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(docs, "images/background.svg", '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      background: {
        image: "images/background.svg",
      },
    }),
  );

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-background-image: url\("\.\/images\/background\.svg"\)/);
  await access(path.join(outDir, "assets", "images", "background.svg"));
});

test("cli background options override docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      background: {
        gradient: "linear-gradient(red, blue)",
        blendMode: "screen",
      },
    }),
  );

  await runCli([
    docs,
    "--out",
    outDir,
    "--background.gradient",
    "linear-gradient(black, transparent)",
    "--background.blendMode",
    "multiply",
  ]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-background-image: linear-gradient\(black, transparent\)/);
  assert.match(css, /--ld-background-blend-mode: multiply/);
  assert.doesNotMatch(css, /linear-gradient\(red, blue\)/);
});

test("loads link underline options from docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      link: {
        underline: "hover",
      },
    }),
  );

  await runCli([docs, "--out", outDir]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-link-text-decoration: none/);
  assert.match(css, /--ld-link-hover-text-decoration: underline/);
});

test("cli link underline options override docs config", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");
  await writeDocFile(
    docs,
    "config.json",
    JSON.stringify({
      link: {
        underline: "none",
      },
    }),
  );

  await runCli([docs, "--out", outDir, "--link.underline", "always"]);

  const css = await readFile(path.join(outDir, "assets", "lildocs.css"), "utf8");
  assert.match(css, /--ld-link-text-decoration: underline/);
  assert.match(css, /--ld-link-hover-text-decoration: underline/);
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
