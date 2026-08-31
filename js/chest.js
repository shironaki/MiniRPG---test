class Chest {

    constructor() {

        this.opened = false;
    }


    open(player) {

        if (this.opened) {

            return {
                success: false,
                message:
                    "📦 Этот сундук уже открыт."
            };
        }


        this.opened = true;


        const reward =
            Math.random();


        if (reward < 0.5) {

            const gold =
                20 +
                Math.floor(
                    Math.random() * 81
                );


            player.gold += gold;


            return {
                success: true,
                message:
                    `💰 В сундуке найдено ${gold} золота!`
            };
        }


        if (reward < 0.8) {

            player.addItem(
                ITEMS.potion
            );


            return {
                success: true,
                message:
                    "🧪 В сундуке найдено зелье!"
            };
        }


        player.addItem(
            ITEMS.shield
        );


        return {
            success: true,
            message:
                "🛡️ В сундуке найден щит!"
        };
    }
}