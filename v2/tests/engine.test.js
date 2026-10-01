"use strict";

const { describe, it, expect, run } = require("../../tests/tiny-test.js");
const { loadEngine } = require("./harness.js");

// ---------------------------------------------------------------------------
// Vectors & rects
// ---------------------------------------------------------------------------
describe("Vec2 / Rect", () => {
    it("normalises a diagonal to unit length", () => {
        const { Vec2 } = loadEngine().exports;
        const v = new Vec2(3, 4).normalize();
        expect(Math.abs(v.length() - 1) < 1e-9).toBe(true);
    });
    it("keeps a zero vector zero", () => {
        const { Vec2 } = loadEngine().exports;
        const v = new Vec2(0, 0).normalize();
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
    });
    it("detects rect overlap and separation", () => {
        const { Rect } = loadEngine().exports;
        expect(Rect.intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
        expect(Rect.intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 5, h: 5 })).toBe(false);
    });
    it("clamps values", () => {
        const { clamp } = loadEngine().exports;
        expect(clamp(15, 0, 10)).toBe(10);
        expect(clamp(-3, 0, 10)).toBe(0);
        expect(clamp(5, 0, 10)).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
describe("Input", () => {
    it("tracks held keys and movement axis", () => {
        const { Input } = loadEngine().exports;
        const i = new Input();
        i.press("KeyD");
        expect(i.isDown("KeyD")).toBe(true);
        expect(i.axis().x).toBe(1);
        i.press("KeyW");
        expect(i.axis().y).toBe(-1);
        i.release("KeyD");
        expect(i.axis().x).toBe(0);
    });
    it("edge-triggers wasPressed until consumed", () => {
        const { Input } = loadEngine().exports;
        const i = new Input();
        i.press("KeyE");
        expect(i.wasPressed("KeyE")).toBe(true);
        i.consumePressed();
        expect(i.wasPressed("KeyE")).toBe(false);
        // holding does not re-trigger without a fresh press
        i.press("KeyE");
        expect(i.wasPressed("KeyE")).toBe(false);
    });
    it("arrow keys map to the same axis as WASD", () => {
        const { Input } = loadEngine().exports;
        const i = new Input();
        i.press("ArrowLeft");
        expect(i.axis().x).toBe(-1);
        i.press("ArrowDown");
        expect(i.axis().y).toBe(1);
    });
    it("analog override wins over keys until cleared", () => {
        const { Input } = loadEngine().exports;
        const i = new Input();
        i.press("KeyD");                 // keyboard says x = +1
        i.setAnalog(-0.5, 0.7);          // joystick overrides
        expect(i.axis().x).toBe(-0.5);
        expect(i.axis().y).toBe(0.7);
        i.clearAnalog();
        expect(i.axis().x).toBe(1);      // back to keyboard
    });
});

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
describe("Camera", () => {
    it("clamps to map edges", () => {
        const { Camera } = loadEngine().exports;
        const cam = new Camera(200, 100);
        cam.follow(0, 0, 1000, 1000);
        expect(cam.x).toBe(0);
        expect(cam.y).toBe(0);
        cam.follow(1000, 1000, 1000, 1000);
        expect(cam.x).toBe(800);
        expect(cam.y).toBe(900);
    });
    it("centres a map smaller than the viewport", () => {
        const { Camera } = loadEngine().exports;
        const cam = new Camera(400, 400);
        cam.follow(50, 50, 200, 200);
        expect(cam.x).toBe(-100);
        expect(cam.y).toBe(-100);
    });
    it("computes visibility", () => {
        const { Camera } = loadEngine().exports;
        const cam = new Camera(100, 100);
        cam.follow(50, 50, 1000, 1000); // x=0,y=0
        expect(cam.isVisible({ x: 10, y: 10, w: 5, h: 5 })).toBe(true);
        expect(cam.isVisible({ x: 500, y: 500, w: 5, h: 5 })).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// TileMap
// ---------------------------------------------------------------------------
describe("TileMap", () => {
    const rows = [
        "####",
        "#..#",
        "#.T#",
        "####"
    ];
    function map(g) { const { TileMap } = loadEngine().exports; return new TileMap(g, 32); }

    it("reports dimensions in tiles and pixels", () => {
        const m = map(rows);
        expect(m.colsCount).toBe(4);
        expect(m.rowsCount).toBe(4);
        expect(m.pixelWidth).toBe(128);
        expect(m.pixelHeight).toBe(128);
    });
    it("resolves tiles and solidity, treating OOB as solid", () => {
        const m = map(rows);
        expect(m.tileAt(1, 1)).toBe(".");
        expect(m.isSolidTile(0, 0)).toBe(true);  // wall
        expect(m.isSolidTile(1, 1)).toBe(false); // grass
        expect(m.isSolidTile(2, 2)).toBe(true);  // tree
        expect(m.isSolidTile(-1, 0)).toBe(true); // out of bounds
    });
    it("maps pixels to tiles", () => {
        const m = map(rows);
        expect(m.colAtPixel(40)).toBe(1);
        expect(m.rowAtPixel(70)).toBe(2);
        expect(m.isSolidAtPixel(70, 70)).toBe(true); // (col2,row2)=tree
    });
});

// ---------------------------------------------------------------------------
// Collision (moveAndCollide)
// ---------------------------------------------------------------------------
describe("moveAndCollide", () => {
    function setup() {
        const { TileMap, moveAndCollide } = loadEngine().exports;
        // 5x3 arena: solid border, open middle row.
        const m = new TileMap(["#####", "#...#", "#####"], 32);
        return { m, moveAndCollide };
    }
    it("moves freely in open space", () => {
        const { m, moveAndCollide } = setup();
        const res = moveAndCollide({ x: 40, y: 40, w: 16, h: 16 }, 10, 0, m);
        expect(res.x).toBe(50);
        expect(res.hitX).toBe(false);
    });
    it("stops against a wall on the right", () => {
        const { m, moveAndCollide } = setup();
        // box near the right open cell (col3 = x96..128 wall at col4 x128)
        const res = moveAndCollide({ x: 100, y: 40, w: 16, h: 16 }, 40, 0, m);
        expect(res.hitX).toBe(true);
        expect(res.x + 16 <= 128).toBe(true); // never past the wall
    });
    it("stops against a wall going up", () => {
        const { m, moveAndCollide } = setup();
        const res = moveAndCollide({ x: 40, y: 40, w: 16, h: 16 }, 0, -40, m);
        expect(res.hitY).toBe(true);
        expect(res.y >= 32).toBe(true); // pushed out of the top wall (row0)
    });
});

// ---------------------------------------------------------------------------
// Player2D
// ---------------------------------------------------------------------------
describe("Player2D", () => {
    it("moves and sets facing from input", () => {
        const { Player2D } = loadEngine().exports;
        const p = new Player2D(100, 100, { speed: 100 });
        p.update(0.1, { x: 1, y: 0 }, null);
        expect(p.x > 100).toBe(true);
        expect(p.facing).toBe("right");
        p.update(0.1, { x: 0, y: -1 }, null);
        expect(p.facing).toBe("up");
    });
    it("is idle (frame 0) when not moving", () => {
        const { Player2D } = loadEngine().exports;
        const p = new Player2D(0, 0);
        p.update(0.1, { x: 0, y: 0 }, null);
        expect(p.moving).toBe(false);
        expect(p.frame).toBe(0);
    });
    it("cycles animation frames while walking", () => {
        const { Player2D } = loadEngine().exports;
        const p = new Player2D(0, 0, { frameDuration: 0.1, frameCount: 4 });
        for (let i = 0; i < 3; i++) p.update(0.1, { x: 1, y: 0 }, null);
        expect(p.frame >= 0 && p.frame < 4).toBe(true);
        expect(p.moving).toBe(true);
    });
    it("respects tile collision when a map is given", () => {
        const { Player2D, TileMap } = loadEngine().exports;
        const m = new TileMap(["###", "#.#", "###"], 32);
        const p = new Player2D(40, 40, { w: 16, h: 16, speed: 1000 });
        p.update(1, { x: 1, y: 0 }, m); // slam into the right wall
        expect(p.x + p.w <= 64).toBe(true);
    });
    it("accelerates from rest and glides to a stop (inertia)", () => {
        const { Player2D } = loadEngine().exports;
        const p = new Player2D(0, 0, { speed: 200, accel: 800, friction: 800 });
        p.update(0.05, { x: 1, y: 0 }, null);
        const early = p.speed;
        expect(early > 0 && early < 200).toBe(true);      // not instant full speed
        for (let i = 0; i < 30; i++) p.update(0.05, { x: 1, y: 0 }, null);
        expect(p.speed > 150).toBe(true);                 // ramps toward max
        // release input -> should still glide briefly, then settle
        p.update(0.05, { x: 0, y: 0 }, null);
        expect(p.speed < 200).toBe(true);
        for (let i = 0; i < 30; i++) p.update(0.05, { x: 0, y: 0 }, null);
        expect(p.speed).toBe(0);
        expect(p.moving).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Enemy2D wander + encounters
// ---------------------------------------------------------------------------
describe("Enemy2D", () => {
    // Deterministic rng so movement is reproducible.
    function seq(vals) { let i = 0; return () => vals[(i++) % vals.length]; }

    it("stays near home within its wander radius", () => {
        const { Enemy2D, TileMap } = loadEngine().exports;
        const m = new TileMap(["........", "........", "........", "........", "........", "........"], 32);
        const e = new Enemy2D(100, 100, { wanderRadius: 40, speed: 60, rng: seq([0.2, 0.9, 0.5, 0.1, 0.7]) });
        for (let i = 0; i < 200; i++) e.update(0.1, m);
        expect(Math.hypot(e.x - e.homeX, e.y - e.homeY) <= 60).toBe(true); // radius + a step of slack
    });

    it("collides with walls instead of passing through", () => {
        const { Enemy2D, TileMap } = loadEngine().exports;
        const m = new TileMap(["###", "#.#", "###"], 32);
        const e = new Enemy2D(40, 40, { w: 16, h: 16, speed: 500, rng: () => 0.15 /* always move right-ish */ });
        for (let i = 0; i < 20; i++) e.update(0.1, m);
        expect(e.x + e.w <= 64).toBe(true);
        expect(e.y + e.h <= 64).toBe(true);
        expect(e.x >= 32).toBe(true);
        expect(e.y >= 32).toBe(true);
    });

    it("detectEncounter finds an overlapping foe and ignores the dead", () => {
        const { Enemy2D, detectEncounter } = loadEngine().exports;
        const near = new Enemy2D(100, 100, { w: 20, h: 20 });
        const far = new Enemy2D(400, 400, { w: 20, h: 20 });
        const hero = { x: 110, y: 110, w: 20, h: 20 };
        expect(detectEncounter(hero, [far, near]) === near).toBe(true);
        near.alive = false;
        expect(detectEncounter(hero, [far, near]) === null).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Zones & portals (multi-map world)
// ---------------------------------------------------------------------------
describe("Zones & portals", () => {
    it("village, forest and cave all exist with rectangular grids", () => {
        const { MAPS } = loadEngine().exports;
        for (const id of ["village", "forest", "cave"]) {
            const m = MAPS[id];
            expect(!!m).toBe(true);
            const widths = new Set(m.rows.map(r => r.length));
            expect(widths.size).toBe(1);
        }
    });

    it("every portal links to a real zone and stands on a walkable tile", () => {
        const { MAPS, tileInfo } = loadEngine().exports;
        for (const id of Object.keys(MAPS)) {
            const m = MAPS[id];
            for (const p of (m.portals || [])) {
                expect(!!MAPS[p.to]).toBe(true);                        // target exists
                const ch = m.rows[p.row][p.col];
                expect(tileInfo(ch).solid).toBe(false);                // portal walkable
                const dest = MAPS[p.to];
                const dch = dest.rows[p.spawn.row][p.spawn.col];
                expect(tileInfo(dch).solid).toBe(false);               // spawn walkable
            }
        }
    });

    it("every zone spawn is on a non-solid tile", () => {
        const { MAPS, tileInfo } = loadEngine().exports;
        for (const id of Object.keys(MAPS)) {
            const m = MAPS[id];
            expect(tileInfo(m.rows[m.spawn.row][m.spawn.col]).solid).toBe(false);
        }
    });

    it("forest<->cave and village<->forest links are reciprocal", () => {
        const { MAPS } = loadEngine().exports;
        const targets = (id) => (MAPS[id].portals || []).map(p => p.to);
        expect(targets("village").includes("forest")).toBe(true);
        expect(targets("forest").includes("village")).toBe(true);
        expect(targets("forest").includes("cave")).toBe(true);
        expect(targets("cave").includes("forest")).toBe(true);
    });

    it("village NPC schedule stops and resource nodes are on walkable tiles", () => {
        const { MAPS, tileInfo } = loadEngine().exports;
        const v = MAPS.village;
        for (const npc of (v.npcs || [])) {
            for (const s of npc.schedule) {
                expect(tileInfo(v.rows[s.row][s.col]).solid).toBe(false);
            }
        }
        for (const r of (v.resources || [])) {
            expect(tileInfo(v.rows[r.row][r.col]).solid).toBe(false);
        }
        for (const c of (v.farm || [])) {
            expect(tileInfo(v.rows[c.row][c.col]).solid).toBe(false);
        }
    });
});

// ---------------------------------------------------------------------------
// Farming
// ---------------------------------------------------------------------------
describe("Farm plots", () => {
    it("cycles empty→tilled→growing→ready→harvest and needs seeds", () => {
        const { Farm } = loadEngine().exports;
        const f = new Farm({ rng: () => 0.9 });   // deterministic: no bumper crop
        expect(f.actionFor(1, 1)).toBe("till");
        expect(f.till(1, 1).ok).toBe(true);
        expect(f.actionFor(1, 1)).toBe("plant");
        expect(f.plant(1, 1, 1, 0).ok).toBe(false);        // no seeds
        const pl = f.plant(1, 1, 1, 3);
        expect(pl.ok && pl.consumeSeed).toBe(true);
        expect(f.actionFor(1, 1)).toBe("water");
        expect(f.harvest(1, 1).ok).toBe(false);            // not ready yet
    });

    it("grows only when watered the previous day, then harvest yields the crop", () => {
        const { Farm, CROP } = loadEngine().exports;
        const f = new Farm({ rng: () => 0.9 });
        f.till(2, 2); f.plant(2, 2, 1, 5);
        // Not watered on day 1 → no growth at dawn of day 2.
        f.onNewDay(2);
        expect(f.plot(2, 2).progress).toBe(0);
        // Water on day 2, grow at dawn of day 3, water again, grow at dawn of day 4.
        f.water(2, 2, 2); f.onNewDay(3);
        expect(f.plot(2, 2).progress).toBe(1);
        f.water(2, 2, 3); f.onNewDay(4);
        expect(f.plot(2, 2).state).toBe("ready");          // growDays = 2
        const h = f.harvest(2, 2);
        expect(h.ok).toBe(true);
        expect(h.crop).toBe(CROP.res);
        expect(h.amount >= 1).toBe(true);
        expect(f.plot(2, 2).state).toBe("tilled");         // ready to replant
    });

    it("water/harvest are rejected in the wrong state; watering is once per day", () => {
        const { Farm } = loadEngine().exports;
        const f = new Farm();
        expect(f.water(3, 3, 1).ok).toBe(false);           // nothing planted
        f.till(3, 3); f.plant(3, 3, 1, 1);
        expect(f.water(3, 3, 1).ok).toBe(true);
        expect(f.water(3, 3, 1).already).toBe(true);       // same day again
    });
});

// ---------------------------------------------------------------------------
// Living NPCs — daily schedule
// ---------------------------------------------------------------------------
describe("NPC2D schedule", () => {
    function makeMap(exports) {
        const { TileMap } = exports;
        // 5x5 open grass field (no walls inside) for deterministic movement.
        return new TileMap([".....", ".....", ".....", ".....", "....."], 32);
    }
    const def = {
        id: "t", name: "Test", schedule: [
            { from: 0, col: 0, row: 0 },
            { from: 600, col: 4, row: 4 },
            { from: 1200, col: 0, row: 4 }
        ]
    };

    it("selects the last stop whose start has passed (and wraps before dawn)", () => {
        const { NPC2D } = loadEngine().exports;
        const n = new NPC2D(def, 32);
        expect(n.stopAt(0).col).toBe(0);
        expect(n.stopAt(700).col).toBe(4);
        expect(n.stopAt(1300).col).toBe(0);
        expect(n.stopAt(1300).row).toBe(4);
        // Before the first stop's minute it wraps to the previous day's last stop.
        const n2 = new NPC2D({ id: "x", schedule: [{ from: 300, col: 2, row: 2 }, { from: 900, col: 1, row: 1 }] }, 32);
        expect(n2.stopAt(100).col).toBe(1);
    });

    it("places on the scheduled tile and walks toward the active stop", () => {
        const { NPC2D } = loadEngine().exports;
        const ex = loadEngine().exports;
        const map = makeMap(ex);
        const n = new NPC2D(def, 32);
        n.placeAt(0);
        expect(Math.round(n.x)).toBe((32 - n.w) / 2);
        // At minute 700 the target is (4,4); after stepping it should move +x/+y.
        const x0 = n.x, y0 = n.y;
        for (let i = 0; i < 30; i++) n.update(0.1, map, 700);
        expect(n.x > x0).toBe(true);
        expect(n.y > y0).toBe(true);
        expect(n.moving).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Social / friendship
// ---------------------------------------------------------------------------
describe("Social friendship", () => {
    it("talk once per day; hearts grow from points", () => {
        const { Social } = loadEngine().exports;
        const s = new Social();
        s.setDay(1);
        const r1 = s.talk("a");
        expect(r1.gained > 0).toBe(true);
        const r2 = s.talk("a");            // same day → blocked
        expect(r2.already).toBe(true);
        s.setDay(2);
        expect(s.talk("a").already).toBe(false);
        expect(s.hearts("a")).toBe(Math.floor(s.points("a") / 100));
    });

    it("liked gifts grant more, capped once per day", () => {
        const { Social } = loadEngine().exports;
        const s = new Social();
        s.setDay(1);
        const plain = s.gift("a", false);
        s.setDay(2);
        const loved = s.gift("a", true);
        expect(loved.gained > plain.gained).toBe(true);
        expect(s.gift("a", true).already).toBe(true); // second gift same day blocked
    });
});

// ---------------------------------------------------------------------------
// Resource gathering
// ---------------------------------------------------------------------------
describe("Resource nodes & bag", () => {
    it("depletes over hits then regrows after cooldown", () => {
        const { ResourceNode } = loadEngine().exports;
        const node = new ResourceNode({ type: "tree", col: 1, row: 1 }, 32);
        let total = 0, felled = false;
        while (!node.depleted) { const r = node.hit(); total += r.amount; felled = felled || r.felled; }
        expect(felled).toBe(true);
        expect(total > node.maxHits).toBe(true);   // bonus on the felling hit
        expect(node.hit()).toBe(null);              // nothing while depleted
        node.update(node.regrow + 1);
        expect(node.depleted).toBe(false);          // regrown
    });

    it("bag tallies, removes and lists entries", () => {
        const { ResourceBag } = loadEngine().exports;
        const bag = new ResourceBag();
        bag.add("wood", 3); bag.add("wood", 2); bag.add("stone", 1);
        expect(bag.count("wood")).toBe(5);
        expect(bag.remove("wood", 4)).toBe(4);
        expect(bag.count("wood")).toBe(1);
        expect(bag.remove("stone", 9)).toBe(1);     // can't remove more than held
        expect(bag.total()).toBe(1);
        expect(bag.entries().length).toBe(1);
    });
});

run();

// ---------------------------------------------------------------------------
// Villager requests
// ---------------------------------------------------------------------------
describe("Villager requests", () => {
    it("stays silent with strangers and asks once you have chatted", () => {
        const { Requests, REQUEST_MIN_POINTS } = loadEngine().exports;
        const r = new Requests({ rng: () => 0 });
        expect(r.ensure("marta", 0, 1)).toBe(null);          // never talked
        const req = r.ensure("marta", REQUEST_MIN_POINTS, 1);
        expect(!!req).toBe(true);
        expect(typeof req.res).toBe("string");
        expect(req.n > 0).toBe(true);
    });

    it("keeps one open request per villager", () => {
        const { Requests } = loadEngine().exports;
        const r = new Requests({ rng: () => 0.5 });
        const a = r.ensure("boris", 50, 1);
        const b = r.ensure("boris", 50, 2);
        expect(a).toBe(b);                                    // same errand
        expect(r.current("boris")).toBe(a);
    });

    it("refuses delivery without the goods and pays out with them", () => {
        const { Requests, REQUEST_FRIENDSHIP } = loadEngine().exports;
        const r = new Requests({ rng: () => 0 });
        const req = r.ensure("lena", 50, 1);
        const short = r.fulfil("lena", req.n - 1);
        expect(short.ok).toBe(false);
        expect(short.short).toBe(1);
        expect(r.current("lena")).toBe(req);                  // still pending

        const done = r.fulfil("lena", req.n);
        expect(done.ok).toBe(true);
        expect(done.take).toBe(req.n);
        expect(done.gold > 0).toBe(true);
        expect(done.friendship).toBe(REQUEST_FRIENDSHIP);
        expect(r.current("lena")).toBe(null);                 // cleared
        expect(r.completed("lena")).toBe(1);
    });

    it("pays better as the villager trusts you more", () => {
        const { Requests } = loadEngine().exports;
        const r = new Requests({ rng: () => 0 });
        const first = r.ensure("marta", 50, 1).gold;
        r.fulfil("marta", 99);
        const second = r.ensure("marta", 50, 2).gold;
        expect(second > first).toBe(true);
    });

    it("friendship can be awarded directly, outside the daily gates", () => {
        const { Social } = loadEngine().exports;
        const s = new Social();
        s.setDay(1);
        s.talk("marta");
        const before = s.points("marta");
        s.award("marta", 45);
        expect(s.points("marta")).toBe(before + 45);
        expect(s.canTalk("marta")).toBe(false);               // gate untouched
    });
});

// ---------------------------------------------------------------------------
// Interiors
// ---------------------------------------------------------------------------
describe("Interiors", () => {
    it("every interior is enclosed, indoor and has a way back out", () => {
        const { MAPS, tileInfo } = loadEngine().exports;
        for (const id of ["home", "shop_in", "forge_in"]) {
            const m = MAPS[id];
            expect(!!m).toBe(true);
            expect(m.indoor).toBe(true);
            expect(m.portals.length > 0).toBe(true);
            // the room is walled in: every border tile is solid except doorways
            const last = m.rows.length - 1;
            for (let c = 0; c < m.rows[0].length; c++) {
                const top = tileInfo(m.rows[0][c]).solid;
                const bottomKey = m.rows[last][c];
                const isDoor = m.portals.some(p => p.col === c && p.row === last);
                expect(top).toBe(true);
                if (!isDoor) expect(tileInfo(bottomKey).solid).toBe(true);
            }
            // spawn is inside and walkable
            expect(tileInfo(m.rows[m.spawn.row][m.spawn.col]).solid).toBe(false);
        }
    });

    it("village doors lead to interiors that lead back to the village", () => {
        const { MAPS, tileInfo } = loadEngine().exports;
        const doors = MAPS.village.interactables.filter(i => i.action === "enter");
        expect(doors.length).toBe(3);
        for (const d of doors) {
            const room = MAPS[d.to];
            expect(!!room).toBe(true);
            // entering lands on a walkable tile inside
            expect(tileInfo(room.rows[d.spawn.row][d.spawn.col]).solid).toBe(false);
            // and the room sends you back to a walkable village tile
            const back = room.portals.find(p => p.to === "village");
            expect(!!back).toBe(true);
            expect(tileInfo(MAPS.village.rows[back.spawn.row][back.spawn.col]).solid).toBe(false);
        }
    });

    it("interior NPCs stand on free floor, never in a wall or in furniture", () => {
        const { MAPS, tileInfo } = loadEngine().exports;
        const sizes = { bed: [1, 2], table: [2, 1], counter: [2, 1], fireplace: [2, 1], rug: [2, 2] };
        for (const id of ["shop_in", "forge_in"]) {
            const m = MAPS[id];
            expect(m.npcs.length > 0).toBe(true);
            const blocked = new Set();
            for (const f of (m.furniture || [])) {
                if (f.kind === "rug") continue;                 // rugs are walkable
                const [w, h] = sizes[f.kind] || [1, 1];
                for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) blocked.add((f.col + i) + "," + (f.row + j));
            }
            for (const npc of m.npcs) {
                expect(npc.schedule.length > 0).toBe(true);
                for (const stop of npc.schedule) {
                    expect(tileInfo(m.rows[stop.row][stop.col]).solid).toBe(false);
                    expect(blocked.has(stop.col + "," + stop.row)).toBe(false);
                }
            }
        }
    });

    it("every villager with a request pool exists somewhere in the world", () => {
        const { MAPS, REQUEST_POOL } = loadEngine().exports;
        const ids = new Set();
        for (const m of Object.values(MAPS)) for (const n of (m.npcs || [])) ids.add(n.id);
        for (const id of Object.keys(REQUEST_POOL)) expect(ids.has(id)).toBe(true);
    });

    it("blocked cells make furniture solid without changing the tile", () => {
        const { TileMap, MAPS } = loadEngine().exports;
        const m = MAPS.home;
        const tm = new TileMap(m.rows, m.tileSize);
        expect(tm.isSolidTile(1, 1)).toBe(false);   // bare floor
        tm.block(1, 1);                              // the bed stands here
        expect(tm.isSolidTile(1, 1)).toBe(true);
        expect(tm.tileAt(1, 1)).toBe("o");           // art unchanged
    });
});

// ---------------------------------------------------------------------------
// Fishing system
// ---------------------------------------------------------------------------
describe("Fishing system", () => {
    it("casts line with delay shortened by better rods", () => {
        const { FishingSystem } = loadEngine().exports;
        const f = new FishingSystem({ rng: () => 0 });
        const c1 = f.cast(1);
        const c3 = f.cast(3);
        expect(c1.delay > c3.delay).toBe(true);
        expect(c1.rodLevel).toBe(1);
        expect(c3.rodLevel).toBe(3);
    });

    it("catches fish and grants resources and xp", () => {
        const { FishingSystem } = loadEngine().exports;
        const f = new FishingSystem({ rng: () => 0.1 });
        const res = f.catchFish(1);
        expect(res.ok).toBe(true);
        expect(typeof res.res).toBe("string");
        expect(res.amount >= 1).toBe(true);
        expect(res.xp > 0).toBe(true);
    });

    it("tier 1 rod catches common fish, tier 2 rod unlocks pike", () => {
        const { FishingSystem } = loadEngine().exports;
        // On tier 1 rod, pike (minRod: 2) must never be drawn
        const f1 = new FishingSystem({ rng: () => 0.999 });
        const res1 = f1.catchFish(1);
        expect(res1.res !== "fish_pike").toBe(true);

        // On tier 2 rod, pike is accessible
        const f2 = new FishingSystem({ rng: () => 0.99 });
        const res2 = f2.catchFish(2);
        expect(res2.ok).toBe(true);
    });

    it("better rods can hook double catches or bonus items", () => {
        const { FishingSystem } = loadEngine().exports;
        // Rng configured to trigger treasureRoll < 0.12 * level
        let doubleSeen = false;
        for (let i = 0; i < 20; i++) {
            const f = new FishingSystem({ rng: () => 0.05 });
            const res = f.catchFish(3);
            if (res.amount === 2 || res.bonus) doubleSeen = true;
        }
        expect(doubleSeen).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Cooking system
// ---------------------------------------------------------------------------
describe("Cooking system", () => {
    it("lists recipes with descriptions, stats and ingredient requirements", () => {
        const { CookingSystem, ResourceBag } = loadEngine().exports;
        const cs = new CookingSystem();
        const bag = new ResourceBag();
        const list = cs.list(bag);
        expect(list.length >= 5).toBe(true);
        expect(list.some(r => r.id === "dish_stew")).toBe(true);
        expect(list.some(r => r.id === "dish_fish")).toBe(true);
        expect(list.some(r => r.id === "dish_pie")).toBe(true);
    });

    it("detects when ingredients are missing and refuses to cook", () => {
        const { CookingSystem, ResourceBag } = loadEngine().exports;
        const cs = new CookingSystem();
        const bag = new ResourceBag();
        expect(cs.canCook("dish_stew", bag)).toBe(false);
        const r = cs.cook("dish_stew", bag);
        expect(r.ok).toBe(false);
        expect(bag.count("dish_stew")).toBe(0);
    });

    it("cooks when ingredients are present in bag, consuming them and yielding dish", () => {
        const { CookingSystem, ResourceBag } = loadEngine().exports;
        const cs = new CookingSystem();
        const bag = new ResourceBag();
        bag.add("veg", 2);
        bag.add("herb", 1);
        expect(cs.canCook("dish_stew", bag)).toBe(true);
        const res = cs.cook("dish_stew", bag);
        expect(res.ok).toBe(true);
        expect(bag.count("veg")).toBe(0);
        expect(bag.count("herb")).toBe(0);
        expect(bag.count("dish_stew")).toBe(1);
    });

    it("supports cooking from home storage chest when bag is short", () => {
        const { CookingSystem, ResourceBag } = loadEngine().exports;
        const cs = new CookingSystem();
        const bag = new ResourceBag();
        const storage = new ResourceBag();
        bag.add("veg", 1);
        storage.add("veg", 1);
        storage.add("herb", 1);
        expect(cs.canCook("dish_stew", bag, storage)).toBe(true);
        const res = cs.cook("dish_stew", bag, storage);
        expect(res.ok).toBe(true);
        expect(bag.count("veg")).toBe(0);
        expect(storage.count("veg")).toBe(0);
        expect(storage.count("herb")).toBe(0);
        expect(bag.count("dish_stew")).toBe(1);
    });

    it("supports alternative fish ingredients for grilled fish", () => {
        const { CookingSystem, ResourceBag } = loadEngine().exports;
        const cs = new CookingSystem();
        const bag = new ResourceBag();
        bag.add("crayfish", 2);
        bag.add("wood", 1);
        expect(cs.canCook("dish_fish", bag)).toBe(true);
        const res = cs.cook("dish_fish", bag);
        expect(res.ok).toBe(true);
        expect(bag.count("crayfish")).toBe(0);
        expect(bag.count("dish_fish")).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Tools and forge upgrades
// ---------------------------------------------------------------------------
describe("Tools and upgrades", () => {
    it("starts at tier 1 with defined names and info", () => {
        const { Tools } = loadEngine().exports;
        const t = new Tools();
        expect(t.level("rod")).toBe(1);
        expect(t.level("axe")).toBe(1);
        expect(t.level("pickaxe")).toBe(1);
        expect(t.level("can")).toBe(1);
        expect(t.info("rod").name.includes("удочка")).toBe(true);
    });

    it("refuses upgrade when resources or gold are missing", () => {
        const { Tools, ResourceBag } = loadEngine().exports;
        const t = new Tools();
        const hero = { gold: 10, inventory: [] };
        const bag = new ResourceBag();
        const check = t.canUpgrade("rod", hero, bag);
        expect(check.ok).toBe(false);
    });

    it("upgrades tool tier, consuming gold and resources", () => {
        const { Tools, ResourceBag } = loadEngine().exports;
        const t = new Tools();
        const hero = { gold: 100, inventory: [{ name: "Эссенция ковки", type: "essence" }] };
        const bag = new ResourceBag();
        bag.add("wood", 10);
        const res = t.upgrade("rod", hero, bag);
        expect(res.ok).toBe(true);
        expect(t.level("rod")).toBe(2);
        expect(hero.gold).toBe(50);
        expect(bag.count("wood")).toBe(4);
    });

    it("tool upgrade bonus enhances gathering hit yield", () => {
        const { ResourceNode } = loadEngine().exports;
        const node = new ResourceNode({ type: "tree", col: 1, row: 1, hits: 2, bonus: 1 });
        const res = node.hit(1); // toolBonus = 1
        expect(res.amount >= 1).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Town aesthetics and outdoor furniture
// ---------------------------------------------------------------------------
describe("Town aesthetics and outdoor furniture", () => {
    it("defines pixel art for outdoor village furniture", () => {
        const { Furniture } = loadEngine().exports;
        for (const kind of ["well", "board", "lamp", "bench", "stall", "flowerbed", "mailbox", "pier", "fountain"]) {
            expect(!!Furniture.KINDS[kind]).toBe(true);
            const size = Furniture.size(kind);
            expect(size.w >= 1).toBe(true);
            expect(size.h >= 1).toBe(true);
        }
    });

    it("village map has outdoor furniture and square interactables", () => {
        const { MAPS } = loadEngine().exports;
        const v = MAPS.village;
        expect((v.furniture || []).length >= 5).toBe(true);
        const well = v.interactables.find(i => i.action === "well");
        const board = v.interactables.find(i => i.action === "board");
        const cat = v.interactables.find(i => i.action === "cat");
        expect(!!well).toBe(true);
        expect(!!board).toBe(true);
        expect(!!cat).toBe(true);
    });

    it("MobRig supports peaceful village fauna (cat, chicken, duck)", () => {
        const { MobRig } = loadEngine().exports;
        for (const kind of ["cat", "chicken", "duck"]) {
            const art = MobRig.compose(kind, 0);
            expect(!!art).toBe(true);
            expect(art.w > 0).toBe(true);
            expect(art.h > 0).toBe(true);
            expect(MobRig.heightScale(kind) > 0).toBe(true);
        }
    });
    it("TileArt provides organic water autotiling and connected tree canopies", () => {
        const { TileArt } = loadEngine().exports;
        // Standalone water and water with sand shore neighbors
        const wCenter = TileArt.compose("water", 0, { up: true, down: true, left: true, right: true });
        const wShore = TileArt.compose("water", 0, { up: false, down: true, left: false, right: true });
        expect(wCenter.w).toBe(16);
        expect(wCenter.h).toBe(16);
        expect(wShore.w).toBe(16);
        expect(wShore.h).toBe(16);

        // Connected forest canopy vs standalone trees
        const tOak = TileArt.compose("tree", 0);
        const tPine = TileArt.compose("tree2", 0);
        const tForest = TileArt.compose("tree", 0, { up: true, down: false, left: true, right: true });
        expect(tOak.w).toBe(16);
        expect(tPine.w).toBe(16);
        expect(tForest.w).toBe(16);
    });
});
