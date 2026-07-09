#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  command,
  flag,
  option,
  optional,
  positional,
  run,
  string,
  subcommands,
} from "cmd-ts";
import { buildSite } from "./core/build.js";
import { startDevServer } from "./core/dev.js";
import { deployGitHubPages, initGitHubPagesWorkflow } from "./core/deploy.js";

export type CliOptions = {
  input: string;
  out?: string;
  theme?: string;
  fontHeading?: string;
  fontBody?: string;
  fontCode?: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  backgroundBlendMode?: string;
  linkUnderline?: string;
  host?: string;
  port?: string;
  base?: string;
  open?: boolean;
};

const outOption = option({
  type: optional(string),
  long: "out",
  description: "Output directory for the generated site.",
});

const themeOption = option({
  type: optional(string),
  long: "theme",
  description: "Built-in lildocs theme or bundled Shiki theme name to use.",
});

const fontHeadingOption = option({
  type: optional(string),
  long: "font.heading",
  description: "Heading font name from Google Fonts or local font file path.",
});

const fontBodyOption = option({
  type: optional(string),
  long: "font.body",
  description: "Body font name from Google Fonts or local font file path.",
});

const fontCodeOption = option({
  type: optional(string),
  long: "font.code",
  description: "Code font name from Google Fonts or local font file path.",
});

const backgroundImageOption = option({
  type: optional(string),
  long: "background.image",
  description:
    "Background image URL, CSS image function, or docs-relative image path.",
});

const backgroundGradientOption = option({
  type: optional(string),
  long: "background.gradient",
  description: "CSS background gradient, such as linear-gradient(...).",
});

const backgroundBlendModeOption = option({
  type: optional(string),
  long: "background.blendMode",
  description:
    "CSS background-blend-mode for the theme color and background layers.",
});

const linkUnderlineOption = option({
  type: optional(string),
  long: "link.underline",
  description: "Link underline behavior: always, hover, or none.",
});

const hostOption = option({
  type: optional(string),
  long: "host",
  description: "Host address for the local development server.",
});

const portOption = option({
  type: optional(string),
  long: "port",
  description: "Port for the local development server.",
});

const openOption = flag({
  long: "open",
  description: "Open the local development server in the default browser.",
});

const baseOption = option({
  type: optional(string),
  long: "base",
  description: "GitHub Pages base path, such as /repo/ for project pages.",
});

const inputArgument = positional({
  type: string,
  displayName: "path",
  description: "Markdown file or docs folder to build.",
});

async function runBuild(options: CliOptions) {
  const result = await buildSite({
    input: options.input,
    outDir: options.out ?? "dist",
    theme: options.theme,
    fonts: {
      heading: options.fontHeading,
      body: options.fontBody,
      code: options.fontCode,
    },
    background: {
      image: options.backgroundImage,
      gradient: options.backgroundGradient,
      blendMode: options.backgroundBlendMode,
    },
    link: {
      underline: parseLinkUnderline(options.linkUnderline),
    },
    cwd: process.cwd(),
  });

  console.log(
    `Built ${result.pages.length} page${result.pages.length === 1 ? "" : "s"} to ${result.outDir}`,
  );
}

async function runDeploy(options: CliOptions) {
  const result = await deployGitHubPages({
    input: options.input,
    outDir: options.out ?? "dist",
    theme: options.theme,
    fonts: {
      heading: options.fontHeading,
      body: options.fontBody,
      code: options.fontCode,
    },
    background: {
      image: options.backgroundImage,
      gradient: options.backgroundGradient,
      blendMode: options.backgroundBlendMode,
    },
    link: {
      underline: parseLinkUnderline(options.linkUnderline),
    },
    basePath: options.base,
    cwd: process.cwd(),
  });

  console.log(`Built GitHub Pages site to ${result.outDir}`);
  console.log(
    `Upload ${result.outDir} with actions/upload-pages-artifact or run init github-pages.`,
  );
}

async function runInitGitHubPages(options: CliOptions) {
  const workflowPath = await initGitHubPagesWorkflow({
    input: options.input,
    outDir: options.out ?? "dist",
    basePath: options.base,
    cwd: process.cwd(),
  });

  console.log(`Created GitHub Pages workflow at ${workflowPath}`);
}

const buildCommand = command({
  name: "build",
  description: "Build a static documentation site.",
  args: {
    input: inputArgument,
    out: outOption,
    theme: themeOption,
    fontHeading: fontHeadingOption,
    fontBody: fontBodyOption,
    fontCode: fontCodeOption,
    backgroundImage: backgroundImageOption,
    backgroundGradient: backgroundGradientOption,
    backgroundBlendMode: backgroundBlendModeOption,
    linkUnderline: linkUnderlineOption,
  },
  handler: runBuild,
});

const devCommand = command({
  name: "dev",
  description: "Start a local documentation development server.",
  args: {
    input: inputArgument,
    out: outOption,
    theme: themeOption,
    fontHeading: fontHeadingOption,
    fontBody: fontBodyOption,
    fontCode: fontCodeOption,
    backgroundImage: backgroundImageOption,
    backgroundGradient: backgroundGradientOption,
    backgroundBlendMode: backgroundBlendModeOption,
    linkUnderline: linkUnderlineOption,
    host: hostOption,
    port: portOption,
    open: openOption,
  },
  handler: async (options) => {
    const port = parsePort(options.port ?? "3000");
    const server = await startDevServer({
      input: options.input,
      outDir: options.out ?? ".lildocs",
      theme: options.theme,
      fonts: {
        heading: options.fontHeading,
        body: options.fontBody,
        code: options.fontCode,
      },
      background: {
        image: options.backgroundImage,
        gradient: options.backgroundGradient,
        blendMode: options.backgroundBlendMode,
      },
      link: {
        underline: parseLinkUnderline(options.linkUnderline),
      },
      cwd: process.cwd(),
      host: options.host ?? "127.0.0.1",
      port,
    });
    if (options.open) {
      await openBrowser(server.url);
    }
    await new Promise(() => {});
  },
});

function parsePort(value: string) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function parseLinkUnderline(
  value: string | undefined,
): "always" | "hover" | "none" | undefined {
  if (
    value === undefined ||
    value === "always" ||
    value === "hover" ||
    value === "none"
  ) {
    return value;
  }
  throw new Error(`Invalid link underline style: ${value}`);
}

async function openBrowser(url: string) {
  const [opener, args] = browserOpenCommand(url);
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(opener, args, { detached: true, stdio: "ignore" });
      child.once("error", reject);
      child.once("spawn", () => {
        child.unref();
        resolve();
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`lildocs: failed to open browser: ${message}`);
  }
}

function browserOpenCommand(url: string): [string, string[]] {
  if (process.platform === "darwin") {
    return ["open", [url]];
  }
  if (process.platform === "win32") {
    return ["cmd", ["/c", "start", "", url]];
  }
  return ["xdg-open", [url]];
}

const deployCommand = command({
  name: "deploy",
  description: "Build GitHub Pages-ready documentation output.",
  args: {
    input: inputArgument,
    out: outOption,
    theme: themeOption,
    fontHeading: fontHeadingOption,
    fontBody: fontBodyOption,
    fontCode: fontCodeOption,
    backgroundImage: backgroundImageOption,
    backgroundGradient: backgroundGradientOption,
    backgroundBlendMode: backgroundBlendModeOption,
    linkUnderline: linkUnderlineOption,
    base: baseOption,
  },
  handler: runDeploy,
});

const initGitHubPagesCommand = command({
  name: "github-pages",
  description: "Create a GitHub Actions workflow for GitHub Pages deployment.",
  args: {
    input: inputArgument,
    out: outOption,
    base: baseOption,
  },
  handler: runInitGitHubPages,
});

const initCommand = subcommands({
  name: "init",
  description: "Initialize lildocs integration files.",
  cmds: {
    "github-pages": initGitHubPagesCommand,
  },
});

const bareBuildCommand = command({
  name: "lildocs",
  description: "Build a static documentation site from Markdown files.",
  args: {
    input: inputArgument,
    out: outOption,
    theme: themeOption,
    fontHeading: fontHeadingOption,
    fontBody: fontBodyOption,
    fontCode: fontCodeOption,
    backgroundImage: backgroundImageOption,
    backgroundGradient: backgroundGradientOption,
    backgroundBlendMode: backgroundBlendModeOption,
    linkUnderline: linkUnderlineOption,
  },
  handler: runBuild,
});

const app = subcommands({
  name: "lildocs",
  description:
    "Turn Markdown docs into a static searchable documentation site.",
  cmds: {
    build: buildCommand,
    deploy: deployCommand,
    dev: devCommand,
    init: initCommand,
  },
});

function isKnownTopLevelArg(arg: string | undefined) {
  return (
    arg === undefined ||
    arg === "build" ||
    arg === "deploy" ||
    arg === "dev" ||
    arg === "init" ||
    arg === "--help" ||
    arg === "-h"
  );
}

async function main() {
  const args = process.argv.slice(2);
  await run(isKnownTopLevelArg(args[0]) ? app : bareBuildCommand, args);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`lildocs: ${message}`);
  process.exitCode = 1;
}
