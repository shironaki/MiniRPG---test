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

    // Natural water with organic shores, depth gradient and lilypads.
    function water(base, wave, deep, variant, neighbors, now) {
        const shallow = "#3b87a8", mid = "#286b8c", deepBlue = "#1e506d";
        const g = fill(mid);
        rect(g, 1, 1, N - 2, N - 2, deepBlue);

        // If neighbor info is given, blend organic sandy shores and rounded corners
        if (neighbors) {
            const sand = "#cbb27a", sandHi = "#ded09b", sandSh = "#967f4c", foam = "#e8f7fa";
            const up = !neighbors.up, down = !neighbors.down, left = !neighbors.left, right = !neighbors.right;

            // Shore banks (transitions from grass to sand to shallow water)
            if (up) {
                rect(g, 0, 0, N, 2, sand);
                rect(g, 0, 0, N, 1, sandHi);
                rect(g, 0, 2, N, 1, sandSh);
                rect(g, 0, 3, N, 1, shallow);
                // gentle foam ripples
                for (let x = 1; x < N - 1; x += 2) px(g, x, 3, foam);
            }
            if (down) {
                rect(g, 0, N - 3, N, 1, shallow);
                for (let x = 0; x < N; x += 2) px(g, x, N - 3, foam);
                rect(g, 0, N - 2, N, 1, sandSh);
                rect(g, 0, N - 1, N, 1, sand);
            }
            if (left) {
                rect(g, 0, 0, 2, N, sand);
                rect(g, 0, 0, 1, N, sandHi);
                rect(g, 2, 0, 1, N, sandSh);
                rect(g, 3, 0, 1, N, shallow);
                for (let y = 1; y < N - 1; y += 2) px(g, 3, y, foam);
            }
            if (right) {
                rect(g, N - 4, 0, 1, N, shallow);
                for (let y = 0; y < N; y += 2) px(g, N - 4, y, foam);
                rect(g, N - 3, 0, 1, N, sandSh);
                rect(g, N - 2, 0, 2, N, sand);
            }

            // Outer corners (convex shore rounding with grass base)
            if (up && left) {
                px(g, 0, 0, "#3d7a3a"); px(g, 1, 0, sandHi); px(g, 0, 1, sandHi);
                px(g, 2, 1, sand); px(g, 1, 2, sand); px(g, 2, 2, sandSh);
            }
            if (up && right) {
                px(g, N - 1, 0, "#3d7a3a"); px(g, N - 2, 0, sandHi); px(g, N - 1, 1, sandHi);
                px(g, N - 3, 1, sand); px(g, N - 2, 2, sand); px(g, N - 3, 2, sandSh);
            }
            if (down && left) {
                px(g, 0, N - 1, "#3d7a3a"); px(g, 1, N - 1, sand); px(g, 0, N - 2, sand);
                px(g, 2, N - 2, sand); px(g, 1, N - 3, sand); px(g, 2, N - 3, sandSh);
            }
            if (down && right) {
                px(g, N - 1, N - 1, "#3d7a3a"); px(g, N - 2, N - 1, sand); px(g, N - 1, N - 2, sand);
                px(g, N - 3, N - 2, sand); px(g, N - 2, N - 3, sand); px(g, N - 3, N - 3, sandSh);
            }

            // Inner corners (concave bays where cardinal neighbors are water but diagonal is land)
            if (!up && !left && neighbors.ul === false) {
                px(g, 0, 0, sandSh); px(g, 1, 0, foam); px(g, 0, 1, foam);
            }
            if (!up && !right && neighbors.ur === false) {
                px(g, N - 1, 0, sandSh); px(g, N - 2, 0, foam); px(g, N - 1, 1, foam);
            }
            if (!down && !left && neighbors.dl === false) {
                px(g, 0, N - 1, sandSh); px(g, 1, N - 1, foam); px(g, 0, N - 2, foam);
            }
            if (!down && !right && neighbors.dr === false) {
                px(g, N - 1, N - 1, sandSh); px(g, N - 2, N - 1, foam); px(g, N - 1, N - 2, foam);
            }
        }

        // Natural water ripples and sunlight glints
        const waveC = "#5db4d6", glint = "#b2e7fa";
        const waveRows = [4, 7, 10, 13];
        waveRows.forEach((ry, i) => {
            const off = ((i + (variant || 0)) % 2 === 0) ? 2 : 8;
            for (let x = off; x < N - 3; x += 8) {
                px(g, x, ry, waveC);
                px(g, x + 1, ry, waveC);
                px(g, x + 2, ry, glint);
            }
        });
        // Lilypad with pink lotus flower (variant 2)
        if (variant === 2 && (!neighbors || (neighbors.up && neighbors.down && neighbors.left && neighbors.right))) {
            rect(g, 5, 6, 6, 4, "#2d753b");
            rect(g, 6, 5, 4, 1, "#2d753b");
            px(g, 8, 7, "#1e5229"); // slit
            px(g, 9, 6, "#ff8da8");
            px(g, 9, 5, "#ffe0ea");
            px(g, 8, 6, "#ffb3c6");
            px(g, 10, 6, "#ff6b8e");
        }
        return g;
    }

    // ---- object tiles (sit on a ground base) --------------------------------
    function treeTile(baseGrass, trunk, trunkSh, leaf, leafHi, leafSh, big, neighbors) {
        const g = grass(baseGrass, "#356b33", "#4a8c42", 0);

        if (neighbors && (neighbors.up || neighbors.down || neighbors.left || neighbors.right)) {
            // Connected forest canopy - seamless, lush woodland
            const foliageDark = "#1c5025", foliageMid = leaf, foliageLight = leafHi, foliageSh = leafSh;
            rect(g, 0, 0, N, N, foliageMid);
            rect(g, 0, 0, N, 3, foliageLight);
            rect(g, 0, N - 3, N, 3, foliageSh);

            // Organic canopy cluster texturing
            for (let y = 1; y < N - 1; y += 3) {
                for (let x = 1; x < N - 1; x += 3) {
                    px(g, x, y, foliageLight);
                    px(g, x + 1, y, foliageLight);
                    px(g, x + 1, y + 1, foliageDark);
                    px(g, x, y + 2, foliageSh);
                }
            }

            // Outer edges of connected forest
            if (!neighbors.up) {
                // Rounded canopy dome overflowing skyward
                px(g, 0, 0, baseGrass); px(g, N - 1, 0, baseGrass);
                rect(g, 1, 0, N - 2, 2, foliageLight);
                px(g, 1, 0, "#6cd675"); px(g, 4, 0, "#6cd675"); px(g, 9, 0, "#6cd675");
            }
            if (!neighbors.down) {
                // Bottom of forest canopy with oak trunks, root flares and ground shadows
                rect(g, 0, N - 4, N, 4, baseGrass);
                rect(g, 2, N - 5, 12, 2, foliageDark);
                // Oak trunk
                rect(g, 6, 8, 4, 7, trunk);
                rect(g, 6, 8, 1, 7, "#7a5433"); // lit bark side
                rect(g, 9, 8, 1, 7, trunkSh);   // shadow bark side
                px(g, 5, 14, trunk);            // left root flare
                px(g, 10, 14, trunkSh);         // right root flare
                // Ground undergrowth shadow
                rect(g, 3, 14, 10, 2, "#1f4222");
                rect(g, 4, 13, 8, 1, "#1f4222");
            }
            if (!neighbors.left) {
                rect(g, 0, 1, 2, N - 2, foliageLight);
                px(g, 0, 0, baseGrass); px(g, 0, N - 1, baseGrass);
            }
            if (!neighbors.right) {
                rect(g, N - 2, 1, 2, N - 2, foliageSh);
                px(g, N - 1, 0, baseGrass); px(g, N - 1, N - 1, baseGrass);
            }
            return g;
        }

        if (big) {
            // Pine / Spruce tree (tree2)
            const pineDark = "#0f3016", pineMid = "#1a4d25", pineHi = "#2c7d3e", pineTop = "#3fa055";
            // Ground shadow
            rect(g, 4, 14, 8, 2, "#1d3e21");
            rect(g, 5, 13, 6, 1, "#1d3e21");
            // Trunk
            rect(g, 7, 10, 2, 5, trunk);
            rect(g, 8, 10, 1, 5, trunkSh);
            // Tier 3 (bottom boughs)
            rect(g, 2, 10, 12, 3, pineDark);
            rect(g, 3, 9, 10, 2, pineMid);
            rect(g, 4, 9, 4, 1, pineHi);
            // Tier 2 (mid boughs)
            rect(g, 3, 6, 10, 3, pineDark);
            rect(g, 4, 5, 8, 2, pineMid);
            rect(g, 5, 5, 3, 1, pineHi);
            // Tier 1 (top crown)
            rect(g, 5, 2, 6, 3, pineDark);
            rect(g, 6, 1, 4, 2, pineMid);
            rect(g, 7, 0, 2, 2, pineTop);
            px(g, 7, 0, "#60c878");
            return g;
        }

        // Standalone detailed pixel-art oak tree (tree)
        // Soft elliptical ground shadow
        rect(g, 3, 14, 10, 2, "#244d26");
        rect(g, 4, 13, 8, 1, "#244d26");

        // Trunk with bark texture & root flare
        rect(g, 6, 8, 4, 7, trunk);
        rect(g, 6, 8, 1, 7, "#7a5433"); // lit bark
        rect(g, 9, 8, 1, 7, trunkSh);   // shadow bark
        px(g, 5, 14, trunk);            // left root flare
        px(g, 10, 14, trunkSh);         // right root flare

        // Voluminous lush spherical foliage
        rect(g, 2, 4, 12, 7, leaf);
        rect(g, 3, 2, 10, 9, leaf);
        rect(g, 5, 1, 6, 2, leaf);

        // Sunlight highlights (top & left lobes)
        rect(g, 3, 2, 5, 3, leafHi);
        rect(g, 4, 1, 4, 2, leafHi);
        rect(g, 2, 5, 3, 3, leafHi);
        px(g, 4, 1, "#6ad472"); px(g, 5, 1, "#6ad472");
        px(g, 9, 3, leafHi); px(g, 4, 6, leafHi);

        // Deep shade clusters (bottom & right lobes)
        rect(g, 4, 10, 8, 1, leafSh);
        rect(g, 7, 8, 6, 3, leafSh);
        rect(g, 11, 5, 3, 4, leafSh);
        px(g, 8, 10, "#163d1e"); px(g, 9, 10, "#163d1e");

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

    function sandTile(base, dark, light, variant) {
        const g = fill(base);
        const pts = [[2, 3], [7, 6], [12, 2], [4, 10], [9, 13], [14, 8]];
        scatter(g, pts, dark, variant);
        scatter(g, pts.map(([x, y]) => [(x + 6) % N, (y + 5) % N]), light, variant + 1);
        if (variant === 2) {
            // tiny white seashell
            px(g, 6, 8, "#ffffff"); px(g, 7, 8, "#f0e6d2"); px(g, 6, 9, "#e0d0b8");
        }
        return g;
    }

    function palmTile(sandBase, trunk, trunkSh, leaf, leafHi, leafSh) {
        const g = sandTile(sandBase, "#cbb27a", "#ded09b", 0);
        // Soft ground shadow on sand
        rect(g, 4, 14, 8, 2, "#967f4c");
        // Curved palm trunk
        px(g, 6, 14, trunk); px(g, 7, 14, trunkSh);
        px(g, 6, 13, trunk); px(g, 7, 13, trunkSh);
        px(g, 7, 12, trunk); px(g, 8, 12, trunkSh);
        px(g, 7, 11, trunk); px(g, 8, 11, trunkSh);
        px(g, 8, 10, trunk); px(g, 9, 10, trunkSh);
        px(g, 8, 9, trunk);  px(g, 9, 9, trunkSh);
        px(g, 8, 8, trunk);  px(g, 9, 8, trunkSh);
        // Coconuts
        px(g, 7, 7, "#5c3d1e"); px(g, 9, 7, "#5c3d1e");
        // Spreading lush palm fronds (drooping umbrella canopy)
        rect(g, 4, 4, 8, 3, leaf);
        rect(g, 2, 5, 12, 2, leaf);
        rect(g, 5, 2, 6, 3, leafHi);
        // Frond tips
        px(g, 1, 7, leafSh); px(g, 0, 8, leafSh);
        px(g, 14, 7, leafSh); px(g, 15, 8, leafSh);
        px(g, 3, 2, leafHi); px(g, 12, 2, leafHi);
        return g;
    }

    // ---- interiors ----------------------------------------------------------
    // Wooden floorboards: long planks with seams and a little grain.
    function floorBoards(plank, seam, grain, variant) {
        const g = fill(plank);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
            if ((x + y * 3) % 11 === 0) px(g, x, y, grain);
        const off = (variant % 2) * 8;
        rect(g, 0, (5 + off) % N, N, 1, seam);
        rect(g, 0, (13 + off) % N, N, 1, seam);
        rect(g, (variant % 2 ? 4 : 11), 0, 1, N, seam);   // staggered short seam
        return g;
    }
    // Flagstones for the forge: big irregular blocks, soot-dark mortar.
    function flagstones(stone, mortar, hi, variant) {
        const g = fill(mortar);
        const shift = (variant % 2) * 4;
        rect(g, 1, 1, 6, 6, stone); rect(g, 1, 1, 6, 1, hi);
        rect(g, 9 - shift, 1, 6, 6, stone); rect(g, 9 - shift, 1, 6, 1, hi);
        rect(g, 1, 9, 6, 6, stone); rect(g, 1, 9, 6, 1, hi);
        rect(g, 9 - shift, 9, 6, 6, stone); rect(g, 9 - shift, 9, 6, 1, hi);
        return g;
    }
    // Interior wall: plaster over a timber frame, with a skirting board.
    function wallInside(plaster, beam, beamSh, skirt) {
        const g = fill(plaster);
        rect(g, 0, 0, N, 2, beamSh);            // ceiling beam
        rect(g, 0, 2, N, 1, beam);
        rect(g, 3, 3, 2, 11, beam); px(g, 4, 3, beamSh);   // uprights
        rect(g, 11, 3, 2, 11, beam); px(g, 12, 3, beamSh);
        rect(g, 0, 14, N, 2, skirt);            // skirting
        return g;
    }
    // The way back out: an open doorway with daylight spilling in.
    function doorwayTile(frame, frameSh, light) {
        const g = fill(frame);
        rect(g, 3, 2, 10, 14, light);
        rect(g, 4, 4, 8, 12, "#f3e3b6");
        rect(g, 0, 0, N, 2, frameSh);
        rect(g, 0, 2, 3, 14, frameSh);
        rect(g, 13, 2, 3, 14, frameSh);
        return g;
    }

    // ---- registry -----------------------------------------------------------
    function compose(name, variant, neighbors, now) {
        variant = variant | 0;
        let g;
        switch (name) {
            case "grass": g = grass("#3d7a3a", "#356b33", "#4a8c42", variant); break;
            case "grass2": g = grass("#427f3f", "#3a7137", "#529349", variant); break;
            case "forest": g = grass("#2f5d33", "#26502b", "#387040", variant % 2 === 0 ? 2 : variant); break;
            case "path": g = speckled("#b79a63", "#9c8150", "#c9b078", variant); break;
            case "plaza": g = cobbles("#c7ad78", "#a98f5f", "#ddc793", variant); break;
            case "dirt": g = speckled("#5b4a34", "#463825", "#6d5940", variant); break;
            case "water": g = water("#2f6d8f", "#4f96b3", "#265a77", variant, neighbors, now); break;
            case "tree": g = treeTile("#3d7a3a", "#6b4a2a", "#4e341c", "#2e6b39", "#3f8a4a", "#1f4a28", false, neighbors); break;
            case "tree2": g = treeTile("#2f5d33", "#523818", "#3c2913", "#1f4a28", "#2e6b39", "#123018", true, neighbors); break;
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
            case "floor": g = floorBoards("#8a6239", "#6d4b29", "#9c7145", variant); break;
            case "floorStone": g = flagstones("#6d6a63", "#4c4944", "#807c73", variant); break;
            case "wallIn": g = wallInside("#c9b089", "#7a5433", "#5e3f26", "#6b4a2c"); break;
            case "doorway": g = doorwayTile("#7d5a33", "#5c4123", "#ffe9a8"); break;
            case "sand": g = sandTile("#d8c48a", "#c4ad6e", "#ebdca8", variant); break;
            case "palm": g = palmTile("#d8c48a", "#8a6239", "#5e3f22", "#2d8a3e", "#4cb55f", "#1b5a26"); break;
            case "sea": g = water("#1c5d85", "#3a8bb8", "#124060", variant, neighbors, now); break;
            default: g = fill("#101319");
        }
        return { w: N, h: N, grid: g };
    }

    // ---- draw with offscreen cache -----------------------------------------
    const _cache = new Map();
    function offscreen(name, variant, nKey, neighbors) {
        const key = name + "|" + variant + "|" + (nKey || "");
        const hit = _cache.get(key);
        if (hit !== undefined) return hit;
        const { grid } = compose(name, variant, neighbors);
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
            name === "fence" || name === "wallIn" || name === "doorway") return 0;
        // Deterministic 0..2 that varies per-tile; flowers (variant 2) ~20%.
        const h = (((col * 13 + row * 7) % 5) + 5) % 5;
        return h < 2 ? 0 : h < 4 ? 1 : 2;
    }

    function draw(ctx, name, sx, sy, ts, col, row, tilemap, now) {
        let neighbors = null, nKey = "";
        if (tilemap && (name === "water" || name === "sea" || name === "tree" || name === "tree2")) {
            const isMatch = (c, r) => {
                const inf = tilemap.infoAt(c, r);
                if (name === "water" || name === "sea") return inf.name === "water" || inf.name === "sea" || inf.name === "bridge";
                return inf.name === "tree" || inf.name === "tree2" || inf.name === "palm";
            };
            const up = isMatch(col, row - 1), down = isMatch(col, row + 1);
            const left = isMatch(col - 1, row), right = isMatch(col + 1, row);
            const ul = isMatch(col - 1, row - 1), ur = isMatch(col + 1, row - 1);
            const dl = isMatch(col - 1, row + 1), dr = isMatch(col + 1, row + 1);
            neighbors = { up, down, left, right, ul, ur, dl, dr };
            nKey = (up ? "1" : "0") + (down ? "1" : "0") + (left ? "1" : "0") + (right ? "1" : "0") +
                   (ul ? "1" : "0") + (ur ? "1" : "0") + (dl ? "1" : "0") + (dr ? "1" : "0");
        }

        const cv = offscreen(name, variantFor(name, col, row), nKey, neighbors);
        if (!cv) return false;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cv, sx, sy, ts, ts);
        return true;
    }

    const TileArt = { compose, draw, N };
    global.TileArt = TileArt;
    if (typeof module !== "undefined" && module.exports) module.exports = { TileArt };
})(typeof window !== "undefined" ? window : globalThis);
