import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FontOverrides } from "./theme.js";
import { LildocsError } from "./errors.js";

export type DocsConfig = {
  theme?: string;
  font?: FontOverrides;
};

export async function readDocsConfig(docsRoot: string): Promise<DocsConfig> {
  const configPath = path.join(docsRoot, "config.json");
  let rawConfig: string;

  try {
    rawConfig = await readFile(configPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return {};
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfig);
  } catch (error) {
    throw new LildocsError(`Invalid docs config JSON at ${configPath}: ${errorMessage(error)}`);
  }

  return validateDocsConfig(parsed, configPath);
}

export function mergeConfigOptions(options: {
  config: DocsConfig;
  theme?: string;
  fonts?: FontOverrides;
}) {
  return {
    theme: options.theme ?? options.config.theme,
    fonts: {
      heading: options.fonts?.heading ?? options.config.font?.heading,
      body: options.fonts?.body ?? options.config.font?.body,
      code: options.fonts?.code ?? options.config.font?.code,
    },
  };
}

function validateDocsConfig(value: unknown, configPath: string): DocsConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LildocsError(`Docs config must be a JSON object: ${configPath}`);
  }

  const config = value as DocsConfig;
  assertOptionalString(config.theme, "theme", configPath);

  if (config.font !== undefined) {
    if (!config.font || typeof config.font !== "object" || Array.isArray(config.font)) {
      throw new LildocsError(`Docs config "font" must be an object: ${configPath}`);
    }
    assertOptionalString(config.font.heading, "font.heading", configPath);
    assertOptionalString(config.font.body, "font.body", configPath);
    assertOptionalString(config.font.code, "font.code", configPath);
  }

  return {
    theme: config.theme,
    font: config.font
      ? {
          heading: config.font.heading,
          body: config.font.body,
          code: config.font.code,
        }
      : undefined,
  };
}

function assertOptionalString(value: unknown, name: string, configPath: string) {
  if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
    throw new LildocsError(`Docs config "${name}" must be a non-empty string: ${configPath}`);
  }
}

function isMissingFileError(error: unknown) {
  return (
    error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
