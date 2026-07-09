import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { mergeConfigOptions, readDocsConfig } from "./config.js";
import { buildContentModel, type Page } from "./content.js";
import {
  buildFrontendAssets,
  createFrontendRenderer,
  readRenderAsset,
  type FrontendRenderer,
} from "./frontend.js";
import { resolveInput, type HomePagePreference } from "./input.js";
import { copyAssets, renderMarkdownPage, type AssetCopy } from "./markdown.js";
import { createMermaidRenderer } from "./mermaid.js";
import { buildNavigation } from "./nav.js";
import { buildReferencePages } from "./reference.js";
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
  type NavigationOptions,
  type ThemeConfig,
} from "./theme.js";
import type { ViteDevServer } from "vite";
import type { PageNavigation } from "../render/types.js";

export type BuildOptions = {
  input: string;
  outDir: string;
  cwd: string;
  theme?: ThemeConfig;
  fonts?: FontOverrides;
  favicon?: string;
  logo?: LogoOptions;
  background?: BackgroundOptions;
  link?: LinkOptions;
  navigation?: NavigationOptions;
  homePagePreference?: HomePagePreference;
  dev?: {
    clientScriptPath: string;
    viteServer?: ViteDevServer;
  };
  basePath?: string;
};

export type BuildResult = {
  outDir: string;
  pages: Page[];
};

export async function buildSite(options: BuildOptions): Promise<BuildResult> {
  const input = await resolveInput(options.input, options.cwd, {
    homePagePreference: options.homePagePreference,
  });
  const docsConfig = await readDocsConfig(input.docsRoot);
  const configOptions = mergeConfigOptions({
    config: docsConfig,
    theme: options.theme,
    fonts: options.fonts,
    favicon: options.favicon,
    logo: options.logo,
    background: options.background,
    link: options.link,
    navigation: options.navigation,
  });
  const outDir = path.resolve(options.cwd, options.outDir);
  const outDirName = path.basename(outDir);
  const packagePath = await findNearestPackageJson(input.docsRoot, options.cwd);
  const repositoryUrl = await resolveRepositoryUrl(packagePath);
  const packageName = await resolvePackageName(packagePath);
  const referencePages = await buildReferencePages({
    cwd: options.cwd,
    docsRoot: input.docsRoot,
    reference: configOptions.reference,
    githubRepository: githubRepositoryName(repositoryUrl),
  });
  const model = await buildContentModel(
    input,
    outDirName,
    configOptions.navigation.order,
    referencePages,
  );
  const projectName = configOptions.projectName ?? packageName;
  const theme = await resolveTheme({
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
  const tablerIconsCss = await readRenderAsset("tabler-icons.css");
  const githubIcon = await readRenderAsset("github-icon.svg");
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
    defaultText: packageName,
    favicon: configOptions.favicon,
  });
  const css = `${fontResolution.css}${themeToCssVariables(theme, fontResolution.themeFonts, configOptions.link, configOptions.navigation)}\n${backgroundResolution.css}${logoResolution.css}${baseCss}`;
  const assets: AssetCopy[] = [
    ...fontResolution.assets,
    ...backgroundResolution.assets,
    ...logoResolution.assets,
  ];
  const mermaid = await createMermaidRenderer({
    themeConfig: themeToMermaidConfig(theme, fontResolution.themeFonts),
  });
  let frontendRenderer: FrontendRenderer | undefined;

  try {
    await rm(outDir, { recursive: true, force: true });
    await mkdir(path.join(outDir, "assets"), { recursive: true });

    const renderedPages = await Promise.all(
      model.pages.map((page) =>
        renderMarkdownPage(model, page, outDir, {
          mermaid,
          shikiTheme: {
            light: theme.light.shiki?.theme,
            dark: theme.dark?.shiki?.theme,
          },
        }),
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
    const frontendAssets = options.dev
      ? {
          scriptPath: options.dev.clientScriptPath,
          stylePaths: [],
        }
      : await buildFrontendAssets({ cwd: options.cwd, outDir });
    const renderer = await createFrontendRenderer({
      cwd: options.cwd,
      viteServer: options.dev?.viteServer,
    });
    frontendRenderer = renderer;

    await Promise.all(
      model.pages.map(async (page) => {
        const nav = buildNavigation(model, page);
        const html = renderer.renderPage({
          page,
          nav,
          pageNavigation: pageNavigation.get(page.route),
          css,
          searchIndexJson,
          logo: logoResolution.logo,
          favicon: logoResolution.favicon,
          repositoryUrl,
          projectName,
          navigation: configOptions.navigation,
          clientScriptPath: frontendAssets.scriptPath,
          clientStylePaths: frontendAssets.stylePaths,
        });
        const outputPath = path.join(outDir, page.outputPath);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, html);
      }),
    );

    await writeFile(path.join(outDir, "assets", "lildocs.css"), css);
    await writeFile(path.join(outDir, "assets", "tabler-icons.css"), tablerIconsCss);
    await writeFile(path.join(outDir, "assets", "github-icon.svg"), githubIcon);
    await writeFile(path.join(outDir, "search-index.json"), searchIndexJson);
    await copyAssets(assets);
  } finally {
    await frontendRenderer?.close();
    await mermaid.close();
  }

  return {
    outDir,
    pages: model.pages,
  };
}

async function resolveRepositoryUrl(packagePath: string | undefined): Promise<string | undefined> {
  const envRepository = process.env.GITHUB_REPOSITORY?.trim();
  if (envRepository) {
    return `https://github.com/${envRepository}`;
  }

  if (!packagePath) {
    return undefined;
  }

  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    repository?: unknown;
  };
  return normalizePackageRepository(packageJson.repository);
}

async function resolvePackageName(packagePath: string | undefined): Promise<string | undefined> {
  if (!packagePath) {
    return undefined;
  }

  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    name?: unknown;
  };
  return typeof packageJson.name === "string" && packageJson.name.trim()
    ? packageJson.name.trim()
    : undefined;
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

function githubRepositoryName(repositoryUrl: string | undefined): string | undefined {
  if (!repositoryUrl) {
    return undefined;
  }

  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)$/.exec(repositoryUrl);
  return match?.[1];
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
