/**
 * v2 engine — a camera that follows a target and stays clamped to the map.
 * Pure math: (x,y) is the top-left of the viewport in world pixels.
 */
class Camera {
    constructor(viewW, viewH) {
        this.x = 0;
        this.y = 0;
        this.viewW = viewW;
        this.viewH = viewH;
    }

    resize(viewW, viewH) { this.viewW = viewW; this.viewH = viewH; }

    // Centre on (cx, cy) world coords, clamped so we never show past the map
    // edges. If the map is smaller than the viewport, it is centred.
    follow(cx, cy, mapW, mapH) {
        let x = cx - this.viewW / 2;
        let y = cy - this.viewH / 2;
        if (mapW <= this.viewW) x = (mapW - this.viewW) / 2;
        else x = Math.max(0, Math.min(x, mapW - this.viewW));
        if (mapH <= this.viewH) y = (mapH - this.viewH) / 2;
        else y = Math.max(0, Math.min(y, mapH - this.viewH));
        this.x = x;
        this.y = y;
        return this;
    }

    worldToScreen(wx, wy) { return { x: wx - this.x, y: wy - this.y }; }

    // Is a world-space rect within (or touching) the viewport? Used to cull.
    isVisible(r) {
        return r.x + r.w >= this.x && r.x <= this.x + this.viewW &&
               r.y + r.h >= this.y && r.y <= this.y + this.viewH;
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Camera };
