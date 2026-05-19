import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConfigOptions, readDocsConfig } from "./config.js";
import { buildContentModel, type Page } from "./content.js";
import { resolveInput } from "./input.js";
import { copyAssets, renderMarkdownPage, type AssetCopy } from "./markdown.js";
import { createMermaidRenderer } from "./mermaid.js";
import { buildNavigation } from "./nav.js";
import { resolveLogoOptions, type LogoOptions } from "./logo.js";
import { relativeUrl } from "./paths.js";
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
import type { PageNavigation } from "../render/renderPage.js";

export type BuildOptions = {
  input: string;
  outDir: string;
  cwd: string;
  theme?: string;
  fonts?: FontOverrides;
  favicon?: string;
  logo?: LogoOptions;
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
const require = createRequire(import.meta.url);

export async function buildSite(options: BuildOptions): Promise<BuildResult> {
  const input = await resolveInput(options.input, options.cwd);
  const configOptions = mergeConfigOptions({
    config: await readDocsConfig(input.docsRoot),
    theme: options.theme,
    fonts: options.fonts,
    favicon: options.favicon,
    logo: options.logo,
    background: options.background,
    link: options.link,
  });
  const outDir = path.resolve(options.cwd, options.outDir);
  const outDirName = path.basename(outDir);
  const model = await buildContentModel(input, outDirName);
  const repositoryUrl = await resolveRepositoryUrl(input.docsRoot, options.cwd);
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
  const copyCodeScript = await readRenderAsset("copy-code.js");
  const navigationScript = await readRenderAsset("navigation.js");
  const swupScript = await readSwupAsset();
  const backgroundResolution = resolveBackgroundOptions({
    cwd: options.cwd,
    docsRoot: input.docsRoot,
    outDir,
    background: configOptions.background,
  });
  const logoResolution = await resolveLogoOptions({
    cwd: options.cwd,
    docsRoot: input.docsRoot,
    outDir,
    logo: configOptions.logo,
    favicon: configOptions.favicon,
  });
  const css = `${fontResolution.css}${themeToCssVariables(theme, fontResolution.themeFonts, configOptions.link)}\n${backgroundResolution.css}${logoResolution.css}${baseCss}`;
  const assets: AssetCopy[] = [
    ...fontResolution.assets,
    ...backgroundResolution.assets,
    ...logoResolution.assets,
  ];
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
    const pageNavigation = buildPageNavigation(model.pages);

    await Promise.all(
      model.pages.map(async (page) => {
        const nav = buildNavigation(model, page);
        const html = renderPage(
          page,
          nav,
          pageNavigation.get(page.route),
          css,
          searchIndexJson,
          logoResolution.logo,
          logoResolution.favicon,
          repositoryUrl,
          options.dev,
        );
        const outputPath = path.join(outDir, page.outputPath);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, html);
      }),
    );

    await writeFile(path.join(outDir, "assets", "lildocs.css"), css);
    await writeFile(path.join(outDir, "assets", "search.js"), searchScript);
    await writeFile(path.join(outDir, "assets", "copy-code.js"), copyCodeScript);
    await writeFile(path.join(outDir, "assets", "swup.umd.js"), swupScript);
    await writeFile(path.join(outDir, "assets", "navigation.js"), navigationScript);
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

async function resolveRepositoryUrl(docsRoot: string, cwd: string): Promise<string | undefined> {
  const envRepository = process.env.GITHUB_REPOSITORY?.trim();
  if (envRepository) {
    return `https://github.com/${envRepository}`;
  }

  const packagePath = await findNearestPackageJson(docsRoot, cwd);
  if (!packagePath) {
    return undefined;
  }

  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    repository?: unknown;
  };
  return normalizePackageRepository(packageJson.repository);
}

async function findNearestPackageJson(start: string, stop: string): Promise<string | undefined> {
  let current = path.resolve(start);
  const root = path.parse(current).root;
  const stopDir = path.resolve(stop);

  while (true) {
    const packagePath = path.join(current, "package.json");
    if (existsSync(packagePath)) {
      return packagePath;
    }

    if (current === stopDir || current === root) {
      return undefined;
    }

    current = path.dirname(current);
  }
}

function normalizePackageRepository(repository: unknown): string | undefined {
  if (typeof repository === "string") {
    return normalizeGitHubRepository(repository);
  }

  if (repository && typeof repository === "object" && "url" in repository) {
    const { url } = repository as { url?: unknown };
    if (typeof url === "string") {
      return normalizeGitHubRepository(url);
    }
  }

  return undefined;
}

function normalizeGitHubRepository(value: string): string | undefined {
  const repository = value.trim();
  if (!repository) {
    return undefined;
  }

  const shorthandMatch = /^(?:github:)?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/.exec(repository);
  if (shorthandMatch?.[1]) {
    return `https://github.com/${shorthandMatch[1].replace(/\.git$/, "")}`;
  }

  const sshMatch = /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/.exec(repository);
  if (sshMatch?.[1]) {
    return `https://github.com/${sshMatch[1]}`;
  }

  const urlMatch = /^(?:git\+)?https:\/\/github\.com\/([^/]+\/[^/#?]+?)(?:\.git)?(?:[#?].*)?$/.exec(
    repository,
  );
  if (urlMatch?.[1]) {
    return `https://github.com/${urlMatch[1]}`;
  }

  return undefined;
}

async function readRenderAsset(name: string) {
  const bundledPath = path.resolve(sourceDir, "render", name);
  try {
    return await readFile(bundledPath, "utf8");
  } catch {
    return readFile(path.resolve(sourceDir, "../render", name), "utf8");
  }
}

async function readSwupAsset() {
  return readFile(path.join(path.dirname(require.resolve("swup")), "Swup.umd.js"), "utf8");
}

function buildPageNavigation(pages: Page[]) {
  const navigation = new Map<string, PageNavigation>();

  if (pages.length < 2) {
    return navigation;
  }

  for (const [index, page] of pages.entries()) {
    const previous = pages[index - 1];
    const next = pages[index + 1];
    navigation.set(page.route, {
      previous: previous
        ? {
            title: previous.title,
            href: relativeUrl(page.route, previous.route),
          }
        : undefined,
      next: next
        ? {
            title: next.title,
            href: relativeUrl(page.route, next.route),
          }
        : undefined,
    });
  }

  return navigation;
}
