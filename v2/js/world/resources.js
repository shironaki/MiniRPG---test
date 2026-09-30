/**
 * v2 world — gatherable resource nodes and a resource bag.
 *
 * A ResourceNode sits on a walkable tile. Interacting with it "hits" the node;
 * each hit yields one unit of its resource, and the final hit fells/depletes it,
 * dropping a small bonus and starting a regrow timer. After `regrow` seconds the
 * node comes back to full. Pure logic (rng injectable) — the renderer draws it.
 *
 * RESOURCES is the catalogue used for HUD/menu labels and for matching gifts.
 */
const RESOURCES = {
    wood:  { name: "Древесина", emoji: "🪵" },
    stone: { name: "Камень",    emoji: "🪨" },
    berry: { name: "Ягоды",     emoji: "🫐" },
    herb:  { name: "Травы",     emoji: "🌿" },
    seeds: { name: "Семена",    emoji: "🌰" },
    veg:   { name: "Морковь",   emoji: "🥕" }
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
    hit() {
        if (this.depleted) return null;
        this.hits -= 1;
        this.shakeT = 0.32;
        let amount = 1;
        let felled = false;
        if (this.hits <= 0) {
            felled = true;
            amount += this.bonus;
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
