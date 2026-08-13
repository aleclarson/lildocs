import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LogoOptions } from "./logo.js";
import type {
  BackgroundOptions,
  FontOverrides,
  LinkOptions,
  NavigationOptions,
  ThemeConfig,
} from "./theme.js";
import { LildocsError } from "./errors.js";

export type DocsConfig = {
  $schema?: string;
  projectName?: string;
  theme?: ThemeConfig;
  font?: FontOverrides;
  favicon?: string;
  logo?: LogoOptions;
  background?: BackgroundOptions;
  link?: LinkOptions;
  navigation?: NavigationOptions & {
    order?: string[];
  };
  reference?: ReferenceOptions;
};

export type ReferenceOptions = {
  enabled?: boolean;
  packageJson?: string;
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
    throw new LildocsError(
      `Invalid docs config JSON at ${configPath}: ${errorMessage(error)}`,
    );
  }

  return validateDocsConfig(parsed, configPath);
}

export function mergeConfigOptions(options: {
  config: DocsConfig;
  theme?: ThemeConfig;
  fonts?: FontOverrides;
  favicon?: string;
  logo?: LogoOptions;
  background?: BackgroundOptions;
  link?: LinkOptions;
  navigation?: NavigationOptions;
}) {
  return {
    projectName: options.config.projectName,
    theme: options.theme ?? options.config.theme,
    fonts: {
      heading: options.fonts?.heading ?? options.config.font?.heading,
      body: options.fonts?.body ?? options.config.font?.body,
      code: options.fonts?.code ?? options.config.font?.code,
    },
    favicon: options.favicon ?? options.config.favicon,
    logo: {
      image: options.logo?.image ?? options.config.logo?.image,
      text: options.logo?.text ?? options.config.logo?.text,
      font: options.logo?.font ?? options.config.logo?.font,
    },
    background: {
      image: options.background?.image ?? options.config.background?.image,
      gradient:
        options.background?.gradient ?? options.config.background?.gradient,
      blendMode:
        options.background?.blendMode ?? options.config.background?.blendMode,
    },
    link: {
      underline: options.link?.underline ?? options.config.link?.underline,
    },
    reference: {
      enabled: options.config.reference?.enabled,
      packageJson: options.config.reference?.packageJson,
    },
    navigation: {
      transition:
        options.navigation?.transition ?? options.config.navigation?.transition,
      duration:
        options.navigation?.duration ?? options.config.navigation?.duration,
      easing: options.navigation?.easing ?? options.config.navigation?.easing,
      order: options.config.navigation?.order,
    },
  };
}

function validateDocsConfig(value: unknown, configPath: string): DocsConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LildocsError(`Docs config must be a JSON object: ${configPath}`);
  }

  const config = value as DocsConfig;
  assertOptionalString(config.$schema, "$schema", configPath);
  assertOptionalString(config.projectName, "projectName", configPath);
  assertOptionalThemeConfig(config.theme, configPath);
  assertOptionalString(config.favicon, "favicon", configPath);

  if (config.font !== undefined) {
    if (
      !config.font ||
      typeof config.font !== "object" ||
      Array.isArray(config.font)
    ) {
      throw new LildocsError(
        `Docs config "font" must be an object: ${configPath}`,
      );
    }
    assertOptionalString(config.font.heading, "font.heading", configPath);
    assertOptionalString(config.font.body, "font.body", configPath);
    assertOptionalString(config.font.code, "font.code", configPath);
  }

  if (config.logo !== undefined) {
    if (
      !config.logo ||
      typeof config.logo !== "object" ||
      Array.isArray(config.logo)
    ) {
      throw new LildocsError(
        `Docs config "logo" must be an object: ${configPath}`,
      );
    }
    assertOptionalString(config.logo.image, "logo.image", configPath);
    assertOptionalString(config.logo.text, "logo.text", configPath);
    assertOptionalString(config.logo.font, "logo.font", configPath);
  }

  if (config.background !== undefined) {
    if (
      !config.background ||
      typeof config.background !== "object" ||
      Array.isArray(config.background)
    ) {
      throw new LildocsError(
        `Docs config "background" must be an object: ${configPath}`,
      );
    }
    assertOptionalString(
      config.background.image,
      "background.image",
      configPath,
    );
    assertOptionalString(
      config.background.gradient,
      "background.gradient",
      configPath,
    );
    assertOptionalString(
      config.background.blendMode,
      "background.blendMode",
      configPath,
    );
  }

  if (config.link !== undefined) {
    if (
      !config.link ||
      typeof config.link !== "object" ||
      Array.isArray(config.link)
    ) {
      throw new LildocsError(
        `Docs config "link" must be an object: ${configPath}`,
      );
    }
    assertOptionalEnum(
      config.link.underline,
      "link.underline",
      ["always", "hover", "none"],
      configPath,
    );
  }

  if (config.navigation !== undefined) {
    if (
      !config.navigation ||
      typeof config.navigation !== "object" ||
      Array.isArray(config.navigation)
    ) {
      throw new LildocsError(
        `Docs config "navigation" must be an object: ${configPath}`,
      );
    }
    assertOptionalEnum(
      config.navigation.transition,
      "navigation.transition",
      ["fade", "slide", "scale", "instant"],
      configPath,
    );
    assertOptionalNumber(
      config.navigation.duration,
      "navigation.duration",
      configPath,
    );
    assertOptionalString(
      config.navigation.easing,
      "navigation.easing",
      configPath,
    );
    assertOptionalStringArray(
      config.navigation.order,
      "navigation.order",
      configPath,
    );
  }

  if (config.reference !== undefined) {
    if (
      !config.reference ||
      typeof config.reference !== "object" ||
      Array.isArray(config.reference)
    ) {
      throw new LildocsError(
        `Docs config "reference" must be an object: ${configPath}`,
      );
    }
    assertOptionalBoolean(
      config.reference.enabled,
      "reference.enabled",
      configPath,
    );
    assertOptionalString(
      config.reference.packageJson,
      "reference.packageJson",
      configPath,
    );
  }

  return {
    projectName: config.projectName,
    theme: config.theme,
    favicon: config.favicon,
    font: config.font
      ? {
          heading: config.font.heading,
          body: config.font.body,
          code: config.font.code,
        }
      : undefined,
    logo: config.logo
      ? {
          image: config.logo.image,
          text: config.logo.text,
          font: config.logo.font,
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
    reference: config.reference
      ? {
          enabled: config.reference.enabled,
          packageJson: config.reference.packageJson,
        }
      : undefined,
    navigation: config.navigation
      ? {
          transition: config.navigation.transition,
          duration: config.navigation.duration,
          easing: config.navigation.easing,
          order: config.navigation.order,
        }
      : undefined,
  };
}

function assertOptionalString(
  value: unknown,
  name: string,
  configPath: string,
) {
  if (
    value !== undefined &&
    (typeof value !== "string" || value.length === 0)
  ) {
    throw new LildocsError(
      `Docs config "${name}" must be a non-empty string: ${configPath}`,
    );
  }
}

function assertOptionalBoolean(
  value: unknown,
  name: string,
  configPath: string,
) {
  if (value !== undefined && typeof value !== "boolean") {
    throw new LildocsError(
      `Docs config "${name}" must be a boolean: ${configPath}`,
    );
  }
}

function assertOptionalThemeConfig(value: unknown, configPath: string) {
  if (value === undefined) {
    return;
  }
  if (typeof value === "string") {
    assertOptionalString(value, "theme", configPath);
    return;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LildocsError(
      `Docs config "theme" must be a string or an object: ${configPath}`,
    );
  }

  const theme = value as { light?: unknown; dark?: unknown };
  assertOptionalString(theme.light, "theme.light", configPath);
  assertOptionalString(theme.dark, "theme.dark", configPath);
}

function assertOptionalEnum(
  value: unknown,
  name: string,
  allowed: string[],
  configPath: string,
) {
  if (value !== undefined && !allowed.includes(String(value))) {
    throw new LildocsError(
      `Docs config "${name}" must be one of ${allowed.join(", ")}: ${configPath}`,
    );
  }
}

function assertOptionalNumber(
  value: unknown,
  name: string,
  configPath: string,
) {
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isFinite(value) || value < 0)
  ) {
    throw new LildocsError(
      `Docs config "${name}" must be a non-negative finite number: ${configPath}`,
    );
  }
}

function assertOptionalStringArray(
  value: unknown,
  name: string,
  configPath: string,
) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new LildocsError(
      `Docs config "${name}" must be an array: ${configPath}`,
    );
  }

  for (const [index, item] of value.entries()) {
    assertOptionalString(item, `${name}[${index}]`, configPath);
  }
}

function isMissingFileError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
