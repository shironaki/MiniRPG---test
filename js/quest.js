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


/**
 * Journal of branching side quests and companion personal quests.
 *
 * Which quests are OFFERED depends on the player's karma and their current
 * ally (role + affinity), so a ruthless loner and a beloved-companion hero see
 * different opportunities. Progress is tracked per accepted quest; rewards
 * (gold/xp/karma/affinity) are granted on claim.
 */
class QuestJournal {
    constructor() {
        this.accepted = {}; // id -> { progress, completed, claimed }
    }

    defs() { return (typeof GAME_DATA !== "undefined" && GAME_DATA.sideQuests) || []; }
    def(id) { return this.defs().find(d => d.id === id) || null; }
    entry(id) { return this.accepted[id] || null; }
    isAccepted(id) { return !!this.accepted[id]; }

    meetsOffer(def, player) {
        const o = def.offer || {};
        const karma = player.karma || 0;
        if (o.minKarma !== undefined && karma < o.minKarma) return false;
        if (o.maxKarma !== undefined && karma > o.maxKarma) return false;
        if (o.requiresAllyRole && (!player.ally || player.ally.role !== o.requiresAllyRole)) return false;
        if (o.minAffinity !== undefined && (!player.ally || (player.ally.affinity || 0) < o.minAffinity)) return false;
        return true;
    }

    // Offerable quests: not yet accepted and whose conditions the player meets.
    available(player) {
        return this.defs().filter(d => !this.accepted[d.id] && this.meetsOffer(d, player));
    }

    activeEntries() {
        return Object.keys(this.accepted).map(id => ({ id, def: this.def(id), entry: this.accepted[id] })).filter(x => x.def);
    }

    accept(id, player) {
        const def = this.def(id);
        if (!def || this.accepted[id] || !this.meetsOffer(def, player)) return null;
        this.accepted[id] = { progress: 0, completed: false, claimed: false };
        return def;
    }

    _bump(id) {
        const e = this.accepted[id];
        const def = this.def(id);
        e.progress++;
        if (e.progress >= def.objective.count) { e.progress = def.objective.count; e.completed = true; }
        return id;
    }

    // Advance kill objectives. Returns ids of quests that progressed.
    onEnemyDefeated(enemy) {
        const changed = [];
        for (const id in this.accepted) {
            const e = this.accepted[id]; if (e.completed) continue;
            const def = this.def(id); if (!def || def.objective.type !== "kill") continue;
            const want = def.objective.enemy;
            if (want === "any" || (enemy && enemy.name && enemy.name.includes(want))) changed.push(this._bump(id));
        }
        return changed;
    }

    // Advance chest objectives. Returns ids of quests that progressed.
    onChestOpened() {
        const changed = [];
        for (const id in this.accepted) {
            const e = this.accepted[id]; if (e.completed) continue;
            const def = this.def(id); if (!def || def.objective.type !== "chest") continue;
            changed.push(this._bump(id));
        }
        return changed;
    }

    // Grant a completed quest's reward exactly once.
    claim(id, game) {
        const e = this.accepted[id]; const def = this.def(id);
        if (!e || !def || !e.completed || e.claimed) return null;
        e.claimed = true;
        const r = def.reward || {};
        const player = game.player;
        if (r.gold) player.gold += r.gold;
        let levelMsgs = [];
        if (r.xp) levelMsgs = player.addExperience(r.xp);
        if (r.karma && game.adjustKarma) game.adjustKarma(r.karma);
        if (r.affinity && player.ally && player.ally.changeAffinity) player.ally.changeAffinity(r.affinity);
        return { def, reward: r, levelMsgs };
    }

    render(player) {
        const rewardText = r => {
            const parts = [];
            if (r.gold) parts.push(`💰 ${r.gold}`);
            if (r.xp) parts.push(`✨ ${r.xp}`);
            if (r.karma) parts.push(`☯️ ${r.karma > 0 ? "+" : ""}${r.karma}`);
            if (r.affinity) parts.push(`❤ +${r.affinity}`);
            return parts.join(" · ");
        };

        let html = "";
        const active = this.activeEntries();

        if (active.length) {
            html += `<h4 class="questGroup">📋 Твои задания</h4>`;
            active.forEach(({ id, def, entry }) => {
                const goal = def.objective.count;
                const state = entry.claimed ? "✅ Награда получена"
                    : entry.completed ? `<button class="questClaim" onclick="claimQuest('${id}')">🏆 Забрать награду</button>`
                    : `⚔️ Прогресс: ${entry.progress}/${goal}`;
                const tag = def.giver === "ally" ? "🤝 Личный квест" : "🏘️ Задание деревни";
                html += `<div class="questCard ${entry.completed ? "done" : ""}">
                    <strong>${def.title}</strong>
                    <span class="questTag">${tag}</span>
                    <p>${def.desc}</p>
                    <p class="questReward">Награда: ${rewardText(def.reward)}</p>
                    <p class="questState">${state}</p>
                </div>`;
            });
        }

        const offers = this.available(player);
        if (offers.length) {
            html += `<h4 class="questGroup">✨ Доступные задания</h4>`;
            offers.forEach(def => {
                const tag = def.giver === "ally" ? "🤝 Личный квест" : "🏘️ Задание деревни";
                html += `<div class="questCard offer">
                    <strong>${def.title}</strong>
                    <span class="questTag">${tag}</span>
                    <p>${def.desc}</p>
                    <p class="questReward">Награда: ${rewardText(def.reward)}</p>
                    <button class="questAccept" onclick="acceptQuest('${def.id}')">📜 Взять задание</button>
                </div>`;
            });
        }

        if (!html) html = `<p class="questEmpty">Пока нет доступных заданий. Заверши текущие, подними репутацию или сдружись со спутником — и появятся новые.</p>`;
        return html;
    }
}