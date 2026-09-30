/*
 * v2 procedural character rig ("paper doll").
 *
 * The hero is NOT a flat picture. It is assembled every frame from parts —
 * head, torso, two arms, two legs — drawn as outlined capsules whose joints
 * rotate to produce a real walk cycle. Benefits over a sprite sheet:
 *   - animates in ALL directions (down / up / left / right), no extra art;
 *   - equipment is just extra draw layers (weapon, later: helmet/armor/cape),
 *     so a new item is DATA, never a regenerated image;
 *   - limbs are continuous vector shapes, so nothing "clips" or slices.
 *
 * Entry point: CharacterRig.draw(ctx, opts)
 *   opts = { x, y, H, facing, phase, moving, now, look }
 *     x,y    feet anchor (bottom-centre) in canvas pixels
 *     H      target character height in pixels
 *     facing "down" | "up" | "left" | "right"
 *     phase  continuous walk phase in radians (advances while moving)
 *     moving boolean
 *     now    Date.now() (for idle breathing); optional
 *     look   appearance + equipment overrides (all optional)
 */
(function (global) {
    "use strict";

    const DEFAULT_LOOK = {
        skin: "#eab98c", skinSh: "#c9905f",
        hair: "#6b4327", hairSh: "#4c2f1a",
        shirt: "#7b4fd0", shirtSh: "#5a37a0",
        belt: "#4a3320",
        pants: "#3b3654", pantsSh: "#2a2740",
        boot: "#5c3d22", bootSh: "#3f2a17",
        outline: "#241826",
        eye: "#22303a",
        // Equipment layers — proof that gear needs no new images. Set null to hide.
        weapon: "sword",
        blade: "#dfe3ec", edge: "#b9c0cf", hilt: "#caa24a",
    };

    function draw(ctx, o) {
        const H = o.H;
        const facing = o.facing || "down";
        const moving = !!o.moving;
        const p = o.phase || 0;
        const now = o.now || 0;
        const L = Object.assign({}, DEFAULT_LOOK, o.look || {});
        const OL = Math.max(1.6, H * 0.022); // outline thickness added around fills

        // ---- proportions (fractions of H; feet baseline at local y = 0) ------
        const hipY = -0.42 * H, shoulderY = -0.74 * H;
        const headCY = -0.88 * H, headR = 0.125 * H;
        const hipHalf = 0.075 * H, shHalf = 0.11 * H;
        const thigh = 0.20 * H, shin = 0.21 * H;
        const uArm = 0.155 * H, fArm = 0.15 * H;
        const legW = 0.12 * H, armW = 0.085 * H;

        // ---- tiny drawing helpers -------------------------------------------
        function cap(x1, y1, x2, y2, w, color) {
            ctx.lineCap = "round";
            ctx.strokeStyle = L.outline; ctx.lineWidth = w + OL;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.strokeStyle = color; ctx.lineWidth = w;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        function dot(x, y, r, color) {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        // two-segment limb (thigh+shin / upper+fore). Returns joint positions.
        function limb(hx, hy, l1, l2, a1, bend, w, color, endColor, footLen, footColor) {
            const kx = hx + Math.sin(a1) * l1, ky = hy + Math.cos(a1) * l1;
            const a2 = a1 + bend;
            const ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
            cap(hx, hy, kx, ky, w, color);
            cap(kx, ky, ex, ey, w * 0.9, endColor);
            if (footLen) { // a boot/hand pointing "forward" (+x local)
                cap(ex, ey, ex + footLen, ey, w * 0.95, footColor || endColor);
            }
            return { kx, ky, ex, ey, a2 };
        }
        function torso() {
            // filled, slightly tapered capsule from hips to shoulders + belt
            ctx.strokeStyle = L.outline; ctx.lineCap = "round";
            ctx.lineWidth = 0.30 * H + OL;
            ctx.beginPath(); ctx.moveTo(lean * 0.4, hipY + 0.02 * H);
            ctx.lineTo(lean, shoulderY); ctx.stroke();
            ctx.strokeStyle = L.shirt; ctx.lineWidth = 0.30 * H;
            ctx.beginPath(); ctx.moveTo(lean * 0.4, hipY + 0.02 * H);
            ctx.lineTo(lean, shoulderY); ctx.stroke();
            // belt
            ctx.strokeStyle = L.belt; ctx.lineWidth = 0.30 * H;
            ctx.lineCap = "butt";
            ctx.beginPath();
            ctx.moveTo(lean * 0.4 - 0.16 * H, hipY - 0.01 * H);
            ctx.lineTo(lean * 0.4 + 0.16 * H, hipY - 0.01 * H); ctx.stroke();
            ctx.lineCap = "round";
        }
        function head(showFace, profile, backOnly) {
            const hx = lean * 1.1, hy = headCY + bob * 0.4;
            // skin
            ctx.fillStyle = L.outline;
            ctx.beginPath(); ctx.arc(hx, hy, headR + OL * 0.6, 0, Math.PI * 2); ctx.fill();
            dot(hx, hy, headR, L.skin);
            if (backOnly) {
                dot(hx, hy, headR, L.hair); // full back of head is hair
                dot(hx, hy, headR * 0.98, L.hair);
                return;
            }
            // hair cap (top half)
            ctx.fillStyle = L.hair;
            ctx.beginPath();
            ctx.arc(hx, hy - headR * 0.05, headR, Math.PI, 2 * Math.PI); ctx.fill();
            if (profile) {
                // side hair to the back + one eye + nose toward +x
                ctx.fillStyle = L.hair;
                ctx.beginPath();
                ctx.arc(hx - headR * 0.35, hy, headR * 0.85, Math.PI * 0.2, Math.PI * 1.5);
                ctx.fill();
                dot(hx + headR * 0.30, hy + headR * 0.05, headR * 0.13, L.eye);
                // nose
                ctx.fillStyle = L.skinSh;
                ctx.beginPath();
                ctx.moveTo(hx + headR * 0.85, hy + headR * 0.02);
                ctx.lineTo(hx + headR * 1.05, hy + headR * 0.18);
                ctx.lineTo(hx + headR * 0.80, hy + headR * 0.22);
                ctx.closePath(); ctx.fill();
            } else if (showFace) {
                dot(hx - headR * 0.34, hy + headR * 0.10, headR * 0.14, L.eye);
                dot(hx + headR * 0.34, hy + headR * 0.10, headR * 0.14, L.eye);
            }
        }
        function backSword() {
            if (L.weapon !== "sword") return;
            // sheathed diagonally across the back (behind the torso)
            const x1 = -0.14 * H, y1 = shoulderY + 0.02 * H;
            const x2 = 0.16 * H, y2 = hipY + 0.05 * H;
            cap(x1, y1, x2, y2, 0.05 * H, L.hilt);
            cap((x1 + x2) / 2, (y1 + y2) / 2, x2, y2, 0.055 * H, L.blade);
        }
        function handSword(hx, hy, ang) {
            if (L.weapon !== "sword") return;
            const bx = hx + Math.sin(ang) * 0.05 * H, by = hy + Math.cos(ang) * 0.05 * H;
            const tx = bx + Math.sin(ang) * 0.34 * H, ty = by + Math.cos(ang) * 0.34 * H;
            // guard
            cap(bx - 0.05 * H, by, bx + 0.05 * H, by, 0.03 * H, L.hilt);
            cap(bx, by, tx, ty, 0.05 * H, L.blade);
            cap(bx, by, tx, ty, 0.018 * H, L.edge);
        }

        // ---- animation drivers ----------------------------------------------
        const A = moving ? 0.55 : 0.05;        // hip swing amplitude
        const Aa = moving ? 0.5 : 0.06;        // shoulder swing amplitude
        const K = moving ? 0.7 : 0.12;         // knee bend amount
        const breathe = Math.sin(now / 650) * (moving ? 0 : 0.008 * H);
        const bob = (moving ? -Math.abs(Math.sin(p)) * 0.012 * H : 0) + breathe;
        const lean = moving ? 0.035 * H : 0;   // slight forward lean into motion

        ctx.save();
        ctx.translate(o.x, o.y);
        if (facing === "left") ctx.scale(-1, 1); // draw everything as facing-right

        if (facing === "left" || facing === "right") {
            // ---------------- SIDE VIEW ----------------
            const s = Math.sin(p);
            // FAR (left) limbs first, shaded
            limb(-hipHalf * 0.3, hipY, thigh, shin,
                -A * s, K * Math.max(0, s), legW, L.pantsSh, L.pantsSh,
                0.10 * H, L.bootSh);
            const farArm = limb(shHalf * 0.2, shoulderY + bob, uArm, fArm,
                Aa * s, 0.25 + 0.2 * Math.max(0, -s), armW, L.shirtSh, L.skinSh);
            backSword();
            torso();
            head(false, true, false);
            // NEAR (right) limbs on top, bright
            limb(hipHalf * 0.3, hipY, thigh, shin,
                A * s, K * Math.max(0, -s), legW, L.pants, L.pants,
                0.12 * H, L.boot);
            const nearArm = limb(shHalf * 0.4 + lean, shoulderY + bob, uArm, fArm,
                -Aa * s, 0.25 + 0.2 * Math.max(0, s), armW, L.shirt, L.skin);
            handSword(nearArm.ex, nearArm.ey, nearArm.a2 + 0.4);

        } else {
            // ---------------- FRONT (down) / BACK (up) ----------------
            const back = facing === "up";
            const stepR = Math.sin(p), stepL = Math.sin(p + Math.PI);
            const liftR = moving ? Math.max(0, stepR) : 0;
            const liftL = moving ? Math.max(0, stepL) : 0;
            // legs
            limb(-hipHalf, hipY, thigh, shin,
                -0.06 - 0.10 * (moving ? stepL : 0), K * liftL,
                legW, L.pants, L.pants, 0, L.boot);
            limb(hipHalf, hipY, thigh, shin,
                0.06 + 0.10 * (moving ? stepR : 0), K * liftR,
                legW, L.pants, L.pants, 0, L.boot);
            // boots as toe caps facing the camera
            dot(-hipHalf + Math.sin(-0.06) * (thigh + shin),
                hipY + Math.cos(0.06) * (thigh + shin) - liftL * 0.12 * H,
                legW * 0.55, L.boot);
            dot(hipHalf + Math.sin(0.06) * (thigh + shin),
                hipY + Math.cos(0.06) * (thigh + shin) - liftR * 0.12 * H,
                legW * 0.55, L.boot);
            if (back) backSword();
            torso();
            // arms at the sides, gentle swing
            const sw = moving ? 0.18 * Math.sin(p) : 0;
            limb(-shHalf, shoulderY + bob, uArm, fArm, -0.14 - sw, 0.12,
                armW, back ? L.shirt : L.shirt, back ? L.shirt : L.skin, 0, L.skin);
            limb(shHalf, shoulderY + bob, uArm, fArm, 0.14 + sw, 0.12,
                armW, L.shirt, back ? L.shirt : L.skin, 0, L.skin);
            head(!back, false, back);
        }

        ctx.restore();
    }

    const CharacterRig = { draw, DEFAULT_LOOK };
    global.CharacterRig = CharacterRig;
    if (typeof module !== "undefined" && module.exports) module.exports = { CharacterRig };
})(typeof window !== "undefined" ? window : globalThis);
