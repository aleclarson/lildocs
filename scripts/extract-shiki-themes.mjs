#!/usr/bin/env node

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { themeNames } from "@shikijs/themes";

const defaultOutDir = path.resolve(process.cwd(), "src/generated/shiki-themes");
const outDir = path.resolve(process.cwd(), parseOutDir(process.argv.slice(2)) ?? defaultOutDir);

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const extractedThemes = [];

for (const themeName of themeNames.toSorted()) {
  const themeModule = await import(`@shikijs/themes/${themeName}`);
  const theme = themeModule.default;
  const fileName = `${themeName}.json`;

  await writeFile(path.join(outDir, fileName), `${JSON.stringify(theme, null, 2)}\n`);
  extractedThemes.push({
    name: themeName,
    displayName: theme.displayName ?? themeName,
    type: theme.type ?? "unknown",
    file: fileName,
  });
}

await writeFile(path.join(outDir, "index.json"), `${JSON.stringify(extractedThemes, null, 2)}\n`);

console.log(`Extracted ${extractedThemes.length} Shiki themes to ${outDir}`);

function parseOutDir(args) {
  const outIndex = args.findIndex((arg) => arg === "--out" || arg === "-o");
  if (outIndex !== -1) {
    return args[outIndex + 1];
  }

  return args[0];
}
