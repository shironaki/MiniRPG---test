class Game {

    constructor() {

        this.player = null;

        this.inventory = null;

        this.shop = null;

        this.npc = null;

        this.quest = null;

        this.world = null;

        this.battle = null;

        this.gameEnded = false;

        this.saveSystem = new SaveSystem();
    }


    start() {

        const name =
            prompt("Введите имя героя:");


        if (!name) {

            return;
        }


        this.player =
            new Player(name);


        this.inventory =
            new Inventory(
                this.player
            );


        this.shop =
            new Shop(
                this.player
            );


        this.npc =
            new NPC(
                "Староста"
            );


        this.quest =
            new Quest();


        this.world =
            new World();


        this.gameEnded = false;


        addLog(`🎮 Добро пожаловать, ${this.player.name}! В рюкзаке уже есть два зелья.`);


        showScreen(
            "villageScreen"
        );


        this.updateUI();
    }

    resume() {
        const data = this.saveSystem.load();
        if (!data?.player || !data?.world) return false;

        this.player = Player.fromJSON(data.player);
        this.world = World.fromJSON(data.world);
        this.quest = Quest.fromJSON(data.quest || {});
        this.inventory = new Inventory(this.player);
        this.shop = new Shop(this.player);
        this.npc = new NPC("Староста");
        this.battle = null;
        this.gameEnded = false;
        addLog(`💾 Приключение ${this.player.name} продолжено.`);
        showScreen("villageScreen");
        this.updateUI();
        return true;
    }


    updateUI() {

        if (!this.player) {
            return;
        }


        const hp =
            (
                this.player.health /
                this.player.maxHealth
            ) * 100;


        document
            .getElementById("playerName")
            .textContent =
                `👤 ${this.player.name}`;


        document
            .getElementById("healthBar")
            .style.width =
                `${hp}%`;


        document
            .getElementById("healthText")
            .textContent =
                `❤️ ${this.player.health} / ${this.player.maxHealth}`;


        document
            .getElementById("quickStats")
            .textContent =
                `⭐ ${this.player.level} ур. · ✨ ${this.player.experience}/${this.player.experienceToNextLevel} · ⚔️ ${this.player.attack} · 🛡️ ${this.player.defense} · 🧰 ${this.player.trapSkill} · 💰 ${this.player.gold}`;

        if (!this.gameEnded) this.saveSystem.save(this);
    }


    startBattle(enemy) {

        if (this.gameEnded) {
            return;
        }


        this.battle =
            new Battle(
                this,
                enemy
            );


        document
            .getElementById("battleLog")
            .innerHTML = "";


        this.showEnemy();


        showScreen(
            "battleScreen"
        );
    }


    showEnemy() {

        const enemy =
            this.battle.enemy;


        const percent =
            (
                enemy.health /
                enemy.maxHealth
            ) * 100;


        document
            .getElementById("enemyInfo")
            .innerHTML = `

                <div class="enemyName">
                    ${enemy.emoji} ${enemy.name}
                </div>

                <div class="bar">

                    <div
                        class="health"
                        style="width:${percent}%"
                    ></div>

                </div>

                <p>
                    ❤️
                    ${enemy.health}
                    /
                    ${enemy.maxHealth}
                </p>

            `;
    }


  enemyDefeated(enemy) {

    if (this.quest) {

        this.quest.enemyDefeated(
            enemy
        );
    }


    /*
    ========================================
    БОСС ПОБЕЖДЁН
    ========================================
    */

    if (
        enemy.name ===
        "Страж сокровища"
    ) {

        const room =
            this.world.getCurrentRoom();


        room.event =
            "treasure";


        room.cleared =
            true;


        this.battle =
            null;


        this.updateUI();


        setTimeout(() => {

            showScreen(
                "locationScreen"
            );


            renderLocation();

        }, 500);


        return;
    }


    /*
    ========================================
    ОБЫЧНЫЙ ВРАГ
    ========================================
    */

    const room =
        this.world.getCurrentRoom();


    room.cleared =
        true;


    room.event =
        "cleared";


    this.battle =
        null;


    this.updateUI();


    setTimeout(() => {

        showScreen(
            "locationScreen"
        );


        renderLocation();

    }, 500);
}

    escapeBattle() {
        this.battle = null;
        this.updateUI();
        setTimeout(() => {
            showScreen("locationScreen");
            renderLocation();
        }, 450);
    }

    gameOver() {

        this.gameEnded = true;
        this.saveSystem.clear();

        showScreen(
            "endScreen"
        );


        document
            .getElementById("endMessage")
            .innerHTML = `

                💀 GAME OVER

                <br><br>

                ${this.player.name}
                погиб.

                <br><br>

                Приключение окончено.

            `;
    }


    victory() {

        this.gameEnded = true;
        this.saveSystem.clear();

        showScreen(
            "endScreen"
        );


        document
            .getElementById("endMessage")
            .innerHTML = `

                🏆 ПОБЕДА!

                <br><br>

                Ты нашёл сокровище
                и завершил приключение!

            `;
    }
}
