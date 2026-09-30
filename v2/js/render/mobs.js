/*
 * v2 pixel mob rig — enemies drawn from code in the same layered pixel style as
 * the hero (no sprite images). Each creature is stamped as a colour grid, gets a
 * 1px auto-outline, and a short idle/walk animation. Palettes are data, so mobs
 * are trivially recolourable and new variants are cheap.
 *
 * API:
 *   MobRig.compose(kind, frame, facingLeft) -> { w, h, grid }  grid[y][x]="#hex"|null
 *   MobRig.draw(ctx, { x, y, H, kind, facing, moving, phase, now })
 *   MobRig.heightScale(kind) -> multiplier applied to enemy.h for a nice size
 */
(function (global) {
    "use strict";

    const PAL = {
        goblin: {
            skin: "#6fae4c", skinSh: "#4d7f33", eye: "#d24b3a",
            cloth: "#7a5230", clothSh: "#523517", tooth: "#eef0e0",
            outline: "#1b2712",
        },
        skeleton: {
            bone: "#e9e7d6", boneSh: "#b3b09a", socket: "#23212a",
            outline: "#1d1b17",
        },
        wolf: {
            fur: "#8b909b", furSh: "#5e626d", belly: "#c9ced6",
            eye: "#e6b23a", nose: "#1c1e26", outline: "#191b21",
        },
    };

    // ---- grid helpers (grids store hex colours directly, null = empty) -------
    function blank(w, h) {
        const g = [];
        for (let y = 0; y < h; y++) g.push(new Array(w).fill(null));
        return g;
    }
    function rect(g, x, y, w, h, c) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const yy = y + j, xx = x + i;
            if (g[yy] && xx >= 0 && xx < g[0].length) g[yy][xx] = c;
        }
    }
    function px(g, x, y, c) { if (g[y] && x >= 0 && x < g[0].length) g[y][x] = c; }

    function outline(g, oc) {
        const h = g.length, w = g[0].length;
        const out = g.map(r => r.slice());
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (g[y][x]) continue;
            if ((y > 0 && g[y - 1][x]) || (y < h - 1 && g[y + 1][x]) ||
                (x > 0 && g[y][x - 1]) || (x < w - 1 && g[y][x + 1])) out[y][x] = oc;
        }
        return out;
    }

    // ---- builders -----------------------------------------------------------
    function buildGoblin(frame) {
        const W = 16, H = 22, g = blank(W, H), p = PAL.goblin;
        const step = frame % 2; // 0/1 leg swap
        // ears (pointy, out to the sides)
        px(g, 2, 8, p.skin); px(g, 3, 9, p.skin); px(g, 3, 8, p.skin);
        px(g, 13, 8, p.skin); px(g, 12, 9, p.skin); px(g, 12, 8, p.skin);
        // head
        rect(g, 4, 4, 8, 7, p.skin);
        rect(g, 4, 10, 8, 1, p.skinSh);
        // brow + eyes
        rect(g, 5, 7, 3, 1, p.skinSh); rect(g, 8, 7, 3, 1, p.skinSh);
        px(g, 6, 8, p.eye); px(g, 9, 8, p.eye);
        // grin + tooth
        rect(g, 6, 10, 4, 1, p.outline);
        px(g, 7, 10, p.tooth); px(g, 9, 11, p.tooth);
        // torso
        rect(g, 5, 12, 6, 4, p.skin);
        rect(g, 5, 12, 6, 1, p.skinSh);
        // loincloth
        rect(g, 5, 16, 6, 2, p.cloth);
        rect(g, 5, 17, 6, 1, p.clothSh);
        // arms
        rect(g, 3, 12, 2, 4, p.skin); rect(g, 11, 12, 2, 4, p.skin);
        // legs (swap)
        rect(g, 5, 18, 2, 3 + (step ? 0 : 1), p.skin);
        rect(g, 9, 18, 2, 3 + (step ? 1 : 0), p.skin);
        return { w: W, h: H, grid: outline(g, p.outline) };
    }

    function buildSkeleton(frame) {
        const W = 16, H = 24, g = blank(W, H), p = PAL.skeleton;
        const step = frame % 2;
        // skull
        rect(g, 5, 3, 6, 6, p.bone);
        rect(g, 5, 8, 6, 1, p.boneSh);
        px(g, 6, 5, p.socket); px(g, 9, 5, p.socket); // eye sockets
        px(g, 6, 6, p.socket); px(g, 9, 6, p.socket);
        px(g, 7, 7, p.socket); px(g, 8, 7, p.socket); // nose
        // jaw teeth
        px(g, 6, 8, p.bone); px(g, 8, 8, p.bone); px(g, 10, 8, p.bone);
        // spine
        rect(g, 7, 10, 2, 8, p.bone);
        // ribs
        for (let r = 0; r < 3; r++) {
            const ry = 11 + r * 2;
            rect(g, 4, ry, 3, 1, p.bone); rect(g, 9, ry, 3, 1, p.bone);
        }
        // arm bones
        rect(g, 3, 10, 1, 6, p.bone); rect(g, 12, 10, 1, 6, p.bone);
        px(g, 3, 16, p.boneSh); px(g, 12, 16, p.boneSh);
        // pelvis
        rect(g, 5, 18, 6, 1, p.bone);
        // leg bones (swap)
        rect(g, 5, 19, 2, 3 + (step ? 0 : 1), p.bone);
        rect(g, 9, 19, 2, 3 + (step ? 1 : 0), p.bone);
        return { w: W, h: H, grid: outline(g, p.outline) };
    }

    function buildWolf(frame) {
        const W = 20, H = 15, g = blank(W, H), p = PAL.wolf;
        const step = frame % 2;
        // tail
        rect(g, 1, 4, 4, 2, p.fur); px(g, 1, 3, p.fur);
        // body
        rect(g, 4, 4, 11, 5, p.fur);
        rect(g, 4, 8, 11, 1, p.belly);
        // haunch
        rect(g, 4, 3, 4, 2, p.fur);
        // head (right side)
        rect(g, 14, 3, 5, 5, p.fur);
        rect(g, 18, 5, 2, 2, p.fur);       // snout
        px(g, 19, 6, p.nose);              // nose
        px(g, 17, 5, p.eye);               // eye
        // ear
        px(g, 15, 1, p.fur); px(g, 15, 2, p.fur); px(g, 16, 2, p.fur);
        // legs (front pair + back pair, alternate)
        const a = step ? 0 : 1, b = step ? 1 : 0;
        rect(g, 5, 9, 2, 4 + a, p.furSh);   // back-far
        rect(g, 8, 9, 2, 4 + b, p.fur);     // back-near
        rect(g, 13, 9, 2, 4 + b, p.furSh);  // front-far
        rect(g, 16, 9, 2, 4 + a, p.fur);    // front-near
        return { w: W, h: H, grid: outline(g, p.outline) };
    }

    const BUILDERS = { goblin: buildGoblin, skeleton: buildSkeleton, wolf: buildWolf };
    const HEIGHT_SCALE = { goblin: 1.9, skeleton: 2.1, wolf: 1.5 };

    function heightScale(kind) { return HEIGHT_SCALE[kind] || 2.0; }

    function compose(kind, frame, facingLeft) {
        const build = BUILDERS[kind] || BUILDERS.goblin;
        return build(frame | 0);
    }

    // ---- draw with offscreen cache ------------------------------------------
    const _cache = new Map();
    function offscreen(kind, frame, key) {
        const hit = _cache.get(key);
        if (hit) return hit;
        const { w, h, grid } = compose(kind, frame);
        let cv = null;
        if (typeof document !== "undefined") {
            cv = document.createElement("canvas");
            cv.width = w; cv.height = h;
            const c = cv.getContext("2d");
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
                if (grid[y][x]) { c.fillStyle = grid[y][x]; c.fillRect(x, y, 1, 1); }
        }
        _cache.set(key, { cv, w, h });
        if (_cache.size > 64) _cache.delete(_cache.keys().next().value);
        return { cv, w, h };
    }

    function draw(ctx, o) {
        const kind = o.kind || "goblin";
        const moving = !!o.moving;
        const frame = moving ? (Math.floor((o.phase || 0) / (Math.PI / 2)) % 2) : 0;
        const key = kind + "|" + frame;
        const { cv, w, h } = offscreen(kind, frame, key);
        if (!cv) return;
        const scale = o.H / h;
        const drawW = w * scale, drawH = h * scale;
        // wolves face left by default (head on the right) -> flip when moving right
        const flip = kind === "wolf" ? o.facing === "right" : o.facing === "left";
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(o.x, o.y);
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(cv, -drawW / 2, -drawH, drawW, drawH);
        ctx.restore();
    }

    const MobRig = { compose, draw, heightScale, PAL };
    global.MobRig = MobRig;
    if (typeof module !== "undefined" && module.exports) module.exports = { MobRig };
})(typeof window !== "undefined" ? window : globalThis);
