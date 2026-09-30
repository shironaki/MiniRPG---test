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
        if (this.player.maxEnergy == null) this.player.maxEnergy = 30;
        if (this.player.energy == null) this.player.energy = this.player.maxEnergy;
        this.player.statuses = []; // effects never persist outside a battle
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
                `⭐ ${this.player.level} ур. · ✨ ${this.player.experience}/${this.player.experienceToNextLevel} · ⚔️ ${this.player.attack} · 🛡️ ${this.player.defense} · ⚡ ${this.player.energy}/${this.player.maxEnergy} · 🧰 ${this.player.trapSkill} · 💰 ${this.player.gold} · ☯️ ${this.karmaLabel()}`;

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


    // Resolve a sprite path from the manifest, or null to fall back to emoji.
    spriteFor(kind, key) {
        const s = (typeof GAME_DATA !== "undefined" && GAME_DATA.sprites) || {};
        if (kind === "hero") return s.hero || null;
        if (kind === "enemy") return (s.enemies || {})[key] || null;
        if (kind === "ally") return (s.allies || {})[key] || null;
        return null;
    }

    // Small chips for the active status effects on a combatant.
    statusChips(statuses) {
        if (!statuses || !statuses.length) return "";
        const defs = (typeof GAME_DATA !== "undefined" && GAME_DATA.statuses) || {};
        return `<div class="statusChips">` + statuses.map(s => {
            const d = defs[s.type] || {};
            return `<span class="statusChip" title="${d.name || s.type}">${d.emoji || "✨"}${s.turns}</span>`;
        }).join("") + `</div>`;
    }

    // Markup for one combatant: sprite (with emoji fallback), name, HP (and,
    // for the hero, an energy bar), plus any status effects.
    fighterHtml(opts) {
        const pct = Math.max(0, Math.min(100, (opts.health / opts.maxHealth) * 100));
        const art = opts.sprite
            ? `<img class="fighterSprite" src="${opts.sprite}" alt="${opts.name}" onerror="spriteFallback(this,'${opts.emoji}')">`
            : `<div class="fighterEmoji">${opts.emoji}</div>`;
        const allyBadge = opts.allyBadge
            ? `<div class="fighterAlly">${opts.allyBadge}</div>`
            : "";
        let energyHtml = "";
        if (opts.energy != null && opts.maxEnergy) {
            const epct = Math.max(0, Math.min(100, (opts.energy / opts.maxEnergy) * 100));
            energyHtml = `<div class="bar energyBar"><div class="energy" style="width:${epct}%"></div></div>
            <p class="fighterEnergy">⚡ ${opts.energy} / ${opts.maxEnergy}</p>`;
        }
        return `
            <div class="fighterArt ${opts.side}">${art}${allyBadge}</div>
            <div class="fighterName">${opts.emoji} ${opts.name}</div>
            <div class="bar"><div class="health" style="width:${pct}%"></div></div>
            <p class="fighterHp">❤️ ${opts.health} / ${opts.maxHealth}</p>
            ${energyHtml}
            ${this.statusChips(opts.statuses)}`;
    }

    showEnemy() {

        const enemy = this.battle.enemy;
        const p = this.player;

        const heroEl = document.getElementById("heroFighter");
        const enemyEl = document.getElementById("enemyFighter");

        if (heroEl) {
            const ally = p.ally;
            heroEl.innerHTML = this.fighterHtml({
                side: "hero",
                name: p.name,
                emoji: "🧑",
                sprite: this.spriteFor("hero"),
                health: p.health,
                maxHealth: p.maxHealth,
                energy: p.energy,
                maxEnergy: p.maxEnergy,
                statuses: p.statuses,
                allyBadge: ally ? `${ally.emoji} ${ally.name}` : ""
            });
        }

        if (enemyEl) {
            enemyEl.innerHTML = this.fighterHtml({
                side: "enemy",
                name: enemy.name,
                emoji: enemy.emoji,
                sprite: this.spriteFor("enemy", enemy.key),
                health: enemy.health,
                maxHealth: enemy.maxHealth,
                statuses: enemy.statuses
            });
            enemyEl.classList.remove("hitFlash");
            void enemyEl.offsetWidth;
            enemyEl.classList.add("hitFlash");
        }

        if (typeof renderBattleSkills === "function") renderBattleSkills();
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
