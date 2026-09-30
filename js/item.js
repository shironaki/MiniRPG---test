class Item {
    constructor(name, type, price, description, attackBonus = 0, defenseBonus = 0, healAmount = 0, emoji = "📦") {
        this.name = name; this.type = type; this.price = price; this.description = description;
        this.attackBonus = attackBonus; this.defenseBonus = defenseBonus; this.healAmount = healAmount; this.emoji = emoji;
    }
    isEquipment() { return ["weapon", "armor", "shield"].includes(this.type); }
    clone() { return new Item(this.name, this.type, this.price, this.description, this.attackBonus, this.defenseBonus, this.healAmount, this.emoji); }
}

const ITEMS = (function () {
    const defs = (typeof GAME_DATA !== "undefined" && GAME_DATA.items) || {};
    const out = {};
    for (const key in defs) {
        const d = defs[key];
        out[key] = new Item(d.name, d.type, d.price, d.description, d.attackBonus, d.defenseBonus, d.healAmount, d.emoji);
    }
    // Safety net if the data module failed to load.
    if (!out.potion) out.potion = new Item("Зелье здоровья", "potion", 20, "Восстанавливает 35 HP.", 0, 0, 35, "🧪");
    return out;
})();
