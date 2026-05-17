import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BackgroundOptions, FontOverrides, LinkOptions } from "./theme.js";
import { LildocsError } from "./errors.js";

export type DocsConfig = {
  $schema?: string;
  theme?: string;
  font?: FontOverrides;
  background?: BackgroundOptions;
  link?: LinkOptions;
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
  background?: BackgroundOptions;
  link?: LinkOptions;
}) {
  return {
    theme: options.theme ?? options.config.theme,
    fonts: {
      heading: options.fonts?.heading ?? options.config.font?.heading,
      body: options.fonts?.body ?? options.config.font?.body,
      code: options.fonts?.code ?? options.config.font?.code,
    },
    background: {
      image: options.background?.image ?? options.config.background?.image,
      gradient: options.background?.gradient ?? options.config.background?.gradient,
      blendMode: options.background?.blendMode ?? options.config.background?.blendMode,
    },
    link: {
      underline: options.link?.underline ?? options.config.link?.underline,
    },
  };
}

function validateDocsConfig(value: unknown, configPath: string): DocsConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LildocsError(`Docs config must be a JSON object: ${configPath}`);
  }

  const config = value as DocsConfig;
  assertOptionalString(config.$schema, "$schema", configPath);
  assertOptionalString(config.theme, "theme", configPath);

  if (config.font !== undefined) {
    if (!config.font || typeof config.font !== "object" || Array.isArray(config.font)) {
      throw new LildocsError(`Docs config "font" must be an object: ${configPath}`);
    }
    assertOptionalString(config.font.heading, "font.heading", configPath);
    assertOptionalString(config.font.body, "font.body", configPath);
    assertOptionalString(config.font.code, "font.code", configPath);
  }

  if (config.background !== undefined) {
    if (
      !config.background ||
      typeof config.background !== "object" ||
      Array.isArray(config.background)
    ) {
      throw new LildocsError(`Docs config "background" must be an object: ${configPath}`);
    }
    assertOptionalString(config.background.image, "background.image", configPath);
    assertOptionalString(config.background.gradient, "background.gradient", configPath);
    assertOptionalString(config.background.blendMode, "background.blendMode", configPath);
  }

  if (config.link !== undefined) {
    if (!config.link || typeof config.link !== "object" || Array.isArray(config.link)) {
      throw new LildocsError(`Docs config "link" must be an object: ${configPath}`);
    }
    assertOptionalEnum(
      config.link.underline,
      "link.underline",
      ["always", "hover", "none"],
      configPath,
    );
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
    background: config.background
      ? {
          image: config.background.image,
          gradient: config.background.gradient,
          blendMode: config.background.blendMode,
        }
      : undefined,
    link: config.link
      ? {
          underline: config.link.underline,
        }
      : undefined,
  };
}

function assertOptionalString(value: unknown, name: string, configPath: string) {
  if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
    throw new LildocsError(`Docs config "${name}" must be a non-empty string: ${configPath}`);
  }
}

function assertOptionalEnum(value: unknown, name: string, allowed: string[], configPath: string) {
  if (value !== undefined && !allowed.includes(String(value))) {
    throw new LildocsError(
      `Docs config "${name}" must be one of ${allowed.join(", ")}: ${configPath}`,
    );
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
