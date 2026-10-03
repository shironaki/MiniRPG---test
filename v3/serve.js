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

// A tiny inline favicon keeps the browser console clean in the live preview.
const FAVICON = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" fill="#16130f"/>' +
    '<path d="M16 6c3 5 6 7 6 12a6 6 0 0 1-12 0c0-5 3-7 6-12z" fill="#ff8a3a"/>' +
    '<path d="M16 14c1.4 2.4 2.6 3.4 2.6 5.6a2.6 2.6 0 0 1-5.2 0c0-2.2 1.2-3.2 2.6-5.6z" fill="#ffe0a0"/>' +
    "</svg>"
);

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/favicon.ico" || urlPath === "/favicon.svg") {
        res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "max-age=86400" });
        res.end(FAVICON);
        return;
    }
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
});

// A dev server must never die mid-session over a dropped socket.
server.on("clientError", (err, socket) => {
    if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});
process.on("uncaughtException", (err) => console.error("[serve] ", err.message));

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Пепел и Зерно (v3) → http://0.0.0.0:${PORT}`);
});
