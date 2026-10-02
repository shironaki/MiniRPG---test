/*
 * v2 building art — proper multi-tile structures drawn from explicit footprint
 * metadata (NOT guessed from neighbours), so roofs always align. Each type has
 * its own look: house, shop (awning + sign), forge (chimney + glowing forge),
 * and gate (a stone archway with a glowing trial portal — no roof to "slide").
 *
 * API:
 *   BuildingArt.draw(ctx, type, sx, sy, wTiles, hTiles, ts, now)
 */
(function (global) {
    "use strict";

    // ---- pixel grid helpers (art resolution = 16 px per tile) ---------------
    const U = 16;
    function blank(W, H) { const g = []; for (let y = 0; y < H; y++) g.push(new Array(W).fill(null)); return g; }
    function rect(g, x, y, w, h, c) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const yy = (y + j) | 0, xx = (x + i) | 0;
            if (g[yy] && xx >= 0 && xx < g[0].length) g[yy][xx] = c;
        }
    }
    function px(g, x, y, c) { x |= 0; y |= 0; if (g[y] && x >= 0 && x < g[0].length) g[y][x] = c; }

    const COLORS = {
        house: {
            type: "house", roof: "#c0472b", roofSh: "#8f3320", ridge: "#d9694e",
            wall: "#d8b78a", wallSh: "#b8946a", door: "#5c3a20", win: "#8fd0e0",
            chimney: "#6d6a63", chimneyTop: "#4c4944"
        },
        shop: {
            type: "shop", roof: "#2f8f8f", roofSh: "#1f6b6b", ridge: "#46b0b0",
            wall: "#e6cd9f", wallSh: "#c3a877", door: "#4a3320", win: "#ffe08a",
            awn1: "#d8452f", awn2: "#f0ede0", sign: "#caa24a",
            chimney: "#5c554d", chimneyTop: "#3a352f"
        },
        forge: {
            type: "forge", roof: "#3f3833", roofSh: "#2a2521", ridge: "#574d45",
            wall: "#7a7168", wallSh: "#5c554d", door: "#3a2a18",
            doorGlow: "#ff8a3a", win: "#ffb24a", winFrame: "#4a4038",
            chimney: "#5c554d", chimneyTop: "#3a352f",
        },
    };

    // ---- shared house/shop/forge structure ----------------------------------
    function structure(W, H, c) {
        const g = blank(W, H);
        const roofH = Math.max(6, Math.round(H * 0.44));
        // trapezoid roof (overhanging eaves, narrow ridge)
        for (let y = 0; y < roofH; y++) {
            const t = y / (roofH - 1 || 1);
            const inset = Math.round((1 - t) * W * 0.16);
            rect(g, inset, y, W - 2 * inset, 1, c.roof);
        }
        rect(g, Math.round(W * 0.16), 0, W - 2 * Math.round(W * 0.16),
            Math.max(1, Math.round(roofH * 0.20)), c.ridge);   // sunlit ridge
        rect(g, 0, roofH - 1, W, 1, c.roofSh);                 // eave shadow
        for (let x = 2; x < W; x += 3)
            for (let y = Math.round(roofH * 0.32); y < roofH - 1; y++)
                if ((x + y) % 3 === 0) px(g, x, y, c.roofSh);   // shingles

        // chimneys
        if (c.chimney) {
            const cx = c.type === "house" ? Math.round(W * 0.22) : Math.round(W * 0.68);
            const cw = Math.max(3, Math.round(W * 0.10));
            rect(g, cx, 0, cw, Math.round(roofH * 0.65), c.chimney);
            rect(g, cx - 1, 0, cw + 2, 1, c.chimneyTop || "#3a352f");
        }

        // walls
        const wy = roofH, wIn = Math.max(1, Math.round(W * 0.06));
        rect(g, wIn, wy, W - 2 * wIn, H - wy, c.wall);
        rect(g, wIn, H - 2, W - 2 * wIn, 2, c.wallSh);
        for (let y = wy + 3; y < H - 1; y += 4) rect(g, wIn + 1, y, W - 2 * wIn - 2, 1, c.wallSh);

        // door
        const dw = Math.max(4, Math.round(W * 0.2)), dh = Math.round((H - wy) * 0.66);
        const dx = Math.round(W / 2 - dw / 2);
        rect(g, dx, H - dh, dw, dh, c.door);
        rect(g, dx, H - dh, dw, 1, c.doorTop || c.wallSh);
        if (c.doorGlow) { rect(g, dx + 1, H - dh + 1, dw - 2, dh - 1, c.doorGlow); px(g, dx + 1, H - Math.round(dh / 2), "#fff2c0"); }
        else px(g, dx + dw - 2, H - Math.round(dh / 2), "#e8c84a"); // knob

        // lantern bracket by the door
        rect(g, dx - 3, H - dh + 2, 2, 3, "#3a3834");
        px(g, dx - 2, H - dh + 3, "#ffdf80");

        // windows & flower boxes
        const winY = wy + Math.round((H - wy) * 0.16), ws = Math.max(3, Math.round(W * 0.13));
        function window_(x) {
            rect(g, x, winY, ws, ws, c.winFrame || "#5c3a20");
            rect(g, x + 1, winY + 1, ws - 2, ws - 2, c.win);
            rect(g, x + 1, winY + 1, Math.max(1, (ws - 2) >> 1), 1, "#ffffff");
            // wooden flower box under the window
            if (c.type === "house" || c.type === "shop") {
                rect(g, x - 1, winY + ws, ws + 2, 2, "#6d4b29");
                rect(g, x, winY + ws - 1, ws, 1, "#3f8c35"); // greenery
                px(g, x, winY + ws - 1, "#d83a56");           // red blossom
                px(g, x + ws - 1, winY + ws - 1, "#ffd240"); // yellow blossom
            }
        }
        window_(Math.round(W * 0.16));
        window_(Math.round(W * 0.84 - ws));

        // type extras
        if (c.type === "shop") {
            // Striped awning above the entrance door
            const aw = Math.round(W * 0.44), ax = Math.round(W / 2 - aw / 2), ay = wy + Math.round((H - wy) * 0.04);
            for (let i = 0; i < aw; i++) rect(g, ax + i, ay, 1, 4, (i % 2 ? c.awn2 : c.awn1));
            rect(g, ax, ay + 4, aw, 1, c.roofSh);
            // Signboard centered directly above the entrance awning (not over windows!)
            const sw = Math.max(12, Math.round(W * 0.28)), sh = 6;
            const sx = Math.round((W - sw) / 2), sy = Math.max(0, wy - 4);
            rect(g, sx, sy, sw, sh, "#422810"); // dark wood border
            rect(g, sx + 1, sy + 1, sw - 2, sh - 2, c.sign); // golden face
            rect(g, sx + Math.round(sw * 0.35), sy + 2, Math.max(1, Math.round(sw * 0.3)), 2, "#422810"); // glyph
            px(g, sx + Math.round(sw * 0.5), sy + 3, "#ffd700");
        }
        return g;
    }

    // ---- trial gate: stone arch + glowing portal ----------------------------
    function gate(W, H) {
        const g = blank(W, H);
        const stone = "#8a8272", stoneSh = "#655f52", stoneHi = "#a9a08c", dark = "#171325";
        const pw = Math.max(3, Math.round(W * 0.22));
        const top = Math.round(H * 0.1);
        // pillars
        rect(g, 0, top, pw, H - top, stone);
        rect(g, W - pw, top, pw, H - top, stone);
        rect(g, 0, top, 1, H - top, stoneHi);
        rect(g, W - 1, top, 1, H - top, stoneSh);
        // capitals
        rect(g, -1, top - 2, pw + 2, 3, stone);
        rect(g, W - pw - 1, top - 2, pw + 2, 3, stone);
        // lintel / arch band
        rect(g, 0, 0, W, top, stone);
        rect(g, 0, 0, W, 1, stoneHi);
        rect(g, 0, top - 1, W, 1, stoneSh);
        // block lines
        for (let y = top + 2; y < H; y += 5) { rect(g, 0, y, pw, 1, stoneSh); rect(g, W - pw, y, pw, 1, stoneSh); }
        // portal opening (glow filled animated in draw())
        rect(g, pw, top, W - 2 * pw, H - top, dark);
        return g;
    }

    // Build the pixel grid for a building of wTiles×hTiles (art res = ×16).
    function compose(type, wTiles, hTiles) {
        const W = wTiles * U, H = hTiles * U;
        const grid = type === "gate" ? gate(W, H) : structure(W, H, COLORS[type] || COLORS.house);
        return { w: W, h: H, grid };
    }

    // ---- offscreen cache + draw --------------------------------------------
    const _cache = new Map();
    function offscreen(type, W, H) {
        const key = type + "|" + W + "|" + H;
        const hit = _cache.get(key);
        if (hit !== undefined) return hit;
        const grid = type === "gate" ? gate(W, H) : structure(W, H, COLORS[type] || COLORS.house);
        let cv = null;
        if (typeof document !== "undefined") {
            cv = document.createElement("canvas");
            cv.width = W; cv.height = H;
            const c = cv.getContext("2d");
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
                if (grid[y][x]) { c.fillStyle = grid[y][x]; c.fillRect(x, y, 1, 1); }
        }
        _cache.set(key, cv);
        return cv;
    }

    function draw(ctx, type, sx, sy, wTiles, hTiles, ts, now, night) {
        const W = wTiles * U, H = hTiles * U;
        const cv = offscreen(type, W, H);
        const dw = wTiles * ts, dh = hTiles * ts;
        if (cv) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(cv, sx, sy, dw, dh);
        }
        // ---- windows glow warm at night (house/shop) ----
        night = night || 0;
        if (night > 0.06 && (type === "house" || type === "shop")) {
            const wallTop = dh * 0.44;
            const winY = sy + wallTop + (dh - wallTop) * 0.16;
            const ws = dw * 0.13;
            const xs = [sx + dw * 0.16, sx + dw * 0.84 - ws];
            const a = Math.min(1, night) * 0.85;
            for (const x of xs) {
                ctx.fillStyle = `rgba(255,214,120,${a})`;
                ctx.fillRect(x, winY, ws, ws);
                ctx.fillStyle = `rgba(255,224,150,${a * 0.28})`;
                ctx.fillRect(x - ws * 0.4, winY - ws * 0.4, ws * 1.8, ws * 1.8); // soft halo
            }
        }
        // ---- animated overlays (drawn live, not cached) ----
        now = now || 0;
        if (type === "forge" || type === "house" || type === "shop") {
            const cx = sx + (type === "house" ? dw * 0.26 : (type === "shop" ? dw * 0.72 : dw * 0.72));
            const base = sy + dh * 0.08;
            const puffs = type === "forge" ? 3 : 2;
            for (let i = 0; i < puffs; i++) {
                const speed = type === "forge" ? 900 : 1300;
                const t = ((now / speed) + i / puffs) % 1;
                const alpha = (type === "forge" ? 0.32 : 0.22) * (1 - t);
                ctx.fillStyle = type === "forge" ? `rgba(180,180,190,${alpha})` : `rgba(235,235,245,${alpha})`;
                ctx.beginPath();
                ctx.arc(cx + Math.sin(now / 500 + i * 2) * dw * 0.04 + (t * dw * 0.08),
                    base - t * dh * 0.45,
                    dw * (0.04 + t * 0.05), 0, Math.PI * 2);
                ctx.fill();
            }
            // Door lantern glow at night
            if (night > 0.1) {
                const dwVal = Math.max(4, Math.round(W * 0.2));
                const dxVal = Math.round(W / 2 - dwVal / 2);
                const lx = sx + (dxVal - 2) * (dw / W);
                const ly = sy + dh * 0.75;
                ctx.fillStyle = `rgba(255,220,130,${Math.min(1, night) * 0.5})`;
                ctx.beginPath();
                ctx.arc(lx, ly, dw * 0.08, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === "gate") {
            const pw = 0.22 * dw, top = 0.1 * dh;
            const cx = sx + dw / 2, cy = sy + top + (dh - top) / 2;
            const pulse = 0.45 + 0.25 * Math.sin(now / 500);
            const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, dw * 0.4);
            grd.addColorStop(0, `rgba(150,110,235,${0.7 * pulse + 0.2})`);
            grd.addColorStop(0.6, `rgba(90,70,190,${0.4 * pulse})`);
            grd.addColorStop(1, "rgba(30,20,60,0)");
            ctx.fillStyle = grd;
            ctx.fillRect(sx + pw, sy + top, dw - 2 * pw, dh - top);
            // sparkles
            for (let i = 0; i < 3; i++) {
                const a = now / 600 + i * 2.1;
                ctx.fillStyle = `rgba(220,205,255,${0.5 + 0.4 * Math.sin(a * 1.7)})`;
                ctx.fillRect(cx + Math.sin(a) * dw * 0.12, cy + Math.cos(a * 1.3) * dh * 0.22, 2, 2);
            }
        }
    }

    const BuildingArt = { draw, compose };
    global.BuildingArt = BuildingArt;
    if (typeof module !== "undefined" && module.exports) module.exports = { BuildingArt };
})(typeof window !== "undefined" ? window : globalThis);
