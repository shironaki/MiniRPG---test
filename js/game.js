class Game {

    constructor() {

        this.player = null;

        this.inventory = null;

        this.shop = null;

        this.npc = null;

        this.quest = null;

        this.world = null;

        this.battle = null;

        this.dungeon = null;

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

    // Spend a perk point to raise a perk by one rank. Returns a result object.
    buyPerk(id) {
        const defs = (typeof GAME_DATA !== "undefined" && GAME_DATA.perks) || [];
        const def = defs.find(p => p.id === id);
        if (!def) return { success: false, message: "Неизвестный навык." };
        if (!this.player.perks) this.player.perks = {};
        const rank = this.player.perks[id] || 0;
        if (rank >= def.maxRank) return { success: false, message: "Достигнут максимальный ранг." };
        const cost = def.cost || 1;
        if ((this.player.perkPoints || 0) < cost) return { success: false, message: "Недостаточно очков навыков." };

        this.player.perkPoints -= cost;
        this.player.perks[id] = rank + 1;
        if (def.maxHealth) { this.player.maxHealth += def.maxHealth; this.player.health += def.maxHealth; }
        if (def.maxEnergy) { this.player.maxEnergy += def.maxEnergy; this.player.energy += def.maxEnergy; }
        this.player.updateStats();
        return { success: true, def, rank: rank + 1 };
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


        this.journal =
            new QuestJournal();


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
        if (this.player.perkPoints == null) this.player.perkPoints = 0;
        if (!this.player.perks) this.player.perks = {};
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
        this.journal = Object.assign(Object.create(QuestJournal.prototype), data.journal || new QuestJournal());
        if (!this.journal.accepted) this.journal.accepted = {};
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
            .textContent = (() => {
                const p = this.player;
                const parts = [
                    `⭐ ${p.level} ур.`,
                    `✨ ${p.experience}/${p.experienceToNextLevel}`,
                    `⚔️ ${p.attack}`,
                    `🛡️ ${p.defense}`,
                    `⚡ ${p.energy}/${p.maxEnergy}`
                ];
                if (p.trapSkill > 0) parts.push(`🧰 ${p.trapSkill}`);       // shown once learned
                parts.push(`💰 ${p.gold}`);
                if ((p.karma || 0) !== 0) parts.push(`☯️ ${this.karmaLabel()}`); // shown once earned
                return parts.join(" · ");
            })();

        const allyBox = document.getElementById("allyInfo");
        if (allyBox) {
            const ally = this.player.ally;
            allyBox.innerHTML = ally
                ? `<span class="allyChip">${ally.emoji} ${ally.name} · ${ally.tierLabel()} <small>❤ ${ally.affinity}</small></span>`
                : "";
        }

        if (typeof refreshMenus === "function") refreshMenus();

        if (!this.gameEnded) this.saveSystem.save(this);
    }


    // --- Procedural dungeon ("Врата испытаний") -------------------------

    enterDungeon() {
        if (this.gameEnded) return;
        this.dungeon = Dungeon.generate(this.player.level);
        addLog("🚪 Ты входишь во Врата испытаний…");
        showScreen("dungeonScreen");
        if (typeof renderDungeon === "function") renderDungeon();
    }

    // Begin the combat floor: a scaled foe flagged as a dungeon encounter so
    // enemyDefeated() advances the run instead of returning to the map.
    startDungeonBattle(floor) {
        const level = this.player.level + floor.n + (floor.type === "elite" ? 2 : 0);
        const enemy = createEnemy(floor.enemy, level);
        enemy.fromDungeon = true;
        if (floor.type === "elite") { enemy.name = "Элитный " + enemy.name; enemy.isElite = true; }
        this.startBattle(enemy);
    }

    // Resolve a non-combat floor immediately; returns a log message. May end
    // the game if a trap is fatal.
    resolveDungeonFloor(floor) {
        const lvl = this.dungeon ? this.dungeon.level : this.player.level;
        if (floor.type === "chest") {
            const gold = 20 + lvl * 6;
            this.player.gold += gold;
            let msg = `📦 Сундук на этаже ${floor.n}: +${gold} 💰`;
            if (typeof Craft !== "undefined" && Math.random() < 0.5) {
                this.player.addItem(Craft.essence());
                msg += " и 🔩 эссенция ковки";
            }
            return msg + ".";
        }
        if (floor.type === "trap") {
            const dmg = 6 + lvl * 2;
            const taken = this.player.takeDamage(dmg);
            let msg = `⚠️ Ловушка на этаже ${floor.n}: −${taken} HP.`;
            if (this.player.isDead()) { this.gameOver(); msg += " Ты пал в подземелье…"; }
            return msg;
        }
        if (floor.type === "rest") {
            const heal = Math.floor(this.player.maxHealth * 0.25);
            const before = this.player.health;
            this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
            return `🔥 Привал на этаже ${floor.n}: +${this.player.health - before} HP.`;
        }
        return `🌙 Этаж ${floor.n}: тишина.`;
    }

    // Reward and close a completed run.
    finishDungeon() {
        if (!this.dungeon) return;
        const lvl = this.dungeon.level;
        const bonusGold = 60 + lvl * 20;
        this.player.gold += bonusGold;
        const xpMsgs = this.player.addExperience(40 + lvl * 15);
        addLog(`🏁 Врата испытаний пройдены! Награда: +${bonusGold} 💰 и опыт.`);
        if (typeof Craft !== "undefined") { this.player.addItem(Craft.essence()); addLog("🔩 Ты выносишь эссенцию ковки как трофей."); }
        xpMsgs.forEach(m => addLog(m));
        this.dungeon.active = false;
        this.updateUI();
        showScreen("villageScreen");
        if (typeof refreshMenus === "function") refreshMenus();
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
        let elementHtml = "";
        if (opts.element) {
            const els = (typeof GAME_DATA !== "undefined" && GAME_DATA.elements) || {};
            const el = els[opts.element] || {};
            const weakKey = (typeof Battle !== "undefined") ? Battle.weaknessOf(opts.element) : null;
            const weak = weakKey && els[weakKey]
                ? ` <span class="weakTag" title="Уязвим к ${els[weakKey].name}">уязвим: ${els[weakKey].emoji}</span>`
                : "";
            elementHtml = `<p class="fighterElement">${el.emoji || ""} ${el.name || ""}${weak}</p>`;
        }
        return `
            <div class="fighterArt ${opts.side}">${art}${allyBadge}</div>
            <div class="fighterName">${opts.emoji} ${opts.name}</div>
            <div class="bar"><div class="health" style="width:${pct}%"></div></div>
            <p class="fighterHp">❤️ ${opts.health} / ${opts.maxHealth}</p>
            ${energyHtml}
            ${elementHtml}
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
                element: enemy.element,
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

    // Branching side / companion quests advance on every kill (guardians and
    // the boss included), so this runs before any early returns below.
    if (this.journal) {
        this.journal.onEnemyDefeated(enemy).forEach(id => {
            const e = this.journal.entry(id);
            const d = this.journal.def(id);
            if (!e || !d) return;
            if (e.completed) addLog(`🏆 Задание «${d.title}» выполнено! Забери награду в журнале.`);
            else addLog(`📜 «${d.title}»: ${e.progress}/${d.objective.count}`);
        });
    }

    /*
    ========================================
    ЭТАЖ ПОДЗЕМЕЛЬЯ ПРОЙДЕН (ВРАТА ИСПЫТАНИЙ)
    ========================================
    */
    if (this.dungeon && this.dungeon.active && enemy.fromDungeon) {
        this.battle = null;
        this.dungeon.advance();
        this.updateUI();
        if (this.dungeon.cleared) {
            setTimeout(() => this.finishDungeon(), 450);
        } else {
            setTimeout(() => { showScreen("dungeonScreen"); if (typeof renderDungeon === "function") renderDungeon(); }, 450);
        }
        return;
    }

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
        // Fleeing inside the trial gate abandons the whole run.
        if (this.dungeon && this.dungeon.active) {
            this.dungeon.active = false;
            addLog("🏃 Ты покидаешь Врата испытаний.");
            setTimeout(() => {
                showScreen("villageScreen");
                if (typeof refreshMenus === "function") refreshMenus();
            }, 450);
            return;
        }
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
