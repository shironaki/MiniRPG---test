/**
 * Procedural dungeon ("Врата испытаний") — a repeatable, randomly generated
 * delve. Each run is a short sequence of floors (combat / chest / trap / rest),
 * always capped by an elite fight. Pure logic here; the Game drives resolution
 * and the UI renders it. Deterministic when passed a seeded rng (used by tests).
 */
class Dungeon {
    constructor(floors, level) {
        this.floors = floors || [];
        this.level = level || 1;
        this.index = 0;
        this.active = true;
        this.cleared = false;
    }

    current() { return this.floors[this.index] || null; }
    get depth() { return this.floors.length; }
    isComplete() { return this.index >= this.floors.length; }

    // Advance past the current floor; mark the run cleared when the last floor
    // is done. Returns the new current floor (or null when finished).
    advance() {
        this.index++;
        if (this.index >= this.floors.length) {
            this.active = false;
            this.cleared = true;
        }
        return this.current();
    }

    // Regular foes scale with the player's level; elites draw from a tougher
    // pool. Pools stay valid enemy keys from GAME_DATA.enemies.
    static poolFor(level) {
        if (level >= 7) return ["skeleton", "wolf", "tideWraith"];
        if (level >= 4) return ["wolf", "skeleton", "goblin"];
        return ["goblin", "wolf"];
    }

    static elitePoolFor(level) {
        if (level >= 7) return ["boneColossus", "flameWarden", "tideWraith"];
        if (level >= 4) return ["flameWarden", "tideWraith", "skeleton"];
        return ["skeleton", "wolf"];
    }

    static makeFloor(n, type, pool, elitePool, rng) {
        const floor = { n, type };
        if (type === "enemy") floor.enemy = pool[Math.floor(rng() * pool.length)];
        if (type === "elite") floor.enemy = elitePool[Math.floor(rng() * elitePool.length)];
        return floor;
    }

    // Build a fresh run. `count` floors (default 5); the final floor is always
    // an elite. `rng` defaults to Math.random but can be seeded for tests.
    static generate(level = 1, count = 5, rng = Math.random) {
        const pool = Dungeon.poolFor(level);
        const elitePool = Dungeon.elitePoolFor(level);
        const floors = [];
        for (let i = 0; i < count - 1; i++) {
            const r = rng();
            const type = r < 0.5 ? "enemy"
                : r < 0.68 ? "chest"
                : r < 0.82 ? "trap"
                : r < 0.92 ? "rest"
                : "elite";
            floors.push(Dungeon.makeFloor(i + 1, type, pool, elitePool, rng));
        }
        floors.push(Dungeon.makeFloor(count, "elite", pool, elitePool, rng));
        return new Dungeon(floors, level);
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Dungeon };
