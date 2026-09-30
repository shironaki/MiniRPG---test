/*
 * v2 pixel tile art — every tile is drawn from code as 16x16 pixel art (scaled
 * up ×2, crisp) in the same style as the characters. No tileset images. Grass,
 * dirt and paths get a few deterministic per-tile variants so large areas don't
 * look flat; trees, rocks, houses and fences are little pixel objects.
 *
 * API:
 *   TileArt.compose(name, variant) -> { w:16, h:16, grid }  grid[y][x]="#hex"|null
 *   TileArt.draw(ctx, name, sx, sy, ts, col, row)
 */
(function (global) {
    "use strict";

    const N = 16;

    function fill(base) {
        const g = [];
        for (let y = 0; y < N; y++) g.push(new Array(N).fill(base));
        return g;
    }
    function empty() {
        const g = [];
        for (let y = 0; y < N; y++) g.push(new Array(N).fill(null));
        return g;
    }
    function rect(g, x, y, w, h, c) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const yy = y + j, xx = x + i;
            if (yy >= 0 && yy < N && xx >= 0 && xx < N) g[yy][xx] = c;
        }
    }
    function px(g, x, y, c) { if (x >= 0 && x < N && y >= 0 && y < N) g[y][x] = c; }
    function scatter(g, coords, c, variant) {
        coords.forEach(([x, y], i) => { if ((i + variant) % 2 === 0) px(g, x, y, c); });
    }

    // ---- ground tiles -------------------------------------------------------
    function grass(base, dark, light, variant) {
        const g = fill(base);
        const tufts = [[2, 3], [5, 9], [9, 4], [12, 11], [7, 13], [13, 6], [3, 12]];
        tufts.forEach(([x, y], i) => {
            if ((i + variant) % 3 === 0) { px(g, x, y, dark); px(g, x, y + 1, dark); }
            else if ((i + variant) % 3 === 1) px(g, x, y, light);
        });
        if (variant === 2) { // a little flower
            px(g, 6, 6, "#f0e58a"); px(g, 6, 5, "#e8d24a");
            px(g, 11, 9, "#d76a8a"); px(g, 11, 8, "#efa6bd");
        }
        return g;
    }
    function speckled(base, dark, light, variant) {
        const g = fill(base);
        const pts = [[3, 4], [8, 2], [12, 6], [5, 11], [10, 13], [14, 9], [2, 8]];
        scatter(g, pts, dark, variant);
        scatter(g, pts.map(([x, y]) => [(x + 5) % N, (y + 7) % N]), light, variant + 1);
        return g;
    }
    function cobbles(base, line, light, variant) {
        const g = fill(base);
        // stone grid with offset rows
        for (let y = 0; y < N; y += 4) {
            for (let x = 0; x < N; x++) px(g, x, y, line);
            const off = ((y / 4) % 2) ? 0 : 8;
            for (let x = off; x < N; x += 8) for (let j = 0; j < 4; j++) px(g, x, y + j, line);
        }
        px(g, 3, 2, light); px(g, 11, 6, light); px(g, 6, 10, light); px(g, 13, 13, light);
        return g;
    }
    function water(base, wave, deep, variant) {
        const g = fill(base);
        rect(g, 0, 12, N, 4, deep);
        const rows = [3, 8, 12];
        rows.forEach((ry, i) => {
            const off = (i + variant) % 2 ? 0 : 6;
            for (let x = off; x < N; x += 8) { px(g, x, ry, wave); px(g, x + 1, ry, wave); }
        });
        return g;
    }

    // ---- object tiles (sit on a ground base) --------------------------------
    function treeTile(baseGrass, trunk, trunkSh, leaf, leafHi, leafSh, big) {
        const g = grass(baseGrass, "#356b33", "#4a8c42", 0);
        // trunk
        rect(g, 7, 10, 2, 5, trunk); px(g, 8, 10, trunkSh); px(g, 8, 14, trunkSh);
        // canopy blob
        const top = big ? 0 : 1;
        rect(g, 4, top + 2, 8, 7, leaf);
        rect(g, 3, top + 4, 10, 4, leaf);
        rect(g, 5, top + 1, 6, 1, leaf);
        rect(g, 6, top + 0, 4, 1, leaf);
        rect(g, 4, top + 2, 4, 2, leafHi);      // top-left highlight
        rect(g, 4, top + 8, 8, 1, leafSh);      // bottom shade
        px(g, 11, top + 4, leafSh);
        return g;
    }
    function rockTile(baseGround, stone, hi, sh) {
        const g = speckled(baseGround, "#4a4038", "#6a5f52", 0);
        rect(g, 4, 8, 8, 5, stone);
        rect(g, 5, 6, 6, 2, stone);
        rect(g, 6, 5, 4, 1, stone);
        rect(g, 4, 8, 3, 2, hi);                // highlight
        rect(g, 4, 12, 8, 1, sh);               // ground shadow
        px(g, 10, 9, sh); px(g, 9, 7, hi);
        // pebbles
        px(g, 2, 13, stone); px(g, 13, 12, stone);
        return g;
    }
    function houseTile(roof, roofSh, wall, wallSh, door, win) {
        const g = empty();
        // wall
        rect(g, 1, 7, 14, 9, wall);
        rect(g, 1, 14, 14, 2, wallSh);
        // roof
        rect(g, 0, 6, 16, 2, roofSh);
        rect(g, 1, 4, 14, 2, roof);
        rect(g, 2, 2, 12, 2, roof);
        rect(g, 4, 1, 8, 1, roof);
        rect(g, 2, 2, 12, 1, "#d9694e");        // roof highlight
        // door
        rect(g, 6, 10, 4, 6, door);
        px(g, 9, 13, "#e8c84a");                // knob
        // windows
        rect(g, 3, 9, 2, 2, win); rect(g, 11, 9, 2, 2, win);
        return g;
    }
    // House pieces for multi-tile buildings (chosen by neighbours in drawMap).
    function houseRoof() {
        const g = fill("#c0472b");
        rect(g, 0, 0, N, 3, "#d9694e");         // sunlit top
        rect(g, 0, 12, N, 4, "#8f3320");        // eave shadow
        rect(g, 0, 11, N, 1, "#6f2718");
        for (let x = 1; x < N; x += 3) rect(g, x, 3, 1, 9, "#a83c24"); // shingles
        return g;
    }
    function houseWallBase() {
        const g = fill("#d8b78a");
        for (let y = 0; y < N; y += 4) rect(g, 0, y, N, 1, "#b8946a");
        for (let y = 0; y < N; y += 8) for (let x = 0; x < N; x += 8) rect(g, x, y, 1, 4, "#b8946a");
        for (let y = 4; y < N; y += 8) for (let x = 4; x < N; x += 8) rect(g, x, y, 1, 4, "#b8946a");
        return g;
    }
    function houseWin() {
        const g = houseWallBase();
        rect(g, 4, 4, 8, 7, "#5c3a20");         // frame
        rect(g, 5, 5, 6, 5, "#8fd0e0");         // glass
        rect(g, 5, 5, 3, 2, "#bfeaf3");         // shine
        rect(g, 7, 5, 1, 5, "#5c3a20"); rect(g, 5, 7, 6, 1, "#5c3a20"); // mullions
        return g;
    }
    function houseDoor() {
        const g = houseWallBase();
        rect(g, 5, 5, 6, 11, "#6a4326");
        rect(g, 6, 6, 4, 10, "#5c3a20");
        rect(g, 7, 6, 1, 10, "#4a2d18");
        px(g, 9, 11, "#e8c84a");                // knob
        rect(g, 5, 4, 6, 1, "#8f6a3f");         // lintel
        return g;
    }
    function fenceTile(baseGrass, wood, woodSh) {
        const g = grass(baseGrass, "#356b33", "#4a8c42", 1);
        rect(g, 0, 7, N, 2, wood);              // top rail
        rect(g, 0, 8, N, 1, woodSh);
        rect(g, 2, 4, 2, 9, wood); px(g, 3, 4, woodSh);   // posts
        rect(g, 11, 4, 2, 9, wood); px(g, 12, 4, woodSh);
        return g;
    }
    function bushTile(baseGrass, leaf, leafHi, leafSh) {
        const g = grass(baseGrass, "#274d2b", "#356b39", 1);
        rect(g, 4, 7, 8, 5, leaf);
        rect(g, 5, 5, 6, 2, leaf);
        rect(g, 5, 7, 3, 2, leafHi);
        rect(g, 4, 11, 8, 1, leafSh);
        px(g, 7, 6, "#d76a8a"); px(g, 10, 8, "#e8d24a"); // berries/flowers
        return g;
    }
    function bridgeTile(plank, plankSh, water) {
        const g = fill(water);
        rect(g, 0, 2, N, 12, plank);
        for (let x = 0; x < N; x += 4) rect(g, x, 2, 1, 12, plankSh);
        rect(g, 0, 2, N, 1, "#a9855a");
        rect(g, 0, 13, N, 1, plankSh);
        return g;
    }
    function gateTile(baseGround, glow, glowHi) {
        const g = speckled(baseGround, "#9c8150", "#c9b078", 0);
        rect(g, 3, 2, 10, 12, glow);
        rect(g, 5, 4, 6, 9, glowHi);
        rect(g, 6, 5, 4, 7, "#fff2c0");
        return g;
    }

    // ---- registry -----------------------------------------------------------
    function compose(name, variant) {
        variant = variant | 0;
        let g;
        switch (name) {
            case "grass": g = grass("#3d7a3a", "#356b33", "#4a8c42", variant); break;
            case "grass2": g = grass("#427f3f", "#3a7137", "#529349", variant); break;
            case "forest": g = grass("#2f5d33", "#26502b", "#387040", variant % 2 === 0 ? 2 : variant); break;
            case "path": g = speckled("#b79a63", "#9c8150", "#c9b078", variant); break;
            case "plaza": g = cobbles("#c7ad78", "#a98f5f", "#ddc793", variant); break;
            case "dirt": g = speckled("#5b4a34", "#463825", "#6d5940", variant); break;
            case "water": g = water("#2f6d8f", "#4f96b3", "#265a77", variant); break;
            case "tree": g = treeTile("#3d7a3a", "#6b4a2a", "#4e341c", "#2e6b39", "#3f8a4a", "#1f4a28", false); break;
            case "tree2": g = treeTile("#2f5d33", "#523818", "#3c2913", "#1f4a28", "#2e6b39", "#123018", true); break;
            case "rock": g = rockTile("#5b4a34", "#5f5750", "#7d746a", "#332e29"); break;
            case "wall": g = cobbles("#6b6152", "#544c40", "#867b69", variant); break;
            case "house": g = houseTile("#c0472b", "#8f3320", "#d8b78a", "#b8946a", "#5c3a20", "#8fd0e0"); break;
            case "houseRoof": g = houseRoof(); break;
            case "houseWall": g = houseWallBase(); break;
            case "houseWin": g = houseWin(); break;
            case "houseDoor": g = houseDoor(); break;
            case "fence": g = fenceTile("#3d7a3a", "#8a6a3f", "#5f4626"); break;
            case "bridge": g = bridgeTile("#8a6a42", "#6a4e2e", "#2f6d8f"); break;
            case "gate": g = gateTile("#c7ad78", "#e8c04a", "#f4d971"); break;
            default: g = fill("#101319");
        }
        return { w: N, h: N, grid: g };
    }

    // ---- draw with offscreen cache -----------------------------------------
    const _cache = new Map();
    function offscreen(name, variant) {
        const key = name + "|" + variant;
        const hit = _cache.get(key);
        if (hit !== undefined) return hit;
        const { grid } = compose(name, variant);
        let cv = null;
        if (typeof document !== "undefined") {
            cv = document.createElement("canvas");
            cv.width = N; cv.height = N;
            const c = cv.getContext("2d");
            for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
                if (grid[y][x]) { c.fillStyle = grid[y][x]; c.fillRect(x, y, 1, 1); }
        }
        _cache.set(key, cv);
        return cv;
    }

    function variantFor(name, col, row) {
        if (name === "tree" || name === "tree2" || name === "rock" ||
            name === "house" || name === "gate" || name === "bridge" ||
            name === "fence") return 0;
        // Deterministic 0..2 that varies per-tile; flowers (variant 2) ~20%.
        const h = (((col * 13 + row * 7) % 5) + 5) % 5;
        return h < 2 ? 0 : h < 4 ? 1 : 2;
    }

    function draw(ctx, name, sx, sy, ts, col, row) {
        const cv = offscreen(name, variantFor(name, col, row));
        if (!cv) return false;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cv, sx, sy, ts, ts);
        return true;
    }

    const TileArt = { compose, draw, N };
    global.TileArt = TileArt;
    if (typeof module !== "undefined" && module.exports) module.exports = { TileArt };
})(typeof window !== "undefined" ? window : globalThis);
