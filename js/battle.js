class Battle {

    constructor(game, enemy) {

        this.game = game;
        this.player = game.player;
        this.enemy = enemy;

        this.finished = false;

        // A defensive stance must never carry over from a previous fight.
        this.player.isDefending = false;

        // Status effects don't leak between fights, and each battle starts
        // with a full energy pool so skills are always an option.
        this.player.statuses = [];
        if (this.player.maxEnergy != null) this.player.energy = this.player.maxEnergy;
        if (!this.enemy.statuses) this.enemy.statuses = [];
    }

    // --- Status-effect engine -------------------------------------------

    applyStatus(target, type, turns) {
        if (!target.statuses) target.statuses = [];
        const existing = target.statuses.find(s => s.type === type);
        if (existing) existing.turns = Math.max(existing.turns, turns);
        else target.statuses.push({ type, turns });
    }

    // Apply damage-over-time and count down durations at the start of a
    // combatant's turn. Returns { lines, stunned }.
    tickStatuses(target, meta) {
        const out = { lines: [], stunned: false };
        if (!target.statuses || !target.statuses.length) return out;
        const defs = (typeof GAME_DATA !== "undefined" && GAME_DATA.statuses) || {};
        const remaining = [];
        for (const s of target.statuses) {
            const def = defs[s.type] || {};
            if (s.type === "stun") {
                out.stunned = true;
            } else if (def.damage) {
                target.health = Math.max(0, target.health - def.damage);
                out.lines.push(`${def.emoji || "☠️"} ${meta.name} теряет ${def.damage} HP от «${def.name || s.type}».`);
            }
            s.turns--;
            if (s.turns > 0) remaining.push(s);
        }
        target.statuses = remaining;
        return out;
    }

    // Run at the start of every player action: regenerate energy and apply
    // any damage-over-time to the player. Returns false if the player died.
    beginPlayerTurn() {
        if (this.player.maxEnergy != null) {
            this.player.energy = Math.min(this.player.maxEnergy, (this.player.energy || 0) + 8);
        }
        const tick = this.tickStatuses(this.player, { name: "Ты", emoji: "🧑" });
        tick.lines.forEach(line => this.log(line));
        this.game.updateUI();
        if (this.player.isDead()) {
            this.lose();
            return false;
        }
        return true;
    }


    playerAttack() {

        if (this.finished) {
            return;
        }

        if (!this.beginPlayerTurn()) {
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


        this.allyTurn();

        if (this.finished) {
            return;
        }


        this.enemyTurn();
    }


    allyTurn() {

        const ally = this.player.ally;

        if (!ally || this.finished || this.enemy.isDead()) {
            return;
        }

        const result = ally.support(this.player, this.enemy);

        if (result && result.message) {
            this.log(result.message);
        }

        if (this.enemy.isDead()) {
            this.win();
        }
    }


    playerHeal() {

        if (this.finished) {
            return;
        }

        if (!this.beginPlayerTurn()) {
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

        if (!this.beginPlayerTurn()) {
            return;
        }


        this.log(
            this.player.defend()
        );


        this.allyTurn();

        if (this.finished) {
            return;
        }


        this.enemyTurn();
    }

    playerUseSkill(id) {

        if (this.finished) return { success: false };

        const skills = (typeof GAME_DATA !== "undefined" && GAME_DATA.skills) || {};
        const skill = skills[id];
        if (!skill) return { success: false, message: "Неизвестное умение." };

        if (this.player.level < skill.level) {
            this.log(`🔒 «${skill.name}» ещё не изучено (нужен ур. ${skill.level}).`);
            return { success: false };
        }
        if ((this.player.energy || 0) < skill.cost) {
            this.log(`⚡ Недостаточно энергии для «${skill.name}» (нужно ${skill.cost}).`);
            return { success: false };
        }

        if (!this.beginPlayerTurn()) return { success: false };

        this.player.energy -= skill.cost;

        if (skill.type === "heal") {
            const amount = Math.min(skill.heal, this.player.maxHealth - this.player.health);
            this.player.health += amount;
            this.log(`${skill.emoji} ${skill.name}: +${amount} HP.`);
        } else {
            const raw = Math.round(this.player.attack * (skill.mult || 1)) + Math.floor(Math.random() * 6);
            const dmg = this.enemy.takeDamage(raw);
            this.log(`${skill.emoji} ${skill.name}: ${dmg} урона.`);
            if (skill.status && (skill.chance === undefined || Math.random() < skill.chance)) {
                this.applyStatus(this.enemy, skill.status, skill.duration || 2);
                const def = ((typeof GAME_DATA !== "undefined" && GAME_DATA.statuses) || {})[skill.status] || {};
                this.log(`${def.emoji || "✨"} ${this.enemy.name} получает эффект «${def.name || skill.status}».`);
            }
        }

        this.game.updateUI();

        if (this.enemy.isDead()) {
            this.win();
            return { success: true };
        }

        this.allyTurn();
        if (this.finished) return { success: true };

        this.enemyTurn();
        return { success: true };
    }

    playerFlee() {
        if (this.finished) return;
        const chance = Math.max(30, 65 - this.enemy.attack);
        if (Math.random() * 100 < chance) {
            this.finished = true;
            this.player.statuses = [];
            this.log(`🏃 Ты скрылся от врага. Шанс был ${chance}%.`);
            this.game.escapeBattle();
            return;
        }
        this.log(`❌ Побег не удался (${chance}%). Враг перехватывает тебя!`);
        this.enemyTurn();
    }


    enemyTurn() {

        if (this.enemy.isDead()) {
            return;
        }


        // Damage-over-time and stun resolve at the start of the enemy's turn.
        const tick = this.tickStatuses(this.enemy, { name: this.enemy.name, emoji: this.enemy.emoji });
        tick.lines.forEach(line => this.log(line));

        if (this.enemy.isDead()) {
            this.win();
            return;
        }

        if (tick.stunned) {
            this.log(`💫 ${this.enemy.name} оглушён и пропускает ход.`);
            this.game.updateUI();
            return;
        }


        const damage =
            this.enemy.attackPlayer(
                this.player
            );


        this.log(`${this.enemy.emoji} ${this.enemy.name} нанёс ${damage} урона.`);


        // Some foes leave a lingering effect on a successful hit.
        if (this.enemy.inflict && Math.random() < (this.enemy.inflictChance || 0) && !this.player.isDead()) {
            this.applyStatus(this.player, this.enemy.inflict, 3);
            const def = ((typeof GAME_DATA !== "undefined" && GAME_DATA.statuses) || {})[this.enemy.inflict] || {};
            this.log(`${def.emoji || "✨"} Ты получаешь эффект «${def.name || this.enemy.inflict}»!`);
        }


        this.game.updateUI();


        if (this.player.isDead()) {

            this.lose();
        }
    }


    win() {

        this.finished = true;

        this.player.statuses = [];


        this.player.gold +=
            (this.player.goldMultiplier ? Math.round(this.enemy.gold * this.player.goldMultiplier()) : this.enemy.gold);


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


        // Chance to drop a forge essence for crafting upgrades.
        const dropChance = (typeof GAME_DATA !== "undefined" && GAME_DATA.essenceDropChance) || 0;
        if (typeof Craft !== "undefined" && Math.random() < dropChance) {
            this.player.addItem(Craft.essence());
            this.log("🔩 Из добычи выпала эссенция ковки.");
        }


        levelMessages.forEach(
            message => this.log(message)
        );

        this.game.updateUI();


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
