/**
 * Procedural Pixel-Art Character Portraits (64x64)
 * Generates detailed, expressive face portraits for dialogue boxes and UI.
 * 
 * Supports:
 * - hero / player (Герой)
 * - marta (Марта)
 * - boris (Борис)
 * - lena (Лена)
 * - tomila (Томила)
 * - kuzma (Кузьма)
 * - elder / starosta (Староста Святослав)
 * - cat (Мурзик)
 */
(function (global) {
    "use strict";

    const W = 64, H = 64;

    function createGrid() {
        const g = [];
        for (let y = 0; y < H; y++) {
            g.push(new Array(W).fill(null));
        }
        return g;
    }

    function px(g, x, y, c) {
        if (x >= 0 && x < W && y >= 0 && y < H && c) {
            g[y][x] = c;
        }
    }

    function rect(g, x, y, w, h, c) {
        for (let j = y; j < y + h; j++) {
            for (let i = x; i < x + w; i++) {
                px(g, i, j, c);
            }
        }
    }

    function circle(g, cx, cy, r, c) {
        for (let j = cy - r; j <= cy + r; j++) {
            for (let i = cx - r; i <= cx + r; i++) {
                if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r) {
                    px(g, i, j, c);
                }
            }
        }
    }

    // Gradient background frame for portrait badge
    function drawBackground(g, bgTop, bgBot) {
        for (let y = 0; y < H; y++) {
            const t = y / H;
            const col = t < 0.5 ? bgTop : bgBot;
            for (let x = 0; x < W; x++) {
                px(g, x, y, col);
            }
        }
        // Frame border
        for (let x = 0; x < W; x++) {
            px(g, x, 0, "#8a6f4d"); px(g, x, 1, "#422810");
            px(g, x, H - 1, "#422810"); px(g, x, H - 2, "#8a6f4d");
        }
        for (let y = 0; y < H; y++) {
            px(g, 0, y, "#8a6f4d"); px(g, 1, y, "#422810");
            px(g, W - 1, y, "#422810"); px(g, W - 2, y, "#8a6f4d");
        }
        // Corner studs
        px(g, 2, 2, "#ffd166"); px(g, 3, 2, "#ffd166");
        px(g, 2, 3, "#ffd166"); px(g, 3, 3, "#d49a24");
        px(g, W - 4, 2, "#ffd166"); px(g, W - 3, 2, "#ffd166");
        px(g, W - 4, 3, "#d49a24"); px(g, W - 3, 3, "#ffd166");
    }

    // ---- Character Specific Portrait Generators ----

    function makeHero(emotion = "neutral") {
        const g = createGrid();
        drawBackground(g, "#26354a", "#121924");

        // Shoulders & tunic
        rect(g, 12, 48, 40, 16, "#3a6080");
        rect(g, 16, 44, 32, 8, "#284560");
        rect(g, 24, 46, 16, 18, "#d8b28a"); // Neck / collar
        rect(g, 28, 52, 8, 12, "#182838"); // Tunic V-cut
        // Leather strap
        for (let i = 0; i < 20; i++) {
            px(g, 18 + i, 46 + (i * 0.9 | 0), "#6d4b29");
            px(g, 19 + i, 46 + (i * 0.9 | 0), "#8a6239");
        }

        // Head & Face
        rect(g, 20, 16, 24, 28, "#f0caa0"); // Base skin
        rect(g, 22, 18, 20, 24, "#ffdcb4"); // Highlight skin
        rect(g, 20, 38, 24, 6, "#e4b686"); // Jaw shadow

        // Ears
        rect(g, 17, 26, 4, 8, "#f0caa0");
        rect(g, 43, 26, 4, 8, "#f0caa0");

        // Eyes & Eyebrows
        rect(g, 24, 24, 6, 2, "#4a321e"); // Brow left
        rect(g, 34, 24, 6, 2, "#4a321e"); // Brow right
        rect(g, 25, 27, 4, 4, "#ffffff"); // Eye left
        rect(g, 27, 27, 2, 4, "#2a5078"); // Pupil left
        px(g, 26, 28, "#ffffff");         // Catchlight
        rect(g, 35, 27, 4, 4, "#ffffff"); // Eye right
        rect(g, 35, 27, 2, 4, "#2a5078"); // Pupil right
        px(g, 36, 28, "#ffffff");         // Catchlight

        // Nose & Mouth
        rect(g, 31, 31, 2, 4, "#d49a6a");
        px(g, 32, 35, "#c48858");
        if (emotion === "happy") {
            rect(g, 29, 38, 6, 2, "#8a3a3a");
            rect(g, 30, 39, 4, 1, "#ffffff");
        } else {
            rect(g, 29, 38, 6, 2, "#8a4a3a");
        }

        // Hair (Tousled adventurous brown)
        rect(g, 18, 8, 28, 12, "#5a3a22");
        rect(g, 20, 6, 24, 6, "#6e472a");
        // Tufts
        rect(g, 16, 12, 6, 10, "#5a3a22");
        rect(g, 42, 12, 6, 10, "#5a3a22");
        rect(g, 22, 14, 8, 8, "#6e472a");
        rect(g, 32, 14, 10, 6, "#5a3a22");
        px(g, 24, 18, "#5a3a22"); px(g, 38, 18, "#5a3a22");

        // Red Adventurer Headband
        rect(g, 18, 16, 28, 4, "#d9383a");
        rect(g, 18, 17, 28, 2, "#ee4b4e");
        px(g, 46, 18, "#b02628");
        px(g, 47, 19, "#d9383a");
        px(g, 48, 21, "#d9383a"); // Headband ribbon tail

        return g;
    }

    function makeMarta(emotion = "neutral") {
        const g = createGrid();
        drawBackground(g, "#2b4030", "#16241a");

        // Clothes / Country blouse & green vest
        rect(g, 14, 46, 36, 18, "#e8e0d5");
        rect(g, 18, 48, 28, 16, "#4a7c59");
        rect(g, 26, 44, 12, 16, "#fce4c8"); // Neck

        // Head & Face
        rect(g, 21, 18, 22, 26, "#fce4c8");
        rect(g, 23, 20, 18, 22, "#ffeedd");
        // Rosy cheeks
        rect(g, 23, 31, 4, 2, "#fca8a8");
        rect(g, 37, 31, 4, 2, "#fca8a8");

        // Eyes & Eyebrows (Warm emerald green)
        rect(g, 24, 23, 5, 1, "#603c20");
        rect(g, 35, 23, 5, 1, "#603c20");
        rect(g, 25, 25, 4, 4, "#ffffff");
        rect(g, 26, 25, 3, 4, "#2e8b57");
        px(g, 26, 26, "#ffffff");
        rect(g, 35, 25, 4, 4, "#ffffff");
        rect(g, 35, 25, 3, 4, "#2e8b57");
        px(g, 36, 26, "#ffffff");

        // Nose & Smiling Mouth
        px(g, 31, 31, "#e6a880");
        rect(g, 29, 36, 6, 2, "#d45868");
        rect(g, 30, 37, 4, 1, "#ffffff");

        // Auburn Hair & Braids
        rect(g, 18, 12, 28, 12, "#8b4513");
        rect(g, 16, 16, 6, 28, "#8b4513"); // Braid left
        rect(g, 42, 16, 6, 28, "#8b4513"); // Braid right
        rect(g, 18, 18, 6, 10, "#a0522d");
        rect(g, 40, 18, 6, 10, "#a0522d");
        // Hair bangs
        rect(g, 24, 16, 16, 5, "#a0522d");
        px(g, 28, 21, "#8b4513"); px(g, 34, 21, "#8b4513");

        // Straw Hat with Red Ribbon
        rect(g, 10, 8, 44, 5, "#e6c260");
        rect(g, 16, 2, 32, 8, "#eed582");
        rect(g, 18, 1, 28, 2, "#d4ad45");
        rect(g, 16, 7, 32, 2, "#c43838"); // Red ribbon
        // Flower on hat
        rect(g, 42, 5, 3, 3, "#ffffff");
        px(g, 43, 6, "#ffd166");

        return g;
    }

    function makeBoris(emotion = "neutral") {
        const g = createGrid();
        drawBackground(g, "#402c20", "#241610");

        // Broad shoulders & Checkered shirt
        rect(g, 10, 44, 44, 20, "#9c3828");
        for (let y = 44; y < 64; y += 4) {
            rect(g, 10, y, 44, 2, "#541e14");
        }
        for (let x = 12; x < 54; x += 6) {
            rect(g, x, 44, 2, 20, "#541e14");
        }
        // Brown Vest
        rect(g, 10, 46, 10, 18, "#5c3d24");
        rect(g, 44, 46, 10, 18, "#5c3d24");
        rect(g, 26, 40, 12, 12, "#eec89e"); // Thick neck

        // Rugged Head
        rect(g, 20, 16, 24, 26, "#eec89e");
        rect(g, 22, 18, 20, 20, "#f7d6b0");

        // Full Bushy Beard & Mustache
        rect(g, 18, 30, 28, 18, "#50341e");
        rect(g, 20, 32, 24, 18, "#634126");
        rect(g, 26, 32, 12, 6, "#784f30"); // Mustache
        rect(g, 22, 44, 20, 6, "#50341e"); // Beard bottom
        // Smile under mustache
        rect(g, 29, 36, 6, 2, "#2b180d");
        rect(g, 30, 36, 4, 1, "#ffffff");

        // Eyes & Bushy Brows
        rect(g, 22, 22, 7, 3, "#3d2716"); // Left bushy brow
        rect(g, 35, 22, 7, 3, "#3d2716"); // Right bushy brow
        rect(g, 24, 25, 4, 3, "#2a1e16"); // Eye left
        px(g, 25, 25, "#ffffff");
        rect(g, 36, 25, 4, 3, "#2a1e16"); // Eye right
        px(g, 37, 25, "#ffffff");
        // Cheerful crow's feet wrinkles
        px(g, 21, 26, "#c49a70"); px(g, 41, 26, "#c49a70");

        // Big nose
        rect(g, 29, 26, 6, 6, "#d99f70");
        rect(g, 30, 27, 4, 4, "#e8b082");

        // Brown Hair
        rect(g, 18, 10, 28, 10, "#50341e");
        rect(g, 20, 8, 24, 5, "#634126");
        rect(g, 16, 14, 5, 14, "#50341e");
        rect(g, 43, 14, 5, 14, "#50341e");

        return g;
    }

    function makeLena(emotion = "neutral") {
        const g = createGrid();
        drawBackground(g, "#263e4a", "#122028");

        // Blue Dress & White Collar
        rect(g, 16, 46, 32, 18, "#3b729e");
        rect(g, 24, 44, 16, 6, "#ffffff");
        rect(g, 28, 42, 8, 8, "#ffe0bd"); // Little neck

        // Cute Round Face
        circle(g, 32, 28, 12, "#ffe0bd");
        rect(g, 24, 22, 16, 14, "#fff0d4");
        // Freckles
        px(g, 25, 30, "#d99a68"); px(g, 27, 31, "#d99a68");
        px(g, 37, 30, "#d99a68"); px(g, 39, 31, "#d99a68");
        // Rosy cheeks
        rect(g, 23, 29, 4, 2, "#fca8b8");
        rect(g, 37, 29, 4, 2, "#fca8b8");

        // Big Curious Blue Eyes
        rect(g, 24, 21, 5, 1, "#9c762c");
        rect(g, 35, 21, 5, 1, "#9c762c");
        rect(g, 24, 23, 6, 6, "#ffffff");
        rect(g, 25, 23, 4, 6, "#2980b9");
        px(g, 26, 24, "#ffffff"); px(g, 25, 26, "#ffffff");
        rect(g, 34, 23, 6, 6, "#ffffff");
        rect(g, 35, 23, 4, 6, "#2980b9");
        px(g, 36, 24, "#ffffff"); px(g, 35, 26, "#ffffff");

        // Button Nose & Bright Grin
        px(g, 32, 29, "#e6a882");
        rect(g, 29, 33, 6, 3, "#c4384e");
        rect(g, 30, 33, 4, 2, "#ffffff");

        // Blonde Hair & Twin Pigtails
        rect(g, 20, 12, 24, 10, "#e8b838");
        rect(g, 22, 10, 20, 5, "#f7cb57");
        rect(g, 22, 16, 20, 6, "#e8b838"); // Bangs
        // Pigtails left & right
        circle(g, 14, 22, 6, "#e8b838");
        circle(g, 50, 22, 6, "#e8b838");
        // Blue Ribbon Bows
        rect(g, 16, 18, 4, 4, "#2980b9");
        px(g, 15, 19, "#5dade2"); px(g, 18, 19, "#5dade2");
        rect(g, 44, 18, 4, 4, "#2980b9");
        px(g, 43, 19, "#5dade2"); px(g, 46, 19, "#5dade2");

        return g;
    }

    function makeTomila(emotion = "neutral") {
        const g = createGrid();
        drawBackground(g, "#3c264a", "#201228");

        // Elegant merchant dress with purple silk & gold embroidery
        rect(g, 14, 44, 36, 20, "#6c3483");
        rect(g, 22, 42, 20, 8, "#8e44ad");
        rect(g, 26, 42, 12, 16, "#fcd8be"); // Neck & collar
        // Gold necklace
        rect(g, 27, 49, 10, 2, "#f1c40f");
        px(g, 32, 52, "#e67e22");

        // Graceful Face
        rect(g, 22, 18, 20, 26, "#fcd8be");
        rect(g, 24, 20, 16, 22, "#ffebd9");
        // Soft blush
        rect(g, 24, 30, 3, 2, "#f1948a");
        rect(g, 37, 30, 3, 2, "#f1948a");

        // Expressive Hazel Eyes & Arching Brows
        rect(g, 24, 22, 5, 1, "#2c1c11");
        rect(g, 35, 22, 5, 1, "#2c1c11");
        rect(g, 25, 24, 4, 4, "#ffffff");
        rect(g, 26, 24, 3, 4, "#7e5109");
        px(g, 26, 25, "#ffffff");
        rect(g, 35, 24, 4, 4, "#ffffff");
        rect(g, 35, 24, 3, 4, "#7e5109");
        px(g, 36, 25, "#ffffff");

        // Pearl Earrings
        rect(g, 19, 28, 2, 3, "#fdfefe");
        rect(g, 43, 28, 2, 3, "#fdfefe");

        // Refined Nose & Warm Smile
        px(g, 31, 30, "#d98880");
        rect(g, 29, 34, 6, 2, "#c0392b");
        rect(g, 30, 34, 4, 1, "#ffffff");

        // Dark Hair in Bun with Gold Pin
        rect(g, 18, 12, 28, 12, "#1c1815");
        circle(g, 32, 8, 8, "#2c221e"); // High bun
        rect(g, 26, 6, 12, 2, "#f1c40f"); // Gold hairpin
        // Flowing side locks
        rect(g, 18, 20, 4, 14, "#1c1815");
        rect(g, 42, 20, 4, 14, "#1c1815");

        return g;
    }

    function makeKuzma(emotion = "neutral") {
        const g = createGrid();
        drawBackground(g, "#4a2d18", "#241408");

        // Heavy leather apron & smith shirt
        rect(g, 10, 44, 44, 20, "#5d4037");
        rect(g, 18, 44, 28, 20, "#3e2723");
        rect(g, 26, 40, 12, 10, "#d7ccc8"); // Muscular neck
        // Iron ring on strap
        rect(g, 20, 50, 4, 4, "#78909c");
        rect(g, 40, 50, 4, 4, "#78909c");

        // Grizzled, rugged face with soot
        rect(g, 20, 16, 24, 26, "#d7a780");
        rect(g, 22, 18, 20, 20, "#e8be99");
        // Soot smudge on cheek
        px(g, 24, 28, "#424242"); px(g, 25, 29, "#616161"); px(g, 26, 28, "#424242");

        // Full Grey-streaked Beard & Mustache
        rect(g, 18, 30, 28, 20, "#757575");
        rect(g, 20, 32, 24, 18, "#9e9e9e");
        rect(g, 24, 32, 16, 6, "#bdbdbd"); // Mustache
        rect(g, 22, 46, 20, 6, "#616161"); // Beard tip

        // Determined glowing amber eyes
        rect(g, 22, 21, 6, 3, "#424242");
        rect(g, 36, 21, 6, 3, "#424242");
        rect(g, 24, 24, 4, 3, "#d35400");
        px(g, 25, 24, "#f39c12");
        rect(g, 36, 24, 4, 3, "#d35400");
        px(g, 37, 24, "#f39c12");

        // Sturdy nose & calm stoic mouth
        rect(g, 29, 25, 6, 6, "#b88358");
        rect(g, 29, 36, 6, 2, "#3e2723");

        // Grey Hair with Bandana
        rect(g, 18, 10, 28, 10, "#9e9e9e");
        rect(g, 16, 14, 5, 14, "#757575");
        rect(g, 43, 14, 5, 14, "#757575");
        // Blue & White Striped Sweatband
        rect(g, 18, 14, 28, 4, "#1565c0");
        rect(g, 18, 15, 28, 2, "#ffffff");

        return g;
    }

    function makeElder(emotion = "neutral") {
        const g = createGrid();
        drawBackground(g, "#263540", "#141c22");

        // Fur-trimmed noble mantle & embroidered robe
        rect(g, 10, 44, 44, 20, "#1a365d");
        rect(g, 14, 42, 36, 8, "#e2e8f0"); // Thick white fur collar
        // Golden carved fibula brooch
        circle(g, 32, 46, 4, "#d69e2e");
        px(g, 32, 46, "#b7791f");
        px(g, 32, 45, "#ecc94b");

        // Wise weathered face
        rect(g, 20, 14, 24, 28, "#ebd3be");
        rect(g, 22, 16, 20, 22, "#f7e8da");
        // Forehead wisdom wrinkles
        rect(g, 26, 17, 12, 1, "#c9a88b");
        rect(g, 28, 19, 8, 1, "#c9a88b");

        // Magnificent flowing silver-white beard
        rect(g, 16, 28, 32, 28, "#e2e8f0");
        rect(g, 18, 30, 28, 26, "#ffffff");
        rect(g, 24, 28, 16, 8, "#ffffff"); // Grand mustache
        rect(g, 24, 50, 16, 8, "#cbd5e0"); // Beard base

        // Wise, gentle pale-blue eyes
        rect(g, 22, 20, 7, 3, "#ffffff"); // Snow-white bushy brows
        rect(g, 35, 20, 7, 3, "#ffffff");
        rect(g, 24, 23, 4, 3, "#3182ce");
        px(g, 25, 23, "#90cdf4");
        rect(g, 36, 23, 4, 3, "#3182ce");
        px(g, 37, 23, "#90cdf4");
        // Kind eye-crease wrinkles
        px(g, 21, 24, "#bfa084"); px(g, 42, 24, "#bfa084");

        // Silver-white hair
        rect(g, 18, 8, 28, 10, "#e2e8f0");
        rect(g, 16, 12, 6, 20, "#ffffff");
        rect(g, 42, 12, 6, 20, "#ffffff");

        return g;
    }

    function makeCat(emotion = "neutral") {
        const g = createGrid();
        drawBackground(g, "#3c3826", "#201e14");

        // Ginger Tabby Body / Chest
        circle(g, 32, 54, 18, "#d97724");
        rect(g, 26, 44, 12, 20, "#ffffff"); // White chest patch

        // Cat Head
        circle(g, 32, 30, 16, "#e68a35");
        circle(g, 32, 30, 14, "#f59e42");
        // Tabby Stripes
        rect(g, 30, 18, 4, 6, "#a34e0a");
        rect(g, 24, 22, 3, 3, "#a34e0a");
        rect(g, 37, 22, 3, 3, "#a34e0a");

        // Pointed Ears with Pink Interior
        // Left ear
        for (let y = 0; y < 10; y++) {
            rect(g, 20 - (y / 2 | 0), 14 + y, 6, 1, "#e68a35");
            if (y > 2) rect(g, 22 - (y / 2 | 0), 14 + y, 3, 1, "#fca5a5");
        }
        // Right ear
        for (let y = 0; y < 10; y++) {
            rect(g, 38 + (y / 2 | 0), 14 + y, 6, 1, "#e68a35");
            if (y > 2) rect(g, 39 + (y / 2 | 0), 14 + y, 3, 1, "#fca5a5");
        }

        // Emerald Green Slit Eyes
        rect(g, 22, 26, 6, 6, "#22c55e");
        rect(g, 24, 25, 2, 8, "#0f172a"); // Vertical slit pupil
        px(g, 23, 27, "#ffffff");          // Shine
        rect(g, 36, 26, 6, 6, "#22c55e");
        rect(g, 38, 25, 2, 8, "#0f172a"); // Vertical slit pupil
        px(g, 37, 27, "#ffffff");

        // White Muzzle & Pink Nose
        circle(g, 32, 35, 6, "#ffffff");
        circle(g, 28, 36, 4, "#ffffff");
        circle(g, 36, 36, 4, "#ffffff");
        rect(g, 30, 33, 4, 3, "#f472b6"); // Pink nose

        // Whiskers
        rect(g, 14, 34, 10, 1, "#ffffff");
        rect(g, 16, 37, 8, 1, "#ffffff");
        rect(g, 40, 34, 10, 1, "#ffffff");
        rect(g, 40, 37, 8, 1, "#ffffff");

        return g;
    }

    const BUILDERS = {
        hero: makeHero,
        player: makeHero,
        marta: makeMarta,
        boris: makeBoris,
        lena: makeLena,
        tomila: makeTomila,
        kuzma: makeKuzma,
        elder: makeElder,
        starosta: makeElder,
        cat: makeCat
    };

    const _cache = new Map();

    function renderToCanvas(id, emotion = "neutral") {
        const key = `${id}_${emotion}`;
        if (_cache.has(key)) return _cache.get(key);

        const builder = BUILDERS[id] || BUILDERS.hero;
        const gridData = builder(emotion);

        let canvas = null;
        let dataUrl = "";
        if (typeof document !== "undefined") {
            canvas = document.createElement("canvas");
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        const c = gridData[y][x];
                        if (c) {
                            ctx.fillStyle = c;
                            ctx.fillRect(x, y, 1, 1);
                        }
                    }
                }
                try {
                    dataUrl = canvas.toDataURL ? canvas.toDataURL() : "";
                } catch (e) {
                    dataUrl = "";
                }
            }
        }
        const res = { grid: gridData, canvas, dataUrl };
        _cache.set(key, res);
        return res;
    }

    function portraitHtml(id, emotion = "neutral") {
        const r = renderToCanvas(id, emotion);
        if (r.dataUrl) {
            return `<img src="${r.dataUrl}" class="dlgPortrait" alt="${id}">`;
        }
        return `<div class="dlgPortraitFallback">${id === "cat" ? "🐱" : "🧑"}</div>`;
    }

    const Portraits = {
        W, H,
        BUILDERS,
        render: renderToCanvas,
        portraitHtml,
        getGrid(id, emotion) {
            const b = BUILDERS[id] || BUILDERS.hero;
            return b(emotion);
        }
    };

    global.Portraits = Portraits;
    if (typeof module !== "undefined" && module.exports) module.exports = { Portraits };
})(typeof window !== "undefined" ? window : globalThis);
