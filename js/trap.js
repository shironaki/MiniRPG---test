class Trap {

    constructor() {

        this.triggered = false;
    }


    activate(player) {

        if (this.triggered) {

            return {
                success: false,
                message:
                    "⚠️ Ловушка уже сработала."
            };
        }


        this.triggered = true;


        const damage =
            10 +
            Math.floor(
                Math.random() * 21
            );


        const actualDamage =
            player.takeDamage(
                damage
            );


        return {
            success: true,
            message:
                `⚠️ ЛОВУШКА! Ты получил ${actualDamage} урона.`
        };
    }
}