import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConfigOptions, readDocsConfig } from "./config.js";
import { buildContentModel, type Page } from "./content.js";
import { resolveInput } from "./input.js";
import { copyAssets, renderMarkdownPage, type AssetCopy } from "./markdown.js";
import { createMermaidRenderer } from "./mermaid.js";
import { buildNavigation } from "./nav.js";
import { buildSearchIndex } from "./search.js";
import {
  resolveFontOverrides,
  resolveBackgroundOptions,
  resolveTheme,
  themeToCssVariables,
  themeToMermaidConfig,
  type FontOverrides,
  type BackgroundOptions,
  type LinkOptions,
} from "./theme.js";
import { renderPage } from "../render/renderPage.js";

export type BuildOptions = {
  input: string;
  outDir: string;
  cwd: string;
  theme?: string;
  fonts?: FontOverrides;
  background?: BackgroundOptions;
  link?: LinkOptions;
  dev?: {
    clientScriptPath: string;
  };
  basePath?: string;
};

export type BuildResult = {
  outDir: string;
  pages: Page[];
};

const sourceDir = path.dirname(fileURLToPath(import.meta.url));

export async function buildSite(options: BuildOptions): Promise<BuildResult> {
  const input = await resolveInput(options.input, options.cwd);
  const configOptions = mergeConfigOptions({
    config: await readDocsConfig(input.docsRoot),
    theme: options.theme,
    fonts: options.fonts,
    background: options.background,
    link: options.link,
  });
  const outDir = path.resolve(options.cwd, options.outDir);
  const outDirName = path.basename(outDir);
  const model = await buildContentModel(input, outDirName);
  const theme = await resolveTheme({
    cwd: options.cwd,
    docsRoot: input.docsRoot,
    requestedTheme: configOptions.theme,
  });
  const fontResolution = await resolveFontOverrides({
    cwd: options.cwd,
    docsRoot: input.docsRoot,
    outDir,
    fonts: configOptions.fonts,
  });
  const baseCss = await readRenderAsset("styles.css");
  const searchScript = await readRenderAsset("search.js");
  const backgroundResolution = resolveBackgroundOptions({
    cwd: options.cwd,
    docsRoot: input.docsRoot,
    outDir,
    background: configOptions.background,
  });
  const css = `${fontResolution.css}${themeToCssVariables(theme, fontResolution.themeFonts, configOptions.link)}\n${backgroundResolution.css}${baseCss}`;
  const assets: AssetCopy[] = [...fontResolution.assets, ...backgroundResolution.assets];
  const mermaid = await createMermaidRenderer({
    themeConfig: themeToMermaidConfig(theme, fontResolution.themeFonts),
  });

  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, "assets"), { recursive: true });

  try {
    const renderedPages = await Promise.all(
      model.pages.map((page) =>
        renderMarkdownPage(model, page, outDir, { mermaid, shikiTheme: theme.shiki?.theme }),
      ),
    );
    for (const [index, rendered] of renderedPages.entries()) {
      const page = model.pages[index];
      if (!page) {
        continue;
      }
      page.html = rendered.html;
      page.searchText = rendered.text;
      assets.push(...rendered.assets);
    }

    const searchIndexJson = JSON.stringify(buildSearchIndex(model.pages), null, 2);

    await Promise.all(
      model.pages.map(async (page) => {
        const nav = buildNavigation(model, page);
        const html = renderPage(page, nav, css, searchIndexJson, options.dev);
        const outputPath = path.join(outDir, page.outputPath);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, html);
      }),
    );

    await writeFile(path.join(outDir, "assets", "lildocs.css"), css);
    await writeFile(path.join(outDir, "assets", "search.js"), searchScript);
    await writeFile(path.join(outDir, "search-index.json"), searchIndexJson);
    await copyAssets(assets);
  } finally {
    await mermaid.close();
  }

  return {
    outDir,
    pages: model.pages,
  };
}

async function readRenderAsset(name: string) {
  const bundledPath = path.resolve(sourceDir, "render", name);
  try {
    return await readFile(bundledPath, "utf8");
  } catch {
    return readFile(path.resolve(sourceDir, "../render", name), "utf8");
  }
}
