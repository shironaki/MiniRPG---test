class Chest {

    constructor() {
        this.opened = false;
    }

    /**
     * Open the chest.
     * @param {Player} player
     * @param {string[]} [lootPool] item keys (see ITEMS) this chest can drop.
     */
    open(player, lootPool = ["potion", "shield"]) {

        if (this.opened) {
            return {
                success: false,
                message: "📦 Этот сундук уже открыт."
            };
        }

        this.opened = true;

        // ~45% gold, otherwise an item drawn from the zone loot pool.
        if (Math.random() < 0.45) {
            const gold = 20 + Math.floor(Math.random() * 81);
            player.gold += gold;
            return {
                success: true,
                message: `💰 В сундуке найдено ${gold} золота!`
            };
        }

        const pool = (lootPool && lootPool.length) ? lootPool : ["potion", "shield"];
        const key = pool[Math.floor(Math.random() * pool.length)];
        const item = ITEMS[key] || ITEMS.potion;
        player.addItem(item);

        return {
            success: true,
            message: `${item.emoji || "📦"} В сундуке найден предмет: ${item.name}!`
        };
    }
}
