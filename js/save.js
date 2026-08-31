class SaveSystem {

    save(game) {

        const data = {

            player: game.player,

            world: game.world,

            quest: game.quest

        };


        localStorage.setItem(
            "miniRPG7",
            JSON.stringify(data)
        );
    }


    clear() {

        localStorage.removeItem(
            "miniRPG7"
        );
    }
}