#!/usr/bin/env node

import { command, option, optional, positional, run, string, subcommands } from "cmd-ts";
import { buildSite } from "./core/build.js";

export type CliOptions = {
  input: string;
  out?: string;
  theme?: string;
  fontHeading?: string;
  fontBody?: string;
  fontCode?: string;
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
    cwd: process.cwd(),
  });

  console.log(
    `Built ${result.pages.length} page${result.pages.length === 1 ? "" : "s"} to ${result.outDir}`,
  );
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
  },
  handler: async () => {
    throw new Error(
      "The dev command is not implemented yet. Use `lildocs build <path>` for v1 static output.",
    );
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
  },
  handler: runBuild,
});

const app = subcommands({
  name: "lildocs",
  description: "Turn Markdown docs into a static searchable documentation site.",
  cmds: {
    build: buildCommand,
    dev: devCommand,
  },
});

function isKnownTopLevelArg(arg: string | undefined) {
  return arg === undefined || arg === "build" || arg === "dev" || arg === "--help" || arg === "-h";
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
