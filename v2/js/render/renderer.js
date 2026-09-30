/**
 * v2 render — draws the tilemap, interactables and hero to a 2D canvas context.
 * Milestone 1 uses flat-colour tiles and a stylised hero; sprite sheets are
 * layered in later without changing callers. Only cull-visible tiles are drawn.
 */
class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.sprites = null; // optional SpriteSheets attached later
    }

    clear(w, h) {
        this.ctx.fillStyle = "#0d1017";
        this.ctx.fillRect(0, 0, w, h);
    }

    drawMap(tilemap, camera) {
        const ctx = this.ctx;
        const ts = tilemap.tileSize;
        const startCol = Math.max(0, tilemap.colAtPixel(camera.x));
        const endCol = Math.min(tilemap.colsCount - 1, tilemap.colAtPixel(camera.x + camera.viewW));
        const startRow = Math.max(0, tilemap.rowAtPixel(camera.y));
        const endRow = Math.min(tilemap.rowsCount - 1, tilemap.rowAtPixel(camera.y + camera.viewH));

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const info = tilemap.infoAt(col, row);
                const sx = Math.round(col * ts - camera.x);
                const sy = Math.round(row * ts - camera.y);
                ctx.fillStyle = info.color || "#101319";
                ctx.fillRect(sx, sy, ts, ts);
                // Simple texture accents.
                if (info.name === "tree") {
                    ctx.fillStyle = "#2e6b39";
                    ctx.beginPath();
                    ctx.arc(sx + ts / 2, sy + ts / 2, ts * 0.38, 0, Math.PI * 2);
                    ctx.fill();
                } else if (info.name === "house") {
                    ctx.fillStyle = "#5c3a25";
                    ctx.fillRect(sx + 2, sy + ts * 0.45, ts - 4, ts * 0.55 - 2);
                    ctx.fillStyle = "#c0472b";
                    ctx.beginPath();
                    ctx.moveTo(sx, sy + ts * 0.5);
                    ctx.lineTo(sx + ts / 2, sy + 3);
                    ctx.lineTo(sx + ts, sy + ts * 0.5);
                    ctx.closePath();
                    ctx.fill();
                } else if (info.name === "water") {
                    ctx.fillStyle = "rgba(255,255,255,0.10)";
                    ctx.fillRect(sx + 4, sy + 6, ts - 8, 3);
                }
            }
        }
    }

    drawInteractables(list, camera) {
        const ctx = this.ctx;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "22px serif";
        for (const it of list) {
            const s = camera.worldToScreen(it.px, it.py);
            // marker plate
            ctx.fillStyle = "rgba(13,16,23,0.55)";
            ctx.beginPath();
            ctx.arc(s.x, s.y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillText(it.emoji || "❔", s.x, s.y + 1);
        }
    }

    drawPlayer(player, camera) {
        const ctx = this.ctx;
        const s = camera.worldToScreen(player.x, player.y);
        const cx = s.x + player.w / 2;
        const cy = s.y + player.h / 2;

        // shadow
        ctx.fillStyle = "rgba(0,0,0,0.30)";
        ctx.beginPath();
        ctx.ellipse(cx, s.y + player.h, player.w * 0.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // body — a subtle bob while walking
        const bob = player.moving ? (player.frame % 2 === 0 ? 0 : 2) : 0;
        ctx.fillStyle = "#e8d8b0";
        ctx.fillRect(s.x, s.y - bob, player.w, player.h);
        ctx.fillStyle = "#6a4bd8";
        ctx.fillRect(s.x, s.y + player.h * 0.5 - bob, player.w, player.h * 0.5);

        // facing indicator (eyes / direction dot)
        ctx.fillStyle = "#1a1030";
        let ex = cx, ey = cy - bob;
        if (player.facing === "up") ey = s.y + 3 - bob;
        else if (player.facing === "down") ey = s.y + player.h * 0.45 - bob;
        else if (player.facing === "left") ex = s.x + 3;
        else if (player.facing === "right") ex = s.x + player.w - 3;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Renderer };
