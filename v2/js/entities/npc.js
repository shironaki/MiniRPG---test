/**
 * v2 entities — a living townsperson who walks a daily SCHEDULE.
 *
 * A schedule is a list of { from, col, row } stops sorted by in-game minute.
 * At any clock time the NPC heads for the last stop whose `from` has passed
 * (wrapping past midnight to the final stop of the previous day). Movement is
 * simple steering with swept-tile collision; if the NPC can't make progress for
 * a while it snaps to the destination so it never gets permanently stuck. This
 * is pure logic (rng injectable) so it can be unit-tested headlessly.
 *
 * def = { id, name, emoji, role, look, speed, dialogue:[...], likes:[...],
 *         schedule:[{from,col,row,activity?}, ...] }
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
        this.speed = def.speed || 40;
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

        // Drop onto the first stop that applies right now (set by placeAt).
    }

    get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    get centerX() { return this.x + this.w / 2; }
    get centerY() { return this.y + this.h / 2; }

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
        if (s) { const p = this._tilePos(s.col, s.row); this.x = p.x; this.y = p.y; }
    }

    update(dt, tilemap, min) {
        this.animTime += dt;
        const s = this.stopAt(min);
        if (!s) { this.moving = false; return; }
        const t = this._tilePos(s.col, s.row);
        let dx = t.x - this.x, dy = t.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= 2) {                 // arrived — idle
            this.moving = false;
            this.dir = { x: 0, y: 0 };
            this._stuck = 0;
            return;
        }

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

        // Anti-stuck: if blocked and making no headway for ~3s, teleport home stop.
        if (progress < 0.02) {
            this._stuck += dt;
            if (this._stuck > 3) { this.x = t.x; this.y = t.y; this._stuck = 0; this.moving = false; }
        } else {
            this._stuck = 0;
        }
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { NPC2D };
