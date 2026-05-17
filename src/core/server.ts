import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".eot", "application/vnd.ms-fontobject"],
]);

export async function serveStaticFile(req: IncomingMessage, res: ServerResponse, outDir: string) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }

  const pathname = requestPathname(req);
  if (!pathname) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(outDir, relativePath);
  if (!isInside(outDir, filePath)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  if (!fileStat.isFile()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  res.writeHead(200, {
    "content-length": fileStat.size,
    "content-type":
      MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
}

function requestPathname(req: IncomingMessage) {
  try {
    return decodeURIComponent(new URL(req.url ?? "/", "http://lildocs.local").pathname);
  } catch {
    return undefined;
  }
}

function isInside(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
