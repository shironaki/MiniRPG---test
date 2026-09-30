"use strict";

/**
 * Tiny zero-dependency static file server for local play and live preview.
 * Binds to 0.0.0.0 so it works inside sandboxed preview environments.
 *
 *   node scripts/serve.js [port]
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || Number(process.argv[2]) || 8080;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
    try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        let rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
        let filePath = path.join(ROOT, rel);

        // Prevent path traversal outside the project root.
        if (!filePath.startsWith(ROOT)) {
            res.writeHead(403).end("Forbidden");
            return;
        }

        const serveFile = (fp) => {
            const ext = path.extname(fp).toLowerCase();
            res.writeHead(200, {
                "Content-Type": MIME[ext] || "application/octet-stream",
                "Cache-Control": "no-cache"
            });
            fs.createReadStream(fp).pipe(res);
        };

        fs.stat(filePath, (err, stat) => {
            if (!err && stat.isFile()) {
                serveFile(filePath);
                return;
            }
            // Directory (with or without trailing slash) → serve its index.html.
            if (!err && stat.isDirectory()) {
                const indexPath = path.join(filePath, "index.html");
                fs.stat(indexPath, (e2, s2) => {
                    if (!e2 && s2.isFile()) serveFile(indexPath);
                    else { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("404 Not Found"); }
                });
                return;
            }
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
        });
    } catch (e) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Internal Server Error");
    }
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Mini RPG served at http://0.0.0.0:${PORT}`);
});
