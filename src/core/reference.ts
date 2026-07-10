import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  generateMarkdownForModule,
  type GenerateMarkdownOptions,
} from "exports-md";
import type { AdditionalPage } from "./content.js";
import { LildocsError } from "./errors.js";
import { toPosixPath } from "./paths.js";
import type { ReferenceOptions } from "./config.js";
import { collectMarkdownPaths } from "./input.js";

type ReferencePackage = {
  packagePath: string;
  configured: boolean;
};

export async function buildReferencePages(options: {
  cwd: string;
  docsRoot: string;
  reference?: ReferenceOptions;
  githubRepository?: string;
}): Promise<AdditionalPage[]> {
  const packageJson = await resolveReferencePackageJson(options);
  if (!packageJson) {
    return [];
  }

  const packageJsonData = await readPackageJson(packageJson.packagePath);
  if (!packageJson.configured && packageJsonData.exports === undefined) {
    return [];
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "lildocs-reference-"));
  try {
    await generateMarkdownForModule(packageJson.packagePath, {
      cwd: options.cwd,
      propertyDocs: "list",
      groupBySyntax: true,
      sortByName: true,
      github: options.githubRepository
        ? {
            repository: options.githubRepository,
            searchLinks: true,
          }
        : undefined,
      outDir: tempDir,
    } satisfies GenerateMarkdownOptions);

    const markdownPaths = await collectMarkdownPaths(tempDir);
    const packageName = packageJsonData.name;
    if (typeof packageName !== "string" || !packageName) {
      throw new Error(`Package name not found: ${packageJson.packagePath}`);
    }

    return Promise.all(
      markdownPaths.map(async (sourcePath) => {
        const rawMarkdown = await readFile(sourcePath, "utf8");
        return {
          sourcePath,
          relativePath: referenceMarkdownPath(rawMarkdown, packageName),
          rawMarkdown,
        };
      }),
    );
  } catch (error) {
    throw new LildocsError(
      `Failed to generate API reference: ${errorMessage(error)}`,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function resolveReferencePackageJson(options: {
  docsRoot: string;
  reference?: ReferenceOptions;
}): Promise<ReferencePackage | undefined> {
  const configuredPath = options.reference?.packageJson;
  if (configuredPath) {
    const packagePath = path.resolve(options.docsRoot, configuredPath);
    if (!existsSync(packagePath)) {
      throw new LildocsError(
        `Configured reference package.json does not exist: ${packagePath}`,
      );
    }
    return { packagePath, configured: true };
  }

  const siblingPackageJson = path.join(
    path.dirname(options.docsRoot),
    "package.json",
  );
  if (existsSync(siblingPackageJson)) {
    return { packagePath: siblingPackageJson, configured: false };
  }

  return undefined;
}

async function readPackageJson(packagePath: string) {
  try {
    return JSON.parse(await readFile(packagePath, "utf8")) as {
      exports?: unknown;
      name?: unknown;
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new LildocsError(
        `Invalid package.json for API reference: ${packagePath}`,
      );
    }
    throw error;
  }
}

function referenceMarkdownPath(rawMarkdown: string, packageName: string) {
  const packageSpecifier = rawMarkdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (
    !packageSpecifier ||
    (packageSpecifier !== packageName &&
      !packageSpecifier.startsWith(`${packageName}/`)) ||
    packageSpecifier
      .split("/")
      .some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(
      `Invalid package entry heading: ${packageSpecifier ?? "missing"}`,
    );
  }

  return toPosixPath(path.posix.join("reference", `${packageSpecifier}.md`));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
