/** Relative URL helpers for directory-style route paths (`/guide/intro`). */

function segments(path: string) {
  return path.split("/").filter(Boolean);
}

/**
 * URL from one page to another, relative to the page's directory. Links use
 * `index.html` paths so they keep working when opened from the filesystem.
 */
export function relativeUrl(fromRoute: string, toRoute: string) {
  const from = segments(fromRoute);
  const to = [...segments(toRoute), "index.html"];
  while (from.length > 0 && to.length > 0 && from[0] === to[0]) {
    from.shift();
    to.shift();
  }

  const parts = [...from.map(() => ".."), ...to];
  const relative = parts.join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

/** URL from a page to a root-relative target such as `assets/lildocs.css`. */
export function rootRelativeUrl(fromRoute: string, target: string) {
  const depth = segments(fromRoute).length;
  const prefix = "../".repeat(depth) || "./";
  return `${prefix}${target}`;
}

/** URL of a route's plain-Markdown sibling, relative to its page. */
export function markdownUrl(route: string) {
  const name = route === "/" ? "index" : (segments(route).at(-1) ?? "index");
  return route === "/" ? `./${name}.md` : `../${name}.md`;
}

/** Strip the app basename from a URL pathname. */
export function stripBasename(pathname: string, basename: string) {
  if (basename === "/") {
    return pathname;
  }
  if (pathname === basename) {
    return "/";
  }
  if (pathname.startsWith(`${basename}/`)) {
    return pathname.slice(basename.length) || "/";
  }
  return pathname;
}
