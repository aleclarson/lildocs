import { access } from "node:fs/promises";
import path from "node:path";
import { LildocsError } from "./errors.js";
import type { AssetCopy } from "./markdown.js";

export type LogoOptions = {
  image?: string;
  text?: string;
  font?: string;
};

export type ResolvedLogo = {
  image?: string;
  text: string;
};

export type LogoResolution = {
  assets: AssetCopy[];
  css: string;
  logo: ResolvedLogo;
};

export async function resolveLogoOptions(options: {
  cwd: string;
  docsRoot: string;
  outDir: string;
  logo?: LogoOptions;
}): Promise<LogoResolution> {
  const assets: AssetCopy[] = [];
  const css: string[] = [];
  const logo: ResolvedLogo = {
    text: options.logo?.text ?? "Docs",
  };

  if (options.logo?.image) {
    logo.image = logoImageValue(options.logo.image, options, assets);
  }

  if (options.logo?.font) {
    const localFontPath = await resolveLocalFontPath(options.logo.font, options);
    if (localFontPath) {
      const family = "Lildocs Logo Font";
      assets.push({
        from: localFontPath,
        to: path.join(options.outDir, "assets", "fonts", path.basename(localFontPath)),
      });
      css.push(`@font-face {
  font-family: ${quoteCssString(family)};
  src: url("./fonts/${path.basename(localFontPath)}") format("${fontFormat(localFontPath)}");
  font-display: swap;
}`);
      css.push(`:root {
  --ld-font-logo: ${quoteCssString(family)};
}`);
    } else {
      css.push(`@import url("${googleFontsCssUrl(options.logo.font, "400;500;600;700")}");`);
      css.push(`:root {
  --ld-font-logo: ${quoteCssString(options.logo.font)};
}`);
    }
  }

  return {
    assets,
    css: css.length > 0 ? `${css.join("\n")}\n` : "",
    logo,
  };
}

function logoImageValue(
  value: string,
  options: {
    docsRoot: string;
    outDir: string;
  },
  assets: AssetCopy[],
) {
  const trimmed = value.trim();
  if (isRemoteImage(trimmed)) {
    return trimmed;
  }

  const source = path.resolve(options.docsRoot, trimmed);
  const assetRelativePath = path.relative(options.docsRoot, source).split(path.sep).join("/");
  assets.push({
    from: source,
    to: path.join(options.outDir, "assets", assetRelativePath),
  });
  return `assets/${assetRelativePath}`;
}

async function resolveLocalFontPath(
  value: string,
  options: {
    cwd: string;
    docsRoot: string;
  },
) {
  const candidates = [path.resolve(options.cwd, value), path.resolve(options.docsRoot, value)];
  const existingCandidates = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      exists: isFontFile(candidate) && (await exists(candidate)),
    })),
  );
  const existingCandidate = existingCandidates.find((candidate) => candidate.exists);
  if (existingCandidate) {
    return existingCandidate.candidate;
  }

  if (isFontFile(value) && path.basename(value) !== value) {
    throw new LildocsError(`Logo font file does not exist: ${value}`);
  }

  return undefined;
}

function isRemoteImage(value: string) {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("/");
}

function isFontFile(value: string) {
  return /\.(?:woff2?|ttf|otf)$/i.test(value);
}

function fontFormat(value: string) {
  const extension = path.extname(value).toLowerCase();
  if (extension === ".woff2") {
    return "woff2";
  }
  if (extension === ".woff") {
    return "woff";
  }
  if (extension === ".ttf") {
    return "truetype";
  }
  if (extension === ".otf") {
    return "opentype";
  }
  return "woff2";
}

function googleFontsCssUrl(fontName: string, weights: string) {
  const family = fontName.trim().replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
}

function quoteCssString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
