/**
 * v2 world — gatherable resource nodes and a resource bag.
 *
 * A ResourceNode sits on a walkable tile. Interacting with it "hits" the node;
 * each hit yields one unit of its resource, and the final hit fells/depletes it,
 * dropping a small bonus and starting a regrow timer. After `regrow` seconds the
 * node comes back to full. Pure logic (rng injectable) — the renderer draws it.
 *
 * RESOURCES is the catalogue used for HUD/menu labels, gifts, and consuming food.
 */
const RESOURCES = {
    wood:        { name: "Древесина",        emoji: "🪵", sellPrice: 2 },
    stone:       { name: "Камень",           emoji: "🪨", sellPrice: 3 },
    berry:       { name: "Ягоды",            emoji: "🫐", sellPrice: 4, heal: 8, energy: 4 },
    herb:        { name: "Травы",            emoji: "🌿", sellPrice: 5, heal: 6, energy: 6 },
    seeds:       { name: "Семена",           emoji: "🌰", sellPrice: 2, buyPrice: 4 },
    veg:         { name: "Морковь",          emoji: "🥕", sellPrice: 8, heal: 12, energy: 6 },
    // Fish (caught in the pond / rivers)
    fish_perch:  { name: "Окунь",            emoji: "🐟", sellPrice: 12, heal: 15, energy: 8, category: "fish" },
    fish_carp:   { name: "Карп",             emoji: "🐠", sellPrice: 20, heal: 25, energy: 12, category: "fish" },
    fish_pike:   { name: "Щука",             emoji: "🐡", sellPrice: 35, heal: 35, energy: 18, category: "fish" },
    crayfish:    { name: "Речной рак",       emoji: "🦐", sellPrice: 10, heal: 10, energy: 6, category: "fish" },
    // Cooked dishes (prepared at the home stove/hearth)
    dish_stew:   { name: "Овощная похлёбка", emoji: "🍲", sellPrice: 30, heal: 40, energy: 20, category: "dish" },
    dish_fish:   { name: "Жареная рыба",     emoji: "🐟", sellPrice: 28, heal: 35, energy: 15, category: "dish" },
    dish_pie:    { name: "Ягодный пирог",    emoji: "🥧", sellPrice: 40, heal: 50, energy: 30, category: "dish" },
    dish_soup:   { name: "Рыбацкая уха",     emoji: "🥘", sellPrice: 60, heal: 80, energy: 40, category: "dish" },
    dish_tea:    { name: "Травяной отвар",   emoji: "🍵", sellPrice: 22, heal: 15, energy: 35, category: "dish" }
};

// Per node-type defaults: which resource, how many hits to fell, regrow seconds.
const NODE_TYPES = {
    tree: { res: "wood",  hits: 3, regrow: 90, bonus: 2 },
    rock: { res: "stone", hits: 4, regrow: 110, bonus: 1 },
    bush: { res: "berry", hits: 1, regrow: 45, bonus: 0 },
    herb: { res: "herb",  hits: 1, regrow: 60, bonus: 0 }
};

class ResourceNode {
    constructor(def, ts = 32) {
        const meta = NODE_TYPES[def.type] || NODE_TYPES.tree;
        this.id = def.id || `${def.type}_${def.col}_${def.row}`;
        this.type = def.type;
        this.res = def.res || meta.res;
        this.col = def.col;
        this.row = def.row;
        this.ts = ts;
        this.px = def.col * ts + ts / 2;
        this.py = def.row * ts + ts / 2;
        this.maxHits = def.hits || meta.hits;
        this.hits = this.maxHits;
        this.bonus = def.bonus != null ? def.bonus : meta.bonus;
        this.regrow = def.regrow || meta.regrow;
        this.cooldown = 0;      // seconds left until regrow
        this.shakeT = 0;        // brief wobble after a hit (for the renderer)
    }

    get depleted() { return this.hits <= 0; }
    get centerX() { return this.px; }
    get centerY() { return this.py; }

    update(dt) {
        if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
        if (this.depleted) {
            this.cooldown -= dt;
            if (this.cooldown <= 0) { this.hits = this.maxHits; this.cooldown = 0; }
        }
    }

    // One gather action. Returns { res, amount, felled } or null if not ready.
    hit(toolBonus = 0) {
        if (this.depleted) return null;
        // Tool bonus can reduce required hits or grant extra yield
        const hitsDealt = 1 + (toolBonus > 1 ? 1 : 0);
        this.hits = Math.max(0, this.hits - hitsDealt);
        this.shakeT = 0.32;
        let amount = hitsDealt;
        let felled = false;
        if (this.hits <= 0) {
            felled = true;
            amount += this.bonus + (toolBonus > 0 ? 1 : 0);
            this.cooldown = this.regrow;
        }
        return { res: this.res, amount, felled };
    }
}

// A simple tally of gathered resources.
class ResourceBag {
    constructor() { this.items = {}; }
    add(res, n = 1) { this.items[res] = (this.items[res] || 0) + n; return this.items[res]; }
    count(res) { return this.items[res] || 0; }
    remove(res, n = 1) {
        const have = this.count(res);
        const take = Math.min(have, n);
        this.items[res] = have - take;
        return take;
    }
    entries() { return Object.keys(this.items).filter(k => this.items[k] > 0).map(k => ({ res: k, n: this.items[k] })); }
    total() { return this.entries().reduce((s, e) => s + e.n, 0); }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { RESOURCES, NODE_TYPES, ResourceNode, ResourceBag };
}
