import { randomInt } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { readDocsConfig } from "./config.js";
import { resolveInput } from "./input.js";
import type { FontOverrides } from "./theme.js";

type ThemePair = readonly [light: string, dark: string];
type FontPair = readonly [heading: string, body: string];

export type ShuffledAppearance = {
  theme: { light: string; dark: string };
  fonts: Required<FontOverrides>;
};

// Keep these pools independent so each shuffle can freely recombine them.
const themePairs: readonly ThemePair[] = [
  ["ayu-light", "ayu-dark"],
  ["ayu-light", "ayu-mirage"],
  ["catppuccin-latte", "catppuccin-frappe"],
  ["catppuccin-latte", "catppuccin-macchiato"],
  ["catppuccin-latte", "catppuccin-mocha"],
  ["everforest-light", "everforest-dark"],
  ["github-light", "github-dark"],
  ["github-light-default", "github-dark-default"],
  ["github-light", "github-dark-dimmed"],
  ["github-light-high-contrast", "github-dark-high-contrast"],
  ["gruvbox-light-hard", "gruvbox-dark-hard"],
  ["gruvbox-light-medium", "gruvbox-dark-medium"],
  ["gruvbox-light-soft", "gruvbox-dark-soft"],
  ["horizon-bright", "horizon"],
  ["light-plus", "dark-plus"],
  ["material-theme-lighter", "material-theme"],
  ["material-theme-lighter", "material-theme-darker"],
  ["material-theme-lighter", "material-theme-ocean"],
  ["material-theme-lighter", "material-theme-palenight"],
  ["min-light", "min-dark"],
  ["night-owl-light", "night-owl"],
  ["one-light", "one-dark-pro"],
  ["rose-pine-dawn", "rose-pine"],
  ["rose-pine-dawn", "rose-pine-moon"],
  ["slack-ochin", "slack-dark"],
  ["solarized-light", "solarized-dark"],
  ["vitesse-light", "vitesse-dark"],
  ["vitesse-light", "vitesse-black"],
  ["snazzy-light", "andromeeda"],
  ["snazzy-light", "aurora-x"],
  ["min-light", "dracula"],
  ["min-light", "dracula-soft"],
  ["min-light", "houston"],
  ["kanagawa-lotus", "kanagawa-dragon"],
  ["kanagawa-lotus", "kanagawa-wave"],
  ["min-light", "laserwave"],
  ["min-light", "monokai"],
  ["min-light", "nord"],
  ["snazzy-light", "plastic"],
  ["min-light", "poimandres"],
  ["github-light", "red"],
  ["min-light", "synthwave-84"],
  ["one-light", "tokyo-night"],
  ["min-light", "vesper"],
];

const fontPairs: readonly FontPair[] = [
  ["Alegreya", "Alegreya Sans"],
  ["Alegreya Sans", "Alegreya"],
  ["Archivo Black", "Archivo"],
  ["Bebas Neue", "Source Sans 3"],
  ["Bitter", "Source Sans 3"],
  ["Bodoni Moda", "Montserrat"],
  ["Bree Serif", "Open Sans"],
  ["Bungee", "Lato"],
  ["Cardo", "Work Sans"],
  ["Cormorant Garamond", "Proza Libre"],
  ["Cormorant Garamond", "Montserrat"],
  ["Crimson Pro", "Inter"],
  ["DM Serif Display", "DM Sans"],
  ["Domine", "Open Sans"],
  ["EB Garamond", "Inter"],
  ["Eczar", "Roboto"],
  ["Fjalla One", "Noto Sans"],
  ["Fraunces", "Inter"],
  ["Fraunces", "Source Sans 3"],
  ["Fredoka", "Nunito"],
  ["IBM Plex Serif", "IBM Plex Sans"],
  ["Josefin Sans", "Lora"],
  ["Karla", "Merriweather"],
  ["Libre Baskerville", "Montserrat"],
  ["Libre Baskerville", "Source Sans 3"],
  ["Libre Franklin", "Libre Baskerville"],
  ["Lora", "Inter"],
  ["Lora", "Roboto"],
  ["Manrope", "Source Serif 4"],
  ["Merriweather", "Open Sans"],
  ["Montserrat", "Lora"],
  ["Montserrat", "Merriweather"],
  ["Newsreader", "Roboto"],
  ["Noto Serif", "Noto Sans"],
  ["Oswald", "Quattrocento"],
  ["Outfit", "Source Sans 3"],
  ["Playfair Display", "Inter"],
  ["Playfair Display", "Lato"],
  ["Playfair Display", "Source Sans 3"],
  ["Poppins", "Lato"],
  ["Prata", "Lato"],
  ["PT Serif", "PT Sans"],
  ["Righteous", "Roboto"],
  ["Roboto Slab", "Roboto"],
  ["Rokkitt", "Lato"],
  ["Rubik", "Karla"],
  ["Sora", "DM Sans"],
  ["Space Grotesk", "Inter"],
  ["Spectral", "Rubik"],
  ["Syne", "Manrope"],
  ["Unbounded", "Inter"],
  ["Vollkorn", "Open Sans"],
  ["Work Sans", "Bitter"],
  ["Yeseva One", "Josefin Sans"],
  ["Young Serif", "Inter"],
  ["Zilla Slab", "Lato"],
  ["Inter", "Inter"],
  ["IBM Plex Sans", "IBM Plex Sans"],
  ["Manrope", "Manrope"],
  ["Nunito", "Nunito Sans"],
  ["Raleway", "Roboto"],
  ["Roboto", "Roboto Slab"],
  ["Space Grotesk", "Space Grotesk"],
  ["Work Sans", "Work Sans"],
];

const monoFonts = [
  "Anonymous Pro",
  "Azeret Mono",
  "B612 Mono",
  "Chivo Mono",
  "Courier Prime",
  "Cousine",
  "Cutive Mono",
  "DM Mono",
  "Fira Code",
  "Fragment Mono",
  "Geist Mono",
  "Google Sans Code",
  "IBM Plex Mono",
  "Inconsolata",
  "JetBrains Mono",
  "Kode Mono",
  "Martian Mono",
  "Noto Sans Mono",
  "Nova Mono",
  "Overpass Mono",
  "PT Mono",
  "Red Hat Mono",
  "Roboto Mono",
  "Share Tech Mono",
  "Sometype Mono",
  "Source Code Pro",
  "Space Mono",
  "Spline Sans Mono",
  "Syne Mono",
  "Ubuntu Mono",
  "Victor Mono",
] as const;

export function shuffleAppearance(): ShuffledAppearance {
  const [light, dark] = randomItem(themePairs);
  const [heading, body] = randomItem(fontPairs);

  return {
    theme: { light, dark },
    fonts: {
      heading,
      body,
      code: randomItem(monoFonts),
    },
  };
}

export async function saveShuffledAppearance(
  inputPath: string,
  cwd: string,
  appearance: ShuffledAppearance,
) {
  const input = await resolveInput(inputPath, cwd, {
    homePagePreference: "readme-first",
  });
  const config = await readDocsConfig(input.docsRoot);
  const configPath = path.join(input.docsRoot, "config.json");
  await writeFile(
    configPath,
    `${JSON.stringify(
      { ...config, theme: appearance.theme, font: appearance.fonts },
      null,
      2,
    )}\n`,
  );
  return configPath;
}

function randomItem<T>(items: readonly T[]): T {
  return items[randomInt(items.length)]!;
}
