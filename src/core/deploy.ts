import { existsSync, readFileSync } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSite, type BuildOptions, type BuildResult } from "./build.js";
import {
  normalizeBasePath,
  renderGitHubPagesWorkflow,
  repoRelativeInputPath,
} from "./github-pages.js";

export type DeployOptions = BuildOptions;

export type DeployResult = BuildResult & {
  basePath: string;
};

export async function deployGitHubPages(
  options: DeployOptions,
): Promise<DeployResult> {
  const basePath = normalizeBasePath(options.basePath);
  const result = await buildSite({
    ...options,
    basePath,
  });

  await writeFile(path.join(result.outDir, ".nojekyll"), "");
  await writeFile(
    path.join(result.outDir, "lildocs-deploy.json"),
    `${JSON.stringify(
      {
        target: "github-pages",
        basePath,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  return {
    ...result,
    basePath,
  };
}

export type InitGitHubPagesWorkflowOptions = {
  input: string;
  outDir: string;
  basePath?: string;
  cwd: string;
};

export async function initGitHubPagesWorkflow(
  options: InitGitHubPagesWorkflowOptions,
) {
  const workflow = await prepareWorkflow(options);
  await mkdir(path.dirname(workflow.path), { recursive: true });
  await writeFile(workflow.path, workflow.contents);

  return workflow.path;
}

async function prepareWorkflow(options: InitGitHubPagesWorkflowOptions) {
  const workflowPath = path.join(
    options.cwd,
    ".github",
    "workflows",
    "lildocs-pages.yml",
  );

  if (await pathExists(workflowPath)) {
    throw new Error(
      `Refusing to overwrite existing workflow at ${workflowPath}.`,
    );
  }

  const workflowInput = repoRelativeInputPath(options.input, options.cwd);
  const workflowOutDir = path.relative(
    options.cwd,
    path.resolve(options.cwd, options.outDir),
  );
  const hasPackageManager = nearestPackageJsonHasPackageManager(options.cwd);

  return {
    path: workflowPath,
    contents: renderGitHubPagesWorkflow({
      input: workflowInput,
      outDir: workflowOutDir || ".",
      basePath: options.basePath,
      pnpmVersion: hasPackageManager ? false : undefined,
    }),
  };
}

function nearestPackageJsonHasPackageManager(cwd: string) {
  let current = path.resolve(cwd);

  while (true) {
    const packageJsonPath = path.join(current, "package.json");

    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        packageManager?: unknown;
      };
      return (
        typeof packageJson.packageManager === "string" &&
        packageJson.packageManager.length > 0
      );
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return false;
    }
    current = parent;
  }
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
