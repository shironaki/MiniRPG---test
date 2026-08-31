class Room {

    constructor(
        id,
        name,
        description
    ) {

        this.id = id;

        this.name = name;

        this.description =
            description;

        this.event = null;

        this.explored = false;

        this.cleared = false;
    }


    generateEvent() {

        if (this.event) {

            return;
        }


        const random =
            Math.random();


        if (random < 0.30) {

            this.event = "enemy";

            return;
        }


        if (random < 0.55) {

            this.event = "chest";

            return;
        }


        if (random < 0.75) {

            this.event = "trap";

            return;
        }


        this.event = "nothing";
    }
}