/**
 * v2 engine — keyboard input.
 * The state (a set of held key codes) is pure and testable; attach()/detach()
 * wire real DOM listeners and are skipped when there is no document.
 */
class Input {
    constructor() {
        this.held = new Set();
        this.pressed = new Set();   // keys pressed since the last consume()
        this._onDown = null;
        this._onUp = null;
    }

    press(code) {
        if (!this.held.has(code)) this.pressed.add(code);
        this.held.add(code);
    }
    release(code) { this.held.delete(code); }
    isDown(code) { return this.held.has(code); }

    // Was `code` pressed since the last consumePressed()? (edge-triggered)
    wasPressed(code) { return this.pressed.has(code); }
    consumePressed() { this.pressed.clear(); }

    // Movement axis from WASD or arrow keys, each component in {-1,0,1}.
    axis() {
        let x = 0, y = 0;
        if (this.isDown("ArrowLeft") || this.isDown("KeyA")) x -= 1;
        if (this.isDown("ArrowRight") || this.isDown("KeyD")) x += 1;
        if (this.isDown("ArrowUp") || this.isDown("KeyW")) y -= 1;
        if (this.isDown("ArrowDown") || this.isDown("KeyS")) y += 1;
        return { x, y };
    }

    attach(target) {
        if (!target || typeof target.addEventListener !== "function") return;
        this._onDown = (e) => {
            this.press(e.code);
            // Stop arrows/space from scrolling the page during play.
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
        };
        this._onUp = (e) => this.release(e.code);
        target.addEventListener("keydown", this._onDown);
        target.addEventListener("keyup", this._onUp);
    }

    detach(target) {
        if (!target || typeof target.removeEventListener !== "function") return;
        if (this._onDown) target.removeEventListener("keydown", this._onDown);
        if (this._onUp) target.removeEventListener("keyup", this._onUp);
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Input };
