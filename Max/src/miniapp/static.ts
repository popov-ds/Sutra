import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type http from "node:http";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

export function miniAppDistDir(): string {
  return path.join(process.cwd(), "dist", "miniapp-web");
}

export async function serveMiniApp(res: http.ServerResponse, urlPath: string): Promise<void> {
  const base = miniAppDistDir();
  const rel =
    urlPath === "/miniapp" || urlPath === "/miniapp/"
      ? "index.html"
      : urlPath.replace(/^\/miniapp\/?/, "") || "index.html";
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base)) {
    res.writeHead(403);
    res.end();
    return;
  }
  let target = file;
  try {
    const st = await fsPromises.stat(target);
    if (st.isDirectory()) target = path.join(target, "index.html");
  } catch {
    target = path.join(base, "index.html");
  }
  if (!fs.existsSync(target)) {
    res.writeHead(404);
    res.end("Mini App not built. Run: npm run build:miniapp");
    return;
  }
  const ext = path.extname(target);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  fs.createReadStream(target).pipe(res);
}