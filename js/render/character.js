/**
 * v3 render — procedural character sprite.
 *
 * Drawn from primitives so appearance (hair, clothes, skin) is data, not an
 * atlas: the same function will later draw settlers, travellers and raiders by
 * swapping the palette.
 *
 * Body layout, in world units, feet at the origin:
 *     y   0        ground / feet
 *       -9 .. 0    legs + boots
 *      -18 .. -8   torso (shoulders at -17)
 *      -26 .. -18  head
 *   The grip (where a tool sits) is at y ≈ -10.5, x ≈ ±6 — the end of the arm,
 *   NOT next to the face. Tools are real little drawings, not emoji glyphs.
 */

export const DEFAULT_LOOK = {
    skin: "#e2b48a",
    hair: "#4a3526",
    shirt: "#6d7f4a",
    pants: "#4a4034",
    cloak: null,
    hairStyle: "short"
};

const GRIP_Y = -10.5;

function shadeHex(hex, amount) {
    const c = hex.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amount)));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/**
 * @param {CanvasRenderingContext2D} ctx translated to the character's feet
 * @param {object} p { dir, anim, moving, look, actionTimer, tool, idleTime }
 */
export function drawCharacter(ctx, p) {
    const look = Object.assign({}, DEFAULT_LOOK, p.look || {});
    const dir = p.dir || "down";
    const t = p.anim || 0;
    const moving = !!p.moving;
    const breathe = Math.sin((p.idleTime || 0) * 1.8) * 0.3;
    const bob = moving ? Math.abs(Math.sin(t)) * 1.1 : breathe;
    const legSwing = moving ? Math.sin(t) * 3.4 : 0;
    const side = dir === "left" ? -1 : 1;
    const swing = p.actionTimer > 0 ? Math.sin(Math.min(1, 1 - p.actionTimer / 0.35) * Math.PI) : 0;

    const skinDark = shadeHex(look.skin, -28);
    const shirtDark = shadeHex(look.shirt, -22);
    const shirtLit = shadeHex(look.shirt, 20);
    const pantsDark = shadeHex(look.pants, -16);

    // Contact shadow — tighter and darker than a generic blob.
    ctx.fillStyle = "rgba(10,9,8,0.32)";
    ctx.beginPath(); ctx.ellipse(0.5, 0, 6.6, 2.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(10,9,8,0.18)";
    ctx.beginPath(); ctx.ellipse(0.5, 0, 8.6, 3.6, 0, 0, Math.PI * 2); ctx.fill();

    const back = (dir === "up");

    // Tool in the far hand goes behind the body when facing away.
    if (p.tool && back) drawHeldTool(ctx, p.tool, dir, side, swing, bob, true);

    /* ---- legs ---------------------------------------------------------- */
    const legL = -9 + bob, legH = 9;
    ctx.fillStyle = look.pants;
    ctx.fillRect(-3.9, legL, 3.5, legH - Math.max(0, legSwing) * 0.25);
    ctx.fillRect(0.5, legL, 3.5, legH - Math.max(0, -legSwing) * 0.25);
    ctx.fillStyle = pantsDark;
    ctx.fillRect(-3.9, legL, 1.2, legH - Math.max(0, legSwing) * 0.25);
    ctx.fillRect(2.8, legL, 1.2, legH - Math.max(0, -legSwing) * 0.25);
    // Boots.
    ctx.fillStyle = "#3a2d22";
    ctx.fillRect(-4.3, -2 + bob + Math.max(0, legSwing) * 0.2, 4.4, 2.2);
    ctx.fillRect(0.2, -2 + bob + Math.max(0, -legSwing) * 0.2, 4.4, 2.2);
    ctx.fillStyle = "#241b14";
    ctx.fillRect(-4.3, -0.4 + bob + Math.max(0, legSwing) * 0.2, 4.4, 0.8);
    ctx.fillRect(0.2, -0.4 + bob + Math.max(0, -legSwing) * 0.2, 4.4, 0.8);

    /* ---- torso --------------------------------------------------------- */
    const torsoTop = -18 + bob, torsoH = 10;
    ctx.fillStyle = look.shirt;
    ctx.fillRect(-5, torsoTop, 10, torsoH);
    ctx.fillStyle = shirtLit;                              // light from upper-left
    ctx.fillRect(-5, torsoTop, 2.4, torsoH - 2);
    ctx.fillStyle = shirtDark;
    ctx.fillRect(2.8, torsoTop, 2.2, torsoH);
    ctx.fillStyle = "rgba(0,0,0,0.18)";                    // shoulder line
    ctx.fillRect(-5, torsoTop, 10, 1);
    // Belt.
    ctx.fillStyle = "#4a3722";
    ctx.fillRect(-5, torsoTop + torsoH - 2, 10, 2);
    ctx.fillStyle = "#8a6a3c";
    ctx.fillRect(-1, torsoTop + torsoH - 2, 2, 2);
    if (look.cloak) {
        ctx.fillStyle = look.cloak;
        ctx.fillRect(-6.2, torsoTop - 0.5, 12.4, 7.5);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(2.6, torsoTop - 0.5, 3.6, 7.5);
    }

    /* ---- arms ---------------------------------------------------------- */
    const armTop = torsoTop + 1.5, armLen = 7.5;
    const armSwing = moving ? Math.sin(t) * 1.4 : 0;
    ctx.fillStyle = look.skin;
    if (dir === "left" || dir === "right") {
        // Near arm only; it reaches forward when acting.
        const ax = side > 0 ? 3.6 : -6.2;
        ctx.fillStyle = shirtDark;
        ctx.fillRect(ax, armTop, 2.6, 3);
        ctx.fillStyle = look.skin;
        ctx.fillRect(ax + side * swing * 1.4, armTop + 3, 2.6, armLen - 3 - swing * 2.5);
    } else {
        ctx.fillStyle = shirtDark;
        ctx.fillRect(-7.2, armTop, 2.6, 3);
        ctx.fillRect(4.6, armTop, 2.6, 3);
        ctx.fillStyle = look.skin;
        ctx.fillRect(-7.2, armTop + 3 + armSwing, 2.6, armLen - 3);
        ctx.fillStyle = skinDark;
        ctx.fillRect(-7.2, armTop + 3 + armSwing, 1, armLen - 3);
        ctx.fillStyle = look.skin;
        ctx.fillRect(4.6, armTop + 3 - armSwing - swing * 2.5, 2.6, armLen - 3);
    }

    /* ---- head ---------------------------------------------------------- */
    const headY = -26.5 + bob;
    const headH = 8.6;
    ctx.fillStyle = "rgba(0,0,0,0.16)";                     // neck shadow
    ctx.fillRect(-2.4, headY + headH - 0.6, 4.8, 1.6);
    ctx.fillStyle = look.skin;
    ctx.fillRect(-4.2, headY, 8.4, headH);
    ctx.fillStyle = skinDark;                               // cheek in shade
    ctx.fillRect(2.4, headY + 1, 1.8, headH - 1);
    ctx.fillStyle = shadeHex(look.skin, 16);
    ctx.fillRect(-4.2, headY + 1, 1.4, headH - 2);

    // Hair.
    const hairDark = shadeHex(look.hair, -22);
    ctx.fillStyle = look.hair;
    if (dir === "up") {
        ctx.fillRect(-4.6, headY - 0.8, 9.2, headH - 0.5);
        ctx.fillStyle = hairDark;
        ctx.fillRect(2.2, headY - 0.8, 2.4, headH - 0.5);
    } else {
        ctx.fillRect(-4.6, headY - 0.8, 9.2, 3.6);
        ctx.fillStyle = hairDark;
        ctx.fillRect(2.4, headY - 0.8, 2.2, 3.6);
        ctx.fillStyle = look.hair;
        if (look.hairStyle === "long") {
            ctx.fillRect(-5.4, headY, 1.8, 7.5);
            ctx.fillRect(3.6, headY, 1.8, 7.5);
        } else {
            ctx.fillRect(-5, headY + 0.6, 1.2, 2.6);
            ctx.fillRect(3.8, headY + 0.6, 1.2, 2.6);
        }
        ctx.fillStyle = shadeHex(look.hair, 24);            // highlight strand
        ctx.fillRect(-3.6, headY - 0.4, 3, 1.1);
    }

    // Face.
    if (dir !== "up") {
        ctx.fillStyle = "#2a211a";
        if (dir === "left") {
            ctx.fillRect(-3.4, headY + 4.6, 1.5, 1.7);
            ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(-4.2, headY + 7, 2.4, 0.9);
        } else if (dir === "right") {
            ctx.fillRect(1.9, headY + 4.6, 1.5, 1.7);
            ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(1.8, headY + 7, 2.4, 0.9);
        } else {
            ctx.fillRect(-2.8, headY + 4.6, 1.6, 1.7);
            ctx.fillRect(1.2, headY + 4.6, 1.6, 1.7);
            ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(-1, headY + 7.2, 2, 0.8);
        }
    }

    // Tool in the near hand, in front of the body.
    if (p.tool && !back) drawHeldTool(ctx, p.tool, dir, side, swing, bob, false);
}

/**
 * Draw the held tool at the hand. `dir` decides which side of the body the
 * grip sits on; the tool is rotated around the grip when swinging.
 */
function drawHeldTool(ctx, tool, dir, side, swing, bob, behind) {
    const gx = (dir === "down" ? 6.2 : dir === "up" ? -6.2 : side * 6.4);
    const gy = GRIP_Y + bob + (dir === "up" ? -0.5 : 0);
    const lean = dir === "up" ? -0.35 : dir === "down" ? 0.3 : side * 0.45;
    const angle = lean - side * swing * 1.9;

    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(angle);
    if (dir === "left") ctx.scale(-1, 1);          // mirror so tools face forward
    if (behind) ctx.globalAlpha = 0.9;

    const id = typeof tool === "string" ? tool : (tool.tool || tool.id || "");
    const itemId = typeof tool === "string" ? tool : (tool.id || "");
    switch (id) {
        case "axe": drawAxe(ctx, itemId.includes("iron")); break;
        case "pick": drawPick(ctx); break;
        case "knife": drawKnife(ctx); break;
        case "spear": drawSpear(ctx); break;
        case "rod": drawRod(ctx); break;
        case "hoe": drawHoe(ctx); break;
        case "torch": drawTorch(ctx); break;
        default: drawGeneric(ctx); break;
    }

    // The hand itself, over the handle, so the grip reads as a grip.
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e2b48a";
    ctx.fillRect(-1.5, -1.6, 3, 3.2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-1.5, 0.8, 3, 0.8);
    ctx.restore();
}

/* --- tool drawings: grip at (0,0), the business end points up ------------ */

function handle(ctx, len, w = 1.6, c = "#7a5a34") {
    ctx.fillStyle = c;
    ctx.fillRect(-w / 2, -len, w, len + 2.5);
    ctx.fillStyle = "rgba(255,230,190,0.25)";
    ctx.fillRect(-w / 2, -len, w * 0.4, len + 2.5);
}

function drawAxe(ctx, iron) {
    handle(ctx, 11);
    const head = iron ? "#b9c2cc" : "#9a9890";
    ctx.fillStyle = "#4a3a24";                   // binding
    ctx.fillRect(-1.6, -11.5, 3.2, 2);
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.moveTo(0.4, -13.5); ctx.lineTo(5.6, -12.2);
    ctx.lineTo(6.4, -8.6); ctx.lineTo(0.4, -8.4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";    // edge glint
    ctx.beginPath();
    ctx.moveTo(5.6, -12.2); ctx.lineTo(6.4, -8.6); ctx.lineTo(5.2, -8.8); ctx.lineTo(4.6, -11.8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0.4, -9.4, 5.4, 1);
}

function drawPick(ctx) {
    handle(ctx, 11);
    ctx.fillStyle = "#8d8b84";
    ctx.beginPath();
    ctx.moveTo(-6.5, -9.6); ctx.quadraticCurveTo(0, -14.2, 6.5, -9.6);
    ctx.quadraticCurveTo(0, -11.8, -6.5, -9.6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(-6.4, -10.2, 2, 1);
    ctx.fillRect(4.4, -10.2, 2, 1);
}

function drawKnife(ctx) {
    // A short blade in the fist: handle through the hand, blade above it.
    ctx.fillStyle = "#5a3f26";
    ctx.fillRect(-1.1, -2.6, 2.2, 5);
    ctx.fillStyle = "#3c2a19";
    ctx.fillRect(-1.1, -2.6, 0.8, 5);
    ctx.fillStyle = "#6d5536";                   // guard
    ctx.fillRect(-2, -3.6, 4, 1.2);
    ctx.fillStyle = "#c9ced6";                   // blade
    ctx.beginPath();
    ctx.moveTo(-1.3, -3.6); ctx.lineTo(1.3, -3.6);
    ctx.lineTo(1.5, -9.6); ctx.lineTo(0, -11.4); ctx.lineTo(-1.3, -9.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(0.3, -10, 0.8, 6);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(-1.3, -9.4, 0.8, 5.6);
}

function drawSpear(ctx) {
    handle(ctx, 17, 1.4, "#6e5331");
    ctx.fillStyle = "#4a3a24";
    ctx.fillRect(-1.2, -17.5, 2.4, 1.6);
    ctx.fillStyle = "#cfd6de";
    ctx.beginPath();
    ctx.moveTo(0, -23.5); ctx.lineTo(2.2, -17.8); ctx.lineTo(0, -16.6); ctx.lineTo(-2.2, -17.8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.moveTo(0, -23.5); ctx.lineTo(0.9, -18); ctx.lineTo(0, -17.2);
    ctx.closePath(); ctx.fill();
}

function drawRod(ctx) {
    ctx.strokeStyle = "#7a5a34"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.quadraticCurveTo(-1, -9, -5, -18);
    ctx.stroke();
    ctx.strokeStyle = "rgba(240,240,240,0.55)"; ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-5, -18); ctx.quadraticCurveTo(-7.5, -12, -7, -5);
    ctx.stroke();
    ctx.fillStyle = "#d8d8d8";
    ctx.beginPath(); ctx.arc(-7, -4.4, 0.9, 0, Math.PI * 2); ctx.fill();
}

function drawHoe(ctx) {
    handle(ctx, 13);
    ctx.fillStyle = "#8d8b84";
    ctx.fillRect(-0.8, -13.6, 6.4, 1.8);
    ctx.fillRect(4.4, -13.6, 1.8, 4.2);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(-0.8, -13.6, 6.4, 0.6);
}

function drawTorch(ctx) {
    ctx.fillStyle = "#5e4228";
    ctx.fillRect(-1.3, -11, 2.6, 13);
    ctx.fillStyle = "#3f2c18";
    ctx.fillRect(0.4, -11, 0.9, 13);
    ctx.fillStyle = "#2a211a";                  // pitch-soaked rag
    ctx.fillRect(-2.2, -13.5, 4.4, 3);
    ctx.fillStyle = "rgba(255,120,40,0.85)";
    ctx.beginPath();
    ctx.moveTo(-2.6, -13); ctx.quadraticCurveTo(0, -22, 2.6, -13);
    ctx.quadraticCurveTo(0, -11.5, -2.6, -13);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,220,140,0.9)";
    ctx.beginPath();
    ctx.moveTo(-1.2, -13.5); ctx.quadraticCurveTo(0, -18.5, 1.2, -13.5);
    ctx.quadraticCurveTo(0, -12.6, -1.2, -13.5);
    ctx.closePath(); ctx.fill();
}

function drawGeneric(ctx) {
    ctx.fillStyle = "#6a5a44";
    ctx.fillRect(-1.2, -8, 2.4, 10);
    ctx.fillStyle = "#8a7a60";
    ctx.fillRect(-2.4, -10.5, 4.8, 3);
}

/** Sleeping hero: a bedroll lump with zzz, drawn inside the tent. */
export function drawSleeping(ctx, time) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    const breathe = Math.sin(time * 1.2) * 0.4;
    ctx.fillStyle = "#6d5e48";
    ctx.beginPath(); ctx.ellipse(0, -4, 11.5, 5.4 + breathe, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7f6e54";
    ctx.beginPath(); ctx.ellipse(-1, -5.4, 9.5, 3.8 + breathe, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(4, -3.4, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e2b48a";
    ctx.beginPath(); ctx.arc(-9.5, -5.5, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4a3526";
    ctx.beginPath(); ctx.arc(-10.6, -6.6, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "7px serif";
    const n = Math.floor(time) % 3;
    for (let i = 0; i <= n; i++) ctx.fillText("z", 6 + i * 4, -13 - i * 5);
}
