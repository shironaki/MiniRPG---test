/**
 * v3 engine — input.
 *
 * Keyboard (WASD/arrows + action keys), mouse and an analogue touch joystick,
 * normalised into one tiny API: `axis()`, `pressed(action)`, `justPressed(action)`.
 * Edge detection is consumed once per simulation tick so a tap can never be
 * swallowed or double-fired.
 */

export const DEFAULT_BINDINGS = {
    up:        ["KeyW", "ArrowUp"],
    down:      ["KeyS", "ArrowDown"],
    left:      ["KeyA", "ArrowLeft"],
    right:     ["KeyD", "ArrowRight"],
    action:    ["KeyE", "Space"],
    cancel:    ["Escape"],
    sprint:    ["ShiftLeft", "ShiftRight"],
    inventory: ["KeyI", "Tab"],
    journal:   ["KeyJ"],
    build:     ["KeyB"],
    map:       ["KeyM"],
    attack:    ["KeyF"],
    slot1: ["Digit1"], slot2: ["Digit2"], slot3: ["Digit3"],
    slot4: ["Digit4"], slot5: ["Digit5"], slot6: ["Digit6"]
};

export class Input {
    constructor({ target = null, bindings = DEFAULT_BINDINGS } = {}) {
        this.bindings = bindings;
        this.codeToActions = new Map();
        for (const [action, codes] of Object.entries(bindings)) {
            for (const code of codes) {
                if (!this.codeToActions.has(code)) this.codeToActions.set(code, []);
                this.codeToActions.get(code).push(action);
            }
        }
        this.down = new Set();        // actions currently held
        this.justDown = new Set();    // actions pressed since last consume()
        this.justUp = new Set();
        this.stick = { x: 0, y: 0, active: false };   // analogue touch input
        this.pointer = { x: 0, y: 0, down: false };
        this.enabled = true;
        this._detach = [];
        if (target) this.attach(target);
    }

    attach(target) {
        const onKey = (down) => (e) => {
            if (!this.enabled) return;
            const actions = this.codeToActions.get(e.code);
            if (!actions) return;
            // Keep the page from scrolling under the canvas.
            if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
                e.preventDefault();
            }
            for (const a of actions) {
                if (down) {
                    if (!this.down.has(a)) this.justDown.add(a);
                    this.down.add(a);
                } else {
                    this.down.delete(a);
                    this.justUp.add(a);
                }
            }
        };
        const kd = onKey(true), ku = onKey(false);
        const blur = () => { this.down.clear(); this.stick.x = this.stick.y = 0; this.stick.active = false; };
        target.addEventListener("keydown", kd);
        target.addEventListener("keyup", ku);
        target.addEventListener("blur", blur);
        this._detach.push(() => {
            target.removeEventListener("keydown", kd);
            target.removeEventListener("keyup", ku);
            target.removeEventListener("blur", blur);
        });
        return this;
    }

    detach() { this._detach.forEach((f) => f()); this._detach = []; return this; }

    /** Virtual press from a touch button / UI element. */
    press(action) {
        if (!this.down.has(action)) this.justDown.add(action);
        this.down.add(action);
        return this;
    }
    release(action) { this.down.delete(action); this.justUp.add(action); return this; }
    tap(action) { this.justDown.add(action); return this; }

    /** Analogue stick, components in [-1, 1]. */
    setStick(x, y) {
        const mag = Math.hypot(x, y);
        if (mag < 0.14) { this.stick.x = 0; this.stick.y = 0; this.stick.active = false; return this; }
        const clamped = Math.min(1, mag);
        // Exponential response: a gentle lean walks, a full push runs.
        const curved = Math.pow(clamped, 1.4);
        this.stick.x = (x / mag) * curved;
        this.stick.y = (y / mag) * curved;
        this.stick.active = true;
        return this;
    }

    pressed(action) { return this.down.has(action); }
    justPressed(action) { return this.justDown.has(action); }
    justReleased(action) { return this.justUp.has(action); }

    /** Movement vector, already normalised; magnitude <= 1 encodes walk vs run. */
    axis() {
        if (this.stick.active) return { x: this.stick.x, y: this.stick.y };
        let x = 0, y = 0;
        if (this.pressed("left")) x -= 1;
        if (this.pressed("right")) x += 1;
        if (this.pressed("up")) y -= 1;
        if (this.pressed("down")) y += 1;
        if (x && y) { const inv = Math.SQRT1_2; x *= inv; y *= inv; }
        return { x, y };
    }

    /** Clear per-tick edges. Call once at the end of every simulation tick. */
    consume() { this.justDown.clear(); this.justUp.clear(); return this; }
}
