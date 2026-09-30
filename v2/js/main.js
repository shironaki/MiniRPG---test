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
    let mapData, tilemap, interactables, enemies, portals, zoneName;

    const player = new Player2D(0, 0, { w: 20, h: 20, speed: 130 });

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
    const menuCtx = { hero, journal, host, refresh: refreshStats };

    function refreshStats() {
        statsEl.innerHTML =
            `<span>❤️ ${Math.max(0, hero.health)}/${hero.maxHealth}</span>` +
            `<span>⚡ ${hero.energy}/${hero.maxEnergy}</span>` +
            `<span>⭐ ур.${hero.level}</span>` +
            `<span>💰 ${hero.gold}</span>` +
            `<span>☯️ ${hero.karma || 0}</span>`;
    }

    const camera = new Camera(canvas.width, canvas.height);
    const input = new Input();
    input.attach(window);
    const renderer = new Renderer(ctx);

    // Load character sprites; the renderer falls back to procedural/emoji art
    // for any that fail to load, so the game always draws something.
    (function loadSprites() {
        const sprites = {};
        ["hero", "goblin", "wolf", "skeleton"].forEach(k => {
            const img = new Image();
            img.src = "assets/sprites/" + k + ".png";
            sprites[k] = img;
        });
        renderer.sprites = sprites;
    })();

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

    function resize() {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const dpr = window.devicePixelRatio || 1;
        const ts = mapData.tileSize;
        let cw, ch, zoom;
        if (isMobile) {
            // Canvas fills the stage exactly (CSS makes #game absolute:inset:0),
            // so the whole playfield fits the screen with no page scrolling.
            cw = stage.clientWidth || window.innerWidth;
            ch = stage.clientHeight || Math.round(window.innerHeight * 0.7);
            canvas.style.width = "";
            canvas.style.height = "";
            zoom = Math.max(1, 54 / ts);
        } else {
            const w = Math.min(stage.clientWidth, 720);
            cw = w;
            ch = Math.round(w * 9 / 16);
            canvas.style.width = w + "px";
            canvas.style.height = ch + "px";
            zoom = Math.max(1, 44 / ts);
        }
        canvas.width = Math.max(1, Math.round(cw * dpr));
        canvas.height = Math.max(1, Math.round(ch * dpr));
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
        camera.resize(cw / zoom, ch / zoom);
    }
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => setTimeout(resize, 100));
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

    function findNearest() {
        let best = null, bestD = INTERACT_RADIUS;
        for (const it of interactables) {
            const d = Math.hypot(it.px - player.centerX, it.py - player.centerY);
            if (d <= bestD) { bestD = d; best = it; }
        }
        return best;
    }

    function openInteraction(it) {
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

    function update(dt) {
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
            openInteraction(nearest);
            input.consumePressed();
            return;
        }
        input.consumePressed();

        player.update(dt, input.axis(), tilemap);
        for (const e of enemies) e.update(dt, tilemap);
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
        renderer.clear(camera.viewW, camera.viewH);
        renderer.drawMap(tilemap, camera);
        renderer.drawPortals(portals, camera);
        renderer.drawInteractables(interactables, camera);
        renderer.drawEnemies(enemies, camera);
        renderer.drawPlayer(player, camera);

        hud.textContent = nearest
            ? `Нажми E — ${nearest.emoji} ${nearest.label}`
            : `📍 ${zoneName} · движение · E — действие · I — рюкзак`;
        hud.classList.toggle("active", !!nearest);
    }

    refreshStats();
    const loop = new Loop(update, render);
    loop.start();

    // Expose for debugging / future bridging.
    window.__v2 = { player, tilemap, camera, input, loop };
})();
