/**
 * v2 world — deep mines procedural exploration and forge smelting system.
 *
 * The deep mines feature multi-floor descents (Levels 1–10+), procedural rock
 * corridors, mineral veins (copper, iron, gold, coal, gemstones), descending ladders,
 * and forge furnace smelting.
 */

const SMELTING_RECIPES = {
    bar_copper: {
        name: "Медный слиток",
        emoji: "🟧",
        ore: "ore_copper",
        oreCount: 3,
        coalCount: 1,
        yield: "bar_copper",
        desc: "3 медной руды + 1 уголь"
    },
    bar_iron: {
        name: "Железный слиток",
        emoji: "⬜",
        ore: "ore_iron",
        oreCount: 3,
        coalCount: 1,
        yield: "bar_iron",
        desc: "3 железной руды + 1 уголь"
    },
    bar_gold: {
        name: "Золотой слиток",
        emoji: "🟨",
        ore: "ore_gold",
        oreCount: 3,
        coalCount: 2,
        yield: "bar_gold",
        desc: "3 золотой руды + 2 угля"
    }
};

class SmeltingSystem {
    constructor() {
        this.recipes = SMELTING_RECIPES;
    }

    listRecipes() {
        return Object.values(this.recipes);
    }

    canSmelt(key, bag) {
        const r = this.recipes[key];
        if (!r) return false;
        return bag.count(r.ore) >= r.oreCount && bag.count("coal") >= r.coalCount;
    }

    smelt(key, bag) {
        const r = this.recipes[key];
        if (!r) return { ok: false, msg: "Неизвестный рецепт плавки." };
        if (!this.canSmelt(key, bag)) {
            return {
                ok: false,
                msg: `Не хватает материалов: нужно ${r.oreCount} ${r.ore} и ${r.coalCount} угля.`
            };
        }
        bag.remove(r.ore, r.oreCount);
        bag.remove("coal", r.coalCount);
        bag.add(r.yield, 1);
        return {
            ok: true,
            yield: r.yield,
            msg: `В горне отлит ${r.name}! ${r.emoji} +1`
        };
    }
}

class MinesSystem {
    constructor(opts = {}) {
        this.currentFloor = opts.currentFloor || 1;
        this.deepestFloor = opts.deepestFloor || 1;
        this.rng = opts.rng || Math.random;
    }

    get floor() {
        return this.currentFloor;
    }

    descend() {
        this.currentFloor += 1;
        if (this.currentFloor > this.deepestFloor) {
            this.deepestFloor = this.currentFloor;
        }
        return this.currentFloor;
    }

    ascend() {
        if (this.currentFloor > 1) {
            this.currentFloor -= 1;
        }
        return this.currentFloor;
    }

    reset() {
        this.currentFloor = 1;
    }

    /**
     * Generate a procedural map for the given mine floor level.
     */
    generateFloor(floor = this.currentFloor) {
        const W = 22, H = 16;
        const grid = [];
        for (let y = 0; y < H; y++) {
            grid.push(new Array(W).fill("."));
        }

        // Outer cavern walls
        for (let x = 0; x < W; x++) { grid[0][x] = "k"; grid[H - 1][x] = "k"; }
        for (let y = 0; y < H; y++) { grid[y][0] = "k"; grid[y][W - 1] = "k"; }

        // Spawn point at ladder up
        const spawn = { col: 2, row: 2 };
        const ladderDown = { col: W - 3, row: H - 3 };

        // Internal stone pillars and rock formations
        for (let y = 3; y < H - 3; y += 2) {
            for (let x = 4; x < W - 4; x += 3) {
                if (this.rng() < 0.6) {
                    grid[y][x] = "k";
                }
            }
        }

        // Generate resource nodes based on floor depth
        const resources = [];
        const enemies = [];

        // Coal deposits (everywhere)
        const coalCount = 2 + Math.floor(this.rng() * 3);
        for (let i = 0; i < coalCount; i++) {
            const cx = 3 + Math.floor(this.rng() * (W - 6));
            const cy = 2 + Math.floor(this.rng() * (H - 4));
            if (grid[cy][cx] === ".") {
                resources.push({ type: "coal_node", res: "coal", col: cx, row: cy, hits: 3, bonus: 2 });
            }
        }

        // Copper veins (Floors 1-6)
        if (floor <= 6) {
            const copperCount = 2 + Math.floor(this.rng() * 3);
            for (let i = 0; i < copperCount; i++) {
                const cx = 3 + Math.floor(this.rng() * (W - 6));
                const cy = 2 + Math.floor(this.rng() * (H - 4));
                if (grid[cy][cx] === ".") {
                    resources.push({ type: "ore_copper_node", res: "ore_copper", col: cx, row: cy, hits: 3, bonus: 1 });
                }
            }
        }

        // Iron veins (Floors 3-10)
        if (floor >= 3) {
            const ironCount = 2 + Math.floor(this.rng() * 3);
            for (let i = 0; i < ironCount; i++) {
                const cx = 3 + Math.floor(this.rng() * (W - 6));
                const cy = 2 + Math.floor(this.rng() * (H - 4));
                if (grid[cy][cx] === ".") {
                    resources.push({ type: "ore_iron_node", res: "ore_iron", col: cx, row: cy, hits: 4, bonus: 1 });
                }
            }
        }

        // Gold veins (Floors 6+)
        if (floor >= 6) {
            const goldCount = 1 + Math.floor(this.rng() * 3);
            for (let i = 0; i < goldCount; i++) {
                const cx = 3 + Math.floor(this.rng() * (W - 6));
                const cy = 2 + Math.floor(this.rng() * (H - 4));
                if (grid[cy][cx] === ".") {
                    resources.push({ type: "ore_gold_node", res: "ore_gold", col: cx, row: cy, hits: 5, bonus: 1 });
                }
            }
        }

        // Gemstone crystals (Floors 5+)
        if (floor >= 5 && this.rng() < 0.75) {
            const gemTypes = ["gem_amethyst", "gem_ruby", "gem_emerald"];
            const gemRes = gemTypes[Math.min(gemTypes.length - 1, Math.floor(this.rng() * gemTypes.length))];
            const cx = 3 + Math.floor(this.rng() * (W - 6));
            const cy = 2 + Math.floor(this.rng() * (H - 4));
            if (grid[cy][cx] === ".") {
                resources.push({ type: "gem_node", res: gemRes, col: cx, row: cy, hits: 4, bonus: 1 });
            }
        }

        // Standard rocks
        for (let i = 0; i < 4; i++) {
            const rx = 2 + Math.floor(this.rng() * (W - 4));
            const ry = 2 + Math.floor(this.rng() * (H - 4));
            if (grid[ry][rx] === ".") {
                resources.push({ type: "rock", res: "stone", col: rx, row: ry, hits: 3, bonus: 1 });
            }
        }

        // Cave creatures
        const enemyCount = 2 + Math.min(4, Math.floor(floor / 2));
        for (let i = 0; i < enemyCount; i++) {
            const ex = 4 + Math.floor(this.rng() * (W - 8));
            const ey = 3 + Math.floor(this.rng() * (H - 6));
            const foeType = floor >= 7 ? "skeleton" : (floor >= 4 ? "wolf" : "goblin");
            const foeEmoji = foeType === "skeleton" ? "💀" : (foeType === "wolf" ? "🐺" : "👹");
            enemies.push({ col: ex, row: ey, kind: foeType, emoji: foeEmoji, wanderRadius: 80 });
        }

        const rows = grid.map(r => r.join(""));

        return {
            id: `mine_floor_${floor}`,
            name: `Шахта: Ярус ${floor}`,
            indoor: true,
            warm: false,
            tileSize: 32,
            rows,
            spawn,
            interactables: [
                { col: spawn.col, row: spawn.row, action: "mine_ascend", label: floor === 1 ? "Выход из шахты" : `Подняться на ярус ${floor - 1}`, emoji: "🪜" },
                { col: ladderDown.col, row: ladderDown.row, action: "mine_descend", label: `Спуститься на ярус ${floor + 1}`, emoji: "⛏️" }
            ],
            resources,
            enemies,
            furniture: []
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SMELTING_RECIPES, SmeltingSystem, MinesSystem };
}
