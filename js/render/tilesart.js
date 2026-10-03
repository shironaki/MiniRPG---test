/**
 * render/tilesart.js — procedural ground and prop art.
 *
 * No image assets: tiles and props are drawn from code. Ground is baked once
 * per 16×16 chunk, so the per-pixel work here costs nothing per frame.
 *
 * Art rules (keep them consistent, they are what makes it read as one world):
 *   • The sun sits top-left: highlights on the upper-left, shadow lower-right.
 *   • Nothing is a flat colour — every surface gets 3+ tones and organic noise.
 *   • Variation comes from smooth noise, never from a per-tile square blotch
 *     (that was the grid artefact in the first pass).
 *   • Props are silhouettes first: dark base, mid body, one bright rim light.
 */
import { T, tileInfo } from "../world/tiles.js";

/* ------------------------------------------------------------------ utils */

/** Deterministic hash → [0,1). */
function h(x, y, s = 0) {
    let n = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
    n = (n ^ (n >>> 13)) * 1274126177 | 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Smooth noise across tiles — large soft patches, no grid edges. */
function soft(x, y, scale = 8, seed = 0) {
    const fx = x / scale, fy = y / scale;
    const xi = Math.floor(fx), yi = Math.floor(fy);
    const tx = fx - xi, ty = fy - yi;
    const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
    const a = h(xi, yi, seed), b = h(xi + 1, yi, seed);
    const c = h(xi, yi + 1, seed), d = h(xi + 1, yi + 1, seed);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function rgb(c) {
    if (c[0] === "#") {
        const s = c.slice(1);
        return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    }
    const m = c.match(/-?\d+/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
}

function css(r, g, b, a = 1) {
    const f = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return a >= 1 ? `rgb(${f(r)},${f(g)},${f(b)})` : `rgba(${f(r)},${f(g)},${f(b)},${a})`;
}

export function shade(hex, amount) {
    const [r, g, b] = rgb(hex);
    return css(r + amount, g + amount, b + amount);
}

function mix(c1, c2, t) {
    const a = rgb(c1), b = rgb(c2);
    return css(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

/** Seasonal shift applied to living ground (grass, moss, meadow). */
export function seasonTint(season) {
    switch (season) {
        case "summer": return { c: "#8fbe4a", t: 0.10 };
        case "autumn": return { c: "#b8823a", t: 0.34 };
        case "winter": return { c: "#dfe8f0", t: 0.55 };
        default: return { c: "#7fc04f", t: 0.08 };
    }
}

const LIVING = new Set([T.GRASS, T.MEADOW, T.MOSS, T.GRASS_DRY, T.PINE_FLOOR]);

/* ------------------------------------------------------------------ ground */

/**
 * Paint one ground tile.
 * Draws in 8 px cells with noise-driven tone, then a type-specific detail pass.
 */
export function paintTile(ctx, id, px, py, size, tx, ty, season = "spring") {
    const info = tileInfo(id);
    let [base, dark, light] = info.colors;

    if (LIVING.has(id)) {
        const st = seasonTint(season);
        base = mix(base, st.c, st.t * 0.75);
        dark = mix(dark, st.c, st.t * 0.5);
        light = mix(light, st.c, st.t * 0.9);
    }

    // Tone is computed per 8 px cell from noise sampled in *continuous* world
    // space, so there is no tile-sized step anywhere — that was the grid
    // artefact of the first pass.
    const [br, bg, bb] = rgb(base);
    // How strongly the ground varies across metres. Burnt and bare ground is
    // blotchy; grass and snow are even.
    const amp = (id === T.ASH || id === T.SOOT) ? 26
        : (id === T.DIRT || id === T.SAND || id === T.GRAVEL || id === T.MUD) ? 18
        : LIVING.has(id) ? 16 : 12;
    const cells = 4;
    const cs = size / cells;
    ctx.fillStyle = base;
    ctx.fillRect(px, py, size, size);
    for (let cy = 0; cy < cells; cy++) {
        for (let cx = 0; cx < cells; cx++) {
            const gx = tx * cells + cx, gy = ty * cells + cy;
            const macro = soft(gx, gy, 26, 11) - 0.5;      // broad sun/shade
            const meso = soft(gx, gy, 7, 23) - 0.5;        // patches
            const micro = soft(gx, gy, 2.1, 31) - 0.5;     // grain
            const tone = macro * amp + meso * (amp * 0.7) + micro * 7;
            // Hue drifts too, not just brightness: dry yellow-green here,
            // cold blue-green there. Flat colour is what kills ground art.
            const warm = (soft(gx, gy, 19, 97) - 0.5) * (LIVING.has(id) ? 20 : 10);
            ctx.fillStyle = css(br + tone + warm, bg + tone + warm * 0.45, bb + tone - warm * 0.7);
            ctx.fillRect(px + cx * cs, py + cy * cs, cs + 0.5, cs + 0.5);
            // Living ground: thin, trodden patches where earth shows through,
            // and deeper pools of shade. Continuous noise, so no tile edges.
            if (LIVING.has(id)) {
                const bare = soft(gx, gy, 17, 53);
                if (bare > 0.66) {
                    ctx.fillStyle = `rgba(104,84,56,${(bare - 0.66) * 1.5})`;
                    ctx.fillRect(px + cx * cs, py + cy * cs, cs + 0.5, cs + 0.5);
                } else if (bare < 0.3) {
                    ctx.fillStyle = `rgba(18,34,16,${(0.3 - bare) * 0.7})`;
                    ctx.fillRect(px + cx * cs, py + cy * cs, cs + 0.5, cs + 0.5);
                }
            }

            // Burnt ground keeps the memory of the fire: soft scorch smears
            // and pale drifts of ash, both continuous across tiles.
            if (id === T.ASH || id === T.SOOT) {
                const scorch = soft(gx, gy, 13, 71);
                if (scorch > 0.58) {
                    ctx.fillStyle = `rgba(26,21,18,${(scorch - 0.58) * 1.1})`;
                    ctx.fillRect(px + cx * cs, py + cy * cs, cs + 0.5, cs + 0.5);
                } else if (scorch < 0.3) {
                    ctx.fillStyle = `rgba(206,196,182,${(0.3 - scorch) * 0.55})`;
                    ctx.fillRect(px + cx * cs, py + cy * cs, cs + 0.5, cs + 0.5);
                }
            }

            // Sparse speckles of the palette's own light/dark tones.
            const k = h(gx, gy, 5);
            if (k > 0.93) {
                ctx.fillStyle = light; ctx.globalAlpha = 0.3;
                ctx.fillRect(px + cx * cs + k * 4, py + cy * cs + k * 3, 2, 1.5);
                ctx.globalAlpha = 1;
            } else if (k < 0.07) {
                ctx.fillStyle = dark; ctx.globalAlpha = 0.32;
                ctx.fillRect(px + cx * cs + k * 30, py + cy * cs + k * 24, 2, 1.5);
                ctx.globalAlpha = 1;
            }
        }
    }

    detailPass(ctx, id, px, py, size, tx, ty, { base, dark, light, season });
    ctx.globalAlpha = 1;
}

function detailPass(ctx, id, px, py, size, tx, ty, pal) {
    const { dark, light, season } = pal;

    switch (id) {
        case T.GRASS: case T.MEADOW: case T.MOSS: case T.GRASS_DRY: case T.PINE_FLOOR: {
            // Blades of grass: short vertical strokes, lighter at the tip.
            const n = 3 + Math.floor(h(tx, ty, 2) * 3);
            for (let i = 0; i < n; i++) {
                const gx = px + h(tx, ty, i * 3 + 1) * (size - 3) + 1;
                const gy = py + h(tx, ty, i * 7 + 2) * (size - 5) + 3;
                const len = 2 + h(tx, ty, i * 11) * 3;
                ctx.fillStyle = season === "winter" ? "rgba(226,236,244,0.5)" : light;
                ctx.globalAlpha = 0.5;
                ctx.fillRect(gx, gy - len, 1, len);
                ctx.fillStyle = dark;
                ctx.globalAlpha = 0.35;
                ctx.fillRect(gx + 1, gy - len * 0.6, 1, len * 0.6);
                ctx.globalAlpha = 1;
            }
            // Occasional flower / pebble.
            const spark = h(tx, ty, 77);
            if (id === T.MEADOW && spark > 0.86) {
                ctx.fillStyle = ["#e8d05a", "#e6eaf0", "#d98ab0", "#9fc6ef"][Math.floor(spark * 97) % 4];
                ctx.fillRect(px + 8 + spark * 12, py + 10 + spark * 10, 2, 2);
            }
            if (id === T.PINE_FLOOR && spark > 0.7) {
                ctx.strokeStyle = "rgba(60,48,30,0.5)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px + 6 + spark * 14, py + 8 + spark * 12);
                ctx.lineTo(px + 10 + spark * 14, py + 12 + spark * 10);
                ctx.stroke();
            }
            break;
        }

        case T.ASH: case T.SOOT: {
            // Soot flecks, charcoal bits and the odd live ember.
            for (let i = 0; i < 6; i++) {
                const a = h(tx, ty, i * 5 + 3);
                const gx = px + a * (size - 2), gy = py + h(tx, ty, i * 9 + 4) * (size - 2);
                ctx.fillStyle = a > 0.55 ? "rgba(28,24,22,0.55)" : "rgba(150,142,134,0.3)";
                ctx.fillRect(gx, gy, a > 0.85 ? 2 : 1, 1);
            }
            const ember = h(tx, ty, 61);
            if (ember > 0.95) {
                ctx.fillStyle = "rgba(220,110,50,0.55)";
                ctx.fillRect(px + ember * 20, py + ember * 18, 2, 2);
            }

            // Baked litter of the fire: charcoal lumps, burnt twigs, cracks.
            const d = h(tx, ty, 99);
            const dx = px + h(tx, ty, 13) * (size - 14) + 4;
            const dy = py + h(tx, ty, 14) * (size - 12) + 4;
            if (d > 0.94) {                                   // charcoal lump
                ctx.fillStyle = "rgba(0,0,0,0.25)";
                ctx.beginPath(); ctx.ellipse(dx + 1, dy + 2, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#211c19";
                ctx.beginPath();
                ctx.moveTo(dx - 4, dy + 1); ctx.lineTo(dx - 2, dy - 3);
                ctx.lineTo(dx + 3, dy - 2); ctx.lineTo(dx + 4, dy + 1);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = "rgba(150,140,130,0.25)";
                ctx.fillRect(dx - 2, dy - 2.5, 3, 1);
            } else if (d > 0.86) {                            // burnt twig
                ctx.strokeStyle = "rgba(32,26,22,0.75)";
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(dx - 6, dy + 2);
                ctx.quadraticCurveTo(dx, dy - 2, dx + 6, dy + 1);
                ctx.stroke();
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(dx + 1, dy - 0.6); ctx.lineTo(dx + 4, dy - 4); ctx.stroke();
            } else if (d > 0.78) {                            // cracked, dry earth
                ctx.strokeStyle = "rgba(20,16,14,0.3)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(dx - 7, dy - 4); ctx.lineTo(dx - 1, dy + 1); ctx.lineTo(dx + 6, dy - 1);
                ctx.stroke();
            }
            break;
        }

        case T.SAND: {
            // Wind ripples.
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = 1;
            for (let i = 0; i < 2; i++) {
                const ry = py + 6 + i * 13 + h(tx, ty, i) * 5;
                ctx.beginPath();
                ctx.moveTo(px + 2, ry);
                ctx.quadraticCurveTo(px + size / 2, ry - 2.5, px + size - 2, ry);
                ctx.stroke();
            }
            ctx.fillStyle = "rgba(120,100,70,0.22)";
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(px + h(tx, ty, i * 13) * size, py + h(tx, ty, i * 17) * size, 1, 1);
            }
            break;
        }

        case T.WATER: case T.DEEP: {
            const deep = id === T.DEEP;
            ctx.fillStyle = deep ? "rgba(10,30,45,0.35)" : "rgba(255,255,255,0.10)";
            for (let i = 0; i < 3; i++) {
                const ry = py + 4 + i * 10 + h(tx, ty, i) * 4;
                const rw = 6 + h(tx, ty, i + 5) * 14;
                ctx.fillRect(px + h(tx, ty, i + 9) * (size - rw), ry, rw, 1);
            }
            if (!deep && h(tx, ty, 41) > 0.8) {       // sun glint on the shallows
                ctx.fillStyle = "rgba(255,255,255,0.3)";
                ctx.fillRect(px + 10, py + 14, 4, 1);
            }
            break;
        }

        case T.STONE: case T.GRAVEL: case T.CLIFF: {
            // Facets and cracks.
            for (let i = 0; i < 4; i++) {
                const a = h(tx, ty, i * 7 + 2);
                const gx = px + a * (size - 6), gy = py + h(tx, ty, i * 11 + 3) * (size - 6);
                const w = 3 + a * 5, hh = 2 + h(tx, ty, i) * 4;
                ctx.fillStyle = a > 0.5 ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.16)";
                ctx.fillRect(gx, gy, w, hh);
            }
            if (id === T.CLIFF) {
                ctx.fillStyle = "rgba(0,0,0,0.3)";
                ctx.fillRect(px, py + size - 4, size, 4);     // base shadow
                ctx.fillStyle = "rgba(255,255,255,0.08)";
                ctx.fillRect(px, py, size, 2);
            }
            break;
        }

        case T.SNOW: {
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.fillRect(px, py, size, 2);
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = "rgba(170,195,225,0.25)";
                ctx.fillRect(px + h(tx, ty, i) * size, py + h(tx, ty, i + 3) * size, 2, 1);
            }
            break;
        }

        case T.MUD: {
            ctx.fillStyle = "rgba(20,24,14,0.3)";
            for (let i = 0; i < 2; i++) {
                const a = h(tx, ty, i * 3);
                ctx.beginPath();
                ctx.ellipse(px + a * size, py + h(tx, ty, i * 5) * size, 4 + a * 4, 2 + a * 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = "rgba(140,160,120,0.18)";
            ctx.fillRect(px + h(tx, ty, 8) * size, py + h(tx, ty, 9) * size, 2, 2);
            break;
        }

        case T.PATH: case T.COBBLE: case T.DIRT: {
            // Trodden earth: pebbles and wheel ruts.
            for (let i = 0; i < 5; i++) {
                const a = h(tx, ty, i * 5 + 1);
                ctx.fillStyle = a > 0.5 ? "rgba(255,245,220,0.13)" : "rgba(40,28,18,0.2)";
                ctx.fillRect(px + a * (size - 3), py + h(tx, ty, i * 7 + 6) * (size - 3), 1 + (a > 0.8 ? 1 : 0), 1);
            }
            if (id === T.COBBLE) {
                ctx.strokeStyle = "rgba(0,0,0,0.18)";
                ctx.lineWidth = 1;
                for (let i = 0; i < 2; i++) {
                    ctx.beginPath();
                    ctx.moveTo(px, py + i * 16 + 8);
                    ctx.lineTo(px + size, py + i * 16 + 8);
                    ctx.stroke();
                }
            }
            break;
        }

        case T.PLANK: {
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.fillRect(px, py + size - 2, size, 1);
            for (let i = 0; i < 2; i++) {
                ctx.fillStyle = "rgba(0,0,0,0.18)";
                ctx.fillRect(px, py + 10 + i * 12, size, 1);
                ctx.fillStyle = "rgba(255,230,190,0.10)";
                ctx.fillRect(px, py + 11 + i * 12, size, 1);
            }
            break;
        }

        case T.FARM: case T.FARM_WET: {
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            for (let i = 0; i < 3; i++) ctx.fillRect(px, py + 4 + i * 10, size, 2);
            ctx.fillStyle = "rgba(255,220,170,0.08)";
            for (let i = 0; i < 3; i++) ctx.fillRect(px, py + 6 + i * 10, size, 1);
            break;
        }
    }
}

/**
 * Soft transition between two ground types: a dithered fringe that fades out,
 * plus a thin darker contact line, which reads as a real edge rather than a
 * sawtooth.
 */
export function paintEdges(ctx, map, tx, ty, px, py, size) {
    const here = map.get(tx, ty);
    const dirs = [[0, -1, "n"], [1, 0, "e"], [0, 1, "s"], [-1, 0, "w"]];
    for (const [dx, dy, side] of dirs) {
        const other = map.get(tx + dx, ty + dy);
        if (other === here || other === T.VOID) continue;
        const oi = tileInfo(other), hi = tileInfo(here);
        if (oi.solid && !oi.liquid) {
            // Contact shadow cast by a cliff onto the neighbouring ground.
            ctx.fillStyle = "rgba(0,0,0,0.20)";
            if (side === "n") ctx.fillRect(px, py, size, 4);
            if (side === "w") ctx.fillRect(px, py, 4, size);
            if (side === "e") ctx.fillRect(px + size - 3, py, 3, size);
            if (side === "s") ctx.fillRect(px, py + size - 3, size, 3);
            continue;
        }

        const steps = 12;
        for (let layer = 0; layer < 2; layer++) {
            ctx.fillStyle = oi.colors[layer === 0 ? 0 : 1];
            ctx.globalAlpha = layer === 0 ? 0.55 : 0.3;
            for (let i = 0; i < steps; i++) {
                const n = h(tx * 13 + i, ty * 17 + layer, side.charCodeAt(0));
                const depth = (layer === 0 ? 2.5 : 5.5) * (0.35 + n * 0.9);
                const seg = size / steps;
                if (side === "n") ctx.fillRect(px + i * seg, py, seg, depth);
                if (side === "s") ctx.fillRect(px + i * seg, py + size - depth, seg, depth);
                if (side === "w") ctx.fillRect(px, py + i * seg, depth, seg);
                if (side === "e") ctx.fillRect(px + size - depth, py + i * seg, depth, seg);
            }
        }
        ctx.globalAlpha = 1;

        // Wet sand / foam where land meets water.
        if (oi.liquid && !hi.liquid) {
            ctx.fillStyle = "rgba(255,255,255,0.22)";
            for (let i = 0; i < steps; i++) {
                const n = h(tx * 7 + i, ty * 11, 3);
                const seg = size / steps;
                if (side === "n") ctx.fillRect(px + i * seg, py + 1 + n * 2, seg * 0.8, 1);
                if (side === "s") ctx.fillRect(px + i * seg, py + size - 2 - n * 2, seg * 0.8, 1);
                if (side === "w") ctx.fillRect(px + 1 + n * 2, py + i * seg, 1, seg * 0.8);
                if (side === "e") ctx.fillRect(px + size - 2 - n * 2, py + i * seg, 1, seg * 0.8);
            }
        }
    }
    ctx.globalAlpha = 1;
}

/* ======================================================================= */
/*  Props — drawn every frame, y-sorted with characters. Origin = the base.  */
/* ======================================================================= */

function shadowEllipse(ctx, w, hh, alpha = 0.3) {
    // Soft core plus a wider, fainter penumbra, offset down-right (sun is
    // up-left). Grounding objects this way is most of the "3D" feeling.
    ctx.fillStyle = `rgba(14,12,10,${alpha * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(2.5, 1.8, w * 1.3, hh * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(14,12,10,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(1.5, 1, w, hh, 0, 0, Math.PI * 2);
    ctx.fill();
}

/** Per-instance colour jitter so a forest is not a clone army. */
function jitterPalette(colors, seedA, seedB) {
    const k = (h(seedA, seedB, 17) - 0.5) * 16;
    const warm = (h(seedA, seedB, 29) - 0.5) * 10;
    return colors.map((c) => {
        const [r, g, b] = rgb(c);
        return css(r + k + warm, g + k, b + k - warm * 0.5);
    });
}

const TREE_COLORS = {
    pine:        ["#35593a", "#274330", "#4e7d4b", "#16281c"],
    spruce:      ["#2d4f35", "#21402c", "#447045", "#13231a"],
    oak:         ["#44763a", "#375f30", "#63a24b", "#1e3418"],
    birch:       ["#5f9442", "#4c7a36", "#84b85a", "#2a401c"],
    willow:      ["#55713c", "#445c30", "#7a9552", "#26311a"],
    palm:        ["#3f8450", "#316a41", "#5aa96a", "#1c3a24"],
    ancient_oak: ["#33612f", "#265024", "#4d8340", "#16290f"]
};

const AUTUMN_COLORS = ["#b07a2c", "#8f6122", "#d79a3e", "#48300f"];

function conifer(ctx, obj) {
    const s = obj.size || 1;
    const pal = jitterPalette(TREE_COLORS[obj.kind] || TREE_COLORS.pine, obj.tx, obj.ty);
    const [mid, dark, lit, deep] = pal;
    const H = 46 * s;

    shadowEllipse(ctx, 13 * s, 5 * s, 0.32);

    // Trunk.
    ctx.fillStyle = "#4b3722";
    ctx.fillRect(-2.6 * s, -13 * s, 5.2 * s, 13 * s);
    ctx.fillStyle = "#5e472c";
    ctx.fillRect(0.4 * s, -13 * s, 2.2 * s, 13 * s);

    // Five tiers of needles, each a jagged skirt.
    const tiers = h(obj.tx, obj.ty, 47) > 0.5 ? 6 : 5;
    for (let i = 0; i < tiers; i++) {
        const t = i / (tiers - 1);
        const w = (17 - t * 11) * s;
        const y = -9 * s - t * (H - 14 * s);
        const tierH = 15 * s;

        ctx.fillStyle = i % 2 ? dark : mid;
        ctx.beginPath();
        ctx.moveTo(0, y - tierH);
        for (let k = 1; k <= 5; k++) {
            const f = k / 5;
            ctx.lineTo(w * f, y - tierH * (1 - f) + (k % 2 ? 1.5 * s : 4 * s));
        }
        ctx.lineTo(w * 0.55, y + 2 * s);
        ctx.lineTo(-w * 0.55, y + 2 * s);
        for (let k = 5; k >= 1; k--) {
            const f = k / 5;
            ctx.lineTo(-w * f, y - tierH * (1 - f) + (k % 2 ? 1.5 * s : 4 * s));
        }
        ctx.closePath();
        ctx.fill();

        // Sun on the upper-left, shade on the lower-right.
        ctx.fillStyle = lit;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(0, y - tierH);
        ctx.lineTo(-w * 0.75, y + 1 * s);
        ctx.lineTo(-w * 0.2, y + 1 * s);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        if (i === tiers - 1) {                       // sun on the crown
            ctx.fillStyle = "rgba(255,240,190,0.22)";
            ctx.beginPath();
            ctx.moveTo(0, y - tierH);
            ctx.lineTo(-w * 0.5, y - tierH * 0.2);
            ctx.lineTo(0, y - tierH * 0.35);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = deep;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(w * 0.18, y - tierH * 0.55);
        ctx.lineTo(w, y + 2 * s);
        ctx.lineTo(w * 0.2, y + 2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function broadleaf(ctx, obj, season) {
    const s = obj.size || 1;
    const autumn = season === "autumn" && obj.kind !== "ancient_oak";
    const pal = jitterPalette(autumn ? AUTUMN_COLORS : (TREE_COLORS[obj.kind] || TREE_COLORS.oak), obj.tx, obj.ty);
    const [mid, dark, lit, deep] = pal;
    const birch = obj.kind === "birch";
    const big = obj.kind === "ancient_oak" ? 1.45 : 1;
    const S = s * big;

    shadowEllipse(ctx, 15 * S, 5.5 * S, 0.32);

    // Trunk with root flare.
    const trunk = birch ? "#d9d4c4" : "#5d4226";
    ctx.fillStyle = trunk;
    ctx.beginPath();
    ctx.moveTo(-5 * S, 0); ctx.lineTo(-2.8 * S, -18 * S);
    ctx.lineTo(2.8 * S, -18 * S); ctx.lineTo(5 * S, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = birch ? "#b7b2a2" : "#452f19";
    ctx.beginPath();
    ctx.moveTo(1.2 * S, -18 * S); ctx.lineTo(2.8 * S, -18 * S);
    ctx.lineTo(5 * S, 0); ctx.lineTo(2 * S, 0);
    ctx.closePath(); ctx.fill();
    if (birch) {
        ctx.fillStyle = "#3a3630";
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-3 * S + h(obj.tx, obj.ty, i) * 5 * S, -16 * S + i * 4 * S, 2.4 * S, 1 * S);
        }
    }

    // Crown: overlapping blobs, dark first, then mid, then a rim light.
    const blobs = [[0, -36, 18], [-12, -28, 13], [12, -29, 12], [-5, -44, 12], [7, -42, 11]];
    ctx.fillStyle = dark;
    for (const [bx, by, br] of blobs) {
        ctx.beginPath();
        ctx.ellipse(bx * S + 2, by * S + 2, br * S, br * 0.84 * S, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = mid;
    for (const [bx, by, br] of blobs) {
        ctx.beginPath();
        ctx.ellipse(bx * S, by * S, br * 0.94 * S, br * 0.78 * S, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = lit;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(-8 * S, -42 * S, 9 * S, 6.5 * S, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-14 * S, -31 * S, 5.5 * S, 4 * S, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = deep;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(10 * S, -26 * S, 9 * S, 5 * S, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

export function paintProp(ctx, obj, time = 0, season = "spring") {
    const kind = obj.kind;
    const s = obj.size || 1;

    // Wind: only foliage sways, and each tree on its own phase.
    if (TREE_COLORS[kind]) {
        const sway = Math.sin(time * 0.8 + obj.tx * 0.7 + obj.ty * 0.37) * 0.02;
        ctx.transform(1, 0, sway, 1, 0, 0);
        // No two trees the same height: ±18 %, and a slight horizontal flip.
        const grow = 0.84 + h(obj.tx, obj.ty, 41) * 0.36;
        const flip = h(obj.tx, obj.ty, 43) > 0.5 ? -1 : 1;
        ctx.scale(flip, 1);
        ctx.scale(grow, grow);
    }

    switch (kind) {
        case "pine": case "spruce":
            conifer(ctx, obj); break;

        case "oak": case "birch": case "willow": case "ancient_oak":
            broadleaf(ctx, obj, season); break;

        case "palm": {
            shadowEllipse(ctx, 11 * s, 4 * s, 0.28);
            ctx.strokeStyle = "#8a6a3c"; ctx.lineWidth = 4.5 * s; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6 * s, -20 * s, 3 * s, -34 * s); ctx.stroke();
            ctx.strokeStyle = "#6f5430"; ctx.lineWidth = 1.6 * s;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(1 * s + i * 0.6, -6 * s - i * 7 * s);
                ctx.lineTo(4 * s + i * 0.6, -7 * s - i * 7 * s);
                ctx.stroke();
            }
            for (let i = 0; i < 7; i++) {
                const a = (i / 7) * Math.PI * 2 + Math.sin(time * 0.6) * 0.06;
                ctx.fillStyle = i % 2 ? "#3f8450" : "#326a41";
                ctx.beginPath();
                ctx.ellipse(3 * s + Math.cos(a) * 12 * s, -34 * s + Math.sin(a) * 6 * s,
                            11 * s, 3.4 * s, a, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = "#8a5f2c";
            ctx.beginPath(); ctx.arc(3 * s, -33 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case "dead_tree": {
            shadowEllipse(ctx, 9 * s, 3.4 * s, 0.26);
            ctx.strokeStyle = "#6a5a48"; ctx.lineWidth = 4 * s; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-2 * s, -16 * s, -1 * s, -31 * s); ctx.stroke();
            ctx.strokeStyle = "#7d6b55"; ctx.lineWidth = 2.2 * s;
            ctx.beginPath(); ctx.moveTo(-1 * s, -20 * s); ctx.quadraticCurveTo(-7 * s, -25 * s, -11 * s, -29 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-1 * s, -24 * s); ctx.quadraticCurveTo(6 * s, -28 * s, 10 * s, -33 * s); ctx.stroke();
            ctx.strokeStyle = "#564736"; ctx.lineWidth = 1.2 * s;
            ctx.beginPath(); ctx.moveTo(-9 * s, -28 * s); ctx.lineTo(-12 * s, -33 * s); ctx.stroke();
            break;
        }

        case "burnt_tree": {
            shadowEllipse(ctx, 9 * s, 3.4 * s, 0.34);
            ctx.strokeStyle = "#241f1c"; ctx.lineWidth = 4.5 * s; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(1 * s, -14 * s, 2 * s, -27 * s); ctx.stroke();
            ctx.strokeStyle = "#332b26"; ctx.lineWidth = 2 * s;
            ctx.beginPath(); ctx.moveTo(1 * s, -16 * s); ctx.quadraticCurveTo(-5 * s, -20 * s, -9 * s, -22 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2 * s, -21 * s); ctx.quadraticCurveTo(7 * s, -23 * s, 11 * s, -26 * s); ctx.stroke();
            ctx.fillStyle = "rgba(90,78,70,0.5)";          // ash dust on the windward side
            ctx.fillRect(-1 * s, -26 * s, 1.5 * s, 10 * s);
            break;
        }

        case "burnt_stump": {
            shadowEllipse(ctx, 8, 3, 0.34);
            ctx.fillStyle = "#2a2421";
            ctx.beginPath();
            ctx.moveTo(-7, 0); ctx.lineTo(-6, -9); ctx.lineTo(-2, -11);
            ctx.lineTo(4, -10); ctx.lineTo(7, 0);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#3f3732";
            ctx.beginPath(); ctx.ellipse(-1, -10, 5.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#15120f";
            ctx.beginPath(); ctx.ellipse(-1, -10, 2.6, 1.1, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case "burnt_beam": {
            shadowEllipse(ctx, 13, 3.5, 0.3);
            ctx.save(); ctx.rotate(-0.22);
            ctx.fillStyle = "#231d1a"; ctx.fillRect(-14, -8, 28, 8);
            ctx.fillStyle = "#39312b"; ctx.fillRect(-14, -8, 28, 2.5);
            ctx.fillStyle = "#4a3f36";
            for (let i = 0; i < 4; i++) ctx.fillRect(-12 + i * 7, -6, 1, 5);
            ctx.restore();
            break;
        }

        case "rock": case "ore_rock": {
            shadowEllipse(ctx, 12, 4.4, 0.3);
            const warm = h(obj.tx, obj.ty, 9) * 10;
            const body = kind === "ore_rock" ? css(104 + warm, 100 + warm, 94 + warm) : css(118 + warm, 116 + warm, 112 + warm);
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.moveTo(-12, 0); ctx.lineTo(-9, -10); ctx.lineTo(-3, -16);
            ctx.lineTo(5, -14); ctx.lineTo(11, -6); ctx.lineTo(9, 0);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.22)";
            ctx.beginPath();
            ctx.moveTo(-9, -10); ctx.lineTo(-3, -16); ctx.lineTo(1, -10); ctx.lineTo(-6, -6);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.moveTo(5, -14); ctx.lineTo(11, -6); ctx.lineTo(9, 0); ctx.lineTo(3, -4);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(80,110,60,0.35)";                 // moss on the shaded side
            ctx.fillRect(-10, -3, 5, 2);
            if (obj.ore) {
                const oreColors = { copper: "#d2823c", iron: "#c3cbd4", coal: "#1f1d1c", gem: "#63dcef" };
                const c = oreColors[obj.ore] || "#c0c0c0";
                ctx.fillStyle = c;
                ctx.fillRect(-5, -11, 3, 3); ctx.fillRect(2, -8, 3, 3); ctx.fillRect(-1, -6, 2, 2);
                ctx.fillStyle = "rgba(255,255,255,0.65)";
                ctx.fillRect(-5, -11, 1, 1); ctx.fillRect(2, -8, 1, 1);
            }
            break;
        }

        case "ruin_wall": {
            shadowEllipse(ctx, 13, 4.5, 0.3);
            ctx.fillStyle = "#6a635a"; ctx.fillRect(-12, -19, 24, 19);
            // Masonry courses.
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 3; c++) {
                    const bx = -12 + c * 8 + (r % 2 ? 3 : 0);
                    ctx.fillStyle = h(obj.tx + c, obj.ty + r, 3) > 0.5 ? "#766e64" : "#5d574f";
                    ctx.fillRect(bx, -18 + r * 5, 7, 4);
                }
            }
            ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(-12, -19, 24, 2);
            ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-12, -3, 24, 3);
            ctx.fillStyle = "rgba(30,25,20,0.5)"; ctx.fillRect(3, -14, 7, 9);   // broken gap
            ctx.fillStyle = "rgba(90,110,60,0.3)"; ctx.fillRect(-10, -6, 6, 2);
            break;
        }

        case "bush": {
            shadowEllipse(ctx, 10, 3.4, 0.26);
            const autumn = season === "autumn";
            const pal = jitterPalette(autumn ? ["#9a6a28", "#7d551f", "#c08a39"] : ["#3f6b33", "#33592a", "#5d8f45"], obj.tx, obj.ty);
            ctx.fillStyle = pal[1];
            ctx.beginPath(); ctx.ellipse(1, -6, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = pal[0];
            ctx.beginPath(); ctx.ellipse(0, -7, 10, 7.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = pal[2];
            ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.ellipse(-4, -10, 5, 3.4, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            if (obj.berries) {
                ctx.fillStyle = "#9c2f58";
                const spots = [[-5, -9], [3, -7], [0, -12], [6, -10], [-2, -5]];
                for (const [bx, by] of spots) {
                    ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = "rgba(255,180,200,0.7)";
                ctx.fillRect(-5, -10, 1, 1); ctx.fillRect(3, -8, 1, 1);
            }
            break;
        }

        case "herb": {
            ctx.strokeStyle = "#5f8a3f"; ctx.lineWidth = 1.4;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 2.5, 0);
                ctx.quadraticCurveTo(i * 6, -7, i * 4.5, -13);
                ctx.stroke();
            }
            const head = obj.herbType === "yarrow" ? "#f2efe0"
                : obj.herbType === "sage" ? "#b9c9a0" : "#a7da7c";
            ctx.fillStyle = head;
            ctx.beginPath(); ctx.ellipse(0, -14, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillRect(-2, -15, 1.5, 1);
            break;
        }

        case "firewood": {
            shadowEllipse(ctx, 9, 2.6, 0.22);
            const logs = [[-0.35, -8, 16], [0.25, -5, 15], [0.05, -2.5, 13]];
            for (let i = 0; i < logs.length; i++) {
                const [rot, yy, len] = logs[i];
                ctx.save(); ctx.translate(0, yy * 0.35); ctx.rotate(rot);
                ctx.fillStyle = i % 2 ? "#6d4f2c" : "#7d5c35";
                ctx.fillRect(-len / 2, -3, len, 3.4);
                ctx.fillStyle = "#9a7845";
                ctx.fillRect(-len / 2, -3, len, 1);
                ctx.fillStyle = "#c8a46a";
                ctx.beginPath(); ctx.ellipse(len / 2, -1.3, 1.1, 1.7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            break;
        }

        case "reed": {
            ctx.strokeStyle = "#6f8a3f"; ctx.lineWidth = 1.5;
            for (let i = -2; i <= 2; i++) {
                const bend = Math.sin(time * 1.2 + i + obj.tx) * 2;
                ctx.beginPath();
                ctx.moveTo(i * 3, 0);
                ctx.quadraticCurveTo(i * 4 + bend, -9, i * 4.5 + bend * 1.6, -17);
                ctx.stroke();
                if (i % 2 === 0) {
                    ctx.fillStyle = "#8a6a3a";
                    ctx.fillRect(i * 4.5 + bend * 1.6 - 1, -20, 2, 4);
                }
            }
            break;
        }

        case "grass_tuft": {
            const colors = season === "winter" ? ["#b9c6d0", "#9fb0ba"]
                : season === "autumn" ? ["#b59a4e", "#977f3c"] : ["#6f9a4a", "#5a7f3b"];
            for (let i = -2; i <= 2; i++) {
                const bend = Math.sin(time * 1.1 + i * 0.6 + obj.tx * 0.5) * 1.6;
                ctx.strokeStyle = i % 2 ? colors[0] : colors[1];
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.moveTo(i * 2.4, 0);
                ctx.quadraticCurveTo(i * 3.6 + bend, -5, i * 5 + bend * 1.4, -10);
                ctx.stroke();
            }
            break;
        }

        case "flower": {
            const bend = Math.sin(time * 1.3 + obj.tx) * 1.2;
            ctx.strokeStyle = "#5f8a3f"; ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(bend, -5, bend, -9); ctx.stroke();
            ctx.fillStyle = "#6f9a4a";
            ctx.beginPath(); ctx.ellipse(-2 + bend, -5, 2.4, 1.2, -0.4, 0, Math.PI * 2); ctx.fill();
            const colors = ["#f0d75e", "#e07a9a", "#8aa8e8", "#f2f0ea"];
            const c = colors[obj.variant % colors.length];
            ctx.fillStyle = c;
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2;
                ctx.beginPath();
                ctx.ellipse(bend + Math.cos(a) * 2, -10 + Math.sin(a) * 2, 1.6, 1.6, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = "#f7c14b";
            ctx.beginPath(); ctx.arc(bend, -10, 1.2, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case "driftwood": {
            shadowEllipse(ctx, 11, 2.6, 0.22);
            ctx.save(); ctx.rotate(-0.18);
            ctx.fillStyle = "#a89880"; ctx.fillRect(-12, -5, 24, 5);
            ctx.fillStyle = "#c3b49c"; ctx.fillRect(-12, -5, 24, 1.5);
            ctx.fillStyle = "#8a7c66";
            for (let i = 0; i < 4; i++) ctx.fillRect(-10 + i * 6, -4, 1, 4);
            ctx.restore();
            break;
        }

        case "tent": {
            shadowEllipse(ctx, 23, 7, 0.34);
            // Canvas, two tones, with a seam and a rolled-back door.
            ctx.fillStyle = "#6a5a40";
            ctx.beginPath(); ctx.moveTo(-21, 0); ctx.lineTo(0, -29); ctx.lineTo(21, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#857047";
            ctx.beginPath(); ctx.moveTo(-21, 0); ctx.lineTo(0, -29); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.18)";
            ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(0, -29); ctx.lineTo(21, 0); ctx.closePath(); ctx.fill();
            // Folds.
            ctx.strokeStyle = "rgba(0,0,0,0.16)"; ctx.lineWidth = 1;
            for (let i = -2; i <= 2; i++) {
                if (!i) continue;
                ctx.beginPath(); ctx.moveTo(i * 7, 0); ctx.lineTo(i * 1.6, -24); ctx.stroke();
            }
            // Dark interior.
            ctx.fillStyle = "#15110c";
            ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(0, -17); ctx.lineTo(7, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#2b2319";
            ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-3, -14); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
            // Ridge pole and guy lines.
            ctx.strokeStyle = "#4a3c2a"; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(0, -29); ctx.lineTo(0, -33); ctx.stroke();
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-21, 0); ctx.lineTo(-27, 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(21, 0); ctx.lineTo(27, 4); ctx.stroke();
            ctx.fillStyle = "#3a2f21";
            ctx.fillRect(-28, 3, 3, 2); ctx.fillRect(25, 3, 3, 2);
            // A bedroll peeking out.
            ctx.fillStyle = "#7d6a4e";
            ctx.beginPath(); ctx.ellipse(0, -2, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case "hearth_ruin": {
            // The stove outlived the house: scorched brick, a cold black mouth
            // and soot licking up the chimney. It is a landmark, so it is big.
            ctx.save();
            ctx.scale(1.25, 1.25);
            shadowEllipse(ctx, 17, 6, 0.36);
            ctx.fillStyle = "#7d5d4c"; ctx.fillRect(-14, -26, 28, 26);
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 4; c++) {
                    const bx = -14 + c * 7 + (r % 2 ? 3.5 : 0);
                    const k = h(obj.tx + c, obj.ty + r, 7);
                    ctx.fillStyle = k > 0.7 ? "#916b56" : k > 0.35 ? "#74564698" : "#5f453a";
                    ctx.fillRect(bx, -25 + r * 4.4, 6.2, 3.6);
                }
            }
            ctx.fillStyle = "rgba(255,230,200,0.12)"; ctx.fillRect(-14, -26, 28, 2);
            ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fillRect(8, -26, 6, 26);
            // Broken chimney stub with soot.
            ctx.fillStyle = "#6b5044"; ctx.fillRect(-9, -36, 12, 10);
            ctx.fillStyle = "#523d33"; ctx.fillRect(-9, -36, 12, 2.4);
            ctx.fillStyle = "rgba(20,16,14,0.55)"; ctx.fillRect(-7, -36, 8, 4);
            // Mouth.
            ctx.fillStyle = "#0f0c0a";
            ctx.beginPath();
            ctx.moveTo(-8, 0); ctx.lineTo(-8, -12); ctx.quadraticCurveTo(0, -17, 8, -12);
            ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(90,60,40,0.35)";          // faint warmth inside
            ctx.beginPath(); ctx.ellipse(0, -4, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(24,20,17,0.6)";           // soot above the mouth
            ctx.beginPath();
            ctx.moveTo(-8, -12); ctx.quadraticCurveTo(0, -24, 8, -12);
            ctx.quadraticCurveTo(0, -15, -8, -12); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#2a2320"; ctx.fillRect(-14, -1.5, 28, 2.5);
            ctx.fillStyle = "#4a3f39";                      // spilled ash at its foot
            ctx.beginPath(); ctx.ellipse(-2, 1.5, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            break;
        }

        case "diary": {
            shadowEllipse(ctx, 7, 2, 0.24);
            ctx.save(); ctx.rotate(-0.12);
            ctx.fillStyle = "#e5d8b4"; ctx.fillRect(-6, -4.5, 12, 4.5);
            ctx.fillStyle = "#c9b98f"; ctx.fillRect(-6, -4.5, 12, 1);
            ctx.fillStyle = "#6b4a2c"; ctx.fillRect(-7, -6, 13, 2);
            ctx.fillStyle = "#231c16";                          // burnt corner
            ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(6, -6); ctx.lineTo(6, -1); ctx.closePath(); ctx.fill();
            ctx.restore();
            break;
        }

        case "chest_old": {
            shadowEllipse(ctx, 12, 4, 0.3);
            ctx.fillStyle = "#5e4428"; ctx.fillRect(-11, -13, 22, 13);
            ctx.fillStyle = "#74552f"; ctx.fillRect(-11, -13, 22, 2);
            ctx.fillStyle = "#4a3620";
            ctx.beginPath(); ctx.ellipse(0, -13, 11, 5, 0, Math.PI, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#8a6a3c";
            ctx.beginPath(); ctx.ellipse(0, -13.5, 11, 4.4, 0, Math.PI, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#3c3a40"; ctx.fillRect(-12, -9, 24, 2); ctx.fillRect(-2.5, -11, 5, 7);
            ctx.fillStyle = "#c8b060"; ctx.fillRect(-1.5, -8, 3, 3);
            break;
        }

        case "campfire": {
            // Fire ring only; flames are drawn live by the renderer.
            shadowEllipse(ctx, 14, 5, 0.22);
            ctx.fillStyle = "#3a332c";
            ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#4a4139";
            ctx.beginPath(); ctx.ellipse(0, -0.5, 8, 3.8, 0, 0, Math.PI * 2); ctx.fill();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + 0.3;
                const rx = Math.cos(a) * 13, ry = Math.sin(a) * 6.5;
                const sz = 3.4 + h(obj.tx + i, obj.ty, 5) * 1.8;
                ctx.fillStyle = "rgba(0,0,0,0.25)";       // the stone sits in the soil
                ctx.beginPath(); ctx.ellipse(rx, ry + 1.2, sz * 1.05, sz * 0.6, a, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = i % 2 ? "#5a544c" : "#4c463f";
                ctx.beginPath(); ctx.ellipse(rx, ry, sz, sz * 0.66, a, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(226,220,208,0.22)";
                ctx.beginPath(); ctx.ellipse(rx - 0.9, ry - 0.9, sz * 0.46, sz * 0.24, a, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(24,20,16,0.35)";    // soot on the inner face
                ctx.beginPath(); ctx.ellipse(rx * 0.72, ry * 0.72, sz * 0.5, sz * 0.3, a, 0, Math.PI * 2); ctx.fill();
            }
            break;
        }

        default: {
            shadowEllipse(ctx, 7, 2.4, 0.22);
            ctx.fillStyle = "#8a7a6a";
            ctx.fillRect(-5, -8, 10, 8);
        }
    }
}

/** Live flames over a campfire. `intensity` 0..1. */
export function paintFlames(ctx, intensity, time) {
    // Cold ashes.
    if (intensity <= 0) {
        ctx.fillStyle = "#2c2724";
        ctx.beginPath(); ctx.ellipse(0, -1, 7, 3.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4a443e";
        ctx.save(); ctx.rotate(0.4); ctx.fillRect(-8, -3, 16, 2.6); ctx.restore();
        ctx.save(); ctx.rotate(-0.4); ctx.fillRect(-8, -3, 16, 2.6); ctx.restore();
        return;
    }

    // Burning logs.
    for (const rot of [0.38, -0.38]) {
        ctx.save(); ctx.rotate(rot);
        ctx.fillStyle = "#4a3320"; ctx.fillRect(-10, -4.5, 20, 4);
        ctx.fillStyle = "#5e4228"; ctx.fillRect(-10, -4.5, 20, 1.2);
        ctx.fillStyle = `rgba(255,${110 + Math.sin(time * 7) * 25},40,${0.5 * intensity})`;
        ctx.fillRect(-6, -2.4, 12, 1.4);
        ctx.restore();
    }

    // Glowing bed of embers.
    ctx.fillStyle = `rgba(255,120,40,${0.3 * intensity})`;
    ctx.beginPath(); ctx.ellipse(0, -1, 10, 4.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,190,90,${0.25 * intensity})`;
    ctx.beginPath(); ctx.ellipse(0, -1.5, 5.5, 2.6, 0, 0, Math.PI * 2); ctx.fill();

    // Flame tongues: three layers, each with its own wobble and a notched
    // silhouette, so it never reads as a plain triangle.
    const flick = 0.78 + Math.sin(time * 11.3) * 0.11 + Math.sin(time * 6.7) * 0.08;
    const H = (15 + intensity * 11) * flick;
    const layers = [
        { c: "rgba(206,62,18,0.7)", w: 9.5, h: H, drift: 1.4, wob: 9.1 },
        { c: "rgba(244,128,30,0.85)", w: 6.6, h: H * 0.78, drift: 2.1, wob: 12.3 },
        { c: "rgba(255,222,150,0.9)", w: 3.6, h: H * 0.44, drift: 2.9, wob: 15.7 }
    ];
    for (const L of layers) {
        const lean = Math.sin(time * 5.5 + L.drift) * L.drift;
        ctx.fillStyle = L.c;
        ctx.beginPath();
        ctx.moveTo(-L.w, -1);
        // Left edge up to the tip, with a wobble that travels upward.
        for (let k = 1; k <= 5; k++) {
            const f = k / 5;
            const wob = Math.sin(time * L.wob - f * 5 + L.drift) * (1.1 + f * 1.6);
            ctx.lineTo(-L.w * (1 - f * 0.92) + wob + lean * f, -1 - L.h * f);
        }
        for (let k = 4; k >= 0; k--) {
            const f = k / 5;
            const wob = Math.sin(time * L.wob - f * 5 + L.drift + 1.7) * (1.1 + f * 1.6);
            ctx.lineTo(L.w * (1 - f * 0.92) + wob + lean * f, -1 - L.h * f);
        }
        ctx.quadraticCurveTo(0, 2, -L.w, -1);
        ctx.closePath();
        ctx.fill();
    }
    // A detached lick of flame, for life.
    const lickY = -H - 4 - ((time * 26) % 10);
    ctx.fillStyle = `rgba(255,170,60,${0.4 * intensity})`;
    ctx.beginPath();
    ctx.ellipse(Math.sin(time * 4) * 3, lickY, 1.8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
}

/** Something roasting on the spit. */
export function paintSpitItem(ctx, slotIndex, state, _emoji, itemId = "") {
    const x = slotIndex === 0 ? -7.5 : 7.5;
    const y = -17;
    ctx.save();
    ctx.translate(x, y);

    const fish = /fish/.test(itemId);
    const burnt = state === "burnt";
    const done = state === "done";
    const body = burnt ? "#2a2522" : done ? "#8a5a2e" : fish ? "#9fb0b8" : "#b4624f";
    const top = burnt ? "#3a3330" : done ? "#b07a3e" : fish ? "#c3d0d6" : "#cc7d66";

    if (fish) {
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = top;
        ctx.beginPath(); ctx.ellipse(-0.6, -0.7, 4.4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(8, -2.4); ctx.lineTo(8, 2.4); ctx.closePath(); ctx.fill();
    } else {
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(0, 0, 4.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = top;
        ctx.beginPath(); ctx.ellipse(-0.6, -1, 3.4, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Skewer through it.
    ctx.strokeStyle = "#6a5436"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-8, 0.5); ctx.lineTo(8, 0.5); ctx.stroke();
    if (done) {                                   // a little steam
        ctx.fillStyle = "rgba(255,240,210,0.35)";
        ctx.beginPath(); ctx.arc(0, -5, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}
