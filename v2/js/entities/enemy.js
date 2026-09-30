/**
 * v2 entities — a roaming creature with light wander AI. It picks a new heading
 * every so often, drifts back toward its home when it strays past its wander
 * radius, and collides with solid tiles. `kind` is a GAME_DATA enemy key so an
 * encounter can spawn the matching foe in battle. Pure logic; rng is injectable
 * for deterministic tests.
 */
class Enemy2D {
    constructor(x, y, opts = {}) {
        this.x = x;
        this.y = y;
        this.homeX = x;
        this.homeY = y;
        this.w = opts.w || 20;
        this.h = opts.h || 20;
        this.speed = opts.speed || 55;
        this.kind = opts.kind || "goblin";
        this.emoji = opts.emoji || "👹";
        this.wanderRadius = opts.wanderRadius || 96;
        this.rng = opts.rng || Math.random;
        this.dir = { x: 0, y: 0 };
        this.retargetIn = 0;
        this.alive = true;
    }

    get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    get centerX() { return this.x + this.w / 2; }
    get centerY() { return this.y + this.h / 2; }

    _pickDirection() {
        // 1-in-4 chance to pause; otherwise a cardinal/diagonal heading.
        const options = [
            { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 },
            { x: 0, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }
        ];
        return options[Math.floor(this.rng() * options.length)];
    }

    update(dt, tilemap) {
        if (!this.alive) return;
        this.retargetIn -= dt;
        if (this.retargetIn <= 0) {
            this.dir = this._pickDirection();
            this.retargetIn = 0.6 + this.rng() * 1.4; // 0.6–2.0s
        }

        // Steer home if we've wandered too far.
        const dxHome = this.homeX - this.x;
        const dyHome = this.homeY - this.y;
        if (Math.hypot(dxHome, dyHome) > this.wanderRadius) {
            const len = Math.hypot(dxHome, dyHome) || 1;
            this.dir = { x: dxHome / len, y: dyHome / len };
        }

        let vx = this.dir.x, vy = this.dir.y;
        const len = Math.hypot(vx, vy);
        if (len > 0) {
            vx /= len; vy /= len;
            const move = moveAndCollide(this.box, vx * this.speed * dt, vy * this.speed * dt, tilemap);
            this.x = move.x;
            this.y = move.y;
            // Bounce off walls by re-rolling next tick.
            if (move.hitX || move.hitY) this.retargetIn = 0;
        }
    }
}

// Returns the first enemy whose box overlaps `heroBox`, or null. Pure.
function detectEncounter(heroBox, enemies) {
    for (const e of enemies) {
        if (e.alive === false) continue;
        if (Rect.intersects(heroBox, e.box)) return e;
    }
    return null;
}

if (typeof module !== "undefined" && module.exports) module.exports = { Enemy2D, detectEncounter };
