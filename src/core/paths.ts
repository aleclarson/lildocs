import path from "node:path";

export function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

export function isHiddenOrSystemPath(relativePath: string) {
  return toPosixPath(relativePath)
    .split("/")
    .some((part) => part.startsWith(".") || part === "node_modules" || part === ".DS_Store");
}

export function relativeUrl(fromRoute: string, toRoute: string) {
  const fromDir = path.posix.dirname(fromRoute);
  const relative = path.posix.relative(fromDir, toRoute);
  return relative.startsWith(".") ? relative : `./${relative}`;
}

export function pageDepth(route: string) {
  const dir = path.posix.dirname(route);
  return dir === "." ? 0 : dir.split("/").length;
}

export function rootRelativeUrl(route: string, target: string) {
  const prefix =
    pageDepth(route) === 0 ? "." : Array.from({ length: pageDepth(route) }, () => "..").join("/");
  return `${prefix}/${target}`;
}
