/**
 * v2 render — furniture pixel art for interiors.
 *
 * Same approach as tilesart.js / character.js: every object is composed as a
 * small pixel grid in code, cached to an offscreen canvas and blitted. No image
 * files. Objects may span several tiles (w/h in tiles) and are drawn on top of
 * the floor, before entities, so the hero can stand in front of them.
 *
 * Each kind is authored on a 16*w x 16*h grid so the pixel density matches the
 * tiles exactly.
 */
(function (global) {
    const N = 16;

    function grid(w, h, fillColor) {
        const g = [];
        for (let y = 0; y < h; y++) {
            const row = new Array(w);
            for (let x = 0; x < w; x++) row[x] = fillColor || null;
            g.push(row);
        }
        return g;
    }
    function px(g, x, y, c) {
        if (!c) return;
        if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) return;
        g[y][x] = c;
    }
    function rect(g, x, y, w, h, c) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c);
    }

    // ---- individual pieces --------------------------------------------------

    // Bed, 1x2 tiles: headboard, pillow, quilt with a fold.
    function bed() {
        const g = grid(N, N * 2);
        rect(g, 1, 1, 14, 3, "#6b4a2c");          // headboard
        rect(g, 1, 1, 14, 1, "#8a6239");
        rect(g, 1, 4, 14, 26, "#7a5433");         // frame
        rect(g, 2, 5, 12, 24, "#e8ddc4");         // mattress
        rect(g, 3, 5, 10, 5, "#fdf6e4");          // pillow
        rect(g, 2, 11, 12, 18, "#b6455a");        // quilt
        rect(g, 2, 11, 12, 1, "#d9647a");
        rect(g, 2, 19, 12, 1, "#8e3446");         // fold
        for (let x = 3; x < 13; x += 3) rect(g, x, 13, 1, 5, "#c85a70");
        rect(g, 1, 29, 14, 2, "#5c3a20");         // foot
        return g;
    }

    // Storage chest, 1x1: banded lid and a brass lock.
    function chest() {
        const g = grid(N, N);
        rect(g, 2, 6, 12, 8, "#7a5433");
        rect(g, 2, 4, 12, 3, "#8a6239");          // lid
        rect(g, 2, 4, 12, 1, "#a37a4c");
        rect(g, 2, 13, 12, 1, "#5c3a20");
        rect(g, 4, 4, 1, 10, "#4a2d18");          // straps
        rect(g, 11, 4, 1, 10, "#4a2d18");
        rect(g, 7, 7, 2, 3, "#e8c84a");           // lock
        px(g, 7, 8, "#8a6a10");
        shadow(g, 2, 15, 12);
        return g;
    }

    // Table, 2x1: a solid top on four legs, outlined so it reads on wood.
    function table() {
        const g = grid(N * 2, N);
        rect(g, 1, 6, 30, 5, "#9c7145");        // top slab, lower on the tile
        rect(g, 1, 6, 30, 1, "#c19a68");        // lit edge
        rect(g, 1, 10, 30, 1, "#5c3a20");       // shadowed lip
        rect(g, 0, 6, 1, 5, "#4a2d18");         // outline
        rect(g, 31, 6, 1, 5, "#4a2d18");
        rect(g, 3, 11, 3, 4, "#7a5433"); rect(g, 3, 11, 1, 4, "#8f6540");
        rect(g, 26, 11, 3, 4, "#7a5433"); rect(g, 26, 11, 1, 4, "#8f6540");
        rect(g, 3, 14, 3, 1, "#4a2d18"); rect(g, 26, 14, 3, 1, "#4a2d18");
        shadow(g, 2, 15, 28);
        return g;
    }

    // A single chair, 1x1: outlined so it does not vanish into the floor.
    function chair() {
        const g = grid(N, N);
        rect(g, 3, 1, 10, 9, "#4a2d18");          // back outline
        rect(g, 4, 2, 8, 7, "#8a6239");
        rect(g, 5, 3, 6, 5, "#6d4b29");           // inset panel
        rect(g, 4, 2, 8, 1, "#a87b4a");
        rect(g, 2, 9, 12, 4, "#4a2d18");          // seat outline
        rect(g, 3, 10, 10, 2, "#9c7145");
        rect(g, 3, 10, 10, 1, "#b88a58");
        rect(g, 3, 13, 2, 3, "#6d4b29");          // legs
        rect(g, 11, 13, 2, 3, "#6d4b29");
        shadow(g, 2, 15, 12);
        return g;
    }

    // Fireplace, 2x1: stone surround, logs and live flames.
    function fireplace(phase) {
        const g = grid(N * 2, N);
        rect(g, 0, 0, 32, 16, "#6d6a63");
        rect(g, 0, 0, 32, 2, "#807c73");
        rect(g, 4, 4, 24, 12, "#241f1c");         // hearth opening
        rect(g, 7, 12, 18, 2, "#5c3a20");         // logs
        rect(g, 9, 11, 14, 1, "#7a5433");
        const f = phase % 2 === 0;
        rect(g, 12, 8, 8, 4, f ? "#e8622a" : "#d8541f");
        rect(g, 14, 6, 4, 4, f ? "#f6a02a" : "#efb03a");
        rect(g, 15, 5, 2, 2, "#ffe07a");
        px(g, f ? 11 : 20, 7, "#f6a02a");
        return g;
    }

    // Shop counter, 2x1: worktop with goods on display.
    function counter() {
        const g = grid(N * 2, N);
        rect(g, 0, 4, 32, 10, "#7a5433");
        rect(g, 0, 3, 32, 2, "#a37a4c");          // worktop
        rect(g, 0, 13, 32, 1, "#4a2d18");
        for (let x = 2; x < 31; x += 6) rect(g, x, 6, 1, 7, "#6d4b29");
        rect(g, 4, 0, 3, 3, "#c0472b");           // apples in a crate
        rect(g, 8, 1, 3, 2, "#4b9e57");
        rect(g, 22, 0, 4, 3, "#c9a227");          // a wheel of cheese
        return g;
    }

    // Shelf of wares, 1x1: a real cabinet with two loaded shelves.
    function shelf() {
        const g = grid(N, N);
        rect(g, 0, 0, 16, 16, "#4a2d18");         // carcass
        rect(g, 1, 1, 14, 14, "#6d4b29");
        rect(g, 2, 2, 12, 5, "#3a2413");          // upper bay (in shadow)
        rect(g, 2, 9, 12, 5, "#3a2413");          // lower bay
        rect(g, 1, 7, 14, 2, "#8a6239");          // middle plank
        rect(g, 1, 7, 14, 1, "#a87b4a");
        rect(g, 1, 14, 14, 1, "#8a6239");         // bottom plank
        rect(g, 3, 3, 2, 4, "#5d7fb8"); px(g, 3, 3, "#8fb3e0");   // bottles
        rect(g, 6, 4, 2, 3, "#b6455a"); px(g, 6, 4, "#d9748c");
        rect(g, 10, 3, 3, 4, "#4b9e57"); px(g, 10, 3, "#79c98a");
        rect(g, 3, 10, 4, 4, "#c9a227");          // sacks & crate
        rect(g, 3, 10, 4, 1, "#e0bd4c");
        rect(g, 9, 11, 4, 3, "#9c7145");
        rect(g, 9, 11, 4, 1, "#b88a58");
        return g;
    }

    // Anvil on a stump, 1x1: bright steel so it stands out on dark flagstones.
    function anvil() {
        const g = grid(N, N);
        rect(g, 2, 10, 12, 5, "#5c3a20");         // oak stump
        rect(g, 2, 10, 12, 1, "#7a5433");
        rect(g, 3, 12, 2, 3, "#4a2d18");          // stump grain
        rect(g, 9, 12, 2, 3, "#4a2d18");
        rect(g, 1, 4, 14, 4, "#2d2b28");          // body outline
        rect(g, 2, 5, 12, 2, "#8a8781");          // steel face
        rect(g, 2, 5, 12, 1, "#c3bfb6");          // polished highlight
        rect(g, 0, 5, 3, 2, "#8a8781");           // horn
        px(g, 0, 6, "#6e6a62");
        rect(g, 13, 5, 2, 2, "#6e6a62");          // heel
        rect(g, 5, 8, 6, 2, "#4a4740");           // waist
        rect(g, 5, 8, 6, 1, "#6e6a62");
        shadow(g, 2, 15, 12);
        return g;
    }

    // Forge hearth, 1x1: coals glowing under a hood.
    function forgeFire(phase) {
        const g = grid(N, N);
        rect(g, 0, 8, 16, 8, "#4c4944");
        rect(g, 0, 8, 16, 1, "#6d6a63");
        rect(g, 2, 10, 12, 5, "#241f1c");
        const f = phase % 2 === 0;
        rect(g, 3, 12, 10, 3, f ? "#e8622a" : "#f07a2a");
        rect(g, 5, 11, 6, 2, "#ffb43a");
        px(g, f ? 6 : 9, 10, "#ffe07a");
        rect(g, 0, 0, 16, 5, "#3a3833");          // hood
        rect(g, 0, 4, 16, 1, "#2a2724");
        return g;
    }

    // Barrel, 1x1: staved body, iron hoops, dark outline.
    function barrel() {
        const g = grid(N, N);
        rect(g, 2, 2, 12, 13, "#3a2413");         // outline
        rect(g, 3, 3, 10, 11, "#8a6239");         // body
        rect(g, 4, 3, 2, 11, "#a87b4a");          // lit stave
        rect(g, 10, 3, 2, 11, "#6d4b29");         // shaded stave
        rect(g, 3, 5, 10, 2, "#4c4944");          // hoops
        rect(g, 3, 10, 10, 2, "#4c4944");
        rect(g, 3, 5, 10, 1, "#6e6a62");
        rect(g, 4, 3, 8, 1, "#c19a68");           // lid rim
        shadow(g, 2, 15, 12);
        return g;
    }

    // Rug, 2x2: soft colour to break up the floor.
    function rug() {
        const g = grid(N * 2, N * 2);
        rect(g, 1, 1, 30, 30, "#7a4258");
        rect(g, 3, 3, 26, 26, "#98536e");
        rect(g, 6, 6, 20, 20, "#7a4258");
        rect(g, 9, 9, 14, 14, "#c9a227");
        rect(g, 12, 12, 8, 8, "#98536e");
        return g;
    }

    // Potted plant, 1x1.
    function plant() {
        const g = grid(N, N);
        rect(g, 5, 11, 6, 4, "#a4562f");
        rect(g, 5, 11, 6, 1, "#c06a3c");
        rect(g, 7, 6, 2, 5, "#3f7a35");
        rect(g, 4, 5, 4, 3, "#4b9e57");
        rect(g, 8, 3, 4, 3, "#57b364");
        rect(g, 6, 2, 3, 2, "#67c473");
        shadow(g, 4, 15, 8);
        return g;
    }

    // Kitchen stove with cooking pot, 1x1: cast-iron stove, boiling stew, steam.
    function stove(phase) {
        const g = grid(N, N);
        rect(g, 1, 4, 14, 11, "#383531");
        rect(g, 1, 4, 14, 1, "#54504a");
        rect(g, 1, 14, 14, 1, "#201e1c");
        // Firebox door & glow
        rect(g, 4, 8, 8, 6, "#241f1c");
        const f = phase % 2 === 0;
        rect(g, 5, 10, 6, 3, f ? "#e8622a" : "#f07a2a");
        px(g, f ? 6 : 8, 11, "#ffe07a");
        // Cooking pot on stove
        rect(g, 4, 1, 8, 4, "#5a5a60");
        rect(g, 3, 2, 10, 1, "#707078");
        // Stew surface
        rect(g, 5, 2, 6, 1, "#d9742b");
        // Steam puffs
        px(g, f ? 6 : 8, 0, "#e8e0d5");
        px(g, f ? 8 : 6, 0, "#c9bfb0");
        shadow(g, 2, 15, 12);
        return g;
    }

    // ---- outdoor village props ----------------------------------------------

    // Town Well, 2x2: stone basin, timber pillars, shingle roof, bucket & rope.
    function well(phase) {
        const g = grid(N * 2, N * 2);
        // Roof
        rect(g, 2, 1, 28, 6, "#a4562f");
        rect(g, 2, 1, 28, 1, "#c86c38");
        rect(g, 5, 0, 22, 1, "#d97b44"); // sunlit ridge
        rect(g, 2, 6, 28, 1, "#7d3e1f"); // eave shadow
        for (let x = 4; x < 28; x += 4) rect(g, x, 3, 1, 3, "#8a4422");
        // Timber posts
        rect(g, 4, 7, 3, 13, "#6d4b29"); rect(g, 4, 7, 1, 13, "#8a6239");
        rect(g, 25, 7, 3, 13, "#6d4b29"); rect(g, 25, 7, 1, 13, "#8a6239");
        // Crossbeam & crank axle
        rect(g, 4, 8, 24, 2, "#7a5433");
        rect(g, 15, 10, 2, 5, "#caa24a"); // rope
        // Stone well basin
        rect(g, 2, 18, 28, 12, "#6d6a63");
        rect(g, 2, 18, 28, 2, "#8a867c"); // rim highlight
        rect(g, 2, 29, 28, 1, "#4a4742"); // base shadow
        for (let y = 20; y < 29; y += 4) {
            rect(g, 2, y, 28, 1, "#4c4944");
            const off = ((y / 4) % 2) ? 0 : 7;
            for (let x = 3 + off; x < 29; x += 7) rect(g, x, y, 1, 4, "#4c4944");
        }
        // Water pool inside
        rect(g, 6, 19, 20, 6, "#2d5c80");
        const f = phase % 2 === 0;
        rect(g, 9, 21, 14, 2, f ? "#4688b8" : "#3878a4");
        px(g, f ? 11 : 18, 21, "#a8e0ff");
        // Hanging bucket
        rect(g, 14, 15, 4, 4, "#8a6239");
        rect(g, 14, 15, 4, 1, "#caa24a"); // metal band
        shadow(g, 3, 31, 26);
        return g;
    }

    // Village Notice / Quest Board, 2x1: wooden board with paper notes & seals.
    function board() {
        const g = grid(N * 2, N);
        // Wooden support posts
        rect(g, 3, 5, 3, 10, "#5c3a20"); rect(g, 3, 5, 1, 10, "#7a5433");
        rect(g, 26, 5, 3, 10, "#5c3a20"); rect(g, 26, 5, 1, 10, "#7a5433");
        // Gabled hood
        rect(g, 1, 1, 30, 3, "#6b4a2c");
        rect(g, 1, 1, 30, 1, "#8a6239");
        rect(g, 1, 3, 30, 1, "#4a2d18");
        // Board backing
        rect(g, 2, 4, 28, 9, "#7a5433");
        rect(g, 3, 5, 26, 7, "#6d4b29");
        // Pinned parchment notices
        rect(g, 5, 6, 8, 5, "#f0e6cf"); px(g, 8, 5, "#c0472b"); // left notice + red pin
        px(g, 6, 7, "#5a452a"); px(g, 8, 7, "#5a452a"); px(g, 10, 7, "#5a452a");
        px(g, 6, 9, "#5a452a"); px(g, 9, 9, "#5a452a");
        rect(g, 15, 6, 6, 5, "#e8dcc4"); px(g, 17, 5, "#3a6ea5"); // right notice + blue pin
        px(g, 16, 7, "#5a452a"); px(g, 18, 7, "#5a452a");
        px(g, 16, 9, "#5a452a");
        rect(g, 22, 7, 6, 4, "#f5eedc"); px(g, 24, 6, "#caa24a"); // small notice + gold pin
        px(g, 23, 8, "#5a452a"); px(g, 25, 8, "#5a452a");
        shadow(g, 2, 15, 28);
        return g;
    }

    // Street Lamp / Lantern post, 1x2: wrought-iron post with glowing lantern.
    function lamp(phase) {
        const g = grid(N, N * 2);
        // Base plate & post
        rect(g, 5, 30, 6, 2, "#242220");
        rect(g, 6, 29, 4, 1, "#3e3b37");
        rect(g, 7, 9, 2, 20, "#242220");
        rect(g, 7, 9, 1, 20, "#4a4742"); // iron highlight
        // Cross arm & bracket
        rect(g, 4, 8, 8, 2, "#242220");
        px(g, 4, 7, "#3e3b37"); px(g, 11, 7, "#3e3b37");
        // Lantern housing
        rect(g, 4, 3, 8, 6, "#242220");
        rect(g, 5, 4, 6, 4, "#ffdf80"); // lantern glass
        // Animated flame
        const f = phase % 2 === 0;
        rect(g, 6, 5, 4, 3, f ? "#ffb43a" : "#ffa028");
        px(g, 7, 5, "#ffffff"); // white flame core
        px(g, f ? 6 : 8, 6, "#ffe07a");
        // Top cap & finial
        rect(g, 4, 2, 8, 2, "#3e3b37");
        rect(g, 6, 0, 4, 2, "#caa24a"); // brass finial
        shadow(g, 4, 31, 8);
        return g;
    }

    // Wooden park / plaza bench, 2x1.
    function bench() {
        const g = grid(N * 2, N);
        // Backrest slats
        rect(g, 2, 3, 28, 2, "#9c7145"); rect(g, 2, 3, 28, 1, "#b88a58");
        rect(g, 2, 6, 28, 2, "#9c7145"); rect(g, 2, 6, 28, 1, "#b88a58");
        // Seat slab
        rect(g, 1, 9, 30, 3, "#9c7145");
        rect(g, 1, 9, 30, 1, "#c19a68");
        rect(g, 1, 11, 30, 1, "#6d4b29");
        // Cast-iron armrests & legs
        rect(g, 2, 4, 2, 10, "#2d2b28"); rect(g, 2, 4, 1, 10, "#4a4742");
        rect(g, 28, 4, 2, 10, "#2d2b28"); rect(g, 28, 4, 1, 10, "#4a4742");
        rect(g, 15, 9, 2, 5, "#2d2b28");
        shadow(g, 2, 15, 28);
        return g;
    }

    // Market Stall with fruits, veggies & fish, 2x2.
    function stall() {
        const g = grid(N * 2, N * 2);
        // Striped awning canopy
        const aw = 32, ah = 9;
        for (let x = 0; x < aw; x++) {
            const c = (Math.floor(x / 4) % 2 === 0) ? "#d8452f" : "#f0ede0";
            const cSh = (Math.floor(x / 4) % 2 === 0) ? "#a83020" : "#c9c6bc";
            rect(g, x, 1, 1, ah - 1, c);
            px(g, x, 0, c);
            px(g, x, ah - 1, cSh); // scallop shadow
        }
        // Corner timber support posts
        rect(g, 2, 8, 2, 22, "#6d4b29"); rect(g, 2, 8, 1, 22, "#8a6239");
        rect(g, 28, 8, 2, 22, "#6d4b29"); rect(g, 28, 8, 1, 22, "#8a6239");
        // Wooden counter table
        rect(g, 2, 17, 28, 12, "#7a5433");
        rect(g, 1, 16, 30, 2, "#a37a4c"); // counter top
        rect(g, 2, 28, 28, 1, "#4a2d18");
        for (let x = 4; x < 28; x += 6) rect(g, x, 18, 1, 10, "#5c3a20");
        // Crates of fresh goods on counter
        // 1. Red apples crate
        rect(g, 3, 13, 8, 4, "#5c3a20");
        rect(g, 4, 12, 6, 3, "#d83a3a");
        px(g, 5, 11, "#ff6060"); px(g, 8, 11, "#ff6060");
        // 2. Carrots & greens crate
        rect(g, 12, 13, 8, 4, "#5c3a20");
        rect(g, 13, 12, 6, 2, "#e87a2a");
        rect(g, 14, 11, 4, 2, "#4b9e57"); // carrot tops
        // 3. Fresh catch basket / tray
        rect(g, 21, 14, 8, 3, "#4a4742");
        rect(g, 22, 12, 6, 3, "#6ea8d8");
        px(g, 23, 11, "#a8d8ff"); px(g, 26, 12, "#3a6890"); // fish tail
        shadow(g, 2, 31, 28);
        return g;
    }

    // Flowerbed with blooming roses, daffodils & lavender, 2x1.
    function flowerbed() {
        const g = grid(N * 2, N);
        // Stone raised border
        rect(g, 1, 4, 30, 11, "#7a7770");
        rect(g, 1, 4, 30, 1, "#9c988f");
        rect(g, 1, 14, 30, 1, "#54524c");
        rect(g, 3, 6, 26, 7, "#4a331f"); // rich soil
        // Dense flowers & foliage
        rect(g, 4, 7, 24, 4, "#3f8c35"); // foliage base
        // Red roses
        px(g, 5, 5, "#d83a56"); px(g, 6, 5, "#ff6584"); px(g, 6, 6, "#d83a56");
        px(g, 17, 5, "#d83a56"); px(g, 18, 5, "#ff6584");
        // Yellow daffodils
        px(g, 10, 4, "#ffd240"); px(g, 11, 4, "#fff070"); px(g, 10, 5, "#e0b020");
        px(g, 24, 5, "#ffd240"); px(g, 25, 4, "#fff070");
        // Blue cornflowers & purple lavender
        px(g, 14, 4, "#4a88e8"); px(g, 14, 5, "#80b0ff");
        px(g, 20, 4, "#9b5de5"); px(g, 21, 5, "#c77dff");
        px(g, 27, 6, "#4a88e8");
        shadow(g, 2, 15, 28);
        return g;
    }

    // Wooden fence horizontal, 1x1.
    function fenceH() {
        const g = grid(N, N);
        // Posts at ends
        rect(g, 0, 3, 3, 12, "#6b4a2c"); rect(g, 0, 3, 3, 1, "#8a6239");
        rect(g, 13, 3, 3, 12, "#6b4a2c"); rect(g, 13, 3, 3, 1, "#8a6239");
        // Rails
        rect(g, 0, 5, 16, 2, "#7a5433"); rect(g, 0, 5, 16, 1, "#9c7145");
        rect(g, 0, 9, 16, 2, "#7a5433"); rect(g, 0, 9, 16, 1, "#9c7145");
        shadow(g, 0, 15, 16);
        return g;
    }

    // Wooden fence vertical, 1x1.
    function fenceV() {
        const g = grid(N, N);
        rect(g, 6, 1, 4, 14, "#6b4a2c");
        rect(g, 6, 1, 2, 14, "#8a6239");
        rect(g, 4, 4, 8, 2, "#7a5433");
        rect(g, 4, 9, 8, 2, "#7a5433");
        shadow(g, 5, 15, 6);
        return g;
    }

    // Mailbox on wooden post, 1x1.
    function mailbox() {
        const g = grid(N, N);
        // Post
        rect(g, 7, 7, 2, 8, "#6b4a2c"); rect(g, 7, 7, 1, 8, "#8a6239");
        // Box
        rect(g, 3, 2, 9, 6, "#5a5a60");
        rect(g, 3, 2, 9, 1, "#787880"); // roof
        rect(g, 3, 7, 9, 1, "#3e3e44");
        rect(g, 4, 3, 2, 4, "#2d2d32"); // opening / slot
        // Red flag up
        rect(g, 12, 1, 2, 4, "#d83a3a");
        px(g, 12, 1, "#ff6060");
        shadow(g, 5, 15, 6);
        return g;
    }

    // Stone town fountain with animated water spray, 2x2.
    function fountain(phase) {
        const g = grid(N * 2, N * 2);
        // Basin
        rect(g, 2, 14, 28, 15, "#7a7770");
        rect(g, 2, 14, 28, 2, "#9c988f");
        rect(g, 2, 28, 28, 1, "#4a4742");
        // Water pool
        rect(g, 5, 16, 22, 10, "#3878a8");
        const f = phase % 2 === 0;
        rect(g, 7, 18, 18, 6, f ? "#58a0d8" : "#4690c8");
        px(g, f ? 9 : 19, 19, "#a0e0ff");
        // Center tier pedestal
        rect(g, 13, 6, 6, 16, "#6d6a63");
        rect(g, 13, 6, 2, 16, "#8a867c");
        // Upper bowl
        rect(g, 9, 6, 14, 4, "#7a7770");
        rect(g, 9, 6, 14, 1, "#9c988f");
        rect(g, 11, 7, 10, 2, "#58a0d8");
        // Water droplets spray
        px(g, 15, 1, f ? "#d8f4ff" : "#a8e0ff");
        px(g, f ? 14 : 16, 2, "#d8f4ff");
        px(g, f ? 13 : 17, 3, "#a8e0ff");
        shadow(g, 3, 31, 26);
        return g;
    }

    // Wooden fishing dock pier planks extending over water, 2x1.
    function pier() {
        const g = grid(N * 2, N);
        rect(g, 0, 2, 32, 12, "#7a5a3a");
        rect(g, 0, 2, 32, 1, "#9c764e");
        rect(g, 0, 13, 32, 1, "#523a22");
        // Plank seams
        for (let x = 6; x < 32; x += 6) rect(g, x, 2, 1, 12, "#422e1b");
        // Mooring bollard & rope
        rect(g, 3, 1, 3, 4, "#3a3834");
        px(g, 3, 1, "#5a5852");
        rect(g, 4, 4, 3, 2, "#caa24a"); // coiled rope
        return g;
    }

    // Coastal Lighthouse with rotating lamp beam, 2x3.
    function lighthouse(phase) {
        const g = grid(N * 2, N * 3);
        // Stone foundation
        rect(g, 4, 38, 24, 8, "#54524c");
        rect(g, 4, 38, 24, 2, "#737068");
        rect(g, 13, 40, 6, 6, "#3a2618"); // arched heavy door
        // Striped masonry tower
        rect(g, 6, 30, 20, 8, "#b83a2a");
        rect(g, 6, 30, 4, 8, "#d9503f");
        rect(g, 22, 30, 4, 8, "#8f2618");
        rect(g, 7, 22, 18, 8, "#e8e5dc");
        rect(g, 7, 22, 4, 8, "#ffffff");
        rect(g, 21, 22, 4, 8, "#b3b0a6");
        rect(g, 8, 14, 16, 8, "#b83a2a");
        rect(g, 8, 14, 3, 8, "#d9503f");
        rect(g, 21, 14, 3, 8, "#8f2618");
        // Lantern room gallery & railing
        rect(g, 7, 12, 18, 2, "#2b2a28");
        rect(g, 9, 5, 14, 7, "#ffe599"); // glowing glass lantern
        rect(g, 11, 6, 10, 5, "#fff8db");
        // Dome roof
        rect(g, 9, 2, 14, 3, "#b83a2a");
        rect(g, 11, 0, 10, 2, "#b83a2a");
        px(g, 15, 0, "#e8c84a");
        shadow(g, 4, 46, 24);
        return g;
    }

    // Beach umbrella & sun lounger, 2x2.
    function beachUmbrella() {
        const g = grid(N * 2, N * 2);
        // Sun lounger
        rect(g, 4, 20, 16, 6, "#4a8cb8");
        rect(g, 4, 20, 16, 1, "#74b3de");
        rect(g, 4, 16, 6, 5, "#4a8cb8");
        // Umbrella pole
        rect(g, 19, 6, 2, 22, "#8a6a42");
        // Striped umbrella canopy
        rect(g, 8, 4, 22, 6, "#e84a5f");
        rect(g, 11, 2, 16, 3, "#f8b195");
        rect(g, 14, 0, 10, 2, "#e84a5f");
        px(g, 18, 0, "#ffffff");
        shadow(g, 16, 29, 8);
        return g;
    }

    // Bookshelf, 2x2: rich carved oak library shelves loaded with books.
    function bookshelf() {
        const g = grid(N * 2, N * 2);
        rect(g, 2, 2, 28, 28, "#5c3d20");
        rect(g, 2, 2, 28, 2, "#7a5433");
        rect(g, 2, 16, 28, 2, "#7a5433");
        rect(g, 2, 28, 28, 2, "#422810");
        // Row 1 books
        const bCols = ["#b83a2a", "#3a68b0", "#3a8b4a", "#c49a2a", "#8a3a90", "#b83a2a", "#d06828", "#3a68b0"];
        for (let i = 0; i < 8; i++) {
            rect(g, 4 + i * 3, 5, 2, 11, bCols[i % bCols.length]);
            px(g, 4 + i * 3, 8, "#ffd700");
        }
        // Row 2 books
        for (let i = 0; i < 8; i++) {
            rect(g, 4 + i * 3, 18, 2, 10, bCols[(i + 3) % bCols.length]);
            px(g, 4 + i * 3, 22, "#e8e5dc");
        }
        shadow(g, 2, 31, 28);
        return g;
    }

    // Plush Sofa, 2x1.
    function sofa() {
        const g = grid(N * 2, N);
        rect(g, 2, 2, 28, 6, "#8b263e"); // backrest
        rect(g, 2, 2, 28, 1, "#b33b56");
        rect(g, 1, 4, 4, 10, "#a8324d"); // left armrest
        rect(g, 27, 4, 4, 10, "#a8324d"); // right armrest
        rect(g, 4, 7, 24, 7, "#b83a58"); // cushion
        rect(g, 4, 7, 24, 1, "#d95775");
        rect(g, 15, 7, 2, 7, "#731c30"); // cushion split
        shadow(g, 2, 15, 28);
        return g;
    }

    // Grandfather Wall Clock, 1x1.
    function clock(phase) {
        const g = grid(N, N);
        rect(g, 4, 1, 8, 14, "#5a3a1f");
        rect(g, 4, 1, 8, 1, "#7d522d");
        rect(g, 5, 3, 6, 5, "#fff8e7"); // clock face
        px(g, 7, 5, "#201c18"); px(g, 8, 5, "#201c18"); px(g, 7, 4, "#201c18"); // hands
        // Pendulum
        const tick = phase % 2 === 0;
        rect(g, 7, 9, 2, 4, "#2a1c10");
        px(g, tick ? 6 : 9, 12, "#ffd700"); // brass pendulum bob
        shadow(g, 4, 15, 8);
        return g;
    }

    // Armchair, 1x1.
    function armchair() {
        const g = grid(N, N);
        rect(g, 2, 2, 12, 6, "#8b263e");
        rect(g, 1, 4, 3, 10, "#a8324d");
        rect(g, 12, 4, 3, 10, "#a8324d");
        rect(g, 3, 7, 10, 7, "#b83a58");
        rect(g, 3, 7, 10, 1, "#d95775");
        shadow(g, 2, 15, 12);
        return g;
    }

    // Animal Feeding Trough with golden hay, 2x1.
    function feeder() {
        const g = grid(N * 2, N);
        rect(g, 2, 4, 28, 10, "#6d4b29");
        rect(g, 2, 4, 28, 1, "#8a6239");
        rect(g, 4, 6, 24, 6, "#e8c34a"); // golden hay
        px(g, 6, 5, "#fbe27d"); px(g, 12, 5, "#fbe27d"); px(g, 20, 5, "#fbe27d");
        rect(g, 2, 13, 28, 1, "#422810");
        shadow(g, 2, 15, 28);
        return g;
    }

    // Smelting Forge Furnace with glowing molten metal, 1x1.
    function furnace(phase) {
        const g = grid(N, N);
        rect(g, 2, 2, 12, 13, "#54504a");
        rect(g, 2, 2, 12, 1, "#736e67");
        rect(g, 4, 6, 8, 8, "#201c1a");
        const f = phase % 2 === 0;
        rect(g, 5, 8, 6, 5, f ? "#f06a20" : "#ff8830");
        rect(g, 6, 9, 4, 3, "#ffe060");
        px(g, 7, 10, "#ffffff");
        shadow(g, 2, 15, 12);
        return g;
    }

    // Mine Ladder Down, 1x1.
    function ladderDown() {
        const g = grid(N, N);
        rect(g, 3, 1, 10, 14, "#181614");
        rect(g, 4, 2, 2, 12, "#8a6239");
        rect(g, 10, 2, 2, 12, "#8a6239");
        for (let y = 3; y < 13; y += 3) {
            rect(g, 5, y, 6, 1, "#b38854");
        }
        return g;
    }

    // A soft contact shadow so pieces sit ON the floor instead of floating.
    function shadow(g, x, y, w) {
        rect(g, x + 1, y, w - 2, 1, "#6b4a28");
        rect(g, x, y - 1, w, 1, "#7a5630");
    }

    // ---- registry -----------------------------------------------------------
    // size = footprint in tiles; animated pieces are rebuilt per phase.
    const KINDS = {
        bed:       { w: 1, h: 2, make: bed },
        chest:     { w: 1, h: 1, make: chest },
        table:     { w: 2, h: 1, make: table },
        chair:     { w: 1, h: 1, make: chair },
        fireplace: { w: 2, h: 1, make: fireplace, animated: true },
        stove:     { w: 1, h: 1, make: stove, animated: true },
        counter:   { w: 2, h: 1, make: counter },
        shelf:     { w: 1, h: 1, make: shelf },
        anvil:     { w: 1, h: 1, make: anvil },
        forgeFire: { w: 1, h: 1, make: forgeFire, animated: true },
        barrel:    { w: 1, h: 1, make: barrel },
        rug:       { w: 2, h: 2, make: rug, walkable: true },
        plant:     { w: 1, h: 1, make: plant },
        // Decorative furniture
        bookshelf: { w: 2, h: 2, make: bookshelf },
        sofa:      { w: 2, h: 1, make: sofa, walkable: true },
        clock:     { w: 1, h: 1, make: clock, animated: true },
        armchair:  { w: 1, h: 1, make: armchair, walkable: true },
        feeder:    { w: 2, h: 1, make: feeder, walkable: true },
        furnace:   { w: 1, h: 1, make: furnace, animated: true },
        ladderDown:{ w: 1, h: 1, make: ladderDown, walkable: true },
        // Village outdoor furniture & props
        well:      { w: 2, h: 2, make: well, animated: true },
        board:     { w: 2, h: 1, make: board },
        lamp:      { w: 1, h: 2, make: lamp, animated: true, solidCols: 1, solidRows: 1, solidOffY: 1 },
        bench:     { w: 2, h: 1, make: bench, walkable: true },
        stall:     { w: 2, h: 2, make: stall },
        flowerbed: { w: 2, h: 1, make: flowerbed, walkable: true },
        fenceH:    { w: 1, h: 1, make: fenceH },
        fenceV:    { w: 1, h: 1, make: fenceV },
        mailbox:   { w: 1, h: 1, make: mailbox, walkable: true },
        fountain:  { w: 2, h: 2, make: fountain, animated: true },
        pier:      { w: 2, h: 1, make: pier, walkable: true },
        lighthouse:{ w: 2, h: 3, make: lighthouse, animated: true, solidCols: 2, solidRows: 2, solidOffY: 1 },
        umbrella:  { w: 2, h: 2, make: beachUmbrella, walkable: true }
    };

    const _cache = new Map();
    function offscreen(kind, phase) {
        const def = KINDS[kind];
        if (!def) return null;
        const key = kind + "|" + (def.animated ? phase : 0);
        const hit = _cache.get(key);
        if (hit !== undefined) return hit;
        const g = def.make(phase);
        let cv = null;
        if (typeof document !== "undefined") {
            cv = document.createElement("canvas");
            cv.width = N * def.w; cv.height = N * def.h;
            const c = cv.getContext("2d");
            for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++)
                if (g[y][x]) { c.fillStyle = g[y][x]; c.fillRect(x, y, 1, 1); }
        }
        _cache.set(key, cv);
        return cv;
    }

    function size(kind) {
        const def = KINDS[kind];
        return def ? { w: def.w, h: def.h } : { w: 1, h: 1 };
    }

    // Draw `kind` with its top-left at screen (sx, sy), scaled to tile size ts.
    function draw(ctx, kind, sx, sy, ts, phase) {
        const def = KINDS[kind];
        if (!def) return false;
        const cv = offscreen(kind, phase | 0);
        if (!cv) return false;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cv, sx, sy, ts * def.w, ts * def.h);
        return true;
    }

    const Furniture = { draw, size, KINDS, N };
    global.Furniture = Furniture;
    if (typeof module !== "undefined" && module.exports) module.exports = { Furniture };
})(typeof window !== "undefined" ? window : globalThis);
