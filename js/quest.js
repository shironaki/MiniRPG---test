class Quest {

    constructor() {

        this.title =
            "👹 Охота на гоблинов";

        this.description =
            "Уничтожь 3 гоблинов.";

        this.required = 3;

        this.progress = 0;

        this.active = false;

        this.completed = false;

        this.rewardClaimed = false;

        this.rewardGold = 100;

        this.rewardXP = 50;
    }


    start() {

        this.active = true;

        return "📜 Квест принят!";
    }


    enemyDefeated(enemy) {

        if (
            !this.active ||
            this.completed
        ) {
            return;
        }


        if (
            enemy.name.includes("Гоблин")
        ) {

            this.progress++;
        }


        if (
            this.progress >=
            this.required
        ) {

            this.completed = true;
        }
    }


    render() {

        if (!this.active) {

            return `
                <div class="quest">
                    📜 Квест ещё не взят.
                </div>
            `;
        }


        return `

            <div class="quest">

                <strong>
                    ${this.title}
                </strong>

                <p>
                    ${this.description}
                </p>

                <p>
                    👹
                    ${this.progress}/${this.required}
                </p>

                ${
                    this.completed
                    ? "🏆 Квест выполнен!"
                    : "⚔️ Продолжай!"
                }

            </div>

        `;
    }
}