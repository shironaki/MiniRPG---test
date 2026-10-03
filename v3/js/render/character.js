/**
 * v3 render — procedural character sprite.
 *
 * Drawn from primitives so appearance (hair, clothes, skin) is data, not an
 * atlas: the same function will later draw settlers, travellers and raiders by
 * swapping the palette.
 */

export const DEFAULT_LOOK = {
    skin: "#e2b48a",
    hair: "#4a3526",
    shirt: "#6d7f4a",
    pants: "#4a4034",
    cloak: null,
    hairStyle: "short"
};

/**
 * @param {CanvasRenderingContext2D} ctx translated to the character's feet
 * @param {object} p { dir, anim, moving, look, carrying, actionTimer, actionKind }
 */
export function drawCharacter(ctx, p) {
    const look = Object.assign({}, DEFAULT_LOOK, p.look || {});
    const dir = p.dir || "down";
    const t = p.anim || 0;
    const moving = !!p.moving;
    const bob = moving ? Math.sin(t) * 1.2 : Math.sin((p.idleTime || 0) * 2) * 0.35;
    const legSwing = moving ? Math.sin(t) * 3.2 : 0;

    // Shadow.
    ctx.fillStyle = "rgba(0,0,0,0.26)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const H = 26;              // total height in world units
    const baseY = -H + bob;

    // Legs.
    ctx.fillStyle = look.pants;
    ctx.fillRect(-4, -9 + bob, 3.4, 9 + legSwing * 0.3);
    ctx.fillRect(0.6, -9 + bob, 3.4, 9 - legSwing * 0.3);
    ctx.fillStyle = "#3a2d22";
    ctx.fillRect(-4.2, -1.6 + bob + Math.max(0, legSwing) * 0.2, 4, 2);
    ctx.fillRect(0.4, -1.6 + bob + Math.max(0, -legSwing) * 0.2, 4, 2);

    // Torso.
    ctx.fillStyle = look.shirt;
    ctx.fillRect(-5, baseY + 9, 10, 10);
    ctx.fillStyle = shadeHex(look.shirt, -18);
    ctx.fillRect(-5, baseY + 9, 2.6, 10);
    if (look.cloak) {
        ctx.fillStyle = look.cloak;
        ctx.fillRect(-6, baseY + 8.5, 12, 7);
    }

    // Arms (the swinging one tracks the tool animation).
    const swing = p.actionTimer > 0 ? Math.sin((1 - p.actionTimer / 0.35) * Math.PI) : 0;
    ctx.fillStyle = look.skin;
    const armY = baseY + 11;
    if (dir === "left") {
        ctx.fillRect(-7, armY, 2.6, 7 - swing * 3);
    } else if (dir === "right") {
        ctx.fillRect(4.4, armY, 2.6, 7 - swing * 3);
    } else {
        ctx.fillRect(-7, armY + (moving ? Math.sin(t) : 0), 2.6, 7);
        ctx.fillRect(4.4, armY - (moving ? Math.sin(t) : 0) - swing * 3, 2.6, 7);
    }

    // Head.
    const headY = baseY + 1;
    ctx.fillStyle = look.skin;
    ctx.fillRect(-4.2, headY, 8.4, 8.4);
    // Hair.
    ctx.fillStyle = look.hair;
    if (dir === "up") {
        ctx.fillRect(-4.6, headY - 0.6, 9.2, 7);
    } else {
        ctx.fillRect(-4.6, headY - 0.6, 9.2, 3.4);
        if (look.hairStyle === "long") {
            ctx.fillRect(-5.2, headY, 1.6, 7);
            ctx.fillRect(3.6, headY, 1.6, 7);
        }
    }
    // Eyes.
    if (dir !== "up") {
        ctx.fillStyle = "#2a211a";
        if (dir === "left") ctx.fillRect(-3, headY + 4.4, 1.5, 1.6);
        else if (dir === "right") ctx.fillRect(1.6, headY + 4.4, 1.5, 1.6);
        else { ctx.fillRect(-2.6, headY + 4.4, 1.5, 1.6); ctx.fillRect(1.2, headY + 4.4, 1.5, 1.6); }
    }

    // Held tool, swinging.
    if (p.toolEmoji) {
        ctx.save();
        const hx = dir === "left" ? -9 : dir === "right" ? 9 : 7;
        ctx.translate(hx, baseY + 13);
        ctx.rotate((dir === "left" ? 1 : -1) * (0.5 - swing * 1.5));
        ctx.font = "10px serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.toolEmoji, 0, 0);
        ctx.restore();
    }
}

function shadeHex(hex, amount) {
    const c = hex.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    const f = (v) => Math.max(0, Math.min(255, v + amount));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Sleeping hero: a bedroll lump with zzz, drawn inside the tent. */
export function drawSleeping(ctx, time) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7a6a52";
    ctx.beginPath(); ctx.ellipse(0, -4, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e2b48a";
    ctx.beginPath(); ctx.arc(-9, -5, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "8px serif";
    const n = Math.floor(time) % 3;
    for (let i = 0; i <= n; i++) ctx.fillText("z", 6 + i * 4, -12 - i * 5);
}
