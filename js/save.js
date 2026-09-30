class SaveSystem {

    save(game) {

        const data = {

            player: game.player,

            world: game.world,

            quest: game.quest,

            journal: game.journal,

            stats: game.stats

        };


        localStorage.setItem(
            "miniRPG9",
            JSON.stringify(data)
        );
    }


    clear() {

        localStorage.removeItem(
            "miniRPG9"
        );
    }

    load() {
        try {
            return JSON.parse(localStorage.getItem("miniRPG9"));
        } catch {
            return null;
        }
    }
}
