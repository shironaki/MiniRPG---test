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
        this.speed = opts.speed || 120;      // pixels per second
        this.facing = "down";
        this.moving = false;
        this.animTime = 0;
        this.frameCount = opts.frameCount || 4;
        this.frameDuration = opts.frameDuration || 0.14; // seconds per frame
    }

    get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    get centerX() { return this.x + this.w / 2; }
    get centerY() { return this.y + this.h / 2; }

    // Current animation frame index (0 = idle/standing when not moving).
    get frame() {
        if (!this.moving) return 0;
        return Math.floor(this.animTime / this.frameDuration) % this.frameCount;
    }

    // dt in seconds. `axis` is { x, y } each in {-1,0,1} (from Input.axis()).
    update(dt, axis, tilemap) {
        let vx = axis.x, vy = axis.y;
        this.moving = (vx !== 0 || vy !== 0);

        if (this.moving) {
            // Normalise diagonal speed.
            const len = Math.hypot(vx, vy) || 1;
            vx /= len; vy /= len;
            const dx = vx * this.speed * dt;
            const dy = vy * this.speed * dt;

            if (tilemap) {
                const res = moveAndCollide(this.box, dx, dy, tilemap);
                this.x = res.x;
                this.y = res.y;
            } else {
                this.x += dx; this.y += dy;
            }

            // Facing follows the dominant input axis (vertical wins ties).
            if (Math.abs(axis.y) >= Math.abs(axis.x)) this.facing = axis.y < 0 ? "up" : "down";
            else this.facing = axis.x < 0 ? "left" : "right";

            this.animTime += dt;
        } else {
            this.animTime = 0;
        }
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Player2D };
