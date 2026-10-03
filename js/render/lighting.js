/**
 * v3 render — light map.
 *
 * The v2 bug ("white fog over the whole screen at noon") happened because the
 * night veil was a flat overlay. Here darkness is a *buffer*: the night colour
 * is painted into an offscreen canvas, light sources are punched out of it
 * with soft radial gradients using `destination-out`, and the result is
 * composited over the frame. At noon the buffer is simply not drawn at all.
 */

/** Ambient colour and strength for a given moment of day. */
export function ambientFor(daylight, weather = "clear", underground = false) {
    if (underground) return { color: "#0a0b10", alpha: 0.7 };
    // daylight: 0 = midnight, 1 = full day.
    if (daylight >= 0.98) {
        const w = { rain: 0.1, storm: 0.18, fog: 0.08, snow: 0.06 }[weather] || 0;
        return { color: "#0b1626", alpha: w };          // crystal-clear noon
    }
    if (daylight <= 0.02) return { color: "#060a1e", alpha: 0.88 };
    // Dawn / dusk: warm tint fading into indigo.
    const night = 1 - daylight;
    const warm = Math.sin(daylight * Math.PI);          // peaks mid-transition
    const color = warm > 0.5 ? "#2a1430" : "#070a1c";
    return { color, alpha: Math.min(0.88, night * 0.92) };
}

export class LightMap {
    constructor(width, height) {
        this.canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
        this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
        this.resize(width, height);
        this.lights = [];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        if (this.canvas) { this.canvas.width = w; this.canvas.height = h; }
        return this;
    }

    begin() { this.lights.length = 0; return this; }

    /**
     * Queue a light. Screen coordinates, radius in screen pixels.
     * `warmth` 0..1 shifts the glow from pale to firelight-orange.
     */
    add(x, y, radius, { intensity = 1, warmth = 0.7, flicker = 0 } = {}) {
        this.lights.push({ x, y, radius, intensity, warmth, flicker });
        return this;
    }

    /**
     * Composite darkness + lights onto the main context.
     * @param {CanvasRenderingContext2D} target
     */
    render(target, { daylight = 1, weather = "clear", underground = false, time = 0 } = {}) {
        const amb = ambientFor(daylight, weather, underground);
        if (amb.alpha <= 0.015 || !this.ctx) return this;

        const c = this.ctx;
        c.globalCompositeOperation = "source-over";
        c.clearRect(0, 0, this.width, this.height);
        c.fillStyle = amb.color;
        c.globalAlpha = 1;
        c.fillRect(0, 0, this.width, this.height);

        // Punch the lights out of the darkness.
        c.globalCompositeOperation = "destination-out";
        for (const L of this.lights) {
            const flick = L.flicker ? (0.88 + Math.sin(time * 9 + L.x) * 0.06 + Math.sin(time * 15.7) * 0.05) : 1;
            const r = Math.max(4, L.radius * flick);
            const g = c.createRadialGradient(L.x, L.y, r * 0.08, L.x, L.y, r);
            const i = Math.min(1, L.intensity);
            g.addColorStop(0, `rgba(0,0,0,${0.99 * i})`);
            g.addColorStop(0.3, `rgba(0,0,0,${0.78 * i})`);
            g.addColorStop(0.58, `rgba(0,0,0,${0.38 * i})`);
            g.addColorStop(0.82, `rgba(0,0,0,${0.12 * i})`);
            g.addColorStop(1, "rgba(0,0,0,0)");
            c.fillStyle = g;
            c.beginPath(); c.arc(L.x, L.y, r, 0, Math.PI * 2); c.fill();
        }
        c.globalCompositeOperation = "source-over";

        target.save();
        target.globalAlpha = amb.alpha;
        target.drawImage(this.canvas, 0, 0);
        target.restore();

        // Warm halo pass: additive glow so fires feel hot, not just "less dark".
        target.save();
        target.globalCompositeOperation = "lighter";
        for (const L of this.lights) {
            if (L.warmth <= 0) continue;
            const flick = L.flicker ? (0.9 + Math.sin(time * 9 + L.y) * 0.08) : 1;
            const r = L.radius * 0.85 * flick;
            const g = target.createRadialGradient(L.x, L.y, 0, L.x, L.y, r);
            const a = 0.42 * L.intensity * amb.alpha * 1.3;
            g.addColorStop(0, `rgba(255,${Math.round(132 + 60 * (1 - L.warmth))},72,${a})`);
            g.addColorStop(0.5, `rgba(255,${Math.round(120 + 50 * (1 - L.warmth))},60,${a * 0.45})`);
            g.addColorStop(1, "rgba(255,150,80,0)");
            target.fillStyle = g;
            target.beginPath(); target.arc(L.x, L.y, r, 0, Math.PI * 2); target.fill();
        }
        target.restore();
        return this;
    }
}
