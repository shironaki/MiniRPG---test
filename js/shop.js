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


    buy(item) {

        if (
            this.player.gold <
            item.price
        ) {

            return {
                success: false,
                message: "💰 Недостаточно золота."
            };
        }


        this.player.gold -=
            item.price;


        this.player.addItem(item);


        return {
            success: true,
            message:
                `🛒 Куплено: ${item.name}`
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
                        💰 ${item.price}
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