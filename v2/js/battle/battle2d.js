/**
 * v2 battle bridge — reuses the entire v1 combat engine (elements, skills,
 * statuses, crit, gold, leveling) without v1's DOM. It builds a minimal "host"
 * object that satisfies what v1's Battle expects (player + a few callbacks) and
 * routes Battle's log through our own sink. UI is layered on top separately.
 *
 * Requires v1 globals: Battle, createEnemy (loaded via <script> in index.html).
 */
class Battle2D {
    constructor(v1player, enemyKind, level, opts = {}) {
        this.player = v1player;
        this.lines = [];
        this.result = null;
        this.finished = false;
        this.onUpdate = opts.onUpdate || function () {};
        this.onLog = opts.onLog || function () {};
        this.onEnd = opts.onEnd || function () {};

        const self = this;
        this.host = {
            player: v1player,
            updateUI() { self.onUpdate(); },
            enemyDefeated() { self._finish("win"); },
            escapeBattle() { self._finish("flee"); },
            gameOver() { self._finish("lose"); }
        };

        this.enemy = createEnemy(enemyKind, level || v1player.level || 1);
        this.battle = new Battle(this.host, this.enemy);
        // Redirect the engine's log to our sink (no DOM dependency).
        this.battle.log = (msg) => { self.lines.push(msg); self.onLog(msg); };
    }

    // Skills the hero currently knows (level-gated) — for building the UI.
    availableSkills() {
        const skills = (typeof GAME_DATA !== "undefined" && GAME_DATA.skills) || {};
        return Object.keys(skills)
            .filter(id => (this.player.level || 1) >= skills[id].level)
            .map(id => ({ id, ...skills[id] }));
    }

    attack() { if (!this.finished) { this.battle.playerAttack(); this.onUpdate(); } }
    useSkill(id) { if (!this.finished) { this.battle.playerUseSkill(id); this.onUpdate(); } }
    defend() { if (!this.finished) { this.battle.playerDefend(); this.onUpdate(); } }
    heal() { if (!this.finished) { this.battle.playerHeal(); this.onUpdate(); } }
    flee() { if (!this.finished) { this.battle.playerFlee(); this.onUpdate(); } }

    _finish(result) {
        if (this.finished) return;
        this.finished = true;
        this.result = result;
        this.onEnd(result);
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Battle2D };
