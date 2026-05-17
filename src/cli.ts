#!/usr/bin/env node

import { command, option, optional, positional, run, string, subcommands } from "cmd-ts";

type CliOptions = {
  input: string;
  out?: string;
  theme?: string;
};

const outOption = option({
  type: optional(string),
  long: "out",
  description: "Output directory for the generated site.",
});

const themeOption = option({
  type: optional(string),
  long: "theme",
  description: "Built-in theme name to use.",
});

const inputArgument = positional({
  type: string,
  displayName: "path",
  description: "Markdown file or docs folder to build.",
});

function printPlaceholder(commandName: "build" | "dev", options: CliOptions) {
  const out = options.out ?? "dist";
  const theme = options.theme ?? "default";

  console.log(
    `lildocs ${commandName} placeholder: input=${options.input} out=${out} theme=${theme}`,
  );
}

const buildCommand = command({
  name: "build",
  description: "Build a static documentation site.",
  args: {
    input: inputArgument,
    out: outOption,
    theme: themeOption,
  },
  handler: (options) => {
    printPlaceholder("build", options);
  },
});

const devCommand = command({
  name: "dev",
  description: "Start a local documentation development server.",
  args: {
    input: inputArgument,
    out: outOption,
    theme: themeOption,
  },
  handler: (options) => {
    printPlaceholder("dev", options);
  },
});

const bareBuildCommand = command({
  name: "lildocs",
  description: "Build a static documentation site from Markdown files.",
  args: {
    input: inputArgument,
    out: outOption,
    theme: themeOption,
  },
  handler: (options) => {
    printPlaceholder("build", options);
  },
});

const app = subcommands({
  name: "lildocs",
  description: "Turn Markdown docs into a static searchable documentation site.",
  cmds: {
    build: buildCommand,
    dev: devCommand,
  },
  default: bareBuildCommand,
});

const args = process.argv.slice(2);
const firstArg = args[0];
const knownSubcommand =
  firstArg === undefined ||
  firstArg === "build" ||
  firstArg === "dev" ||
  firstArg === "--help" ||
  firstArg === "-h";

await run(knownSubcommand ? app : bareBuildCommand, args);
