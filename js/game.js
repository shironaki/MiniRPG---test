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

        this.stats = this.emptyStats();
    }

    emptyStats() {
        return { steps: 0, kills: 0, chests: 0, traps: 0 };
    }

    bumpStat(key) {
        if (!this.stats) this.stats = this.emptyStats();
        if (key in this.stats) this.stats[key]++;
    }

    // Recruit (or replace) a companion. Returns the new ally.
    recruitAlly(type) {
        const factory = (typeof ALLIES !== "undefined") && ALLIES[type];
        if (!factory) return null;
        this.player.ally = factory();
        return this.player.ally;
    }

    // Shift karma within [-100, 100].
    adjustKarma(delta) {
        if (!this.player) return 0;
        this.player.karma = Math.max(-100, Math.min(100, (this.player.karma || 0) + (delta || 0)));
        return this.player.karma;
    }

    karmaLabel() {
        const k = this.player ? (this.player.karma || 0) : 0;
        if (k >= 40) return "Герой";
        if (k >= 10) return "Добрый";
        if (k <= -40) return "Злодей";
        if (k <= -10) return "Тёмный";
        return "Нейтральный";
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

        this.stats = this.emptyStats();


        addLog(`🎮 Добро пожаловать, ${this.player.name}! В рюкзаке уже есть два зелья.`);


        showScreen(
            "villageScreen"
        );


        this.updateUI();
    }

    resume() {
        const data = this.saveSystem.load();
        if (!data?.player || !data?.world) return false;

        this.player = Object.assign(Object.create(Player.prototype), data.player);
        if (this.player.karma === undefined) this.player.karma = 0;
        this.player.inventory.forEach(item => Object.setPrototypeOf(item, Item.prototype));
        Object.values(this.player.equipment).filter(Boolean).forEach(item => Object.setPrototypeOf(item, Item.prototype));
        if (this.player.ally) Object.setPrototypeOf(this.player.ally, Ally.prototype);
        this.world = Object.assign(Object.create(World.prototype), data.world);
        Object.values(this.world.rooms).forEach(room => {
            Object.setPrototypeOf(room, Room.prototype);
            if (room.chest) Object.setPrototypeOf(room.chest, Chest.prototype);
            if (room.trap) Object.setPrototypeOf(room.trap, Trap.prototype);
        });
        this.world.getCurrentRoom().visited = true;
        this.quest = Object.assign(Object.create(Quest.prototype), data.quest || new Quest());
        this.inventory = new Inventory(this.player);
        this.shop = new Shop(this.player);
        this.npc = new NPC("Староста");
        this.battle = null;
        this.gameEnded = false;
        this.stats = Object.assign(this.emptyStats(), data.stats || {});
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
                `⭐ ${this.player.level} ур. · ✨ ${this.player.experience}/${this.player.experienceToNextLevel} · ⚔️ ${this.player.attack} · 🛡️ ${this.player.defense} · 🧰 ${this.player.trapSkill} · 💰 ${this.player.gold} · ☯️ ${this.karmaLabel()}`;

        const allyBox = document.getElementById("allyInfo");
        if (allyBox) {
            const ally = this.player.ally;
            allyBox.innerHTML = ally
                ? `<span class="allyChip">${ally.emoji} ${ally.name} · ${ally.tierLabel()} <small>❤ ${ally.affinity}</small></span>`
                : "";
        }

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

    this.bumpStat("kills");

    /*
    ========================================
    СТРАЖ РУНЫ (МИНИ-БОСС) ПОБЕЖДЁН
    ========================================
    */
    if (enemy.isGuardian && enemy.relicRoom && this.world.rooms[enemy.relicRoom]) {

        const guardedRoom = this.world.rooms[enemy.relicRoom];
        guardedRoom.guardianDefeated = true;
        guardedRoom.event = "relic";
        guardedRoom.cleared = false;

        this.battle = null;
        this.updateUI();

        setTimeout(() => {
            showScreen("locationScreen");
            renderLocation();
        }, 500);

        return;
    }

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

    renderStats() {
        const s = this.stats || this.emptyStats();
        const relics = this.world ? this.world.relics.length : 0;
        return `
            <div class="runStats">
                <h3>📊 Итоги забега</h3>
                <div class="runStatsGrid">
                    <span>⭐ Уровень: ${this.player ? this.player.level : 1}</span>
                    <span>💰 Золото: ${this.player ? this.player.gold : 0}</span>
                    <span>👣 Шагов: ${s.steps}</span>
                    <span>⚔️ Побед: ${s.kills}</span>
                    <span>📦 Сундуков: ${s.chests}</span>
                    <span>🧰 Ловушек снято: ${s.traps}</span>
                    <span>✨ Рун: ${relics}/3</span>
                </div>
            </div>
        `;
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

                ${this.renderStats()}

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

                ${this.renderStats()}

            `;
    }
}
