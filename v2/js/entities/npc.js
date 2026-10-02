/**
 * v2 entities — a living townsperson with autonomous AI & daily schedules.
 *
 * NPCs feature:
 * - Structured daily schedules (home -> work -> plaza stroll -> evening meal -> sleep)
 * - Proximity awareness (turns to face nearby player, offers greeting emotes)
 * - Contextual activity states (idle, working, chatting, relaxing, sleeping)
 * - Living thought / emote bubbles (💬, 💡, 😊, 💤, ⚒️, 🌿)
 * - Anti-stuck pathfinding with collision awareness
 *
 * Pure logic, unit-testable headlessly.
 */
class NPC2D {
    constructor(def, ts = 32) {
        this.id = def.id;
        this.name = def.name || "Житель";
        this.emoji = def.emoji || "🧑";
        this.role = def.role || "Житель деревни";
        this.look = def.look || null;              // CharacterRig palette override
        this.dialogue = def.dialogue && def.dialogue.length ? def.dialogue : ["…"];
        this.likes = def.likes || [];              // gift keywords they love
        this.ts = ts;
        this.w = 18;
        this.h = 20;
        this.speed = def.speed || 45;
        this.rng = def.rng || Math.random;

        // Sort a copy of the schedule by start minute.
        this.schedule = (def.schedule || []).slice().sort((a, b) => a.from - b.from);

        this.x = 0;
        this.y = 0;
        this.dir = { x: 0, y: 0 };
        this.facing = "down";
        this.moving = false;
        this.animTime = 0;
        this._stuck = 0;
        this.activity = "idle";

        // Living AI state
        this.bubble = null;          // { icon: "💬", life: 2.0, t: 0 }
        this.fidgetTimer = 2 + this.rng() * 4;
        this.playerAware = false;
        this.awareTimer = 0;
    }

    get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    get centerX() { return this.x + this.w / 2; }
    get centerY() { return this.y + this.h / 2; }

    showBubble(icon, life = 2.0) {
        this.bubble = { icon, life, maxLife: life, t: 0 };
    }

    // The scheduled stop active at clock `min` (last stop whose from<=min; wraps).
    stopAt(min) {
        if (!this.schedule.length) return null;
        let cur = this.schedule[this.schedule.length - 1]; // default = previous day's last
        for (const s of this.schedule) {
            if (min >= s.from) cur = s;
        }
        return cur;
    }

    // Centre this NPC on a tile.
    _tilePos(col, row) {
        return {
            x: col * this.ts + (this.ts - this.w) / 2,
            y: row * this.ts + (this.ts - this.h) / 2
        };
    }

    // Snap to the stop applicable at `min` (used on spawn / zone load).
    placeAt(min) {
        const s = this.stopAt(min);
        if (s) {
            const p = this._tilePos(s.col, s.row);
            this.x = p.x;
            this.y = p.y;
            this.activity = s.activity || "idle";
        }
    }

    reactToPlayer(playerBox, dt) {
        if (!playerBox) return;
        const pCenterX = playerBox.x + playerBox.w / 2;
        const pCenterY = playerBox.y + playerBox.h / 2;
        const dist = Math.hypot(pCenterX - this.centerX, pCenterY - this.centerY);

        if (dist <= 48 && this.activity !== "sleep") {
            const wasAware = this.playerAware;
            this.playerAware = true;
            this.awareTimer += dt;

            // Turn toward player
            const dx = pCenterX - this.centerX;
            const dy = pCenterY - this.centerY;
            this.facing = Math.abs(dx) > Math.abs(dy)
                ? (dx < 0 ? "left" : "right")
                : (dy < 0 ? "up" : "down");

            // Show friendly greeting if newly noticed
            if (!wasAware && (!this.bubble || this.bubble.life <= 0)) {
                const greetings = ["👋", "💡", "😊"];
                this.showBubble(greetings[(Math.random() * greetings.length) | 0], 1.8);
            }
        } else {
            this.playerAware = false;
            this.awareTimer = 0;
        }
    }

    update(dt, tilemap, min, playerBox) {
        this.animTime += dt;

        // Update bubble timer
        if (this.bubble) {
            this.bubble.t += dt;
            this.bubble.life -= dt;
            if (this.bubble.life <= 0) this.bubble = null;
        }

        const s = this.stopAt(min);
        if (!s) { this.moving = false; return; }
        this.activity = s.activity || "idle";

        // Sleeping state: idle with occasional sleep bubbles
        if (this.activity === "sleep") {
            this.moving = false;
            if (!this.bubble && Math.random() < 0.015) {
                this.showBubble("💤", 2.2);
            }
            return;
        }

        // Check player proximity reaction
        if (playerBox) {
            this.reactToPlayer(playerBox, dt);
            if (this.playerAware) {
                // Stand still while interacting/talking to player
                this.moving = false;
                return;
            }
        }

        const t = this._tilePos(s.col, s.row);
        let dx = t.x - this.x, dy = t.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= 3) {                 // arrived at destination stop
            this.moving = false;
            this.dir = { x: 0, y: 0 };
            this._stuck = 0;

            // Ambient fidgeting / micro-actions while standing
            this.fidgetTimer -= dt;
            if (this.fidgetTimer <= 0) {
                this.fidgetTimer = 3 + this.rng() * 5;
                if (!this.playerAware) {
                    const dirs = ["down", "left", "right", "up"];
                    this.facing = dirs[(this.rng() * dirs.length) | 0];

                    if (!this.bubble && this.rng() < 0.3) {
                        const emotes = {
                            work: ["⚒️", "📦", "🌿"],
                            flowers: ["🌸", "🌿", "🌼"],
                            well: ["💧", "🪣"],
                            bench: ["📖", "☀️", "🍵"],
                            plaza: ["💬", "✨", "👋"]
                        };
                        const pool = emotes[this.activity] || ["💬", "💭", "✨"];
                        this.showBubble(pool[(this.rng() * pool.length) | 0], 2.0);
                    }
                }
            }
            return;
        }

        // Steer towards target destination
        dx /= dist; dy /= dist;
        const before = { x: this.x, y: this.y };
        const mv = moveAndCollide(this.box, dx * this.speed * dt, dy * this.speed * dt, tilemap);
        this.x = mv.x; this.y = mv.y;
        const progress = Math.hypot(this.x - before.x, this.y - before.y);
        this.moving = progress > 0.02;
        this.dir = { x: dx, y: dy };
        this.facing = Math.abs(dx) > Math.abs(dy)
            ? (dx < 0 ? "left" : "right")
            : (dy < 0 ? "up" : "down");

        // Anti-stuck: if blocked and making no headway for ~3s, snap to destination stop.
        if (progress < 0.02) {
            this._stuck += dt;
            if (this._stuck > 3) {
                this.x = t.x;
                this.y = t.y;
                this._stuck = 0;
                this.moving = false;
            }
        } else {
            this._stuck = 0;
        }
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { NPC2D };
