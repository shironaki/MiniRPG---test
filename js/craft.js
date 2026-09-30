/**
 * Crafting / forge system: equipment has a rarity tier that can be upgraded at
 * the forge by spending gold and "essence" materials dropped by foes. Each tier
 * scales the item's bonuses (and price) and relabels it.
 */
const RARITY = {
    order: ["common", "rare", "legendary"],
    info: {
        common:    { label: "Обычный",     emoji: "⚪", mult: 1.0, color: "#c5cede" },
        rare:      { label: "Редкий",      emoji: "🔵", mult: 1.6, color: "#4aa3ff" },
        legendary: { label: "Легендарный", emoji: "🟣", mult: 2.4, color: "#c084fc" }
    }
};

class Craft {
    static nextRarity(r) {
        const i = RARITY.order.indexOf(r || "common");
        return (i >= 0 && i < RARITY.order.length - 1) ? RARITY.order[i + 1] : null;
    }

    static rarityInfo(r) { return RARITY.info[r] || RARITY.info.common; }

    // A fresh essence material item.
    static essence() {
        const m = (typeof GAME_DATA !== "undefined" && GAME_DATA.materials && GAME_DATA.materials.essence)
            || { name: "Эссенция ковки", type: "material", price: 0, description: "", emoji: "🔩" };
        return new Item(m.name, m.type, m.price, m.description, 0, 0, 0, m.emoji);
    }

    static isEssence(item) { return item && item.type === "material" && item.name && item.name.includes("Эссенция"); }
    static essenceCount(player) { return player.inventory.filter(Craft.isEssence).length; }

    static canUpgrade(item) {
        return !!(item && typeof item.isEquipment === "function" && item.isEquipment() && Craft.nextRarity(item.rarity || "common"));
    }

    // Cost to raise an item to its next tier.
    static upgradeCost(item) {
        const next = Craft.nextRarity(item.rarity || "common");
        if (!next) return null;
        const gold = next === "rare" ? 80 : 180;
        const essence = next === "rare" ? 1 : 2;
        return { gold, essence, next };
    }

    static upgrade(player, item) {
        if (!Craft.canUpgrade(item)) return { success: false, message: "Этот предмет нельзя улучшить." };
        const cost = Craft.upgradeCost(item);
        if (player.gold < cost.gold) return { success: false, message: "Недостаточно золота." };
        if (Craft.essenceCount(player) < cost.essence) return { success: false, message: "Недостаточно эссенций ковки." };

        player.gold -= cost.gold;
        let removed = 0;
        player.inventory = player.inventory.filter(i => {
            if (removed < cost.essence && Craft.isEssence(i)) { removed++; return false; }
            return true;
        });

        const ratio = Craft.rarityInfo(cost.next).mult / Craft.rarityInfo(item.rarity || "common").mult;
        if (item.attackBonus) item.attackBonus = Math.round(item.attackBonus * ratio);
        if (item.defenseBonus) item.defenseBonus = Math.round(item.defenseBonus * ratio);
        item.price = Math.round((item.price || 0) * ratio);

        const baseName = item.name.replace(/^(Редкий|Легендарный)\s+/, "");
        const info = Craft.rarityInfo(cost.next);
        item.name = `${info.label} ${baseName}`;
        item.rarity = cost.next;

        if (typeof player.updateStats === "function") player.updateStats();
        return { success: true, item, next: cost.next, gold: cost.gold, essence: cost.essence };
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { RARITY, Craft };
