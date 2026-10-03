/**
 * v3 dev server — zero dependencies, serves the v3 folder at the root so the
 * live preview opens straight into «Пепел и Зерно».
 *
 *   node v3/serve.js [port]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || Number(process.argv[2]) || 3000;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const filePath = path.join(ROOT, rel);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end("Forbidden");
        return;
    }
    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
            return;
        }
        res.writeHead(200, {
            "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
            "Cache-Control": "no-cache"
        });
        fs.createReadStream(filePath).pipe(res);
    });
}).listen(PORT, "0.0.0.0", () => {
    console.log(`Пепел и Зерно (v3) → http://0.0.0.0:${PORT}`);
});
