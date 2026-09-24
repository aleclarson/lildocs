import path from "node:path";

export function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

export function isHiddenOrSystemPath(relativePath: string) {
  return toPosixPath(relativePath)
    .split("/")
    .some(
      (part) =>
        part.startsWith(".") || part === "node_modules" || part === ".DS_Store",
    );
}

/**
 * URL from one route to another, relative to the source page's directory.
 * Routes are directory-style app paths such as `/guide/intro`.
 */
export function relativeUrl(fromRoute: string, toRoute: string) {
  const file = toRoute === "/" ? "index.html" : `${toRoute}/index.html`;
  const relative = path.posix.relative(fromRoute, file);
  return relative.startsWith(".") ? relative : `./${relative}`;
}

/** URL of a route's plain-Markdown sibling, relative to its page. */
export function markdownUrl(route: string) {
  const name = route === "/" ? "index" : (route.split("/").pop() ?? "index");
  return route === "/" ? `./${name}.md` : `../${name}.md`;
}

export function isExternalOrAnchorUrl(href: string) {
  return (
    /^(?:[a-z]+:)?\/\//i.test(href) ||
    href.startsWith("#") ||
    href.startsWith("mailto:")
  );
}

export function resolveMarkdownDocumentPath(
  fromRelativePath: string,
  href: string,
) {
  if (isExternalOrAnchorUrl(href)) {
    return undefined;
  }

  const [hrefPath] = href.split("#");
  if (!hrefPath?.toLowerCase().endsWith(".md")) {
    return undefined;
  }

  return path.posix.normalize(
    path.posix.join(
      path.posix.dirname(fromRelativePath),
      hrefPath.replace(/\\/g, "/"),
    ),
  );
}

export function pageDepth(route: string) {
  return route.split("/").filter(Boolean).length;
}

export function rootRelativeUrl(route: string, target: string) {
  const prefix = "../".repeat(pageDepth(route)) || "./";
  return `${prefix}${target}`;
}
