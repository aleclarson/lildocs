import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { LildocsError } from "./errors.js";
import { isHiddenOrSystemPath } from "./paths.js";

const HOME_PAGE_CANDIDATES = [
  "index.md",
  "intro.md",
  "introduction.md",
  "getting-started.md",
  "quickstart.md",
  "readme.md",
  "README.md",
];

const README_FIRST_HOME_PAGE_CANDIDATES = [
  "README.md",
  ...HOME_PAGE_CANDIDATES.filter((candidate) => candidate !== "README.md"),
];

export type HomePagePreference = "default" | "readme-first";

type ResolveInputOptions = {
  homePagePreference?: HomePagePreference;
};

export type ResolvedInput = {
  docsRoot: string;
  homePage: string;
};

export async function resolveInput(
  input: string,
  cwd: string,
  options: ResolveInputOptions = {},
): Promise<ResolvedInput> {
  const inputPath = path.resolve(cwd, input);
  let inputStat;

  try {
    inputStat = await stat(inputPath);
  } catch {
    throw new LildocsError(`Input path does not exist: ${input}`);
  }

  if (inputStat.isFile()) {
    if (path.extname(inputPath).toLowerCase() !== ".md") {
      throw new LildocsError(`Input file must be Markdown: ${input}`);
    }

    return {
      docsRoot: path.dirname(inputPath),
      homePage: inputPath,
    };
  }

  if (!inputStat.isDirectory()) {
    throw new LildocsError(`Input path must be a Markdown file or directory: ${input}`);
  }

  const homePage = await findHomePage(inputPath, options.homePagePreference);
  if (!homePage) {
    throw new LildocsError(`No Markdown files found in docs directory: ${input}`);
  }

  return {
    docsRoot: inputPath,
    homePage,
  };
}

async function findHomePage(docsRoot: string, preference: HomePagePreference = "default") {
  const homePageCandidates =
    preference === "readme-first" ? README_FIRST_HOME_PAGE_CANDIDATES : HOME_PAGE_CANDIDATES;
  const candidates = await Promise.all(
    homePageCandidates.map(async (candidate) => {
      const candidatePath = path.join(docsRoot, candidate);
      try {
        const candidateStat = await stat(candidatePath);
        return candidateStat.isFile() ? candidatePath : undefined;
      } catch {
        return undefined;
      }
    }),
  );
  const homePage = candidates.find(Boolean);
  if (homePage) {
    return homePage;
  }

  const markdownFiles = await collectMarkdownPaths(docsRoot, docsRoot);
  return markdownFiles[0];
}

export async function collectMarkdownPaths(
  docsRoot: string,
  currentDir = docsRoot,
): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const collected = await Promise.all(
    entries
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map(async (entry) => {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(docsRoot, fullPath);
        if (isHiddenOrSystemPath(relativePath)) {
          return [];
        }

        if (entry.isDirectory()) {
          return collectMarkdownPaths(docsRoot, fullPath);
        }

        if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
          return [fullPath];
        }

        return [];
      }),
  );

  return collected.flat();
}
