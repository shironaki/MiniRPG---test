class Shop {

    constructor(player) {

        this.player = player;

        this.items = [

            ITEMS.potion,
            ITEMS.sword,
            ITEMS.bow,
            ITEMS.shield,
            ITEMS.armor

        ];
    }


    // Karma discount/markup: high karma (helpful hero) earns up to 15% off,
    // low karma (ruthless) is charged up to 15% more.
    priceFactor() {
        const k = Math.max(-50, Math.min(50, this.player.karma || 0));
        return 1 - (k / 50) * 0.15;
    }

    priceOf(item) {
        return Math.max(1, Math.round(item.price * this.priceFactor()));
    }

    buy(item) {

        const price = this.priceOf(item);

        if (this.player.gold < price) {

            return {
                success: false,
                message: "💰 Недостаточно золота."
            };
        }


        this.player.gold -= price;


        this.player.addItem(item);


        return {
            success: true,
            message:
                `🛒 Куплено: ${item.name} за ${price} 💰`
        };
    }


    sell(item) {

        const index =
            this.player.inventory.indexOf(
                item
            );


        if (index === -1) {

            return {
                success: false,
                message: "❌ Предмет не найден."
            };
        }


        const price =
            Math.floor(
                item.price / 2
            );


        this.player.inventory.splice(
            index,
            1
        );


        this.player.gold +=
            price;


        return {
            success: true,
            message:
                `💰 Продано за ${price} золота.`
        };
    }


    renderShop() {

        return this.items.map(

            (item, index) => `

                <div class="shopItem">

                    <h3>
                        ${item.name}
                    </h3>

                    <p>
                        ${item.description}
                    </p>

                    <p>
                        💰 ${this.priceOf(item)}
                    </p>

                    <button
                        onclick="buyItem(${index})"
                    >
                        🛒 Купить
                    </button>

                </div>

            `

        ).join("");
    }


    renderPlayerItems() {

        if (
            this.player.inventory.length === 0
        ) {

            return "<p>🎒 Пусто.</p>";
        }


        return this.player.inventory.map(

            (item, index) => {

                const price =
                    Math.floor(
                        item.price / 2
                    );


                return `

                    <div class="inventoryItem">

                        ${item.name}

                        <br>

                        💰 Продажа: ${price}

                        <button
                            onclick="sellItem(${index})"
                        >
                            Продать
                        </button>

                    </div>

                `;
            }

        ).join("");
    }
}