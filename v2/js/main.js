/**
 * v2 bootstrap — wires the canvas, world, hero, camera, input, and loop.
 * Free-roam a living tiled valley with camera follow, realistic tool mechanics,
 * living NPCs, farm homestead, deep mines, culinary arts, and sandbox progression.
 */
(function () {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const stage = document.getElementById("stage");
    const hud = document.getElementById("hud");
    const statsEl = document.getElementById("stats");
    const overlay = document.getElementById("overlay");
    const overlayBody = document.getElementById("overlayBody");
    const overlayClose = document.getElementById("overlayClose");

    // The active zone's data is (re)built by loadZone() on every map change.
    let mapData, tilemap, interactables, enemies, portals, zoneName, npcs, resourceNodes, farmPlots, furniture;

    const player = new Player2D(0, 0, { w: 20, h: 20, speed: 130 });

    // In-game clock in minutes (0..1440). A full day passes in DAY_REAL_SEC.
    let clockMin = 8 * 60;                 // start the day at 08:00
    let dayCount = 1;                      // increments each dawn (clock wrap)
    const DAY_REAL_SEC = 300;             // 5 real minutes = one full day
    const MIN_PER_SEC = 1440 / DAY_REAL_SEC;

    // Persistent systems (survive zone changes).
    const social = new Social();
    const resources = new ResourceBag();
    const farm = new Farm();
    const requests = new Requests();      // villager errands
    const storage = new ResourceBag();    // the chest at home
    const tools = (typeof Tools !== "undefined") ? new Tools() : null;
    const cooking = (typeof CookingSystem !== "undefined") ? new CookingSystem() : null;
    const fishing = (typeof FishingSystem !== "undefined") ? new FishingSystem() : null;
    const weather = (typeof WeatherSystem !== "undefined") ? new WeatherSystem() : null;
    const ranch = (typeof RanchSystem !== "undefined") ? new RanchSystem() : null;
    const smelting = (typeof SmeltingSystem !== "undefined") ? new SmeltingSystem() : null;
    const decor = (typeof DecorSystem !== "undefined") ? new DecorSystem() : null;
    const mines = (typeof MinesSystem !== "undefined") ? new MinesSystem() : null;
    const skills = (typeof SkillsSystem !== "undefined") ? new SkillsSystem() : null;
    const homestead = (typeof HomesteadSystem !== "undefined") ? new HomesteadSystem() : null;

    // Starter pouch and tools
    resources.add("seeds", 6);
    if (storage) {
        storage.add("wood", 15);
        storage.add("stone", 10);
        storage.add("bread", 2);
    }

    // Hero stats & character profile
    const hero = new Player("Любомир");
    const journal = new QuestJournal();
    let charProfile = (typeof CharacterProfile !== "undefined")
        ? new CharacterProfile({ name: "Любомир" })
        : null;

    // Try to load saved profile
    try {
        const rawProf = localStorage.getItem("v2_char_profile");
        if (rawProf && typeof CharacterProfile !== "undefined") {
            charProfile = new CharacterProfile(JSON.parse(rawProf));
            charProfile.applyToPlayer(hero, tools, resources);
            player.look = charProfile.getLook();
        }
    } catch (e) { /* ignore */ }

    const host = {
        player: hero,
        adjustKarma(n) { hero.karma = (hero.karma || 0) + n; }
    };

    // Transient on-screen feedback (gathering, gifts, catches) — fades on its own.
    let flash = "", flashT = 0;
    function showFlash(text, secs) { flash = text; flashT = secs || 1.6; }

    // Dynamic rising floating texts (+1 Wood, +25 XP, +50 Gold) & Emote bubbles
    const floatingTexts = [];
    function addFloatingText(text, x, y, color = "rgba(255, 230, 100, ALPHA)", size = 12, maxT = 1.3) {
        floatingTexts.push({ text, x, y, color, size, t: 0, maxT });
    }

    const emotes = [];
    function addEmote(icon, x, y, life = 1.8, offsetY = 36) {
        emotes.push({ icon, x, y, life, t: 0, offsetY });
    }

    function getMap(id) {
        if (typeof id === "object" && id) return id;
        if (typeof id === "string" && id.startsWith("mine_floor_") && mines) {
            const flNum = parseInt(id.replace("mine_floor_", ""), 10) || 1;
            return mines.generateFloor(flNum);
        }
        return (typeof MAPS !== "undefined" && MAPS[id]) || (typeof ZONES !== "undefined" && ZONES[id]);
    }

    // Build (or rebuild) the world for a zone and drop the hero at `spawn`.
    function loadZone(id, spawn) {
        mapData = getMap(id);
        tilemap = new TileMap(mapData.rows, mapData.tileSize);
        const ts = mapData.tileSize;
        interactables = (mapData.interactables || []).map(it => ({
            ...it, px: it.col * ts + ts / 2, py: it.row * ts + ts / 2
        }));
        enemies = (mapData.enemies || []).map(e => new Enemy2D(
            e.col * ts + 6, e.row * ts + 6,
            { w: 20, h: 20, kind: e.kind || e.type, type: e.type || e.kind, emoji: e.emoji, wanderRadius: e.wanderRadius, friendly: e.friendly }
        ));
        portals = (mapData.portals || []).map(p => ({
            ...p, px: p.col * ts + ts / 2, py: p.row * ts + ts / 2
        }));
        npcs = (mapData.npcs || []).map(def => {
            const n = new NPC2D(def, ts);
            n.placeAt(clockMin);
            return n;
        });
        resourceNodes = (mapData.resources || []).map(r => new ResourceNode(r, ts));
        farmPlots = (mapData.farm || []).map(c => ({ col: c.col, row: c.row, px: c.col * ts + ts / 2, py: c.row * ts + ts / 2 }));
        
        let furnList = (mapData.furniture || []).map(f => ({ ...f }));
        if (id === "home" && decor && decor.furniture && decor.furniture.length) {
            furnList = furnList.concat(decor.furniture.map(df => ({ ...df })));
        }
        furniture = furnList;

        // Furniture footprint blocking with fine walkable rules
        if (typeof Furniture !== "undefined") {
            for (const f of furniture) {
                const def = Furniture.KINDS[f.kind];
                if (!def || def.walkable) continue;
                const size = Furniture.size(f.kind);
                const blockCols = def.solidCols || size.w;
                const blockRows = def.solidRows || size.h;
                const offC = def.solidOffX || 0;
                const offR = def.solidOffY || 0;
                for (let j = 0; j < blockRows; j++) {
                    for (let i = 0; i < blockCols; i++) {
                        tilemap.block(f.col + offC + i, f.row + offR + j);
                    }
                }
            }
        }
        zoneName = mapData.name || (typeof id === "string" ? id : "Локация");
        const sp = spawn || mapData.spawn;
        player.x = sp.col * ts + 6;
        player.y = sp.row * ts + 6;
        nearest = null;
        if (typeof resize === "function") resize();
        if (input && input.consumePressed) input.consumePressed();
    }

    const menuCtx = {
        hero, journal, host, refresh: refreshStats, social, resources,
        requests, storage, tools, cooking, fishing, weather,
        ranch, smelting, decor, mines, skills, homestead,
        get charProfile() { return charProfile; },
        set charProfile(p) { charProfile = p; },
        closeInteraction,
        addEmote: (icon, x, y, life, offY) => addEmote(icon, x !== undefined ? x : player.centerX, y !== undefined ? y : player.centerY, life, offY),
        addFloatingText: (text, x, y, col, sz, maxT) => addFloatingText(text, x !== undefined ? x : player.centerX, y !== undefined ? y : player.centerY - 16, col, sz, maxT),
        enterMines: (fl) => {
            closeInteraction();
            loadZone(`mine_floor_${fl || 1}`);
            showFlash(`⛏️ Вы спустились в шахту (Ярус ${fl || 1})!`, 2);
        },
        get day() { return dayCount; }
    };

    function refreshStats() {
        if (!statsEl) return;
        const hpPct = Math.max(0, Math.min(100, Math.round((hero.health / hero.maxHealth) * 100)));
        const enPct = Math.max(0, Math.min(100, Math.round((hero.energy / hero.maxEnergy) * 100)));

        const activeClassTitle = (charProfile && typeof charProfile.getActiveTitle === "function")
            ? charProfile.getActiveTitle(skills)
            : "Новичок долины";

        const hotbarHtml = (tools && typeof tools.getHotbar === "function")
            ? tools.getHotbar().map((s, idx) => `
                <div class="hotbarSlot ${s.active ? "active" : ""}" data-hotbar-slot="${idx}" title="${s.name}">
                    <span class="slotNum">${s.slot}</span>
                    <span class="slotIcon">${s.emoji}</span>
                    ${s.level > 1 ? `<span class="slotLv">${s.level}</span>` : ""}
                </div>`).join("")
            : "";

        statsEl.innerHTML = `
            <div id="playerCard">
                <div class="playerHead">
                    <div class="avatarCircle">🧑</div>
                    <div class="nameWrap">
                        <strong class="heroName">${hero.name || "Любомир"}</strong>
                        <span class="statClassBadge">👑 ${activeClassTitle}</span>
                        <span class="statLevelBadge">⭐ Ур. ${hero.level}</span>
                    </div>
                </div>
                <div class="statGauges">
                    <div class="statBarWrap hpWrap" title="Здоровье">
                        <span>❤️</span>
                        <div class="statBar"><div class="statFillHp" style="width:${hpPct}%"></div></div>
                        <span class="statVal">${Math.max(0, hero.health)}/${hero.maxHealth}</span>
                    </div>
                    <div class="statBarWrap enWrap" title="Энергия">
                        <span>⚡</span>
                        <div class="statBar"><div class="statFillEn" style="width:${enPct}%"></div></div>
                        <span class="statVal">${hero.energy}/${hero.maxEnergy}</span>
                    </div>
                </div>
                <div class="playerCoins">
                    <span class="statGoldBadge">💰 ${hero.gold}</span>
                </div>
            </div>
            <div id="quickHotbar">${hotbarHtml}</div>
        `;
    }

    const camera = new Camera(canvas.width, canvas.height);
    const input = new Input();
    input.attach(window);
    const renderer = new Renderer(ctx);

    // Hero and all mobs are drawn from code (CharacterRig / MobRig)
    renderer.sprites = null;

    // Hotbar click events
    if (statsEl) {
        statsEl.addEventListener("click", (e) => {
            const slot = e.target.closest("[data-hotbar-slot]");
            if (slot && tools) {
                const idx = parseInt(slot.dataset.hotbarSlot, 10);
                tools.setActiveSlot(idx);
                refreshStats();
            }
        });
    }

    // On-screen touch controls
    (function wireTouch() {
        const touch = document.getElementById("touch");
        if (!touch) return;
        touch.querySelectorAll("[data-key]").forEach(btn => {
            const code = btn.dataset.key;
            const down = (e) => { e.preventDefault(); input.press(code); };
            const up = (e) => { e.preventDefault(); input.release(code); };
            btn.addEventListener("touchstart", down, { passive: false });
            btn.addEventListener("touchend", up, { passive: false });
            btn.addEventListener("touchcancel", up);
            btn.addEventListener("mousedown", down);
            btn.addEventListener("mouseup", up);
            btn.addEventListener("mouseleave", up);
        });
        touch.querySelectorAll("[data-tap]").forEach(btn => {
            const code = btn.dataset.tap;
            const tap = (e) => { e.preventDefault(); input.press(code); input.release(code); };
            btn.addEventListener("touchstart", tap, { passive: false });
            btn.addEventListener("mousedown", tap);
        });
    })();

    let paused = false;
    let nearest = null;
    const INTERACT_RADIUS = 44;

    function resize() {
        const rect = stage.getBoundingClientRect();
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
        camera.resize(canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => setTimeout(resize, 100));

    // Fullscreen toggle
    const fsBtn = document.getElementById("fsBtn");
    if (fsBtn) {
        fsBtn.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    }

    // ---- Control scheme (virtual joystick <-> D-pad) -----
    (function wireControlScheme() {
        const joystick = document.getElementById("joystick");
        const stick = document.getElementById("stick");
        const dpad = document.getElementById("dpad");
        const toggle = document.getElementById("ctrlToggle");
        if (!joystick || !dpad || !toggle) return;

        let mode = "stick";
        try { mode = localStorage.getItem("v2ctrl") || "stick"; } catch (e) { /* ignore */ }

        function apply(m) {
            mode = m;
            joystick.style.display = m === "stick" ? "block" : "none";
            dpad.style.display = m === "dpad" ? "flex" : "none";
            toggle.textContent = m === "stick" ? "🕹️" : "✚";
            input.clearAnalog();
            try { localStorage.setItem("v2ctrl", m); } catch (e) { /* ignore */ }
        }
        toggle.addEventListener("click", () => apply(mode === "stick" ? "dpad" : "stick"));
        apply(mode);

        let active = false, cx = 0, cy = 0, stickRadius = 46;
        const DEAD = 0.20;
        function point(e) { return e.touches ? (e.touches[0] || e.changedTouches[0]) : e; }
        function start(e) {
            active = true;
            const r = joystick.getBoundingClientRect();
            stickRadius = Math.max(30, r.width / 2 - 10);
            cx = r.left + r.width / 2;
            cy = r.top + r.height / 2;
            move(e);
        }
        function move(e) {
            if (!active) return;
            const p = point(e);
            let dx = p.clientX - cx, dy = p.clientY - cy;
            const dist = Math.hypot(dx, dy);
            if (dist > stickRadius) { dx = (dx / dist) * stickRadius; dy = (dy / dist) * stickRadius; }
            stick.style.transform = `translate(${dx}px, ${dy}px)`;

            const norm = Math.min(1, dist / stickRadius);
            if (norm < DEAD) {
                input.clearAnalog();
            } else {
                const scaledMag = Math.pow((norm - DEAD) / (1 - DEAD), 1.4);
                input.setAnalog((dx / dist) * scaledMag, (dy / dist) * scaledMag);
            }
            if (e.cancelable && e.type !== "mousemove") e.preventDefault();
        }
        function end() {
            active = false;
            stick.style.transform = "translate(0,0)";
            input.clearAnalog();
        }
        joystick.addEventListener("touchstart", start, { passive: false });
        joystick.addEventListener("touchmove", move, { passive: false });
        joystick.addEventListener("touchend", end);
        joystick.addEventListener("touchcancel", end);
        joystick.addEventListener("mousedown", start);
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", end);
    })();

    // Nearest interactable across static spots, living NPCs and resource nodes.
    function findNearest() {
        let best = null, bestD = INTERACT_RADIUS;
        for (const it of interactables) {
            const d = Math.hypot(it.px - player.centerX, it.py - player.centerY);
            if (d <= bestD) { bestD = d; best = { kind: "spot", target: it, emoji: it.emoji, label: it.label }; }
        }
        for (const n of npcs) {
            const d = Math.hypot(n.centerX - player.centerX, n.centerY - player.centerY);
            if (d < bestD) { bestD = d; best = { kind: "npc", target: n, emoji: n.emoji, label: n.name }; }
        }
        for (const r of resourceNodes) {
            if (r.depleted) continue;
            const d = Math.hypot(r.centerX - player.centerX, r.centerY - player.centerY);
            if (d < bestD) {
                bestD = d;
                const meta = (typeof RESOURCES !== "undefined") ? RESOURCES[r.res] : null;
                const emoji = (meta && meta.emoji) || "📦";
                const toolHint = (r.type === "tree" || r.type === "driftwood") ? "🪓" : (r.type === "rock" || r.type.startsWith("ore_") ? "⛏️" : "✋");
                best = { kind: "resource", target: r, emoji, label: `${toolHint} ${meta ? meta.name : r.type}` };
            }
        }
        for (const f of farmPlots) {
            const d = Math.hypot(f.px - player.centerX, f.py - player.centerY);
            if (d < bestD) {
                bestD = d;
                const act = farm.actionFor(f.col, f.row);
                const labels = {
                    till: "🌾 Вспахать мотыгой",
                    plant: "🌰 Посадить семена",
                    water: "🪣 Полить лейкой",
                    harvest: "🥕 Собрать урожай"
                };
                best = { kind: "farm", target: f, emoji: "🌱", label: labels[act] || "Грядка" };
            }
        }
        for (const e of enemies) {
            if (!e.alive) continue;
            const isFauna = e.kind === "cat" || e.kind === "cow" || e.kind === "sheep" || e.kind === "chicken" || e.kind === "duck";
            if (!isFauna) continue;
            const ex = e.x + (e.w || 20) / 2;
            const ey = e.y + (e.h || 20) / 2;
            const d = Math.hypot(ex - player.centerX, ey - player.centerY);
            if (d < bestD) {
                bestD = d;
                const emoji = e.emoji || (e.kind === "cow" ? "🐮" : e.kind === "sheep" ? "🐑" : e.kind === "chicken" ? "🐔" : "🐱");
                const name = e.name || (e.kind === "cow" ? "Корова Бурёнка" : e.kind === "sheep" ? "Овечка Кудряш" : e.kind === "chicken" ? "Курочка" : "Кот Мурзик");
                best = { kind: "fauna", target: e, emoji, label: name, px: ex, py: ey };
            }
        }
        return best;
    }

    // Direct physical interaction with friendly animals in the pasture
    function interactFauna(animal) {
        if (!animal) return { ok: false };
        const kind = animal.kind || animal.type || "";
        const ax = animal.x + (animal.w || 20) / 2;
        const ay = animal.y + (animal.h || 20) / 2;

        if (kind === "cat" || kind === "fauna_cat") {
            hero.health = Math.min(hero.maxHealth, hero.health + 10);
            hero.energy = Math.min(hero.maxEnergy, hero.energy + 15);
            addEmote("❤️", ax, ay - 18, 1.8);
            addFloatingText("Мур-р-р... +15⚡", ax, ay - 24, "rgba(244, 114, 182, ALPHA)", 13);
            showFlash("🐱 Кот Мурзик довольно мурлычет и трётся о твои ноги.", 1.5);
            if (skills) skills.addXp("foraging", 2);
            refreshStats();
            return { ok: true, action: "pet", kind: "cat" };
        }

        // Farm livestock (cow, sheep, chicken) linked to RanchSystem
        if (ranch) {
            const rAnimal = ranch.list.find(a => a.type === kind || a.id === animal.id || (kind && kind.includes(a.type))) || ranch.list[0];
            if (rAnimal) {
                // If not petted today, pet first
                if (!rAnimal.petted) {
                    const pRes = rAnimal.pet();
                    if (pRes.ok) {
                        addEmote("❤️", ax, ay - 18, 1.8);
                        addFloatingText(`${rAnimal.name} ❤️`, ax, ay - 24, "rgba(244, 114, 182, ALPHA)", 13);
                        showFlash(pRes.msg, 1.5);
                        if (skills) skills.addXp("farming", 4);
                        refreshStats();
                        return { ok: true, action: "pet", animal: rAnimal };
                    }
                }
                // If has wheat/hay in bag and not fed, feed
                if (!rAnimal.fed && (resources.count("wheat") > 0 || resources.count("hay") > 0)) {
                    const fRes = rAnimal.feed(resources);
                    if (fRes.ok) {
                        addEmote("🌾", ax, ay - 18, 1.8);
                        addFloatingText(`Покормлено 🌾`, ax, ay - 24, "rgba(74, 222, 128, ALPHA)", 13);
                        showFlash(fRes.msg, 1.5);
                        if (skills) skills.addXp("farming", 6);
                        refreshStats();
                        return { ok: true, action: "feed", animal: rAnimal };
                    }
                }
                // If has ready product, harvest it directly
                if (rAnimal.hasProduct) {
                    const hRes = rAnimal.harvest(resources, dayCount);
                    if (hRes.ok) {
                        const meta = (typeof RESOURCES !== "undefined") ? RESOURCES[hRes.res] : null;
                        const em = meta ? meta.emoji : "📦";
                        addEmote(em, ax, ay - 18, 2.0);
                        addFloatingText(`+1 ${meta ? meta.name : hRes.res}`, ax, ay - 26, "rgba(255, 215, 0, ALPHA)", 14);
                        showFlash(`🎉 Собрана свежая продукция: ${meta ? meta.name : hRes.res}!`, 1.8);
                        if (skills) skills.addXp("farming", 10);
                        refreshStats();
                        return { ok: true, action: "harvest", res: hRes.res, animal: rAnimal };
                    }
                }
            }
        }

        // Friendly idle reaction
        addEmote("❤️", ax, ay - 18, 1.5);
        addFloatingText("Довольное животное ✨", ax, ay - 24, "rgba(250, 204, 21, ALPHA)", 12);
        showFlash(`Животное довольно жуёт траву на пастбище.`, 1.3);
        return { ok: true, action: "idle" };
    }

    // Daily dawn: skip to 08:00
    function sleepUntilMorning() {
        onDawn(dayCount + 1);
        clockMin = 8 * 60;
        hero.health = hero.maxHealth;
        hero.energy = hero.maxEnergy;
        showFlash("☀️ Наступило утро. Силы полностью восстановлены!", 2);
        addFloatingText("Полный отдых ❤️⚡", player.centerX, player.centerY - 20, "rgba(74, 222, 128, ALPHA)", 14);
        addEmote("💤", player.centerX, player.centerY - 24, 2.0);
        refreshStats();
    }

    function workPlot(cell) {
        const act = farm.actionFor(cell.col, cell.row);
        let r;
        if (act === "till") {
            if (!tools || !tools.has("hoe")) {
                showFlash("🌾 Нужна мотыга, чтобы вспахать землю!", 1.5);
                addFloatingText("Нужна мотыга! 🌾", cell.px, cell.py - 12, "rgba(239, 68, 68, ALPHA)", 13);
                addEmote("❓", player.centerX, player.centerY - 22, 1.2);
                return;
            }
            r = farm.till(cell.col, cell.row);
            if (r.ok) {
                addFloatingText("🪓 Вспахано", cell.px, cell.py - 12, "rgba(200, 180, 140, ALPHA)");
                if (skills) skills.addXp("farming", 4);
            }
        } else if (act === "plant") {
            let chosenSeed = null;
            let chosenCrop = "veg";
            const seedTypes = [
                { seed: "seed_strawberry", crop: "strawberry" },
                { seed: "seed_tomato", crop: "tomato" },
                { seed: "seed_corn", crop: "corn" },
                { seed: "seed_pumpkin", crop: "pumpkin" },
                { seed: "seed_wheat", crop: "wheat" },
                { seed: "seeds", crop: "veg" }
            ];
            for (const st of seedTypes) {
                if (resources.count(st.seed) > 0) {
                    chosenSeed = st.seed;
                    chosenCrop = st.crop;
                    break;
                }
            }
            if (chosenSeed) {
                r = farm.plant(cell.col, cell.row, dayCount, resources.count(chosenSeed), chosenCrop);
                if (r.ok && r.consumeSeed) {
                    resources.remove(chosenSeed, 1);
                    addFloatingText(`🌱 Посажено: ${chosenCrop}`, cell.px, cell.py - 12, "rgba(120, 240, 140, ALPHA)");
                    if (skills) skills.addXp("farming", 6);
                }
            } else {
                r = farm.plant(cell.col, cell.row, dayCount, 0, "veg");
            }
        } else if (act === "water") {
            if (!tools || !tools.has("can")) {
                showFlash("🪣 Нужна лейка, чтобы полить посевы!", 1.5);
                addFloatingText("Нужна лейка! 🪣", cell.px, cell.py - 12, "rgba(239, 68, 68, ALPHA)", 13);
                addEmote("❓", player.centerX, player.centerY - 22, 1.2);
                return;
            }
            r = farm.water(cell.col, cell.row, dayCount);
            if (r.ok) {
                addFloatingText("💧 Полит", cell.px, cell.py - 12, "rgba(56, 189, 248, ALPHA)");
                addEmote("💧", cell.px, cell.py - 24, 1.2);
                if (skills) skills.addXp("farming", 5);
            }
        } else {
            r = farm.harvest(cell.col, cell.row);
            if (r.ok) {
                let amount = r.amount;
                if (tools && tools.level("can") >= 3 && Math.random() < 0.4) {
                    amount += 1;
                }
                if (skills) amount += skills.bonus("crop_yield");
                resources.add(r.crop, amount);
                r.amount = amount;
                addFloatingText(`+${amount} ${r.crop}`, cell.px, cell.py - 14, "rgba(255, 215, 0, ALPHA)", 14);
                addEmote("✨", cell.px, cell.py - 24, 1.4);
                if (skills) skills.addXp("farming", 15);
            }
        }
        if (r && r.msg) showFlash(r.msg, 1.3);
        refreshStats();
    }

    // A quick, non-pausing gather. Adds to the bag and gives feedback.
    function gatherFrom(node) {
        // Strict tool checking
        if (node.type === "tree" || node.type === "driftwood") {
            if (!tools || !tools.has("axe")) {
                showFlash("🪓 Нужен топор, чтобы рубить дерево!", 1.5);
                addFloatingText("Нужен топор! 🪓", node.px, node.py - 12, "rgba(239, 68, 68, ALPHA)", 13);
                addEmote("❓", player.centerX, player.centerY - 22, 1.2);
                return;
            }
        } else if (node.type === "rock" || node.type.startsWith("ore_") || node.type === "coal_node" || node.type === "gem_node") {
            if (!tools || !tools.has("pickaxe")) {
                showFlash("⛏️ Нужна кирка, чтобы раскалывать породу!", 1.5);
                addFloatingText("Нужна кирка! ⛏️", node.px, node.py - 12, "rgba(239, 68, 68, ALPHA)", 13);
                addEmote("❓", player.centerX, player.centerY - 22, 1.2);
                return;
            }
        }

        let toolBonus = 0;
        if (tools) {
            if (node.type === "tree" || node.type === "driftwood") toolBonus = tools.level("axe") - 1;
            else if (node.type === "rock" || node.type.startsWith("ore_") || node.type === "coal_node" || node.type === "gem_node") toolBonus = tools.level("pickaxe") - 1;
        }
        if (skills) {
            if (node.type === "tree" || node.type === "driftwood") toolBonus += skills.bonus("wood_yield");
            else if (node.type === "rock" || node.type.startsWith("ore_")) toolBonus += skills.bonus("ore_yield");
        }

        const r = node.hit(toolBonus);
        if (!r) return;
        resources.add(r.res, r.amount);

        if (skills) {
            if (node.type === "tree" || node.type === "driftwood") skills.addXp("foraging", 8);
            else if (node.type === "rock" || node.type.startsWith("ore_") || node.type === "coal_node" || node.type === "gem_node") skills.addXp("mining", 10);
            else skills.addXp("foraging", 5);
        }

        const meta = (typeof RESOURCES !== "undefined") ? RESOURCES[r.res] : null;
        const em = (meta && meta.emoji) || "📦";
        let extra = "";
        if (node.type === "bush" && Math.random() < 0.5) { resources.add("seeds", 1); extra = " 🌰+1"; }
        showFlash((r.felled ? `${em} +${r.amount} — собрано!` : `${em} +${r.amount}`) + extra, 1.2);
        addFloatingText(`+${r.amount} ${em}`, node.px, node.py - 12, "rgba(100, 255, 120, ALPHA)");
        journal.onResourceGathered && journal.onResourceGathered(r.res, r.amount);
        refreshStats();
    }

    // Fishing at the pond or ocean beach
    function fishAtPond(isOcean = false) {
        if (!tools || !tools.has("rod")) {
            showFlash("🎣 Нужна удочка, чтобы рыбачить!", 1.5);
            addFloatingText("Нужна удочка! 🎣", player.centerX, player.centerY - 16, "rgba(239, 68, 68, ALPHA)", 13);
            addEmote("❓", player.centerX, player.centerY - 22, 1.2);
            return;
        }
        const rodLv = tools ? tools.level("rod") : 1;
        const fishSys = fishing || new FishingSystem();
        const res = fishSys.catchFish(rodLv, isOcean);
        resources.add(res.res, res.amount);
        if (res.bonus) resources.add(res.bonus.res, res.bonus.amount);
        hero.addExperience(res.xp || 5);
        if (skills) skills.addXp("fishing", 12);
        const extra = res.bonus ? ` и со дна: ${res.bonus.emoji} ${res.bonus.name}` : "";
        showFlash(`🎣 ${res.msg}${extra} (+${res.xp || 5}✨)`, 2);
        addFloatingText(`+${res.amount} ${res.res}`, player.centerX, player.centerY - 16, "rgba(56, 189, 248, ALPHA)", 13);
        addEmote("🎣", player.centerX, player.centerY - 22, 1.5);
        journal.onResourceGathered && journal.onResourceGathered(res.res, res.amount);
        refreshStats();
    }

    function openInteraction(sel) {
        if (sel.kind === "npc") {
            paused = true;
            V2Menus.townsfolk(Object.assign({ npc: sel.target }, menuCtx));
            return;
        }
        const it = sel.target;
        // Doors are instant: step inside instead of opening a panel.
        if (it.action === "enter" && it.to) { loadZone(it.to, it.spawn); return; }
        if (it.action === "sleep") { sleepUntilMorning(); return; }
        if (it.action === "fishing") {
            const isOcean = it.spot === "ocean" || mapData.id === "beach";
            fishAtPond(isOcean);
            return;
        }
        if (it.action === "mine_descend") {
            const nextFl = mines ? mines.descend() : 2;
            loadZone(`mine_floor_${nextFl}`);
            showFlash(`🪜 Вы спустились на ярус ${nextFl} глубоких шахт.`, 2);
            return;
        }

        paused = true;
        const dispatch = {
            shop: V2Menus.shop,
            forge: V2Menus.forge,
            quests: V2Menus.quests,
            npc: V2Menus.dialogue,
            dungeon: V2Menus.dungeon,
            storage: V2Menus.storage,
            cooking: V2Menus.cooking,
            board: V2Menus.board,
            well: V2Menus.well,
            cat: V2Menus.cat,
            ranch: V2Menus.ranch,
            smelt: V2Menus.smelt,
            decor: V2Menus.decor,
            mines: V2Menus.mines,
            skills: V2Menus.skills,
            homestead: V2Menus.homestead
        };
        const open = dispatch[it.action];
        if (open) { open(menuCtx); return; }
        overlayBody.innerHTML = `<h2>${it.emoji} ${escapeText(it.label)}</h2>
            <p>${escapeText(describe(it.action))}</p>`;
        overlay.classList.remove("hidden");
    }

    function onDawn(newDay) {
        dayCount = newDay;
        const curWeather = weather ? weather.getWeather(dayCount) : null;
        const isRain = curWeather && curWeather.isRain;
        const isWinter = weather ? (weather.getSeason(dayCount).id === "winter") : false;

        if (ranch) ranch.onDawn();

        // Advance growing plots
        farm.onDawn((c, r) => {
            if (isRain && !isWinter) {
                farm.water(c, r, dayCount);
            }
        });
    }

    function closeInteraction() {
        overlay.classList.add("hidden");
        overlayBody.innerHTML = "";
        paused = false;
        refreshStats();
        if (input && input.consumePressed) input.consumePressed();
    }
    overlayClose.addEventListener("click", closeInteraction);
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
            closeInteraction();
        }
        // Hotbar shortcuts 1..6
        if (tools && !paused && e.key >= "1" && e.key <= "6") {
            tools.setActiveSlot(parseInt(e.key, 10) - 1);
            refreshStats();
        }
    });

    function escapeText(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function describe(action) {
        const d = {
            shop: "Добро пожаловать в деревенскую лавку! Здесь можно купить снаряжение и продать добычу.",
            forge: "Жаркий горн и наковальня. Кузнец готов улучшить твоё оружие за золото и эссенции.",
            quests: "Доска заданий: жители деревни просят о помощи.",
            npc: "Житель деревни приветливо кивает тебе.",
            dungeon: "Древние врата ведут в процедурные подземелья с опасными монстрами и сокровищами.",
            well: "Глубокий колодец со студёной водой."
        };
        return d[action] || "Интерактивный объект.";
    }

    function lightingFor(min) {
        const dawn = 5.5 * 60, dayStart = 6.5 * 60, dusk = 19.5 * 60, night = 22 * 60;
        let r = 12, g = 18, b = 45, a = 0, nightRatio = 0;

        if (min >= night || min < dawn) {
            // Deep night: dark indigo wash
            r = 8; g = 10; b = 28; a = 0.65; nightRatio = 1.0;
        } else if (min >= dawn && min < dayStart) {
            // Dawn transition: night fades away to clear day
            const t = (min - dawn) / (dayStart - dawn);
            r = 15; g = 20; b = 50; a = 0.65 * (1 - t);
            nightRatio = 1 - t;
        } else if (min >= dayStart && min < dusk) {
            // Clear, vibrant daytime: ZERO darkness overlay
            a = 0; nightRatio = 0;
        } else {
            // Dusk transition: evening falls
            const t = (min - dusk) / (night - dusk);
            r = 12; g = 18; b = 45; a = 0.65 * t;
            nightRatio = t;
        }
        return {
            r, g, b, a,
            alpha: a,
            night: nightRatio,
            color: a === 0 ? "transparent" : "#080a1c"
        };
    }

    function clockLabel(min) {
        const h = Math.floor(min / 60);
        const m = Math.floor(min % 60);
        const icon = (h >= 6 && h < 19) ? "☀️" : (h >= 19 && h < 22) ? "🌅" : "🌙";
        return `${icon} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    function update(dt) {
        const prev = clockMin;
        clockMin = (clockMin + dt * MIN_PER_SEC) % 1440;
        if (clockMin < prev) { onDawn(dayCount + 1); }
        social.setDay(dayCount);
        if (flashT > 0) flashT = Math.max(0, flashT - dt);
        if (paused) return;

        // Hotbar selection shortcuts 1..6
        if (input.wasPressed("Digit1") || input.wasPressed("Numpad1")) { tools.setActiveSlot(0); refreshStats(); }
        if (input.wasPressed("Digit2") || input.wasPressed("Numpad2")) { tools.setActiveSlot(1); refreshStats(); }
        if (input.wasPressed("Digit3") || input.wasPressed("Numpad3")) { tools.setActiveSlot(2); refreshStats(); }
        if (input.wasPressed("Digit4") || input.wasPressed("Numpad4")) { tools.setActiveSlot(3); refreshStats(); }
        if (input.wasPressed("Digit5") || input.wasPressed("Numpad5")) { tools.setActiveSlot(4); refreshStats(); }
        if (input.wasPressed("Digit6") || input.wasPressed("Numpad6")) { tools.setActiveSlot(5); refreshStats(); }

        // Open backpack/equipment with I
        if (input.wasPressed("KeyI")) {
            paused = true;
            V2Menus.inventory(menuCtx);
            input.consumePressed();
            return;
        }

        // Open Skills Panel with K
        if (input.wasPressed("KeyK")) {
            paused = true;
            V2Menus.skills(menuCtx);
            input.consumePressed();
            return;
        }

        // Open Character Customization with C
        if (input.wasPressed("KeyC")) {
            paused = true;
            V2Menus.charCreation(menuCtx);
            input.consumePressed();
            return;
        }

        // Open Homestead Panel with H
        if (input.wasPressed("KeyH")) {
            paused = true;
            V2Menus.homestead(menuCtx);
            input.consumePressed();
            return;
        }

        // Edge-triggered interaction
        if ((input.wasPressed("KeyE") || input.wasPressed("Enter") || input.wasPressed("Space")) && nearest) {
            const sel = nearest;
            if (sel.kind === "resource") {
                gatherFrom(sel.target);
            } else if (sel.kind === "farm") {
                workPlot(sel.target);
            } else if (sel.kind === "fauna") {
                interactFauna(sel.target);
            } else {
                openInteraction(sel);
            }
            input.consumePressed();
            if (sel.kind !== "resource" && sel.kind !== "farm" && sel.kind !== "fauna") return;
        }
        input.consumePressed();

        player.update(dt, input.axis(), tilemap);
        for (const e of enemies) e.update(dt, tilemap);
        for (const n of npcs) n.update(dt, tilemap, clockMin, player.box);
        for (const r of resourceNodes) r.update(dt);

        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            floatingTexts[i].t += dt;
            if (floatingTexts[i].t >= floatingTexts[i].maxT) floatingTexts.splice(i, 1);
        }
        for (let i = emotes.length - 1; i >= 0; i--) {
            emotes[i].t += dt;
            emotes[i].life -= dt;
            if (emotes[i].life <= 0) emotes.splice(i, 1);
        }

        camera.follow(player.centerX, player.centerY, tilemap.pixelWidth, tilemap.pixelHeight);
        nearest = findNearest();

        // Walking onto a portal tile travels to linked zone
        const pcol = tilemap.colAtPixel(player.centerX);
        const prow = tilemap.rowAtPixel(player.centerY);
        for (const p of portals) {
            if (p.col === pcol && p.row === prow) { loadZone(p.to, p.spawn); return; }
        }

        // Bumping into a roaming foe triggers an encounter
        const foe = detectEncounter(player.box, enemies);
        if (foe) openEncounter(foe);
    }

    function render() {
        const indoor = !!mapData.indoor;
        const light = indoor
            ? (mapData.warm ? { r: 255, g: 176, b: 88, a: 0.12, night: 0 } : { a: 0, night: 0 })
            : lightingFor(clockMin);

        const curSeason = weather ? weather.getSeason(dayCount) : { id: "spring", name: "Весна", emoji: "🌸" };
        const curW = weather ? weather.getWeather(dayCount) : { id: "sunny", name: "Солнечно", emoji: "☀️" };

        renderer.clear(camera.viewW, camera.viewH);
        renderer.drawMap(tilemap, camera, curSeason ? curSeason.id : "spring");
        renderer.drawBuildings(mapData.buildings, camera, mapData.tileSize, light.night);
        renderer.drawFarm(farm, farmPlots, camera, mapData.tileSize);
        renderer.drawFurniture(furniture, camera, mapData.tileSize, Math.floor(performance.now() / 380));
        renderer.drawResourceNodes(resourceNodes, camera);
        renderer.drawPortals(portals, camera);
        renderer.drawInteractables(interactables, camera);
        renderer.drawEnemies(enemies, camera);
        renderer.drawNPCs(npcs, camera);
        renderer.drawPlayer(player, camera);
        renderer.drawNightOverlay(light, camera, {
            player: { x: player.centerX, y: player.centerY },
            furniture,
            buildings: mapData.buildings,
            tileSize: mapData.tileSize
        });
        if (typeof renderer.drawWeather === "function" && weather && !indoor) {
            renderer.drawWeather(camera, curW.id, performance.now() / 1000);
        }
        if (typeof renderer.drawAmbient === "function") {
            renderer.drawAmbient(camera, zoneName, light, curW, curSeason);
        }
        if (typeof renderer.drawEmotes === "function") {
            renderer.drawEmotes(emotes, camera);
        }
        if (typeof renderer.drawFloatingTexts === "function") {
            renderer.drawFloatingTexts(floatingTexts, camera);
        }

        // Contextual floating action prompt over interacted target
        if (nearest && nearest.target && typeof nearest.target.px === "number") {
            const sc = camera.worldToScreen(nearest.target.px, nearest.target.py);
            ctx.save();
            ctx.font = "bold 11px sans-serif";
            const text = `[E] ${nearest.label}`;
            const tw = ctx.measureText(text).width;
            const px = Math.max(tw / 2 + 6, Math.min(camera.viewW - tw / 2 - 6, sc.x));
            const py = Math.max(16, sc.y - 24);

            ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
            ctx.strokeStyle = "#eab308";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(px - tw / 2 - 8, py - 10, tw + 16, 20, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#fef08a";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, px, py);
            ctx.restore();
        }

        if (flashT > 0) {
            hud.textContent = flash;
            hud.classList.add("active");
        } else {
            const weatherBadge = curW ? ` ${curW.emoji}` : "";
            const seasonBadge = curSeason ? `${curSeason.emoji} ` : "";
            hud.textContent = `📍 ${zoneName} · ${seasonBadge}${curSeason ? curSeason.name : "Сезон"} (День ${dayCount}) ·${weatherBadge} ${clockLabel(clockMin)} · E — действие · I — рюкзак`;
            hud.classList.remove("active");
        }
    }

    refreshStats();
    const loop = new Loop(update, render);
    loop.start();

    // Start in village
    loadZone("village");

    // Expose for testing and debugging
    window.__v2 = {
        player, camera, input, loop,
        get tilemap() { return tilemap; },
        get mapData() { return mapData; },
        social, resources, bag: resources, farm, weather,
        get npcs() { return npcs; },
        get nodes() { return resourceNodes; },
        get enemies() { return enemies; },
        get farmPlots() { return farmPlots; },
        get furniture() { return furniture; },
        get floatingTexts() { return floatingTexts; },
        get emotes() { return emotes; },
        addFloatingText, addEmote,
        requests, storage, tools, cooking, fishing,
        ranch, smelting, decor, mines, skills, homestead,
        lightingFor, interactFauna, refreshStats,
        sleepUntilMorning, fishAtPond, closeInteraction,
        get zone() { return zoneName; },
        get clock() { return clockMin; },
        get day() { return dayCount; }
    };
})();
