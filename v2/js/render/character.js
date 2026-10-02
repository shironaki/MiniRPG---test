/*
 * v2 pixel character rig — a small Stardew-style sprite built from LAYERS in
 * code (no image files, no regeneration):
 *
 *   - authored as coordinate-stamped pixel grids per direction (down/up/side);
 *   - every part is a palette key, so colours (skin/hair/shirt/pants/boots) are
 *     just DATA — recolour freely;
 *   - equipment (hat, tool, …) are extra overlay layers stamped on top, so a new
 *     item is a small pixel grid, never a re-rendered character;
 *   - a 1px dark outline is generated automatically around the silhouette;
 *   - a short walk cycle animates the legs (and a 1px body bob) in every
 *     direction — continuous, no sprite-sheet slicing.
 *
 * API:
 *   CharacterRig.compose(dir, frame, look) -> { w, h, grid }  // grid[y][x] = "#rrggbb" | null
 *   CharacterRig.draw(ctx, { x, y, H, facing, phase, moving, now, look })
 */
(function (global) {
    "use strict";

    const GW = 16, GH = 26; // grid size (with margins for the auto-outline)

    const DEFAULT_LOOK = {
        outline: "#20161c",
        skin: "#f0c08a", skinSh: "#d29a63",
        hair: "#6e4324", hairSh: "#4d2d16",
        eye: "#2a2733",
        shirt: "#3f7fd6", shirtSh: "#2c5aa0",
        cuff: "#f0c08a",
        pants: "#5b4632", pantsSh: "#3f301f",
        boot: "#6a4626", bootSh: "#472d16",
        // equipment layers (set null to hide) — proof gear is just data:
        hat: "#c0472b", hatSh: "#8f3320",   // little cap
    };

    // palette key -> look field
    const KEY = {
        s: "skin", S: "skinSh",
        h: "hair", H: "hairSh",
        e: "eye",
        c: "shirt", C: "shirtSh", f: "cuff",
        p: "pants", P: "pantsSh",
        b: "boot", B: "bootSh",
        a: "hat", A: "hatSh",
        r: "beard", R: "beardSh"
    };

    // ---- grid helpers -------------------------------------------------------
    function blank() {
        const g = [];
        for (let y = 0; y < GH; y++) g.push(new Array(GW).fill("."));
        return g;
    }
    function rect(g, x, y, w, h, k) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const yy = y + j, xx = x + i;
            if (yy >= 0 && yy < GH && xx >= 0 && xx < GW) g[yy][xx] = k;
        }
    }
    function px(g, x, y, k) {
        if (y >= 0 && y < GH && x >= 0 && x < GW) g[y][x] = k;
    }

    // ---- base art per direction (no outline; outline is auto-added) ---------
    // Legs are stamped by buildLegs so the walk cycle can shift them.
    function buildTorsoHead(dir) {
        const g = blank();
        if (dir === "side") {
            // hair back of head, face toward +x (right)
            rect(g, 4, 3, 8, 4, "h");        // hair cap
            rect(g, 4, 7, 3, 3, "h");        // back hair
            rect(g, 6, 6, 6, 5, "s");        // face skin
            rect(g, 6, 6, 5, 1, "h");        // fringe
            px(g, 10, 8, "e");               // eye
            px(g, 11, 9, "S");               // nose/chin shade
            // hat
            rect(g, 4, 2, 8, 2, "a");
            rect(g, 4, 4, 8, 1, "A");
            // torso
            rect(g, 6, 12, 5, 6, "c");
            rect(g, 6, 12, 5, 1, "C");
            px(g, 10, 17, "C");
            // one visible arm swinging in front
            rect(g, 8, 12, 2, 4, "c");
            rect(g, 8, 16, 2, 2, "s");       // hand
        } else {
            const back = dir === "up";
            // head block
            rect(g, 4, 4, 8, 7, "s");        // skin base
            // hair: full for back, cap+sides for front
            rect(g, 4, 3, 8, 3, "h");        // top
            rect(g, 3, 5, 2, 4, "h");        // left side
            rect(g, 11, 5, 2, 4, "h");       // right side
            if (back) rect(g, 4, 4, 8, 7, "h"); // whole back of head is hair
            else rect(g, 4, 5, 8, 1, "h");   // fringe
            // hat (cap)
            rect(g, 3, 2, 10, 2, "a");
            rect(g, 3, 4, 10, 1, "A");
            if (!back) {
                px(g, 6, 8, "e"); px(g, 9, 8, "e");   // eyes
                px(g, 7, 10, "S"); px(g, 8, 10, "S"); // mouth
            }
            // torso
            rect(g, 4, 12, 8, 6, "c");
            rect(g, 4, 12, 8, 1, "C");
            rect(g, 4, 17, 8, 1, "C");       // hem shade
            // arms at the sides
            rect(g, 3, 12, 1, 4, "c"); px(g, 3, 16, "s");
            rect(g, 12, 12, 1, 4, "c"); px(g, 12, 16, "s");
        }
        return g;
    }

    // Legs as their own layer so the walk cycle can lift/shift them.
    // liftL / liftR / shift are small integer pixel offsets.
    function stampLegs(g, dir, liftL, liftR, shift) {
        if (dir === "side") {
            // back leg (shaded) + front leg; shift = stride in x
            // back leg
            rect(g, 6 - shift, 18, 2, 4, "P");
            rect(g, 6 - shift, 22 - 0, 3, 2, "B");
            // front leg
            rect(g, 9 + shift, 18, 2, 4, "p");
            rect(g, 9 + shift, 22, 3, 2, "b");
        } else {
            // left leg
            rect(g, 5, 18 - liftL, 2, 4, "p");
            rect(g, 5, 22 - liftL, 2, 2, "b");
            // right leg
            rect(g, 9, 18 - liftR, 2, 4, "p");
            rect(g, 9, 22 - liftR, 2, 2, "b");
        }
    }

    // ---- compose: build keys -> colours, add auto-outline -------------------
    function compose(dir, frame, look) {
        const L = Object.assign({}, DEFAULT_LOOK, look || {});
        const d = dir === "left" ? "side" : (dir === "right" ? "side" : dir);
        const g = buildTorsoHead(d);

        // walk cycle: 4 phases -> alternate leg lift (front) / stride (side)
        let liftL = 0, liftR = 0, shift = 0, bob = 0;
        const f = ((frame % 4) + 4) % 4;
        if (d === "side") {
            shift = (f === 1) ? 1 : (f === 3) ? -1 : 0;
        } else {
            if (f === 1) { liftL = 1; bob = 1; }
            else if (f === 3) { liftR = 1; bob = 1; }
        }
        stampLegs(g, d, liftL, liftR, shift);

        // body bob: nudge everything above the legs up by `bob`
        if (bob) {
            for (let y = 0; y < 18; y++) {
                for (let x = 0; x < GW; x++) {
                    if (g[y][x] !== ".") { /* keep */ }
                }
            }
            // shift rows 2..17 up by 1 (copy)
            for (let y = 2; y < 18; y++) g[y - bob] = g[y].slice();
            g[17] = new Array(GW).fill(".");
        }

        // hide hat if look.hat is null
        if (!L.hat) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
            if (g[y][x] === "a" || g[y][x] === "A") g[y][x] = ".";

        // beard layer for elders / bearded characters
        if (L.beard) {
            if (d === "side") {
                rect(g, 9, 9, 3, 3, "r");
                px(g, 10, 8, "r");
                px(g, 11, 11, "R");
            } else if (d !== "up") {
                rect(g, 5, 9, 6, 3, "r");
                rect(g, 6, 8, 4, 1, "r"); // mustache
                px(g, 6, 12, "R"); px(g, 9, 12, "R");
            }
        }

        // key grid -> colour grid
        const col = [];
        for (let y = 0; y < GH; y++) {
            col.push(new Array(GW).fill(null));
            for (let x = 0; x < GW; x++) {
                const k = g[y][x];
                if (k === ".") continue;
                const field = KEY[k];
                col[y][x] = (field && L[field]) || L.outline;
            }
        }
        // auto-outline: transparent cell touching a filled cell -> outline
        const out = [];
        for (let y = 0; y < GH; y++) out.push(col[y].slice());
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
            if (col[y][x]) continue;
            if ((y > 0 && col[y - 1][x]) || (y < GH - 1 && col[y + 1][x]) ||
                (x > 0 && col[y][x - 1]) || (x < GW - 1 && col[y][x + 1])) {
                out[y][x] = L.outline;
            }
        }
        return { w: GW, h: GH, grid: out };
    }

    // ---- draw with cached offscreen canvases --------------------------------
    const _cache = new Map();
    function offscreen(dir, frame, look, key) {
        const hit = _cache.get(key);
        if (hit) return hit;
        const { w, h, grid } = compose(dir, frame, look);
        let cv;
        if (typeof document !== "undefined") {
            cv = document.createElement("canvas");
            cv.width = w; cv.height = h;
            const c = cv.getContext("2d");
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                if (grid[y][x]) { c.fillStyle = grid[y][x]; c.fillRect(x, y, 1, 1); }
            }
        }
        _cache.set(key, cv);
        if (_cache.size > 64) _cache.delete(_cache.keys().next().value);
        return cv;
    }

    function draw(ctx, o) {
        const dir = o.facing || "down";
        const moving = !!o.moving;
        const frame = moving ? (Math.floor((o.phase || 0) / (Math.PI / 2)) % 4) : 0;
        const look = o.look || null;
        const lookHash = look ? JSON.stringify(look) : "d";
        const cacheKey = dir + "|" + frame + "|" + lookHash;
        const cv = offscreen(dir, frame, look, cacheKey);
        if (!cv) return;

        const scale = o.H / GH;
        const drawW = GW * scale, drawH = GH * scale;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(o.x, o.y);
        if (dir === "left") ctx.scale(-1, 1); // side art faces right; flip for left
        ctx.drawImage(cv, -drawW / 2, -drawH, drawW, drawH);
        ctx.restore();
    }

    const CharacterRig = { compose, draw, DEFAULT_LOOK, GW, GH };
    global.CharacterRig = CharacterRig;
    if (typeof module !== "undefined" && module.exports) module.exports = { CharacterRig };
})(typeof window !== "undefined" ? window : globalThis);
