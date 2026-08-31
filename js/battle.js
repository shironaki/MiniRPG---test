class Battle {

    constructor(game, enemy) {

        this.game = game;
        this.player = game.player;
        this.enemy = enemy;

        this.finished = false;
    }


    playerAttack() {

        if (this.finished) {
            return;
        }


        const result =
            this.player.attackEnemy(
                this.enemy
            );


        let message =
            `⚔️ Ты нанёс ${result.damage} урона.`;


        if (result.critical) {

            message =
                `💥 КРИТИЧЕСКИЙ УДАР! ${message}`;
        }


        this.log(message);


        if (this.enemy.isDead()) {

            this.win();

            return;
        }


        this.enemyTurn();
    }


    playerHeal() {

        if (this.finished) {
            return;
        }


        const result =
            this.player.heal();


        this.log(
            result.message
        );


        if (result.success) {

            this.enemyTurn();
        }


        this.game.updateUI();
    }


    playerDefend() {

        if (this.finished) {
            return;
        }


        this.log(
            this.player.defend()
        );


        this.enemyTurn();
    }


    enemyTurn() {

        if (this.enemy.isDead()) {
            return;
        }


        const damage =
            this.enemy.attackPlayer(
                this.player
            );


        this.log(
            `👹 ${this.enemy.name} нанёс ${damage} урона.`
        );


        this.game.updateUI();


        if (this.player.isDead()) {

            this.lose();
        }
    }


    win() {

        this.finished = true;


        this.player.gold +=
            this.enemy.gold;


        const levelMessages =
            this.player.addExperience(
                this.enemy.experience
            );


        this.log(
            `🏆 Победа! +${this.enemy.experience} XP`
        );


        this.log(
            `💰 Получено ${this.enemy.gold} золота.`
        );


        levelMessages.forEach(
            message => this.log(message)
        );


        this.game.enemyDefeated(
            this.enemy
        );
    }


    lose() {

        this.finished = true;


        this.game.gameOver();
    }


    log(message) {

        const log =
            document.getElementById(
                "battleLog"
            );


        const line =
            document.createElement(
                "div"
            );


        line.innerHTML = message;

        log.appendChild(line);

        log.scrollTop =
            log.scrollHeight;
    }
}