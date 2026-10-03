/**
 * v3 render — the frame.
 *
 * Five layers, in order:
 *   1. ground      — baked per 16×16 chunk into offscreen canvases (static)
 *   2. decals      — paths, edges, tilled soil (baked with the ground)
 *   3. objects     — props, characters, buildings; y-sorted every frame
 *   4. weather     — rain, snow, fog in screen space
 *   5. light       — the light map, composited last
 *
 * Only visible chunks are drawn, and a chunk is re-baked only when a tile in
 * it changes. That is the whole performance story for a 96×72 zone.
 */
import { CHUNK } from "../world/tilemap.js";
import { TILE_SIZE } from "../world/tiles.js";
import { paintTile, paintEdges, paintProp, paintFlames, paintSpitItem } from "./tilesart.js";
import { drawCharacter, drawSleeping } from "./character.js";
import { LightMap } from "./lighting.js";
import { itemEmoji } from "../sandbox/items.js";

export class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d", { alpha: false });
        this.ctx.imageSmoothingEnabled = false;
        this.camera = camera;
        this.chunkCache = new Map();     // `${zoneId}:${key}` -> canvas
        this.lightMap = new LightMap(canvas.width, canvas.height);
        this.time = 0;
        this.stats = { chunksDrawn: 0, propsDrawn: 0, baked: 0 };
        this.season = "spring";
    }

    resize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.imageSmoothingEnabled = false;
        this.camera.resize(w, h);
        this.lightMap.resize(w, h);
        return this;
    }

    /** Throw away baked chunks (zone change, season change). */
    invalidate(zoneId = null) {
        if (!zoneId) this.chunkCache.clear();
        else for (const k of Array.from(this.chunkCache.keys())) {
            if (k.startsWith(zoneId + ":")) this.chunkCache.delete(k);
        }
        return this;
    }

    /** Bake one chunk's ground into an offscreen canvas. */
    bakeChunk(zone, cx, cy) {
        const size = CHUNK * TILE_SIZE;
        const cv = document.createElement("canvas");
        cv.width = size; cv.height = size;
        const c = cv.getContext("2d");
        c.imageSmoothingEnabled = false;
        for (let ty = 0; ty < CHUNK; ty++) {
            for (let tx = 0; tx < CHUNK; tx++) {
                const wx = cx * CHUNK + tx, wy = cy * CHUNK + ty;
                if (!zone.map.inBounds(wx, wy)) continue;
                const id = zone.map.get(wx, wy);
                paintTile(c, id, tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, wx, wy, this.season);
            }
        }
        // Second pass so edges blend over finished neighbours.
        for (let ty = 0; ty < CHUNK; ty++) {
            for (let tx = 0; tx < CHUNK; tx++) {
                const wx = cx * CHUNK + tx, wy = cy * CHUNK + ty;
                if (!zone.map.inBounds(wx, wy)) continue;
                paintEdges(c, zone.map, wx, wy, tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE);
            }
        }
        this.stats.baked++;
        return cv;
    }

    drawGround(zone) {
        const cam = this.camera;
        const ctx = this.ctx;
        const chunks = zone.map.chunksInRect(cam.x, cam.y, cam.viewW, cam.viewH);
        this.stats.chunksDrawn = 0;
        for (const ch of chunks) {
            const key = `${zone.id}:${ch.key}`;
            if (zone.map.dirtyChunks.has(ch.key)) {
                this.chunkCache.delete(key);
                zone.map.dirtyChunks.delete(ch.key);
            }
            let cv = this.chunkCache.get(key);
            if (!cv) { cv = this.bakeChunk(zone, ch.cx, ch.cy); this.chunkCache.set(key, cv); }
            const wx = ch.cx * CHUNK * TILE_SIZE;
            const wy = ch.cy * CHUNK * TILE_SIZE;
            const s = cam.worldToScreen(wx, wy);
            const size = CHUNK * TILE_SIZE * cam.zoom;
            ctx.drawImage(cv, Math.round(s.x), Math.round(s.y), Math.ceil(size), Math.ceil(size));
            this.stats.chunksDrawn++;
        }
        return this;
    }

    /**
     * Objects layer: props + characters, sorted by their base Y so a hero
     * walking behind a pine is actually behind it.
     */
    drawObjects(state) {
        const { zone, player, fires } = state;
        const cam = this.camera;
        const ctx = this.ctx;
        const drawables = [];

        for (const obj of zone.objects) {
            if (obj.removed) continue;
            if (!cam.isVisible(obj.x, obj.y, 70)) continue;
            drawables.push({ y: obj.y, kind: "prop", obj });
        }
        for (const ent of (state.entities || [])) {
            if (!cam.isVisible(ent.x, ent.y, 70)) continue;
            drawables.push({ y: ent.y, kind: "entity", obj: ent });
        }
        if (!player.sleeping) drawables.push({ y: player.y, kind: "player", obj: player });

        drawables.sort((a, b) => a.y - b.y);
        this.stats.propsDrawn = drawables.length;

        for (const d of drawables) {
            const o = d.obj;
            const s = cam.worldToScreen(o.x, o.y);
            ctx.save();
            ctx.translate(Math.round(s.x), Math.round(s.y));
            ctx.scale(cam.zoom, cam.zoom);
            if (d.kind === "prop") {
                paintProp(ctx, o, this.time, this.season);
                if (o.kind === "campfire") {
                    const fire = fires && fires.get(o.id != null ? o.id : `${o.tx},${o.ty}`);
                    paintFlames(ctx, fire ? fire.intensity : 0, this.time);
                    if (fire) {
                        fire.spit.forEach((slot, i) => {
                            if (slot) paintSpitItem(ctx, i, slot.state, itemEmoji(slot.itemId));
                        });
                        if (fire.lit) {
                            // Spit frame.
                            ctx.strokeStyle = "#4a3a28"; ctx.lineWidth = 1.2;
                            ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-9, -22); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(9, -22); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(-10, -21); ctx.lineTo(10, -21); ctx.stroke();
                        }
                    }
                }
            } else if (d.kind === "player") {
                drawCharacter(ctx, {
                    dir: o.dir, anim: o.anim, moving: o.moving, look: state.look,
                    actionTimer: o.actionTimer, toolEmoji: state.toolEmoji, idleTime: this.time
                });
            } else {
                drawCharacter(ctx, {
                    dir: o.dir || "down", anim: o.anim || 0, moving: !!o.moving, look: o.look
                });
            }
            ctx.restore();
        }
        return this;
    }

    /** Highlight the thing the player is about to interact with. */
    drawInteractHint(target, label) {
        if (!target) return this;
        const cam = this.camera;
        const ctx = this.ctx;
        const s = cam.worldToScreen(target.x, target.y);
        ctx.save();
        ctx.strokeStyle = "rgba(255,226,150,0.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -this.time * 12;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, 16 * cam.zoom, 8 * cam.zoom, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (label) {
            ctx.save();
            ctx.font = `${Math.round(7 * cam.zoom)}px "Segoe UI", system-ui, sans-serif`;
            ctx.textAlign = "center";
            const w = ctx.measureText(label).width + 16;
            const y = s.y - 34 * cam.zoom;
            ctx.fillStyle = "rgba(18,16,14,0.82)";
            roundRect(ctx, s.x - w / 2, y - 16, w, 22, 6);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,210,130,0.5)";
            ctx.lineWidth = 1;
            roundRect(ctx, s.x - w / 2, y - 16, w, 22, 6);
            ctx.stroke();
            ctx.fillStyle = "#ffe6b0";
            ctx.fillText(label, s.x, y);
            ctx.restore();
        }
        return this;
    }

    /** Screen-space weather. */
    drawWeather(weather, dt) {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        if (weather === "rain" || weather === "storm") {
            ctx.save();
            ctx.strokeStyle = weather === "storm" ? "rgba(170,195,225,0.5)" : "rgba(170,195,225,0.35)";
            ctx.lineWidth = 1;
            const n = weather === "storm" ? 220 : 140;
            for (let i = 0; i < n; i++) {
                const x = (i * 97 + this.time * 420) % W;
                const y = (i * 131 + this.time * 900) % H;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - 3, y + 12);
                ctx.stroke();
            }
            ctx.restore();
        } else if (weather === "snow") {
            ctx.save();
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            for (let i = 0; i < 120; i++) {
                const x = (i * 83 + Math.sin(this.time * 0.6 + i) * 30 + this.time * 20) % W;
                const y = (i * 61 + this.time * 60) % H;
                ctx.fillRect(x, y, 2, 2);
            }
            ctx.restore();
        } else if (weather === "fog") {
            ctx.save();
            ctx.fillStyle = "rgba(190,195,200,0.18)";
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
        return this;
    }

    /**
     * Full frame.
     * @param {object} state { zone, player, clock, weather, particles, fires, interact, look, toolEmoji, entities }
     * @param {number} dt
     */
    render(state, dt = 0) {
        this.time += dt;
        this.season = state.clock ? state.clock.season.key : "spring";
        const ctx = this.ctx;
        ctx.fillStyle = "#0a0c10";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGround(state.zone);
        this.drawObjects(state);
        if (state.particles) state.particles.draw(ctx, this.camera);
        if (state.player.sleeping) {
            const s = this.camera.worldToScreen(state.player.x, state.player.y);
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.scale(this.camera.zoom, this.camera.zoom);
            drawSleeping(ctx, this.time);
            ctx.restore();
        }
        this.drawInteractHint(state.interact && state.interact.target, state.interact && state.interact.label);
        this.drawWeather(state.weather, dt);

        // --- lights ---------------------------------------------------------
        const cam = this.camera;
        this.lightMap.begin();
        if (state.fires) {
            for (const [key, fire] of state.fires) {
                if (!fire.lit) continue;
                const obj = state.zone.objects.find((o) => (o.id != null ? o.id : `${o.tx},${o.ty}`) === key);
                if (!obj || !cam.isVisible(obj.x, obj.y, 200)) continue;
                const s = cam.worldToScreen(obj.x, obj.y);
                this.lightMap.add(s.x, s.y, fire.lightRadius * cam.zoom,
                    { intensity: 0.55 + fire.intensity * 0.45, warmth: 0.9, flicker: 1 });
            }
        }
        if (state.playerLight > 0) {
            const s = cam.worldToScreen(state.player.x, state.player.y - 8);
            this.lightMap.add(s.x, s.y, state.playerLight * cam.zoom, { intensity: 0.8, warmth: 0.85, flicker: 1 });
        }
        for (const L of state.extraLights || []) {
            const s = cam.worldToScreen(L.x, L.y);
            this.lightMap.add(s.x, s.y, L.r * cam.zoom, { intensity: L.i || 0.7, warmth: L.w !== undefined ? L.w : 0.6 });
        }
        this.lightMap.render(ctx, {
            daylight: state.clock ? state.clock.daylight : 1,
            weather: state.weather,
            underground: !!(state.zone.def && state.zone.def.underground),
            time: this.time
        });

        return this;
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
