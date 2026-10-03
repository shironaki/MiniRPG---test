/**
 * v3 render — particles and floating text.
 *
 * Sparks over the fire, smoke, rain, snow, dust from an axe hit, and the
 * "+2 🪵" numbers that make every action feel like it paid out. Pure data +
 * one draw pass; capped so a long session can never choke the frame.
 */

export class Particles {
    constructor({ max = 600 } = {}) {
        this.items = [];
        this.texts = [];
        this.max = max;
    }

    spawn(p) {
        if (this.items.length >= this.max) this.items.shift();
        this.items.push(Object.assign({
            x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 1,
            size: 2, color: "#fff", gravity: 0, kind: "dot", alpha: 1
        }, p));
        return this;
    }

    /** Floating combat/loot text, in world coordinates. */
    text(x, y, str, { color = "#fff", life = 1.2, vy = -22, size = 11 } = {}) {
        this.texts.push({ x, y, str, color, life, maxLife: life, vy, size });
        if (this.texts.length > 40) this.texts.shift();
        return this;
    }

    /* ---- presets ------------------------------------------------------- */

    sparks(x, y, n = 6) {
        for (let i = 0; i < n; i++) {
            this.spawn({
                x, y, vx: (Math.random() - 0.5) * 16, vy: -18 - Math.random() * 22,
                life: 0.5 + Math.random() * 0.6, maxLife: 1, gravity: 10,
                size: 1 + Math.random() * 1.4,
                color: Math.random() > 0.5 ? "#ffcf6a" : "#ff8a3a", kind: "spark"
            });
        }
        return this;
    }

    smoke(x, y, n = 1) {
        for (let i = 0; i < n; i++) {
            this.spawn({
                x: x + (Math.random() - 0.5) * 4, y,
                vx: (Math.random() - 0.5) * 5, vy: -9 - Math.random() * 6,
                life: 1.6 + Math.random(), maxLife: 2.6,
                size: 3 + Math.random() * 3, color: "rgba(180,175,170,0.5)", kind: "smoke"
            });
        }
        return this;
    }

    chips(x, y, color = "#8a6a3c", n = 7) {
        for (let i = 0; i < n; i++) {
            this.spawn({
                x, y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 25,
                life: 0.4 + Math.random() * 0.3, maxLife: 0.7, gravity: 120,
                size: 1.5 + Math.random() * 1.5, color, kind: "chip"
            });
        }
        return this;
    }

    hearts(x, y) {
        this.spawn({ x, y, vx: 0, vy: -16, life: 1.1, maxLife: 1.1, size: 7, color: "#ff6b8a", kind: "emoji", glyph: "❤️" });
        return this;
    }

    emote(x, y, glyph) {
        this.spawn({ x, y, vx: 0, vy: -14, life: 1.4, maxLife: 1.4, size: 11, kind: "emoji", glyph });
        return this;
    }

    update(dt) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const p = this.items[i];
            p.life -= dt;
            if (p.life <= 0) { this.items.splice(i, 1); continue; }
            p.vy += (p.gravity || 0) * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.kind === "smoke") { p.size += dt * 3; p.vx *= 0.99; }
        }
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.life -= dt;
            if (t.life <= 0) { this.texts.splice(i, 1); continue; }
            t.y += t.vy * dt;
            t.vy *= 0.94;
        }
        return this;
    }

    /** @param {Camera} cam */
    draw(ctx, cam) {
        for (const p of this.items) {
            if (!cam.isVisible(p.x, p.y, 40)) continue;
            const s = cam.worldToScreen(p.x, p.y);
            const a = Math.max(0, Math.min(1, p.life / (p.maxLife || 1)));
            ctx.globalAlpha = a * (p.alpha || 1);
            if (p.kind === "emoji") {
                ctx.font = `${p.size * cam.zoom * 0.6}px serif`;
                ctx.textAlign = "center";
                ctx.fillText(p.glyph, s.x, s.y);
            } else {
                ctx.fillStyle = p.color;
                const sz = p.size * cam.zoom * 0.5;
                if (p.kind === "smoke") {
                    ctx.beginPath(); ctx.arc(s.x, s.y, sz, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
                }
            }
        }
        ctx.globalAlpha = 1;

        for (const t of this.texts) {
            if (!cam.isVisible(t.x, t.y, 60)) continue;
            const s = cam.worldToScreen(t.x, t.y);
            const a = Math.max(0, Math.min(1, t.life / t.maxLife));
            ctx.globalAlpha = a;
            ctx.font = `bold ${Math.round(t.size * cam.zoom * 0.55)}px "Segoe UI", system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(0,0,0,0.7)";
            ctx.strokeText(t.str, s.x, s.y);
            ctx.fillStyle = t.color;
            ctx.fillText(t.str, s.x, s.y);
        }
        ctx.globalAlpha = 1;
        return this;
    }

    get count() { return this.items.length + this.texts.length; }
    clear() { this.items.length = 0; this.texts.length = 0; return this; }
}
