import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { isWithin } from "./paths.mjs";
const root = resolve("site");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const file = resolve(root, "." + pathname);
    if (!isWithin(root, file)) {
      res.writeHead(403).end();
      return;
    }
    const target = file === root ? resolve(root, "index.html") : file;
    const bytes = await readFile(target);
    res
      .writeHead(200, {
        "Content-Type": types[extname(target)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(bytes);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("Market Town: http://127.0.0.1:4173"),
);
