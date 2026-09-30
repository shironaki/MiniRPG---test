/**
 * v2 engine — fixed-timestep game loop with a render callback.
 * Accumulates real elapsed time and steps the simulation in fixed slices so
 * physics/movement are frame-rate independent; render runs once per frame.
 */
class Loop {
    constructor(update, render, step = 1 / 60) {
        this.update = update;      // (dt) => void, dt = fixed step in seconds
        this.render = render;      // (alpha) => void
        this.step = step;
        this.running = false;
        this._acc = 0;
        this._last = 0;
        this._raf = null;
        this._tick = this._tick.bind(this);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this._last = (typeof performance !== "undefined" ? performance.now() : Date.now());
        this._acc = 0;
        this._raf = requestAnimationFrame(this._tick);
    }

    stop() {
        this.running = false;
        if (this._raf != null) cancelAnimationFrame(this._raf);
        this._raf = null;
    }

    _tick(now) {
        if (!this.running) return;
        let frame = (now - this._last) / 1000;
        this._last = now;
        // Guard against huge jumps (tab switch) so we never spiral.
        if (frame > 0.25) frame = 0.25;
        this._acc += frame;
        let guard = 0;
        while (this._acc >= this.step && guard++ < 240) {
            this.update(this.step);
            this._acc -= this.step;
        }
        this.render(this._acc / this.step);
        this._raf = requestAnimationFrame(this._tick);
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Loop };
