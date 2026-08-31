class Inventory {

    constructor(player) {

        this.player = player;
    }


    getItems() {

        return this.player.inventory;
    }


    add(item) {

        return this.player.addItem(item);
    }


    remove(item) {

        return this.player.removeItem(item);
    }


    use(item) {

        if (!item) {

            return {
                success: false,
                message: "❌ Предмет не найден."
            };
        }


        if (item.type === "potion") {

            return this.player.heal();
        }


        if (item.isEquipment()) {

            return this.player.equip(item);
        }


        return {
            success: false,
            message: "❌ Нельзя использовать."
        };
    }


    render() {

        const items =
            this.player.inventory;


        if (items.length === 0) {

            return `
                <div class="inventoryItem">
                    🎒 Инвентарь пуст.
                </div>
            `;
        }


        return items.map(

            (item, index) => {

                let bonus = "";


                if (item.attackBonus) {

                    bonus +=
                        `⚔️ +${item.attackBonus} `;
                }


                if (item.defenseBonus) {

                    bonus +=
                        `🛡️ +${item.defenseBonus} `;
                }


                if (item.healAmount) {

                    bonus +=
                        `❤️ +${item.healAmount}`;
                }


                return `

                    <div class="inventoryItem">

                        <strong>
                            ${index + 1}. ${item.name}
                        </strong>

                        <p>
                            ${item.description}
                        </p>

                        <p>
                            ${bonus}
                        </p>

                        <button
                            onclick="inventoryUse(${index})"
                        >
                            Использовать
                        </button>

                        <button
                            onclick="inventoryRemove(${index})"
                        >
                            🗑️ Удалить
                        </button>

                    </div>

                `;
            }

        ).join("");
    }
}