#!/usr/bin/env node

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { themeNames } from "@shikijs/themes";
import {
  loadTheme,
  mapShikiThemeToLildocsTheme,
  renderThemeTs,
} from "./shiki-theme-to-lildocs-theme.mjs";

const defaultOutDir = path.resolve(process.cwd(), "src/generated/lildocs-themes");
const outDir = path.resolve(process.cwd(), parseOutDir(process.argv.slice(2)) ?? defaultOutDir);

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const index = await Promise.all(
  themeNames.toSorted().map(async (themeName) => {
    const shikiTheme = await loadTheme(themeName);
    const lildocsTheme = mapShikiThemeToLildocsTheme(shikiTheme);
    const fileName = `${themeName}.theme.ts`;

    await writeFile(path.join(outDir, fileName), renderThemeTs(lildocsTheme, shikiTheme), "utf8");

    return {
      name: themeName,
      displayName: shikiTheme.displayName ?? themeName,
      type: shikiTheme.type ?? "unknown",
      file: fileName,
    };
  }),
);

await writeFile(path.join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");

console.log(`Mapped ${index.length} Shiki themes to lildocs themes in ${outDir}`);

function parseOutDir(args) {
  const outIndex = args.findIndex((arg) => arg === "--out" || arg === "-o");
  if (outIndex !== -1) {
    return args[outIndex + 1];
  }

  return args[0];
}
