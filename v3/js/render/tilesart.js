/**
 * v3 render — procedural tile and prop art.
 *
 * No image assets: every tile and every tree is drawn from code into an
 * offscreen canvas, which keeps the repo tiny and lets biomes recolour
 * themselves per season. Ground is baked per 16×16 chunk, so these functions
 * run once per chunk, not once per frame.
 */
import { T, TILES, tileInfo } from "../world/tiles.js";

/** Cheap deterministic hash → [0,1), used for speckles and prop variation. */
function h(x, y, s = 0) {
    let n = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
    n = (n ^ (n >>> 13)) * 1274126177 | 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function shade(hex, amount) {
    const c = hex.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amount)));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Seasonal recolouring of the ground palette. */
export function seasonTint(season) {
    switch (season) {
        case "summer": return { r: 6, g: 8, b: -6 };
        case "autumn": return { r: 26, g: 2, b: -18 };
        case "winter": return { r: 18, g: 22, b: 30 };
        default: return { r: 0, g: 4, b: 0 };
    }
}

/**
 * Paint a single ground tile with texture.
 * @param {CanvasRenderingContext2D} ctx
 */
export function paintTile(ctx, id, px, py, size, tx, ty, season = "spring") {
    const info = tileInfo(id);
    const [base, dark, light] = info.colors;
    const tint = seasonTint(season);

    ctx.fillStyle = base;
    ctx.fillRect(px, py, size, size);

    // Soft patchiness: two large blotches per tile, deterministic per coord.
    const blotch = h(tx, ty, 11);
    if (blotch > 0.55) {
        ctx.fillStyle = shade(base, 8);
        ctx.globalAlpha = 0.35;
        ctx.fillRect(px + size * h(tx, ty, 3) * 0.4, py + size * h(tx, ty, 4) * 0.4, size * 0.6, size * 0.6);
        ctx.globalAlpha = 1;
    }

    // Per-tile speckle texture — the thing that makes flat colour look like ground.
    const grains = info.liquid ? 3 : 7;
    for (let i = 0; i < grains; i++) {
        const gx = px + Math.floor(h(tx, ty, i * 7 + 1) * size);
        const gy = py + Math.floor(h(tx, ty, i * 13 + 2) * size);
        const pick = h(tx, ty, i * 17 + 5);
        ctx.fillStyle = pick > 0.6 ? light : dark;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(gx, gy, pick > 0.9 ? 2 : 1, pick > 0.9 ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    // Water gets horizontal ripple bands; snow gets a cold sheen.
    if (info.liquid) {
        ctx.fillStyle = light;
        ctx.globalAlpha = 0.18;
        for (let i = 0; i < 2; i++) {
            const ry = py + 6 + i * 11 + Math.floor(h(tx, ty, i) * 4);
            ctx.fillRect(px + 2, ry, size - 4, 1);
        }
        ctx.globalAlpha = 1;
    }
    if (id === T.SNOW) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(px, py, size, 2);
    }
    if (id === T.PATH || id === T.COBBLE) {
        ctx.strokeStyle = shade(dark, -8);
        ctx.globalAlpha = 0.25;
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
        ctx.globalAlpha = 1;
    }
    if (tint && (id === T.GRASS || id === T.MEADOW)) {
        ctx.fillStyle = `rgba(${128 + tint.r},${128 + tint.g},${128 + tint.b},0.10)`;
        ctx.fillRect(px, py, size, size);
    }
}

/**
 * Blend the seam between two different ground types: a dithered fringe of the
 * neighbour's colour. Cheap substitute for a full autotile set, and it reads
 * surprisingly well at 32 px.
 */
export function paintEdges(ctx, map, tx, ty, px, py, size) {
    const here = map.get(tx, ty);
    const dirs = [[0, -1, "n"], [1, 0, "e"], [0, 1, "s"], [-1, 0, "w"]];
    for (const [dx, dy, side] of dirs) {
        const other = map.get(tx + dx, ty + dy);
        if (other === here || other === T.VOID) continue;
        const info = tileInfo(other);
        if (info.solid && !info.liquid) continue;
        ctx.fillStyle = info.colors[0];
        ctx.globalAlpha = 0.45;
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const jag = 2 + Math.floor(h(tx * 7 + i, ty * 13, side.charCodeAt(0)) * 4);
            if (side === "n") ctx.fillRect(px + t * size, py, size / steps, jag);
            if (side === "s") ctx.fillRect(px + t * size, py + size - jag, size / steps, jag);
            if (side === "w") ctx.fillRect(px, py + t * size, jag, size / steps);
            if (side === "e") ctx.fillRect(px + size - jag, py + t * size, jag, size / steps);
        }
        ctx.globalAlpha = 1;
    }
}

/* ===========================================================================
 * Props — drawn every frame, y-sorted with the characters.
 * Each function draws around (0,0) at the object's base (feet).
 * ======================================================================== */

function drawShadow(ctx, w, h2, alpha = 0.22) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h2, 0, 0, Math.PI * 2);
    ctx.fill();
}

function conifer(ctx, obj, colors) {
    const s = obj.size || 1;
    const H = 44 * s;
    drawShadow(ctx, 11 * s, 4 * s);
    ctx.fillStyle = "#5a4328";
    ctx.fillRect(-2.5 * s, -12 * s, 5 * s, 12 * s);
    ctx.fillStyle = "#4a3620";
    ctx.fillRect(-2.5 * s, -12 * s, 1.5 * s, 12 * s);
    const tiers = 4;
    for (let i = 0; i < tiers; i++) {
        const t = i / (tiers - 1);
        const w = (16 - t * 9) * s;
        const y = -10 * s - t * (H - 16 * s);
        ctx.fillStyle = i % 2 ? colors[1] : colors[0];
        ctx.beginPath();
        ctx.moveTo(0, y - 13 * s);
        ctx.lineTo(w, y + 2 * s);
        ctx.lineTo(w * 0.45, y + 1 * s);
        ctx.lineTo(w * 0.6, y + 6 * s);
        ctx.lineTo(-w * 0.6, y + 6 * s);
        ctx.lineTo(-w * 0.45, y + 1 * s);
        ctx.lineTo(-w, y + 2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = colors[2];
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y - 13 * s);
        ctx.lineTo(w * 0.42, y + 1 * s);
        ctx.lineTo(0, y + 1 * s);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function broadleaf(ctx, obj, colors, trunkColor = "#6b4f2e") {
    const s = obj.size || 1;
    drawShadow(ctx, 14 * s, 5 * s);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(-3 * s, -16 * s, 6 * s, 16 * s);
    ctx.fillStyle = shade(trunkColor, -22);
    ctx.fillRect(-3 * s, -16 * s, 2 * s, 16 * s);
    // Root flare.
    ctx.fillRect(-6 * s, -3 * s, 3 * s, 3 * s);
    ctx.fillRect(3 * s, -3 * s, 3 * s, 3 * s);
    // Crown: three overlapping blobs for volume.
    const blobs = [[0, -34, 17], [-11, -27, 12], [11, -27, 12]];
    for (let i = 0; i < blobs.length; i++) {
        const [bx, by, br] = blobs[i];
        ctx.fillStyle = i === 0 ? colors[0] : colors[1];
        ctx.beginPath();
        ctx.ellipse(bx * s, by * s, br * s, br * 0.86 * s, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = colors[2];
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(-5 * s, -38 * s, 8 * s, 6 * s, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

const TREE_COLORS = {
    pine: ["#2f5134", "#26432b", "#3f6a44"],
    spruce: ["#294a31", "#213c28", "#39603e"],
    oak: ["#3f6b33", "#365b2c", "#55873f"],
    birch: ["#5c8b3f", "#4d7635", "#74a44f"],
    willow: ["#4e6b36", "#41592d", "#657f45"],
    palm: ["#3c7a4a", "#326540", "#4f9a5e"],
    ancient_oak: ["#2f5b2c", "#275024", "#447a3a"]
};

export function paintProp(ctx, obj, time = 0, season = "spring") {
    const kind = obj.kind;
    const s = obj.size || 1;
    // Wind sway: trees lean gently, nothing else moves.
    const sway = (TREE_COLORS[kind] ? Math.sin(time * 0.9 + obj.tx * 0.7 + obj.ty * 0.3) * 0.018 : 0);
    if (sway) { ctx.translate(0, 0); ctx.transform(1, 0, sway, 1, 0, 0); }

    switch (kind) {
        case "pine": case "spruce":
            conifer(ctx, obj, TREE_COLORS[kind]); break;
        case "oak": case "birch": case "willow": case "ancient_oak": {
            const colors = season === "autumn" && kind !== "ancient_oak"
                ? ["#9a6b2c", "#875c25", "#c08c3c"] : TREE_COLORS[kind];
            broadleaf(ctx, obj, colors, kind === "birch" ? "#d8d4c6" : "#6b4f2e");
            break;
        }
        case "palm": {
            drawShadow(ctx, 10 * s, 4 * s);
            ctx.strokeStyle = "#8a6a3c"; ctx.lineWidth = 4 * s;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(5 * s, -20 * s, 2 * s, -34 * s); ctx.stroke();
            ctx.fillStyle = TREE_COLORS.palm[0];
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.ellipse(2 * s + Math.cos(a) * 11 * s, -34 * s + Math.sin(a) * 6 * s, 10 * s, 4 * s, a, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
        case "dead_tree": {
            drawShadow(ctx, 9 * s, 3 * s);
            ctx.strokeStyle = "#6a5a48"; ctx.lineWidth = 3.5 * s; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-1 * s, -30 * s); ctx.stroke();
            ctx.lineWidth = 2 * s;
            ctx.beginPath(); ctx.moveTo(-1 * s, -20 * s); ctx.lineTo(-10 * s, -27 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-1 * s, -24 * s); ctx.lineTo(9 * s, -31 * s); ctx.stroke();
            break;
        }
        case "burnt_tree": {
            drawShadow(ctx, 9 * s, 3 * s, 0.3);
            ctx.strokeStyle = "#2e2724"; ctx.lineWidth = 4 * s; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2 * s, -26 * s); ctx.stroke();
            ctx.lineWidth = 2 * s; ctx.strokeStyle = "#241f1c";
            ctx.beginPath(); ctx.moveTo(1 * s, -17 * s); ctx.lineTo(-8 * s, -23 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2 * s, -21 * s); ctx.lineTo(10 * s, -24 * s); ctx.stroke();
            break;
        }
        case "burnt_stump": {
            drawShadow(ctx, 8, 3, 0.3);
            ctx.fillStyle = "#2b2522"; ctx.fillRect(-7, -9, 14, 9);
            ctx.fillStyle = "#171412"; ctx.fillRect(-7, -9, 14, 3);
            ctx.fillStyle = "#3d3430"; ctx.fillRect(-5, -7, 3, 5);
            break;
        }
        case "burnt_beam": {
            drawShadow(ctx, 12, 3, 0.25);
            ctx.save(); ctx.rotate(-0.25);
            ctx.fillStyle = "#2a2421"; ctx.fillRect(-13, -7, 26, 7);
            ctx.fillStyle = "#3a322d"; ctx.fillRect(-13, -7, 26, 2);
            ctx.restore();
            break;
        }
        case "rock": case "ore_rock": {
            drawShadow(ctx, 11, 4);
            const c = kind === "ore_rock" ? "#6e6a63" : "#7b7a78";
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.moveTo(-11, 0); ctx.lineTo(-8, -11); ctx.lineTo(-1, -15);
            ctx.lineTo(7, -12); ctx.lineTo(11, -3); ctx.lineTo(8, 0);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = shade(c, 22);
            ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-1, -14); ctx.lineTo(2, -9); ctx.closePath(); ctx.fill();
            if (obj.ore) {
                const oreColors = { copper: "#c87b3a", iron: "#b8c0c8", coal: "#2f2d2c", gem: "#5ad2e6" };
                ctx.fillStyle = oreColors[obj.ore] || "#c0c0c0";
                ctx.fillRect(-4, -9, 3, 3); ctx.fillRect(3, -7, 3, 3); ctx.fillRect(-1, -5, 2, 2);
            }
            break;
        }
        case "ruin_wall": {
            drawShadow(ctx, 12, 4, 0.25);
            ctx.fillStyle = "#6d675f"; ctx.fillRect(-12, -18, 24, 18);
            ctx.fillStyle = "#565049";
            for (let i = 0; i < 4; i++) ctx.fillRect(-12, -18 + i * 5, 24, 1);
            ctx.fillStyle = "#3a3531"; ctx.fillRect(-12, -18, 24, 3);
            ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(4, -14, 7, 8);
            break;
        }
        case "bush": {
            drawShadow(ctx, 9, 3);
            const g = season === "autumn" ? ["#8a6a2c", "#6f5423"] : ["#3f6b33", "#345a2a"];
            ctx.fillStyle = g[0];
            ctx.beginPath(); ctx.ellipse(0, -7, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = g[1];
            ctx.beginPath(); ctx.ellipse(-4, -5, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
            if (obj.berries) {
                ctx.fillStyle = "#8e3b6b";
                ctx.fillRect(-5, -9, 2, 2); ctx.fillRect(3, -7, 2, 2); ctx.fillRect(0, -12, 2, 2);
            }
            break;
        }
        case "herb": {
            ctx.strokeStyle = "#6f9a4a"; ctx.lineWidth = 1.5;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath(); ctx.moveTo(i * 3, 0); ctx.quadraticCurveTo(i * 6, -6, i * 4, -11); ctx.stroke();
            }
            ctx.fillStyle = obj.herbType === "yarrow" ? "#f0eddd" : obj.herbType === "sage" ? "#b9c9a0" : "#9fd27a";
            ctx.fillRect(-2, -13, 4, 3);
            break;
        }
        case "firewood": {
            ctx.fillStyle = "#7a5a34";
            ctx.save(); ctx.rotate(0.3); ctx.fillRect(-8, -3, 16, 3); ctx.restore();
            ctx.save(); ctx.rotate(-0.4); ctx.fillRect(-7, -5, 14, 3); ctx.restore();
            ctx.fillStyle = "#99753f"; ctx.fillRect(-6, -6, 3, 2);
            break;
        }
        case "reed": {
            ctx.strokeStyle = "#6f8a3f"; ctx.lineWidth = 1.5;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 3, 0);
                ctx.quadraticCurveTo(i * 4 + Math.sin(time + i) * 2, -9, i * 4, -16);
                ctx.stroke();
            }
            break;
        }
        case "grass_tuft": {
            ctx.strokeStyle = season === "winter" ? "#9fb0b8" : "#6f9a4a";
            ctx.lineWidth = 1.4;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 2.5, 0);
                ctx.quadraticCurveTo(i * 4 + Math.sin(time * 1.3 + i + obj.tx) * 1.5, -5, i * 5, -9);
                ctx.stroke();
            }
            break;
        }
        case "flower": {
            ctx.strokeStyle = "#5f8a3f"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -8); ctx.stroke();
            const colors = ["#e8d05a", "#d96a8a", "#8aa8e8", "#f0f0f0"];
            ctx.fillStyle = colors[obj.variant % colors.length];
            ctx.beginPath(); ctx.arc(0, -10, 2.6, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case "driftwood": {
            ctx.fillStyle = "#a8977e";
            ctx.save(); ctx.rotate(-0.2); ctx.fillRect(-11, -4, 22, 4); ctx.restore();
            break;
        }
        case "tent": {
            drawShadow(ctx, 20, 6, 0.26);
            ctx.fillStyle = "#6a5a42";
            ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, -26); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#7d6b4e";
            ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, -26); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#2b2219";
            ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -15); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#4a3c2a"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-24, 3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(24, 3); ctx.stroke();
            break;
        }
        case "hearth_ruin": {
            drawShadow(ctx, 14, 5, 0.26);
            ctx.fillStyle = "#6a635b"; ctx.fillRect(-13, -20, 26, 20);
            ctx.fillStyle = "#514b45";
            for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ctx.fillRect(-12 + j * 9, -19 + i * 5, 8, 4);
            ctx.fillStyle = "#1b1613"; ctx.fillRect(-6, -11, 12, 11);
            ctx.fillStyle = "#3a322d"; ctx.fillRect(-13, -23, 26, 3);
            break;
        }
        case "diary": {
            ctx.fillStyle = "#6b5334"; ctx.fillRect(-6, -4, 12, 4);
            ctx.fillStyle = "#d8cba8"; ctx.fillRect(-5, -6, 10, 2);
            ctx.fillStyle = "#2a211a"; ctx.fillRect(-6, -6, 4, 2);
            break;
        }
        case "chest_old": {
            drawShadow(ctx, 11, 4);
            ctx.fillStyle = "#6a4f2e"; ctx.fillRect(-11, -13, 22, 13);
            ctx.fillStyle = "#8a6a3c"; ctx.fillRect(-11, -13, 22, 4);
            ctx.fillStyle = "#4a4a52"; ctx.fillRect(-2, -8, 4, 5);
            break;
        }
        case "campfire": {
            // Drawn by the renderer with live flames; here only the stone ring.
            ctx.fillStyle = "#4d4842";
            for (let i = 0; i < 7; i++) {
                const a = (i / 7) * Math.PI * 2;
                ctx.beginPath();
                ctx.ellipse(Math.cos(a) * 13, Math.sin(a) * 6, 4, 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = "#3b3631";
            ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }
        default: {
            ctx.fillStyle = "#8a7a6a";
            ctx.fillRect(-5, -8, 10, 8);
        }
    }
}

/** Animated flames for a lit campfire, drawn after the ring. */
export function paintFlames(ctx, intensity, time) {
    if (intensity <= 0) {
        ctx.fillStyle = "rgba(60,54,48,0.9)";
        ctx.fillRect(-5, -4, 10, 3);
        return;
    }
    // Logs.
    ctx.fillStyle = "#5a3f22";
    ctx.save(); ctx.rotate(0.35); ctx.fillRect(-9, -4, 18, 3.5); ctx.restore();
    ctx.save(); ctx.rotate(-0.35); ctx.fillRect(-9, -4, 18, 3.5); ctx.restore();

    const flick = 0.75 + Math.sin(time * 11) * 0.12 + Math.sin(time * 6.3) * 0.1;
    const H = (14 + intensity * 12) * flick;
    const layers = [
        { c: "rgba(255,140,40,0.95)", w: 7, h: H },
        { c: "rgba(255,196,80,0.95)", w: 4.5, h: H * 0.72 },
        { c: "rgba(255,240,190,0.95)", w: 2.4, h: H * 0.42 }
    ];
    for (const L of layers) {
        ctx.fillStyle = L.c;
        ctx.beginPath();
        ctx.moveTo(-L.w, -2);
        ctx.quadraticCurveTo(-L.w * 0.6, -L.h * 0.6, Math.sin(time * 7) * 1.6, -L.h);
        ctx.quadraticCurveTo(L.w * 0.6, -L.h * 0.6, L.w, -2);
        ctx.closePath();
        ctx.fill();
    }
    // Embers glow on the ground.
    ctx.fillStyle = `rgba(255,120,40,${0.25 * intensity})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
}

/** Item cooking on the spit above a fire. */
export function paintSpitItem(ctx, slotIndex, state, emoji) {
    const x = slotIndex === 0 ? -7 : 7;
    const y = -18;
    ctx.save();
    ctx.translate(x, y);
    ctx.font = "9px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (state === "burnt") ctx.filter = "grayscale(1) brightness(0.4)";
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
}

export { shade };
