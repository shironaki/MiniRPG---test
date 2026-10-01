/**
 * v2 render — draws the tilemap, interactables and hero to a 2D canvas context.
 * Milestone 1 uses flat-colour tiles and a stylised hero; sprite sheets are
 * layered in later without changing callers. Only cull-visible tiles are drawn.
 */
class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.sprites = null; // optional SpriteSheets attached later
    }

    clear(w, h) {
        this.ctx.fillStyle = "#0d1017";
        this.ctx.fillRect(0, 0, w, h);
    }

    drawMap(tilemap, camera) {
        const ctx = this.ctx;
        const ts = tilemap.tileSize;
        const startCol = Math.max(0, tilemap.colAtPixel(camera.x));
        const endCol = Math.min(tilemap.colsCount - 1, tilemap.colAtPixel(camera.x + camera.viewW));
        const startRow = Math.max(0, tilemap.rowAtPixel(camera.y));
        const endRow = Math.min(tilemap.rowsCount - 1, tilemap.rowAtPixel(camera.y + camera.viewH));

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const info = tilemap.infoAt(col, row);
                const sx = Math.round(col * ts - camera.x);
                const sy = Math.round(row * ts - camera.y);

                // Pixel tile art (matches the character style). Building
                // footprints ('house') are just a grass base here — the real
                // structure is drawn as a whole in drawBuildings().
                if (typeof TileArt !== "undefined") {
                    const name = info.name === "house" ? "grass" : info.name;
                    if (TileArt.draw(ctx, name, sx, sy, ts, col, row, tilemap, Date.now())) {
                        this._animateTile(ctx, name, sx, sy, ts, col, row);
                        continue;
                    }
                }

                ctx.fillStyle = info.color || "#101319";
                ctx.fillRect(sx, sy, ts, ts);
                // Simple texture accents (fallback only).
                if (info.name === "tree") {
                    ctx.fillStyle = "#2e6b39";
                    ctx.beginPath();
                    ctx.arc(sx + ts / 2, sy + ts / 2, ts * 0.38, 0, Math.PI * 2);
                    ctx.fill();
                } else if (info.name === "house") {
                    ctx.fillStyle = "#5c3a25";
                    ctx.fillRect(sx + 2, sy + ts * 0.45, ts - 4, ts * 0.55 - 2);
                    ctx.fillStyle = "#c0472b";
                    ctx.beginPath();
                    ctx.moveTo(sx, sy + ts * 0.5);
                    ctx.lineTo(sx + ts / 2, sy + 3);
                    ctx.lineTo(sx + ts, sy + ts * 0.5);
                    ctx.closePath();
                    ctx.fill();
                } else if (info.name === "water") {
                    ctx.fillStyle = "rgba(255,255,255,0.10)";
                    ctx.fillRect(sx + 4, sy + 6, ts - 8, 3);
                } else if (info.name === "tree2") {
                    ctx.fillStyle = "#0f2d17";
                    ctx.beginPath();
                    ctx.arc(sx + ts / 2, sy + ts / 2, ts * 0.42, 0, Math.PI * 2);
                    ctx.fill();
                } else if (info.name === "forest") {
                    ctx.fillStyle = "rgba(20,60,30,0.5)";
                    ctx.beginPath();
                    ctx.arc(sx + ts * 0.32, sy + ts * 0.62, ts * 0.12, 0, Math.PI * 2);
                    ctx.arc(sx + ts * 0.66, sy + ts * 0.4, ts * 0.1, 0, Math.PI * 2);
                    ctx.fill();
                } else if (info.name === "rock") {
                    ctx.fillStyle = "rgba(0,0,0,0.22)";
                    ctx.fillRect(sx + 3, sy + 3, ts - 6, ts - 6);
                } else if (info.name === "dirt") {
                    ctx.fillStyle = "rgba(0,0,0,0.12)";
                    ctx.fillRect(sx + ts * 0.2, sy + ts * 0.55, 3, 3);
                    ctx.fillRect(sx + ts * 0.62, sy + ts * 0.28, 3, 3);
                } else if (info.name === "gate") {
                    ctx.fillStyle = "rgba(255,225,150,0.35)";
                    ctx.fillRect(sx + ts * 0.2, sy + ts * 0.15, ts * 0.6, ts * 0.7);
                }
            }
        }
    }

    // Live foliage/water motion drawn over a (cached) ground tile.
    _animateTile(ctx, name, sx, sy, ts, col, row) {
        const now = Date.now();
        if (name === "grass" || name === "grass2" || name === "forest") {
            const hash = (col * 13 + row * 7);
            if (hash % 2 !== 0) return;              // only some tiles, keep it cheap
            const sway = Math.sin(now / 520 + hash) * (ts * 0.06);
            ctx.strokeStyle = name === "forest"
                ? "rgba(90,150,85,0.5)" : "rgba(130,205,120,0.55)";
            ctx.lineWidth = Math.max(1, ts * 0.06);
            const bx = sx + ts * (0.35 + (hash % 3) * 0.15), by = sy + ts * 0.66;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + sway, by - ts * 0.26);
            ctx.stroke();
        } else if (name === "water") {
            const glint = ((now / 60 + col * 17 + row * 9) % (ts + 12)) - 6;
            ctx.fillStyle = "rgba(255,255,255,0.18)";
            ctx.fillRect(sx + glint, sy + ts * (0.32 + ((row + col) % 3) * 0.18), ts * 0.18, 1);
            const waveOff = Math.sin(now / 450 + col * 1.8 + row * 2.3) * (ts * 0.05);
            ctx.fillStyle = "rgba(255,255,255,0.10)";
            ctx.fillRect(sx + ts * 0.28 + waveOff, sy + ts * 0.68, ts * 0.44, 1);
        }
    }

    // Whole buildings drawn from footprint metadata (roofs never misalign).
    drawBuildings(buildings, camera, ts, night) {
        if (!buildings || typeof BuildingArt === "undefined") return;
        const ctx = this.ctx;
        const now = Date.now();
        for (const b of buildings) {
            const sx = Math.round(b.col * ts - camera.x);
            const sy = Math.round(b.row * ts - camera.y);
            const wpx = b.w * ts, hpx = b.h * ts;
            if (sx + wpx < 0 || sy + hpx < 0 || sx > camera.viewW || sy > camera.viewH) continue;
            // soft ground shadow
            ctx.fillStyle = "rgba(0,0,0,0.16)";
            ctx.fillRect(sx + 2, sy + hpx - 2, wpx - 4, 3);
            BuildingArt.draw(ctx, b.type, sx, sy, b.w, b.h, ts, now, night || 0);
        }
    }

    // Gatherable resource nodes (trees/rocks/bushes/herbs) drawn procedurally.
    drawResourceNodes(nodes, camera) {
        if (!nodes) return;
        const ctx = this.ctx;
        const now = Date.now();
        for (const n of nodes) {
            const s = camera.worldToScreen(n.px, n.py);
            if (s.x < -40 || s.y < -40 || s.x > camera.viewW + 40 || s.y > camera.viewH + 40) continue;
            const wob = n.shakeT > 0 ? Math.sin(now / 40) * 2.2 * (n.shakeT / 0.32) : 0;
            const cx = s.x + wob, by = s.y + 14;   // by ~ ground line

            // ground shadow
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.beginPath();
            ctx.ellipse(s.x, by + 2, 11, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            if (n.type === "tree") {
                // trunk
                ctx.fillStyle = "#5c3a22";
                ctx.fillRect(cx - 2.5, by - (n.depleted ? 5 : 14), 5, n.depleted ? 6 : 15);
                if (!n.depleted) {
                    // layered canopy
                    ctx.fillStyle = "#2f6b34";
                    ctx.beginPath(); ctx.arc(cx, by - 20, 12, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "#3a8040";
                    ctx.beginPath(); ctx.arc(cx - 5, by - 24, 8, 0, Math.PI * 2);
                    ctx.arc(cx + 6, by - 22, 7, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "rgba(255,255,255,0.10)";
                    ctx.beginPath(); ctx.arc(cx - 4, by - 26, 3, 0, Math.PI * 2); ctx.fill();
                } else {
                    // stump rings
                    ctx.fillStyle = "#7a5030";
                    ctx.beginPath(); ctx.ellipse(cx, by - 5, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "#5c3a22"; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.ellipse(cx, by - 5, 2.4, 1.3, 0, 0, Math.PI * 2); ctx.stroke();
                }
            } else if (n.type === "rock") {
                if (!n.depleted) {
                    ctx.fillStyle = "#8a8f98";
                    ctx.beginPath();
                    ctx.moveTo(cx - 11, by); ctx.lineTo(cx - 7, by - 11);
                    ctx.lineTo(cx + 3, by - 13); ctx.lineTo(cx + 11, by - 4);
                    ctx.lineTo(cx + 8, by); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = "#a9aeb6";
                    ctx.beginPath(); ctx.moveTo(cx - 5, by - 9); ctx.lineTo(cx + 1, by - 11);
                    ctx.lineTo(cx + 2, by - 5); ctx.lineTo(cx - 4, by - 4); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = "#5f646c";
                    ctx.fillRect(cx + 3, by - 6, 4, 4);
                } else {
                    ctx.fillStyle = "#6b7078";
                    ctx.fillRect(cx - 6, by - 3, 4, 3);
                    ctx.fillRect(cx, by - 2, 5, 3);
                    ctx.fillRect(cx - 2, by - 5, 3, 3);
                }
            } else if (n.type === "bush") {
                ctx.fillStyle = n.depleted ? "#2c4a2c" : "#2f7a3a";
                ctx.beginPath();
                ctx.arc(cx - 5, by - 4, 6, 0, Math.PI * 2);
                ctx.arc(cx + 5, by - 4, 6, 0, Math.PI * 2);
                ctx.arc(cx, by - 8, 7, 0, Math.PI * 2); ctx.fill();
                if (!n.depleted) {
                    ctx.fillStyle = "#5aa6ff";
                    ctx.beginPath(); ctx.arc(cx - 3, by - 6, 1.6, 0, Math.PI * 2);
                    ctx.arc(cx + 4, by - 5, 1.6, 0, Math.PI * 2);
                    ctx.arc(cx + 1, by - 9, 1.6, 0, Math.PI * 2); ctx.fill();
                }
            } else if (n.type === "herb") {
                ctx.strokeStyle = n.depleted ? "#3a5a34" : "#4fae53";
                ctx.lineWidth = 1.6;
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(cx + i * 3, by);
                    ctx.lineTo(cx + i * 5, by - (n.depleted ? 3 : 10));
                    ctx.stroke();
                }
                if (!n.depleted) {
                    ctx.fillStyle = "#e8d24a";
                    ctx.beginPath(); ctx.arc(cx, by - 10, 2, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
    }

    // Farm plots — soil, sprouts and ripe crops drawn per tile state.
    // Interior furniture. Drawn after the floor and before entities so the
    // hero walks in front of the pieces. `phase` animates fire.
    drawFurniture(list, camera, ts, phase) {
        if (!list || !list.length || typeof Furniture === "undefined") return;
        for (const f of list) {
            const s = Furniture.size(f.kind);
            const sx = Math.round(f.col * ts - camera.x);
            const sy = Math.round(f.row * ts - camera.y);
            if (sx + s.w * ts < 0 || sy + s.h * ts < 0 || sx > camera.viewW || sy > camera.viewH) continue;
            Furniture.draw(this.ctx, f.kind, sx, sy, ts, phase | 0);
        }
    }

    drawFarm(farm, plotList, camera, ts) {
        if (!farm || !plotList) return;
        const ctx = this.ctx;
        for (const cell of plotList) {
            const p = farm.plot(cell.col, cell.row);
            const sx = Math.round(cell.col * ts - camera.x);
            const sy = Math.round(cell.row * ts - camera.y);
            if (sx + ts < 0 || sy + ts < 0 || sx > camera.viewW || sy > camera.viewH) continue;
            const pad = 3, x = sx + pad, y = sy + pad, s = ts - pad * 2;

            if (p.state === "empty") {
                // faint outline so the field reads as farmland before tilling
                ctx.strokeStyle = "rgba(90,60,35,0.5)";
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
                continue;
            }

            // tilled soil (darker when watered)
            ctx.fillStyle = p.watered ? "#4a3320" : "#6b4a2c";
            ctx.fillRect(x, y, s, s);
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.lineWidth = 1;
            for (let i = 1; i < 3; i++) {
                const fy = y + (s * i) / 3;
                ctx.beginPath(); ctx.moveTo(x + 1, fy); ctx.lineTo(x + s - 1, fy); ctx.stroke();
            }

            const cx = sx + ts / 2, by = sy + ts - pad - 1;
            if (p.state === "growing") {
                const t = p.growDays ? Math.min(1, p.progress / p.growDays) : 0;
                const hgt = 4 + t * (ts * 0.5);
                ctx.strokeStyle = "#4fae53";
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, by - hgt); ctx.stroke();
                ctx.fillStyle = "#5cc267";
                ctx.beginPath();
                ctx.ellipse(cx - 3, by - hgt * 0.7, 3, 1.6, -0.6, 0, Math.PI * 2);
                ctx.ellipse(cx + 3, by - hgt * 0.85, 3, 1.6, 0.6, 0, Math.PI * 2);
                ctx.fill();
                if (p.watered) {
                    ctx.fillStyle = "rgba(90,170,255,0.5)";
                    ctx.beginPath(); ctx.arc(cx + 5, by - 2, 1.6, 0, Math.PI * 2); ctx.fill();
                }
            } else if (p.state === "ready") {
                // leafy top + orange root (a little carrot)
                ctx.fillStyle = "#4caf50";
                ctx.beginPath();
                ctx.moveTo(cx, by - 14); ctx.lineTo(cx - 4, by - 8); ctx.lineTo(cx + 4, by - 8);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#e8862b";
                ctx.beginPath();
                ctx.moveTo(cx - 4, by - 8); ctx.lineTo(cx + 4, by - 8); ctx.lineTo(cx, by);
                ctx.closePath(); ctx.fill();
            }
        }
    }

    // Living townsfolk — drawn with the hero rig using each NPC's palette.
    drawNPCs(npcs, camera) {
        if (!npcs) return;
        const ctx = this.ctx;
        for (const n of npcs) {
            const s = camera.worldToScreen(n.x, n.y);
            const cx = s.x + n.w / 2;
            const bottom = s.y + n.h;
            ctx.fillStyle = "rgba(0,0,0,0.26)";
            ctx.beginPath();
            ctx.ellipse(cx, bottom, n.w * 0.5, 4.2, 0, 0, Math.PI * 2);
            ctx.fill();

            if (typeof CharacterRig !== "undefined") {
                CharacterRig.draw(ctx, {
                    x: cx, y: bottom + 2, H: n.h * 1.7,
                    facing: n.facing, phase: n.animTime * 8,
                    moving: n.moving, now: Date.now(), look: n.look || null
                });
            } else {
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.font = "20px serif";
                ctx.fillText(n.emoji || "🧑", cx, s.y + n.h / 2);
            }

            // small floating name tag
            ctx.save();
            ctx.font = "10px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const label = n.name || "";
            const tw = ctx.measureText(label).width + 8;
            const ty = bottom - n.h * 1.7 - 8;
            ctx.fillStyle = "rgba(13,16,23,0.55)";
            ctx.fillRect(cx - tw / 2, ty - 7, tw, 13);
            ctx.fillStyle = "rgba(240,235,220,0.95)";
            ctx.fillText(label, cx, ty);
            ctx.restore();
        }
    }

    // Full-screen day/night tint with dynamic light sources (lamps, windows, player lantern).
    drawNightOverlay(light, camera, sources) {
        if (!light || light.a <= 0.002) return;
        const ctx = this.ctx;
        const W = camera.viewW, H = camera.viewH;

        // If no light sources or simple context, draw uniform tint.
        if (!sources || typeof document === "undefined") {
            ctx.fillStyle = `rgba(${light.r},${light.g},${light.b},${light.a})`;
            ctx.fillRect(0, 0, W, H);
            return;
        }

        if (!this._lightCanvas) {
            this._lightCanvas = document.createElement("canvas");
        }
        if (this._lightCanvas.width !== W || this._lightCanvas.height !== H) {
            this._lightCanvas.width = W;
            this._lightCanvas.height = H;
        }
        const lctx = this._lightCanvas.getContext("2d");
        if (!lctx) {
            ctx.fillStyle = `rgba(${light.r},${light.g},${light.b},${light.a})`;
            ctx.fillRect(0, 0, W, H);
            return;
        }

        // Fill darkness tint
        lctx.globalCompositeOperation = "source-over";
        lctx.fillStyle = `rgba(${light.r},${light.g},${light.b},${light.a})`;
        lctx.fillRect(0, 0, W, H);

        // Carve out light circles with destination-out
        lctx.globalCompositeOperation = "destination-out";

        const punchLight = (sx, sy, radius, intensity) => {
            if (sx < -radius || sy < -radius || sx > W + radius || sy > H + radius) return;
            try {
                const grd = lctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
                grd.addColorStop(0, `rgba(0,0,0,${intensity || 1.0})`);
                grd.addColorStop(0.4, `rgba(0,0,0,${(intensity || 1.0) * 0.7})`);
                grd.addColorStop(1, "rgba(0,0,0,0)");
                lctx.fillStyle = grd;
                lctx.beginPath();
                lctx.arc(sx, sy, radius, 0, Math.PI * 2);
                lctx.fill();
            } catch (e) {
                // fallback
                lctx.fillStyle = "rgba(0,0,0,0.6)";
                lctx.beginPath();
                lctx.arc(sx, sy, radius * 0.7, 0, Math.PI * 2);
                lctx.fill();
            }
        };

        const ts = sources.tileSize || 32;

        // 1. Street lamps
        if (sources.furniture) {
            for (const f of sources.furniture) {
                if (f.kind === "lamp") {
                    const sx = Math.round(f.col * ts + ts * 0.5 - camera.x);
                    const sy = Math.round(f.row * ts + ts * 0.5 - camera.y);
                    punchLight(sx, sy, 85, 0.95);
                } else if (f.kind === "fireplace" || f.kind === "stove" || f.kind === "forgeFire") {
                    const sx = Math.round(f.col * ts + ts * 0.8 - camera.x);
                    const sy = Math.round(f.row * ts + ts * 0.5 - camera.y);
                    punchLight(sx, sy, 65, 0.90);
                }
            }
        }

        // 2. Building windows & forge fire
        if (sources.buildings) {
            for (const b of sources.buildings) {
                const sx = Math.round(b.col * ts + b.w * ts * 0.5 - camera.x);
                const sy = Math.round(b.row * ts + b.h * ts * 0.6 - camera.y);
                if (b.type === "forge") {
                    punchLight(sx, sy, 80, 0.92);
                } else if (b.type === "house" || b.type === "shop") {
                    punchLight(sx, sy, 70, 0.85);
                } else if (b.type === "gate") {
                    punchLight(sx, sy, 60, 0.75);
                }
            }
        }

        // 3. Player lantern (when dark)
        if (sources.player && light.a > 0.15) {
            const px = Math.round(sources.player.x - camera.x);
            const py = Math.round(sources.player.y - camera.y);
            punchLight(px, py, 60, 0.88);
        }

        // Blit darkness mask to screen
        ctx.drawImage(this._lightCanvas, 0, 0);

        // Soft warm glow overlay on lamps and windows
        if (sources.furniture && light.a > 0.08) {
            for (const f of sources.furniture) {
                if (f.kind === "lamp") {
                    const sx = Math.round(f.col * ts + ts * 0.5 - camera.x);
                    const sy = Math.round(f.row * ts + ts * 0.5 - camera.y);
                    if (sx >= -50 && sy >= -50 && sx <= W + 50 && sy <= H + 50) {
                        ctx.fillStyle = "rgba(255,210,120,0.18)";
                        ctx.beginPath();
                        ctx.arc(sx, sy, 60, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }

    // Ambient floating petals / leaves and night fireflies.
    drawAmbient(camera, zoneName, light) {
        const ctx = this.ctx;
        const now = Date.now();
        const W = camera.viewW, H = camera.viewH;

        if (zoneName === "Деревня" || zoneName === "village") {
            // Day / evening: drifting petals and autumn leaves
            const count = 10;
            for (let i = 0; i < count; i++) {
                const seed = i * 137.5;
                const speedX = 0.045 + (i % 3) * 0.015;
                const speedY = 0.025 + (i % 2) * 0.010;
                const x = ((now * speedX + seed * 12) % (W + 60)) - 30;
                const y = ((now * speedY + seed * 23 + Math.sin(now / 400 + i) * 15) % (H + 60)) - 30;

                const isPetal = i % 2 === 0;
                ctx.fillStyle = isPetal ? "rgba(255,182,193,0.65)" : "rgba(220,165,80,0.60)";
                ctx.beginPath();
                ctx.ellipse(x, y, isPetal ? 3 : 4, isPetal ? 2 : 2.5, Math.sin(now / 500 + i), 0, Math.PI * 2);
                ctx.fill();
            }

            // Dusk / night: glowing fireflies near trees and pond
            if (light && light.a > 0.25) {
                const fireflies = 8;
                for (let i = 0; i < fireflies; i++) {
                    const seed = i * 97.3;
                    const wx = (seed * 19 + Math.sin(now / 700 + i * 1.5) * 45) % (26 * 32);
                    const wy = (seed * 29 + Math.cos(now / 600 + i * 1.8) * 35) % (18 * 32);
                    const sx = Math.round(wx - camera.x);
                    const sy = Math.round(wy - camera.y);
                    if (sx < -10 || sy < -10 || sx > W + 10 || sy > H + 10) continue;

                    const pulse = 0.4 + 0.5 * Math.sin(now / 350 + i * 2.1);
                    if (pulse > 0.15) {
                        ctx.fillStyle = `rgba(210,255,100,${pulse * 0.85})`;
                        ctx.beginPath();
                        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = `rgba(210,255,100,${pulse * 0.25})`;
                        ctx.beginPath();
                        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }

    drawPortals(list, camera) {
        if (!list) return;
        const ctx = this.ctx;
        const now = Date.now();
        for (const p of list) {
            // Outdoor portals (path to forest, cave entrance) get an atmospheric ground beacon;
            // Indoor doorways already have their doorway tiles.
            if (p.to === "village" && p.label === "На улицу") continue;

            const s = camera.worldToScreen(p.px, p.py);
            const pulse = 0.4 + 0.3 * Math.sin(now / 400 + (p.px + p.py));
            ctx.save();
            ctx.fillStyle = `rgba(220,180,90,${pulse * 0.28})`;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y + 4, 12, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawInteractables(list, camera) {
        if (!list) return;
        const ctx = this.ctx;
        const now = Date.now();
        for (const it of list) {
            // For doors, shops, beds, stoves, boards, cats, wells, etc., the physical art is already visible.
            // If it's a standalone wild NPC or dungeon lair without existing architecture, draw a clean subtle floating icon.
            if (it.action === "npc" || (it.action === "dungeon" && !it.to)) {
                const s = camera.worldToScreen(it.px, it.py);
                const bob = Math.sin(now / 350 + (it.px + it.py)) * 2;
                ctx.save();
                ctx.font = "20px serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(it.emoji || "✨", s.x, s.y - 10 + bob);
                ctx.restore();
            }
        }
    }

    // Return a sprite image only if it is attached and fully decoded.
    _img(key) {
        const img = this.sprites && this.sprites[key];
        return (img && img.complete && img.naturalWidth > 0) ? img : null;
    }

    // Draw a sprite anchored by its bottom-centre (feet), preserving aspect.
    _drawSprite(img, cx, bottomY, targetH, flip, bob) {
        const ctx = this.ctx;
        const ar = img.naturalWidth / img.naturalHeight;
        const h = targetH, w = h * ar;
        const y = bottomY - h - (bob || 0);
        if (flip) {
            ctx.save();
            ctx.translate(cx, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, -w / 2, y, w, h);
            ctx.restore();
        } else {
            ctx.drawImage(img, cx - w / 2, y, w, h);
        }
    }

    drawEnemies(enemies, camera) {
        const ctx = this.ctx;
        for (const e of enemies) {
            if (e.alive === false) continue;
            const s = camera.worldToScreen(e.x, e.y);
            const cx = s.x + e.w / 2;
            const bottom = s.y + e.h;
            // shadow
            ctx.fillStyle = "rgba(0,0,0,0.28)";
            ctx.beginPath();
            ctx.ellipse(cx, bottom, e.w * 0.5, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pixel mob rig (matches the hero's art) — animated, no sprite files.
            if (typeof MobRig !== "undefined") {
                const dir = e.dir || { x: 0, y: 0 };
                const moving = Math.hypot(dir.x, dir.y) > 0.01;
                const facing = dir.x < -0.01 ? "left" : "right";
                const bob = Math.sin(Date.now() / 480 + (e.x + e.y) * 0.05) * 1.1;
                MobRig.draw(ctx, {
                    x: cx,
                    y: bottom + 2 - bob,
                    H: e.h * MobRig.heightScale(e.kind),
                    kind: e.kind,
                    facing,
                    moving,
                    phase: Date.now() / 130 + (e.x + e.y) * 0.05,
                    now: Date.now(),
                });
                continue;
            }

            const img = this._img(e.kind);
            if (img) {
                const bob = Math.sin(Date.now() / 480 + (e.x + e.y) * 0.05) * 1.2;
                this._drawSprite(img, cx, bottom + 2, e.h * 2.2, false, bob);
            } else {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "20px serif";
                ctx.fillText(e.emoji || "👹", cx, s.y + e.h / 2);
            }
        }
    }

    // Draws the hero: a sprite when loaded, else a procedural walk-cycle figure.
    drawPlayer(player, camera) {
        const ctx = this.ctx;
        const s = camera.worldToScreen(player.x, player.y);
        const cx = s.x + player.w / 2;
        const w = player.w, h = player.h;

        // ground shadow (shrinks a touch on the up-beat of a stride)
        const stride = player.moving ? Math.abs(Math.sin(player.animTime * 8)) : 0;
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(cx, s.y + h, w * (0.52 - stride * 0.06), 4.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // footstep dust while moving (on foot-contact beats)
        if (player.moving && stride < 0.22) {
            ctx.fillStyle = "rgba(210,198,175,0.22)";
            ctx.beginPath();
            ctx.ellipse(cx, s.y + h + 1, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Procedural part-based hero: real limbs, every direction, gear as layers.
        if (typeof CharacterRig !== "undefined") {
            CharacterRig.draw(ctx, {
                x: cx,
                y: s.y + h + 2,
                H: h * 1.7,
                facing: player.facing,
                phase: player.animTime * 8,
                moving: player.moving,
                now: Date.now(),
                look: this.heroLook || null,
            });
            return;
        }

        // Minimal fallback if the rig module failed to load.
        ctx.fillStyle = "#6a4bd8";
        ctx.fillRect(cx - w * 0.32, s.y + h * 0.38, w * 0.64, h * 0.36);
        ctx.fillStyle = "#f0dcb8";
        ctx.beginPath();
        ctx.arc(cx, s.y + h * 0.24, w * 0.28, 0, Math.PI * 2);
        ctx.fill();
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Renderer };
