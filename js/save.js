class SaveSystem {

    save(game) {

        const data = {

            player: game.player.toJSON(),

            world: game.world.toJSON(),

            quest: game.quest.toJSON()

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
            const raw = localStorage.getItem("miniRPG9");
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
}
