/**
 * v2 entities — the controllable hero. Holds position, facing and a walk-cycle
 * animation clock. Movement is resolved against the tilemap via moveAndCollide.
 * Pure logic (no DOM), so update() is fully unit-testable.
 */
class Player2D {
    constructor(x, y, opts = {}) {
        this.x = x;
        this.y = y;
        this.w = opts.w || 20;
        this.h = opts.h || 20;
        this.maxSpeed = opts.speed || 120;   // pixels per second
        this.accel = opts.accel || 900;      // ramp-up (px/s^2)
        this.friction = opts.friction || 1100; // ramp-down when no input
        this.vx = 0;
        this.vy = 0;
        this.facing = "down";
        this.moving = false;
        this.animTime = 0;
        this.frameCount = opts.frameCount || 4;
        this.frameDuration = opts.frameDuration || 0.14; // seconds per frame
    }

    get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    get centerX() { return this.x + this.w / 2; }
    get centerY() { return this.y + this.h / 2; }
    get speed() { return Math.hypot(this.vx, this.vy); }

    // Current animation frame index (0 = idle/standing when not moving).
    get frame() {
        if (!this.moving) return 0;
        return Math.floor(this.animTime / this.frameDuration) % this.frameCount;
    }

    // dt in seconds. `axis` is { x, y } (analog from a stick, or {-1,0,1} keys).
    // Movement uses acceleration + friction so the hero eases in and glides to a
    // stop instead of teleporting — it feels grounded rather than "floaty".
    update(dt, axis, tilemap) {
        const ax = axis.x, ay = axis.y;
        const inputLen = Math.hypot(ax, ay);
        const hasInput = inputLen > 0.001;

        // Desired velocity: preserve analog magnitude up to 1.0 (so slight tilt allows walking slowly)
        let mag = Math.min(1, inputLen);
        let dvx = 0, dvy = 0;
        if (hasInput) {
            dvx = (ax / inputLen) * mag;
            dvy = (ay / inputLen) * mag;
        }

        const approach = (cur, tgt, step) =>
            cur < tgt ? Math.min(cur + step, tgt) : Math.max(cur - step, tgt);

        if (hasInput) {
            this.vx = approach(this.vx, dvx * this.maxSpeed, this.accel * dt);
            this.vy = approach(this.vy, dvy * this.maxSpeed, this.accel * dt);
        } else {
            this.vx = approach(this.vx, 0, this.friction * dt);
            this.vy = approach(this.vy, 0, this.friction * dt);
        }

        const dx = this.vx * dt, dy = this.vy * dt;
        if (tilemap) {
            const res = moveAndCollide(this.box, dx, dy, tilemap);
            if (res.hitX) this.vx = 0;
            if (res.hitY) this.vy = 0;
            this.x = res.x;
            this.y = res.y;
        } else {
            this.x += dx; this.y += dy;
        }

        this.moving = this.speed > 4;

        // Facing follows live input (vertical wins ties); kept while gliding.
        if (hasInput) {
            if (Math.abs(ay) >= Math.abs(ax)) this.facing = ay < 0 ? "up" : "down";
            else this.facing = ax < 0 ? "left" : "right";
        }

        if (this.moving) this.animTime += dt;
        else this.animTime = 0;
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Player2D };
