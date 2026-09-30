/**
 * v2 engine — vector & axis-aligned bounding-box (AABB) math.
 * Pure functions/classes: no DOM, fully unit-testable.
 */
class Vec2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    clone() { return new Vec2(this.x, this.y); }
    length() { return Math.hypot(this.x, this.y); }
    // Normalise in place; a zero vector stays zero.
    normalize() {
        const len = this.length();
        if (len > 0) { this.x /= len; this.y /= len; }
        return this;
    }
}

// Rectangle helpers. A rect is { x, y, w, h } with (x,y) the top-left corner.
const Rect = {
    intersects(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    },
    centerX(r) { return r.x + r.w / 2; },
    centerY(r) { return r.y + r.h / 2; },
    contains(r, px, py) {
        return px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
    }
};

function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

if (typeof module !== "undefined" && module.exports) module.exports = { Vec2, Rect, clamp };
