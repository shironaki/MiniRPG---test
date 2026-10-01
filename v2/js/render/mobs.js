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
        cat: {
            fur: "#d87a2a", furSh: "#a85018", belly: "#f5eee6",
            eye: "#38b058", nose: "#f090a0", outline: "#2a1a0e"
        },
        chicken: {
            body: "#f5f2eb", bodySh: "#d4cdbe", comb: "#d83a3a",
            beak: "#f0a828", outline: "#2d2b28"
        },
        duck: {
            head: "#2e8b57", bill: "#f0c030", neck: "#f0f0f0",
            body: "#6b5440", bodySh: "#4e3a2a", spec: "#3a68b0", outline: "#1a261c"
        }
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
        const W = 22, H = 16, g = blank(W, H), p = PAL.wolf;
        const step = frame % 2;
        // bushy raised tail (left)
        rect(g, 0, 3, 3, 4, p.furSh);
        px(g, 1, 2, p.furSh); px(g, 2, 2, p.fur);
        rect(g, 2, 4, 2, 3, p.fur);
        // body
        rect(g, 4, 6, 11, 4, p.fur);
        rect(g, 4, 6, 11, 1, p.furSh);      // darker back/saddle
        rect(g, 5, 9, 9, 1, p.belly);       // light belly
        // haunch (back), a bit taller
        rect(g, 3, 5, 4, 4, p.fur);
        rect(g, 3, 5, 4, 1, p.furSh);
        // neck up to head (head on the right)
        rect(g, 14, 4, 4, 5, p.fur);
        // head + muzzle
        rect(g, 16, 4, 4, 4, p.fur);
        rect(g, 19, 6, 3, 2, p.fur);        // muzzle points right
        px(g, 21, 7, p.nose);               // nose
        px(g, 21, 6, p.furSh);
        px(g, 18, 6, p.eye);                // eye
        // upright ears (two triangles)
        px(g, 15, 2, p.furSh); px(g, 15, 3, p.fur); px(g, 16, 3, p.fur);
        px(g, 18, 2, p.furSh); px(g, 18, 3, p.fur); px(g, 17, 3, p.fur);
        // legs: back pair + front pair, alternating for a trot
        const a = step ? 1 : 0, b = step ? 0 : 1;
        // back legs
        rect(g, 5, 10, 2, 4 + a, p.furSh); px(g, 5, 13 + a, p.nose);
        rect(g, 8, 10, 2, 4 + b, p.fur); px(g, 8, 13 + b, p.nose);
        // front legs
        rect(g, 13, 10, 2, 4 + b, p.furSh); px(g, 13, 13 + b, p.nose);
        rect(g, 16, 10, 2, 4 + a, p.fur); px(g, 16, 13 + a, p.nose);
        return { w: W, h: H, grid: outline(g, p.outline) };
    }

    function buildCat(frame) {
        const W = 16, H = 14, g = blank(W, H), p = PAL.cat;
        const step = frame % 2;
        // Tail (curling up at the back)
        px(g, 1, 6 - step, p.fur); px(g, 2, 7 - step, p.fur); px(g, 3, 8, p.fur);
        // Body
        rect(g, 4, 6, 8, 5, p.fur);
        rect(g, 5, 6, 2, 3, p.furSh); // stripe
        rect(g, 8, 6, 2, 3, p.furSh); // stripe
        rect(g, 6, 9, 5, 2, p.belly); // white belly/chest
        // Head
        rect(g, 11, 4, 4, 5, p.fur);
        px(g, 11, 2, p.fur); px(g, 12, 3, p.fur); // left ear
        px(g, 14, 2, p.fur); px(g, 13, 3, p.fur); // right ear
        px(g, 13, 5, p.eye); // green eye
        px(g, 14, 6, p.nose); // pink nose
        // Paws
        rect(g, 4, 11, 2, 2, step ? p.belly : p.fur);
        rect(g, 7, 11, 2, 2, step ? p.fur : p.belly);
        rect(g, 10, 11, 2, 2, p.belly);
        return { w: W, h: H, grid: outline(g, p.outline) };
    }

    function buildChicken(frame) {
        const W = 14, H = 14, g = blank(W, H), p = PAL.chicken;
        const peck = frame % 2;
        // Body
        rect(g, 3, 6, 7, 5, p.body);
        rect(g, 4, 9, 5, 2, p.bodySh);
        // Tail feathers
        px(g, 2, 5, p.body); px(g, 1, 4, p.body); px(g, 2, 4, p.bodySh);
        // Head & neck
        const hy = peck ? 5 : 3;
        rect(g, 9, hy, 3, 4, p.body);
        px(g, 10, hy - 1, p.comb); px(g, 11, hy - 1, p.comb); // red comb
        px(g, 12, hy + 1, p.beak); px(g, 13, hy + 2, p.beak); // yellow beak
        px(g, 11, hy + 3, p.comb); // wattle
        px(g, 10, hy + 1, "#201e1c"); // eye
        // Legs
        rect(g, 5, 11, 1, 2, p.beak);
        rect(g, 8, 11, 1, 2, p.beak);
        px(g, 6, 13, p.beak); px(g, 9, 13, p.beak);
        return { w: W, h: H, grid: outline(g, p.outline) };
    }

    function buildDuck(frame) {
        const W = 16, H = 12, g = blank(W, H), p = PAL.duck;
        const bob = frame % 2;
        // Body
        rect(g, 3, 4 + bob, 9, 5, p.body);
        rect(g, 4, 7 + bob, 7, 2, p.bodySh);
        rect(g, 6, 5 + bob, 3, 2, p.spec); // blue speculum on wing
        // Tail
        px(g, 2, 3 + bob, p.body); px(g, 1, 2 + bob, p.bodySh);
        // Green head & yellow bill
        rect(g, 11, 2 + bob, 3, 4, p.head);
        rect(g, 11, 5 + bob, 3, 1, p.neck); // white neck ring
        rect(g, 13, 3 + bob, 3, 2, p.bill); // yellow bill
        px(g, 12, 3 + bob, "#101010");      // eye
        // Water wake ripple
        px(g, 2, 10, "#a0d8f8"); px(g, 13, 10, "#a0d8f8");
        return { w: W, h: H, grid: outline(g, p.outline) };
    }

    const BUILDERS = {
        goblin: buildGoblin, skeleton: buildSkeleton, wolf: buildWolf,
        cat: buildCat, chicken: buildChicken, duck: buildDuck
    };
    const HEIGHT_SCALE = {
        goblin: 1.7, skeleton: 1.85, wolf: 1.35,
        cat: 1.0, chicken: 0.9, duck: 0.85
    };

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
        // art faces right by default -> flip only when facing left
        const flip = o.facing === "left";
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
