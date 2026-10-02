/**
 * v2 world — gatherable resource nodes and a resource bag.
 *
 * A ResourceNode sits on a walkable tile. Interacting with it "hits" the node;
 * each hit yields one unit of its resource, and the final hit fells/depletes it,
 * dropping a small bonus and starting a regrow timer.
 *
 * RESOURCES is the master catalogue used for HUD, inventory, gifting, cooking,
 * shop prices, and food consumption stats.
 */
const RESOURCES = {
    // Basic materials
    wood:              { name: "Древесина",           emoji: "🪵", sellPrice: 2, category: "material" },
    stone:             { name: "Камень",              emoji: "🪨", sellPrice: 3, category: "material" },
    berry:             { name: "Лесные ягоды",        emoji: "🫐", sellPrice: 4, heal: 8, energy: 4, category: "food" },
    herb:              { name: "Целебные травы",      emoji: "🌿", sellPrice: 5, heal: 6, energy: 6, category: "material" },
    
    // Orchard fruits
    apple:             { name: "Спелое яблоко",       emoji: "🍎", sellPrice: 10, heal: 15, energy: 10, category: "fruit" },
    cherry:            { name: "Сладкая вишня",       emoji: "🍒", sellPrice: 12, heal: 12, energy: 12, category: "fruit" },
    
    // Farm produce & vegetables
    veg:               { name: "Морковь",             emoji: "🥕", sellPrice: 8, heal: 12, energy: 6, category: "produce" },
    strawberry:        { name: "Клубника",            emoji: "🍓", sellPrice: 18, heal: 18, energy: 12, category: "produce" },
    tomato:            { name: "Сочный томат",        emoji: "🍅", sellPrice: 15, heal: 14, energy: 8, category: "produce" },
    corn:              { name: "Початок кукурузы",    emoji: "🌽", sellPrice: 22, heal: 20, energy: 14, category: "produce" },
    pumpkin:           { name: "Крупная тыква",       emoji: "🎃", sellPrice: 35, heal: 30, energy: 20, category: "produce" },
    wheat:             { name: "Пшеница",             emoji: "🌾", sellPrice: 6, heal: 4, energy: 4, category: "produce" },

    // Seeds
    seeds:             { name: "Семена моркови",      emoji: "🌰", sellPrice: 2, buyPrice: 4, category: "seed", cropKey: "veg" },
    seeds_strawberry:  { name: "Семена клубники",     emoji: "🍓", sellPrice: 5, buyPrice: 10, category: "seed", cropKey: "strawberry" },
    seeds_tomato:      { name: "Семена томатов",      emoji: "🍅", sellPrice: 4, buyPrice: 8, category: "seed", cropKey: "tomato" },
    seeds_corn:        { name: "Семена кукурузы",     emoji: "🌽", sellPrice: 6, buyPrice: 12, category: "seed", cropKey: "corn" },
    seeds_pumpkin:     { name: "Семена тыквы",        emoji: "🎃", sellPrice: 10, buyPrice: 18, category: "seed", cropKey: "pumpkin" },
    seeds_wheat:       { name: "Семена пшеницы",      emoji: "🌾", sellPrice: 2, buyPrice: 3, category: "seed", cropKey: "wheat" },

    // Coastal & Marine resources
    seashell:          { name: "Морская ракушка",     emoji: "🐚", sellPrice: 8, category: "coastal" },
    pearl:             { name: "Жемчужина",           emoji: "🦪", sellPrice: 50, category: "coastal" },
    seaweed:           { name: "Морские водоросли",   emoji: "🌿", sellPrice: 4, heal: 5, energy: 6, category: "coastal" },

    // River fish (Village pond & river)
    fish_perch:        { name: "Окунь",               emoji: "🐟", sellPrice: 12, heal: 15, energy: 8, category: "fish" },
    fish_carp:         { name: "Карп",                emoji: "🐠", sellPrice: 20, heal: 25, energy: 12, category: "fish" },
    fish_pike:         { name: "Щука",                emoji: "🐡", sellPrice: 35, heal: 35, energy: 18, category: "fish" },
    crayfish:          { name: "Речной рак",          emoji: "🦐", sellPrice: 10, heal: 10, energy: 6, category: "fish" },

    // Ocean fish & seafood (Coast & Beach)
    fish_tuna:         { name: "Лазурный тунец",      emoji: "🐟", sellPrice: 45, heal: 40, energy: 20, category: "marine_fish" },
    fish_flounder:     { name: "Морская камбала",     emoji: "🐠", sellPrice: 30, heal: 30, energy: 15, category: "marine_fish" },
    lobster:           { name: "Королевский омар",    emoji: "🦞", sellPrice: 55, heal: 50, energy: 25, category: "marine_fish" },

    // Animal & Ranching Products
    egg:               { name: "Свежее яйцо",         emoji: "🥚", sellPrice: 14, heal: 10, energy: 10, category: "animal" },
    egg_large:         { name: "Крупное золотое яйцо", emoji: "🥚", sellPrice: 32, heal: 25, energy: 20, category: "animal" },
    milk:              { name: "Парное молоко",       emoji: "🥛", sellPrice: 18, heal: 15, energy: 15, category: "animal" },
    milk_large:        { name: "Сливочное молоко",    emoji: "🥛", sellPrice: 42, heal: 35, energy: 30, category: "animal" },
    wool:              { name: "Мягкая овечья шерсть", emoji: "🧶", sellPrice: 38, category: "material" },
    hay:               { name: "Ароматное сено",      emoji: "🌾", sellPrice: 3, buyPrice: 6, category: "feed" },

    // Mining, Ores & Smelting
    coal:              { name: "Каменный уголь",      emoji: "🪨", sellPrice: 8, buyPrice: 15, category: "mineral" },
    ore_copper:        { name: "Медная руда",         emoji: "🥉", sellPrice: 12, category: "ore" },
    ore_iron:          { name: "Железная руда",       emoji: "🥈", sellPrice: 20, category: "ore" },
    ore_gold:          { name: "Золотая руда",        emoji: "🥇", sellPrice: 45, category: "ore" },
    bar_copper:        { name: "Медный слиток",       emoji: "🟧", sellPrice: 35, category: "bar" },
    bar_iron:          { name: "Железный слиток",     emoji: "⬜", sellPrice: 60, category: "bar" },
    bar_gold:          { name: "Золотой слиток",      emoji: "🟨", sellPrice: 130, category: "bar" },
    gem_amethyst:      { name: "Аметист",             emoji: "💜", sellPrice: 85, category: "gem" },
    gem_ruby:          { name: "Огненный рубин",      emoji: "🔴", sellPrice: 125, category: "gem" },
    gem_emerald:       { name: "Изумруд",             emoji: "💚", sellPrice: 165, category: "gem" },

    // Cooked dishes (Home stove & hearth)
    dish_stew:         { name: "Овощная похлёбка",    emoji: "🍲", sellPrice: 30, heal: 40, energy: 20, category: "dish" },
    dish_fish:         { name: "Жареная рыба",        emoji: "🐟", sellPrice: 28, heal: 35, energy: 15, category: "dish" },
    dish_pie:          { name: "Ягодный пирог",       emoji: "🥧", sellPrice: 40, heal: 50, energy: 30, category: "dish" },
    dish_soup:         { name: "Рыбацкая уха",        emoji: "🥘", sellPrice: 60, heal: 80, energy: 40, category: "dish" },
    dish_tea:          { name: "Травяной отвар",      emoji: "🍵", sellPrice: 22, heal: 15, energy: 35, category: "dish" },
    dish_cider:        { name: "Яблочный сидр",       emoji: "🧃", sellPrice: 35, heal: 20, energy: 40, speedBuff: 1.25, category: "dish" },
    dish_jam:          { name: "Клубничное варенье",  emoji: "🍓", sellPrice: 45, heal: 45, energy: 25, category: "dish" },
    dish_pumpkin_soup: { name: "Тыквенный крем-суп",  emoji: "🎃", sellPrice: 65, heal: 75, energy: 45, category: "dish" },
    dish_pasta:        { name: "Морская паста",       emoji: "🍝", sellPrice: 85, heal: 95, energy: 50, category: "dish" },
    dish_omelette:     { name: "Деревенский омлет",   emoji: "🍳", sellPrice: 42, heal: 45, energy: 30, category: "dish" },
    dish_pancake:      { name: "Блинчики с ягодами",  emoji: "🥞", sellPrice: 68, heal: 70, energy: 45, category: "dish" },
    dish_cheese:       { name: "Домашний сыр",        emoji: "🧀", sellPrice: 58, heal: 50, energy: 35, category: "dish" },
    dish_steak:        { name: "Сытный стейк",        emoji: "🥩", sellPrice: 95, heal: 110, energy: 60, category: "dish" },
    dish_gold_cider:   { name: "Золотой сидр",        emoji: "🍎", sellPrice: 190, heal: 150, energy: 100, speedBuff: 1.4, category: "dish" }
};

// Per node-type defaults: which resource, how many hits to fell, regrow seconds.
const NODE_TYPES = {
    tree:            { res: "wood",        hits: 3, regrow: 90,  bonus: 2 },
    rock:            { res: "stone",       hits: 4, regrow: 110, bonus: 1 },
    bush:            { res: "berry",       hits: 1, regrow: 45,  bonus: 0 },
    herb:            { res: "herb",        hits: 1, regrow: 60,  bonus: 0 },
    apple_tree:      { res: "apple",       hits: 2, regrow: 75,  bonus: 1 },
    cherry_tree:     { res: "cherry",      hits: 2, regrow: 75,  bonus: 1 },
    seashell:        { res: "seashell",    hits: 1, regrow: 40,  bonus: 0 },
    driftwood:       { res: "wood",        hits: 2, regrow: 60,  bonus: 1 },
    ore_copper_node: { res: "ore_copper",  hits: 3, regrow: 120, bonus: 1 },
    ore_iron_node:   { res: "ore_iron",    hits: 4, regrow: 150, bonus: 1 },
    ore_gold_node:   { res: "ore_gold",    hits: 5, regrow: 180, bonus: 1 },
    coal_node:       { res: "coal",        hits: 3, regrow: 100, bonus: 2 },
    gem_node:        { res: "gem_amethyst", hits: 4, regrow: 200, bonus: 1 }
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

// A simple tally of gathered resources in backpack.
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
