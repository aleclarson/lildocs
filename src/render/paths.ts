function routeDir(route: string) {
  const index = route.lastIndexOf("/");
  return index === -1 ? "." : route.slice(0, index);
}

function normalizeRoute(route: string) {
  const parts: string[] = [];
  for (const part of route.split("/")) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  return parts.join("/");
}

export function relativeUrl(fromRoute: string, toRoute: string) {
  const fromParts =
    routeDir(fromRoute) === "." ? [] : routeDir(fromRoute).split("/");
  const toParts = normalizeRoute(toRoute).split("/");
  while (
    fromParts.length > 0 &&
    toParts.length > 0 &&
    fromParts[0] === toParts[0]
  ) {
    fromParts.shift();
    toParts.shift();
  }

  const relativeParts = [...fromParts.map(() => ".."), ...toParts];
  const relative = relativeParts.join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

export function rootRelativeUrl(route: string, target: string) {
  const dir = routeDir(route);
  const depth = dir === "." ? 0 : dir.split("/").length;
  const prefix =
    depth === 0 ? "." : Array.from({ length: depth }, () => "..").join("/");
  return `${prefix}/${target}`;
}
