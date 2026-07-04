import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateMarkdownForModule } from "exports-md";
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
      outDir: tempDir,
    });

    const markdownPaths = await collectMarkdownPaths(tempDir);
    return Promise.all(
      markdownPaths.map(async (sourcePath) => {
        const generatedPath = toPosixPath(path.relative(tempDir, sourcePath));
        return {
          sourcePath,
          relativePath: toPosixPath(path.posix.join("reference", generatedPath)),
          rawMarkdown: await readFile(sourcePath, "utf8"),
        };
      }),
    );
  } catch (error) {
    throw new LildocsError(`Failed to generate API reference: ${errorMessage(error)}`);
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
      throw new LildocsError(`Configured reference package.json does not exist: ${packagePath}`);
    }
    return { packagePath, configured: true };
  }

  const siblingPackageJson = path.join(path.dirname(options.docsRoot), "package.json");
  if (existsSync(siblingPackageJson)) {
    return { packagePath: siblingPackageJson, configured: false };
  }

  return undefined;
}

async function readPackageJson(packagePath: string) {
  try {
    return JSON.parse(await readFile(packagePath, "utf8")) as { exports?: unknown };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new LildocsError(`Invalid package.json for API reference: ${packagePath}`);
    }
    throw error;
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
