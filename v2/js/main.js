/**
 * v2 bootstrap — wires the canvas, world, hero, camera, input and loop.
 * Milestone 1: free-roam a tiled village with camera follow, wall collision,
 * and proximity interaction prompts. Interactions currently open an info panel;
 * later milestones bridge them into the existing battle/shop/quest systems.
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
    let mapData, tilemap, interactables, enemies, portals, zoneName, npcs, resourceNodes;

    const player = new Player2D(0, 0, { w: 20, h: 20, speed: 130 });

    // In-game clock in minutes (0..1440). A full day passes in DAY_REAL_SEC.
    let clockMin = 8 * 60;                 // start the day at 08:00
    let dayCount = 1;                      // increments each dawn (clock wrap)
    const DAY_REAL_SEC = 300;             // 5 real minutes = one full day
    const MIN_PER_SEC = 1440 / DAY_REAL_SEC;

    // Persistent social & gathering state (survive zone changes).
    const social = new Social();
    const resources = new ResourceBag();

    // Transient on-screen feedback (gathering, gifts) — fades on its own.
    let flash = "", flashT = 0;
    function showFlash(text, secs) { flash = text; flashT = secs || 1.6; }

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
            { w: 20, h: 20, kind: e.kind, emoji: e.emoji, wanderRadius: e.wanderRadius }
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
        zoneName = mapData.name || id;
        const sp = spawn || mapData.spawn;
        player.x = sp.col * ts + 6;
        player.y = sp.row * ts + 6;
        nearest = null;
        if (typeof resize === "function") resize();
        if (input && input.consumePressed) input.consumePressed();
    }

    // Persistent v1 hero drives stats/progression; Player2D handles position.
    const hero = new Player("Герой");
    const journal = new QuestJournal();
    const host = {
        player: hero,
        adjustKarma(n) { hero.karma = (hero.karma || 0) + n; }
    };
    const menuCtx = { hero, journal, host, refresh: refreshStats, social, resources };

    function refreshStats() {
        let html =
            `<span>❤️ ${Math.max(0, hero.health)}/${hero.maxHealth}</span>` +
            `<span>⚡ ${hero.energy}/${hero.maxEnergy}</span>` +
            `<span>⭐ ур.${hero.level}</span>` +
            `<span>💰 ${hero.gold}</span>` +
            `<span>☯️ ${hero.karma || 0}</span>`;
        const bag = resources.entries();
        if (bag.length) {
            const meta = (typeof RESOURCES !== "undefined") ? RESOURCES : {};
            html += `<span class="sep">·</span>` + bag.map(e =>
                `<span>${(meta[e.res] && meta[e.res].emoji) || "📦"} ${e.n}</span>`).join("");
        }
        statsEl.innerHTML = html;
    }

    const camera = new Camera(canvas.width, canvas.height);
    const input = new Input();
    input.attach(window);
    const renderer = new Renderer(ctx);

    // Hero and all mobs are drawn from code (CharacterRig / MobRig) — no image
    // files to load. Kept null so the renderer's rig paths are used.
    renderer.sprites = null;

    // On-screen touch controls → feed the same Input as the keyboard.
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

    // Immersive = touch device OR fullscreen: the canvas fills the whole stage
    // (which itself fills the viewport), so nothing ever needs page scrolling.
    function immersive() {
        return !!document.fullscreenElement ||
            window.matchMedia("(pointer: coarse)").matches;
    }

    function resize() {
        const imm = immersive();
        document.body.classList.toggle("immersive", imm);
        document.documentElement.classList.toggle("immersive", imm);
        const dpr = window.devicePixelRatio || 1;
        const ts = mapData.tileSize;
        let cw, ch, zoom;
        if (immersive()) {
            cw = stage.clientWidth || window.innerWidth;
            ch = stage.clientHeight || window.innerHeight;
            canvas.style.width = "";
            canvas.style.height = "";
            zoom = Math.max(1, 56 / ts);
        } else {
            // Desktop windowed: use most of the viewport (much bigger than before),
            // keeping a pleasant 16:9 and never overflowing width or height.
            const vw = stage.clientWidth || window.innerWidth;
            const vh = window.innerHeight;
            let w = Math.min(vw, 1200);
            let h = Math.min(Math.round(w * 9 / 16), Math.round(vh * 0.76));
            w = Math.round(h * 16 / 9);
            if (w > vw) { w = vw; h = Math.round(w * 9 / 16); }
            cw = w; ch = h;
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            zoom = Math.max(1, 46 / ts);
        }
        canvas.width = Math.max(1, Math.round(cw * dpr));
        canvas.height = Math.max(1, Math.round(ch * dpr));
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
        camera.resize(cw / zoom, ch / zoom);
    }
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => setTimeout(resize, 100));
    document.addEventListener("fullscreenchange", () => setTimeout(resize, 50));

    // Fullscreen toggle.
    (function wireFullscreen() {
        const fsBtn = document.getElementById("fsBtn");
        if (!fsBtn) return;
        fsBtn.addEventListener("click", () => {
            if (document.fullscreenElement) {
                document.exitFullscreen && document.exitFullscreen();
            } else {
                const el = document.documentElement;
                (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
            }
        });
    })();

    loadZone("village");

    // ---- Control scheme (virtual joystick <-> D-pad), remembered locally -----
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

        // Analog joystick → Input.setAnalog.
        const R = 34, DEAD = 0.18;
        let active = false, cx = 0, cy = 0;
        function point(e) { return e.touches ? (e.touches[0] || e.changedTouches[0]) : e; }
        function start(e) {
            active = true;
            const r = joystick.getBoundingClientRect();
            cx = r.left + r.width / 2; cy = r.top + r.height / 2;
            move(e); if (e.cancelable) e.preventDefault();
        }
        function move(e) {
            if (!active) return;
            const p = point(e);
            let dx = p.clientX - cx, dy = p.clientY - cy;
            const d = Math.hypot(dx, dy) || 1;
            const cl = Math.min(d, R);
            dx = dx / d * cl; dy = dy / d * cl;
            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            let nx = dx / R, ny = dy / R;
            if (Math.abs(nx) < DEAD) nx = 0;
            if (Math.abs(ny) < DEAD) ny = 0;
            input.setAnalog(nx, ny);
            if (e.cancelable) e.preventDefault();
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
            if (d <= bestD) { bestD = d; best = { kind: "npc", target: n, emoji: n.emoji, label: n.name }; }
        }
        for (const r of resourceNodes) {
            if (r.depleted) continue;
            const d = Math.hypot(r.centerX - player.centerX, r.centerY - player.centerY);
            if (d <= bestD) {
                bestD = d;
                const meta = (typeof RESOURCES !== "undefined") ? RESOURCES[r.res] : null;
                best = { kind: "resource", target: r, emoji: (meta && meta.emoji) || "🌿", label: gatherVerb(r.type) };
            }
        }
        return best;
    }

    function gatherVerb(type) {
        return type === "tree" ? "Рубить дерево"
            : type === "rock" ? "Добыть камень"
            : type === "herb" ? "Собрать травы" : "Собрать ягоды";
    }

    // A quick, non-pausing gather. Adds to the bag and gives feedback.
    function gatherFrom(node) {
        const r = node.hit();
        if (!r) return;
        resources.add(r.res, r.amount);
        const meta = (typeof RESOURCES !== "undefined") ? RESOURCES[r.res] : null;
        const em = (meta && meta.emoji) || "📦";
        showFlash(r.felled ? `${em} +${r.amount} — собрано!` : `${em} +${r.amount}`, 1.2);
        journal.onResourceGathered && journal.onResourceGathered(r.res, r.amount);
        refreshStats();
    }

    function openInteraction(sel) {
        if (sel.kind === "npc") {
            paused = true;
            V2Menus.townsfolk(Object.assign({ npc: sel.target }, menuCtx));
            return;
        }
        const it = sel.target;
        paused = true;
        const dispatch = {
            shop: V2Menus.shop,
            forge: V2Menus.forge,
            quests: V2Menus.quests,
            npc: V2Menus.dialogue,
            dungeon: V2Menus.dungeon
        };
        const open = dispatch[it.action];
        if (open) { open(menuCtx); return; }
        overlayBody.innerHTML = `<h2>${it.emoji} ${escapeText(it.label)}</h2>
            <p>${escapeText(describe(it.action))}</p>`;
        overlay.classList.remove("hidden");
    }

    function respawnHero() {
        player.x = mapData.spawn.col * mapData.tileSize + 6;
        player.y = mapData.spawn.row * mapData.tileSize + 6;
        input.consumePressed();
    }

    function openEncounter(foe) {
        paused = true;
        openBattle(hero, foe.kind, hero.level, {
            onWin(bc) {
                journal.onEnemyDefeated(bc.enemy);   // advance side quests
                foe.alive = false;          // defeated foe leaves the map
                respawnHero();
                refreshStats();
                paused = false;
            },
            onFlee() {
                foe.x = foe.homeX; foe.y = foe.homeY;
                respawnHero();
                paused = false;
            },
            onLose() {
                // Full heal + respawn: a forgiving overworld defeat for the prototype.
                hero.health = hero.maxHealth;
                foe.x = foe.homeX; foe.y = foe.homeY;
                respawnHero();
                paused = false;
            }
        });
    }
    function closeInteraction() {
        paused = false;
        overlay.classList.add("hidden");
        refreshStats();
        input.consumePressed();
    }
    overlayClose.addEventListener("click", closeInteraction);

    function describe(action) {
        switch (action) {
            case "npc": return "Староста ждёт вестей о подземелье. Здесь начнутся диалоги и главный квест.";
            case "shop": return "Лавка торговца — покупка и продажа снаряжения.";
            case "forge": return "Кузница — улучшение снаряжения эссенциями ковки.";
            case "dungeon": return "Врата испытаний — вход в процедурное подземелье.";
            case "quests": return "Доска квестов — побочные и спутниковые задания.";
            default: return "Точка интереса.";
        }
    }

    function escapeText(s) {
        return (typeof escapeHtml === "function") ? escapeHtml(s) : String(s);
    }

    // ---- day/night lighting -------------------------------------------------
    // Keyframes by hour: overlay tint {r,g,b} and alpha. Interpolated + wrapped.
    const LIGHT_KEYS = [
        { h: 0,  a: 0.60, r: 16, g: 20, b: 58 },   // deep night
        { h: 5,  a: 0.52, r: 24, g: 26, b: 72 },
        { h: 6.5, a: 0.30, r: 150, g: 90, b: 70 },  // dawn (warm)
        { h: 8,  a: 0.0,  r: 0, g: 0, b: 0 },       // morning
        { h: 17, a: 0.0,  r: 0, g: 0, b: 0 },       // day
        { h: 18.5, a: 0.30, r: 180, g: 95, b: 40 }, // dusk (orange)
        { h: 20, a: 0.44, r: 44, g: 36, b: 82 },
        { h: 22, a: 0.60, r: 16, g: 20, b: 58 },
        { h: 24, a: 0.60, r: 16, g: 20, b: 58 }
    ];
    function lightingFor(min) {
        const h = min / 60;
        let a = LIGHT_KEYS[0], b = LIGHT_KEYS[LIGHT_KEYS.length - 1];
        for (let i = 0; i < LIGHT_KEYS.length - 1; i++) {
            if (h >= LIGHT_KEYS[i].h && h <= LIGHT_KEYS[i + 1].h) { a = LIGHT_KEYS[i]; b = LIGHT_KEYS[i + 1]; break; }
        }
        const span = (b.h - a.h) || 1, t = Math.min(1, Math.max(0, (h - a.h) / span));
        const lerp = (x, y) => Math.round(x + (y - x) * t);
        const alpha = a.a + (b.a - a.a) * t;
        return { r: lerp(a.r, b.r), g: lerp(a.g, b.g), b: lerp(a.b, b.b), a: alpha, night: Math.min(1, alpha / 0.6) };
    }
    function clockLabel(min) {
        const h = Math.floor(min / 60), m = Math.floor(min % 60);
        const icon = (h >= 6 && h < 8) ? "🌅" : (h >= 8 && h < 18) ? "☀️" : (h >= 18 && h < 20) ? "🌇" : "🌙";
        return `${icon} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    function update(dt) {
        const prev = clockMin;
        clockMin = (clockMin + dt * MIN_PER_SEC) % 1440;
        if (clockMin < prev) dayCount += 1;      // wrapped past midnight → new day
        social.setDay(dayCount);
        if (flashT > 0) flashT = Math.max(0, flashT - dt);
        if (paused) return;
        // Open the backpack/equipment panel anywhere with I.
        if (input.wasPressed("KeyI")) {
            paused = true;
            V2Menus.inventory(menuCtx);
            input.consumePressed();
            return;
        }
        // Edge-triggered interaction.
        if ((input.wasPressed("KeyE") || input.wasPressed("Enter") || input.wasPressed("Space")) && nearest) {
            if (nearest.kind === "resource") {
                gatherFrom(nearest.target);      // quick action, keep playing
            } else {
                openInteraction(nearest);
            }
            input.consumePressed();
            if (nearest.kind !== "resource") return;
        }
        input.consumePressed();

        player.update(dt, input.axis(), tilemap);
        for (const e of enemies) e.update(dt, tilemap);
        for (const n of npcs) n.update(dt, tilemap, clockMin);
        for (const r of resourceNodes) r.update(dt);
        camera.follow(player.centerX, player.centerY, tilemap.pixelWidth, tilemap.pixelHeight);
        nearest = findNearest();

        // Walking onto a portal tile travels to the linked zone.
        const pcol = tilemap.colAtPixel(player.centerX);
        const prow = tilemap.rowAtPixel(player.centerY);
        for (const p of portals) {
            if (p.col === pcol && p.row === prow) { loadZone(p.to, p.spawn); return; }
        }

        // Bumping into a roaming foe triggers an encounter.
        const foe = detectEncounter(player.box, enemies);
        if (foe) openEncounter(foe);
    }

    function render() {
        // Indoor zones (the cave) ignore the outdoor day/night lighting.
        const indoor = !!mapData.indoor;
        const light = indoor ? { a: 0, night: 0 } : lightingFor(clockMin);

        renderer.clear(camera.viewW, camera.viewH);
        renderer.drawMap(tilemap, camera);
        renderer.drawBuildings(mapData.buildings, camera, mapData.tileSize, light.night);
        renderer.drawResourceNodes(resourceNodes, camera);
        renderer.drawPortals(portals, camera);
        renderer.drawInteractables(interactables, camera);
        renderer.drawEnemies(enemies, camera);
        renderer.drawNPCs(npcs, camera);
        renderer.drawPlayer(player, camera);
        renderer.drawNightOverlay(light, camera);

        if (flashT > 0) {
            hud.textContent = flash;
            hud.classList.add("active");
        } else {
            hud.textContent = nearest
                ? `Нажми E — ${nearest.emoji} ${nearest.label}`
                : `📍 ${zoneName} · День ${dayCount} · ${clockLabel(clockMin)} · E — действие · I — рюкзак`;
            hud.classList.toggle("active", !!nearest);
        }
    }

    refreshStats();
    const loop = new Loop(update, render);
    loop.start();

    // Expose for debugging / future bridging.
    window.__v2 = { player, tilemap, camera, input, loop };
})();
