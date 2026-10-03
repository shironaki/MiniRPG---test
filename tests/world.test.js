/** v3 tests — world: tiles, chunked map, collision, zone generation, weather. */
import { suite, test, assert, run } from "./tiny.js";
import { T, TILES, tileInfo, isSolidTile, TILE_SIZE } from "../js/world/tiles.js";
import { TileMap, moveAndCollide, CHUNK } from "../js/world/tilemap.js";
import { generateZone, WorldMap, Zone } from "../js/world/worldgen.js";
import { ZONES, BIOMES, valleyTileCount, oppositeEdge, zoneDef } from "../js/world/regions.js";
import { WeatherSystem, WEATHER } from "../js/world/weather.js";
import { GameClock } from "../js/core/time.js";
import { EventBus } from "../js/core/events.js";

suite("tiles");

test("every tile has a complete definition", () => {
    for (const [id, def] of Object.entries(TILES)) {
        assert.ok(def.key, `tile ${id} has no key`);
        assert.ok(Array.isArray(def.colors) && def.colors.length === 3, `tile ${def.key} needs 3 colours`);
        assert.ok(typeof def.solid === "boolean");
        assert.gte(def.speed, 0);
    }
});

test("water blocks only at depth; paths are faster than mud", () => {
    assert.not(isSolidTile(T.WATER));
    assert.ok(isSolidTile(T.DEEP));
    assert.ok(isSolidTile(T.CLIFF));
    assert.gt(tileInfo(T.PATH).speed, tileInfo(T.MUD).speed);
});

suite("tilemap");

test("get/set, bounds and out-of-range reads", () => {
    const m = new TileMap(10, 8, T.GRASS);
    assert.eq(m.get(0, 0), T.GRASS);
    m.set(3, 3, T.WATER);
    assert.eq(m.get(3, 3), T.WATER);
    assert.eq(m.get(-1, 0), T.VOID);
    assert.eq(m.get(99, 99), T.VOID);
    assert.eq(m.widthPx, 10 * TILE_SIZE);
});

test("dirty chunks track edits and clear on demand", () => {
    const m = new TileMap(40, 40);
    m.dirtyChunks.clear();
    m.set(20, 20, T.PATH);
    assert.gte(m.dirtyChunks.size, 1);
    assert.eq(m.chunksX, Math.ceil(40 / CHUNK));
});

test("chunksInRect only returns visible chunks", () => {
    const m = new TileMap(64, 64);
    const all = m.chunksInRect(0, 0, m.widthPx, m.heightPx);
    const few = m.chunksInRect(0, 0, 100, 100);
    assert.eq(all.length, m.chunksX * m.chunksY);
    assert.lt(few.length, all.length);
});

test("collision slides along walls instead of sticking", () => {
    const m = new TileMap(10, 10, T.GRASS);
    m.fillRect(5, 0, 1, 10, T.CLIFF);          // vertical wall at x=5
    const start = { x: 4 * TILE_SIZE + 10, y: 2 * TILE_SIZE };
    const res = moveAndCollide(m, start.x, start.y, 20, 10, 9);
    assert.ok(res.hitX, "should be blocked horizontally");
    assert.gt(res.y, start.y, "should still slide vertically");
});

test("collision keeps the mover inside the map", () => {
    const m = new TileMap(10, 10, T.GRASS);
    const res = moveAndCollide(m, 5, 5, -500, -500, 9);
    assert.gte(res.x, 9);
    assert.gte(res.y, 9);
});

suite("regions");

test("the valley is far bigger than the v2 village", () => {
    const v2Tiles = 26 * 18;                    // the whole v2 map
    const total = valleyTileCount();
    assert.gt(total, v2Tiles * 5, "world must be at least 5× bigger");
    assert.gt(total, 40000, `expected 40k+ tiles, got ${total}`);
});

test("every zone declares a known biome and valid links", () => {
    for (const z of Object.values(ZONES)) {
        assert.ok(BIOMES[z.biome], `zone ${z.id} has unknown biome ${z.biome}`);
        assert.gt(z.w, 20); assert.gt(z.h, 20);
        for (const l of z.links || []) {
            assert.ok(ZONES[l.target], `zone ${z.id} links to missing ${l.target}`);
            assert.lt(l.from, l.to);
            const limit = (l.edge === "north" || l.edge === "south") ? z.w : z.h;
            assert.lt(l.to, limit, `link on ${z.id}.${l.edge} runs off the edge`);
        }
    }
});

test("links are mutual where they should be", () => {
    assert.eq(oppositeEdge("north"), "south");
    const ash = zoneDef("ashfall");
    const north = ash.links.find((l) => l.edge === "north");
    assert.eq(north.target, "meadow");
    const back = zoneDef("meadow").links.find((l) => l.target === "ashfall");
    assert.ok(back, "meadow must link back to ashfall");
    assert.eq(back.edge, "south");
});

suite("worldgen");

test("generation is deterministic for a given seed", () => {
    const a = generateZone("meadow", 777);
    const b = generateZone("meadow", 777);
    assert.deep(Array.from(a.map.data.slice(0, 500)), Array.from(b.map.data.slice(0, 500)));
    assert.eq(a.objects.length, b.objects.length);
});

test("different seeds make different valleys", () => {
    const a = generateZone("meadow", 1);
    const b = generateZone("meadow", 2);
    let diff = 0;
    for (let i = 0; i < a.map.data.length; i++) if (a.map.data[i] !== b.map.data[i]) diff++;
    assert.gt(diff, 100);
});

test("borders are sealed except at portals", () => {
    const z = generateZone("ashfall", 5);
    let open = 0;
    for (let x = 0; x < z.w; x++) {
        if (!isSolidTile(z.map.get(x, 0))) open++;
        if (!isSolidTile(z.map.get(x, z.h - 1))) open++;
    }
    assert.gt(open, 0, "there must be at least one way out");
    assert.eq(z.portals.length, zoneDef("ashfall").links.length);
    for (const p of z.portals) {
        assert.ok(ZONES[p.target]);
        assert.gt(p.w * p.h, 0);
    }
});

test("the spawn point is walkable and inside the zone", () => {
    for (const id of ["ashfall", "meadow", "forest", "shore", "pass"]) {
        const z = generateZone(id, 11);
        assert.not(z.solidAt(z.spawn.x, z.spawn.y), `spawn blocked in ${id}`);
        assert.gt(z.spawn.x, 0);
        assert.lt(z.spawn.x, z.map.widthPx);
    }
});

test("the prologue zone contains the camp: tent, fire and the hearth", () => {
    const z = generateZone("ashfall", 3);
    const kinds = z.objects.map((o) => o.kind);
    assert.ok(kinds.includes("tent"), "no tent");
    assert.ok(kinds.includes("campfire"), "no campfire");
    assert.ok(kinds.includes("hearth_ruin"), "no burnt hearth");
    assert.ok(kinds.includes("diary"), "no diary");
    assert.ok(z.campSite, "camp site not recorded");
    // The fire must be reachable, not buried in a tree.
    const fire = z.objects.find((o) => o.kind === "campfire");
    assert.not(z.solidAt(fire.x, fire.y));
});

test("forest really is denser than the meadow", () => {
    const forest = generateZone("forest", 9);
    const meadow = generateZone("meadow", 9);
    const dens = (z) => z.objects.filter((o) => ["pine", "spruce", "oak", "birch"].includes(o.kind)).length / (z.w * z.h);
    assert.gt(dens(forest), dens(meadow));
});

test("solid props block movement, low clutter does not", () => {
    const z = generateZone("forest", 4);
    const tree = z.objects.find((o) => o.kind === "pine");
    if (tree) assert.ok(z.isBlockedTile(tree.tx, tree.ty));
    const herb = z.objects.find((o) => o.kind === "herb");
    if (herb) assert.not(z.isBlockedTile(herb.tx, herb.ty));
});

test("WorldMap caches zones lazily", () => {
    const w = new WorldMap(12);
    assert.eq(w.loadedCount, 0);
    const a = w.get("meadow");
    const b = w.get("meadow");
    assert.eq(a, b);
    assert.eq(w.loadedCount, 1);
    w.get("forest");
    assert.eq(w.loadedCount, 2);
});

test("every zone in the valley generates without throwing", () => {
    for (const id of Object.keys(ZONES)) {
        const z = generateZone(id, 2024);
        assert.ok(z instanceof Zone);
        assert.eq(z.map.w, ZONES[id].w);
        assert.gt(z.objects.length, 10, `${id} feels empty`);
    }
});

suite("weather");

test("weather is deterministic per day and seed", () => {
    const bus = new EventBus();
    const clock = new GameClock({ bus, day: 1 });
    const a = new WeatherSystem({ bus: new EventBus(), seed: 42, clock });
    const b = new WeatherSystem({ bus: new EventBus(), seed: 42, clock });
    assert.eq(a.current, b.current);
    assert.ok(WEATHER[a.current]);
});

test("the forecast matches what tomorrow actually rolls", () => {
    const clock = new GameClock({ day: 5 });
    const w = new WeatherSystem({ seed: 3, clock });
    const predicted = w.tomorrow;
    w.rollForDay(6, clock.season.key);
    assert.eq(w.current, predicted);
});

test("winter snows and summer does not", () => {
    const w = new WeatherSystem({ seed: 8 });
    let snowyWinter = 0, snowySummer = 0;
    for (let d = 1; d < 120; d++) {
        if (w.pick(d, "winter") === "snow") snowyWinter++;
        if (w.pick(d, "summer") === "snow") snowySummer++;
    }
    assert.gt(snowyWinter, 10);
    assert.eq(snowySummer, 0);
});

run("v3 world");
