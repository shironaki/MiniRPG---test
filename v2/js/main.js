/**
 * v2 bootstrap — wires the canvas, world, hero, camera, input and loop.
 * Milestone 1: free-roam a tiled village with camera follow, wall collision,
 * and proximity interaction prompts. Interactions currently open an info panel;
 * later milestones bridge them into the existing battle/shop/quest systems.
 */
(function () {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const hud = document.getElementById("hud");
    const statsEl = document.getElementById("stats");
    const overlay = document.getElementById("overlay");
    const overlayBody = document.getElementById("overlayBody");
    const overlayClose = document.getElementById("overlayClose");

    const mapData = getMap("village");
    const tilemap = new TileMap(mapData.rows, mapData.tileSize);

    const player = new Player2D(
        mapData.spawn.col * mapData.tileSize + 6,
        mapData.spawn.row * mapData.tileSize + 6,
        { w: 20, h: 20, speed: 130 }
    );

    // Resolve interactable pixel centres once.
    const interactables = (mapData.interactables || []).map(it => ({
        ...it,
        px: it.col * mapData.tileSize + mapData.tileSize / 2,
        py: it.row * mapData.tileSize + mapData.tileSize / 2
    }));

    // Spawn roaming enemies from the map data.
    const enemies = (mapData.enemies || []).map(e => new Enemy2D(
        e.col * mapData.tileSize + 6,
        e.row * mapData.tileSize + 6,
        { w: 20, h: 20, kind: e.kind, emoji: e.emoji, wanderRadius: e.wanderRadius }
    ));

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

    let paused = false;
    let nearest = null;
    const INTERACT_RADIUS = 44;

    function resize() {
        const wrap = canvas.parentElement;
        const w = Math.min(wrap.clientWidth, 720);
        const h = Math.round(w * 9 / 16);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        camera.resize(w, h);
    }
    window.addEventListener("resize", resize);
    resize();

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

        // Bumping into a roaming foe triggers an encounter.
        const foe = detectEncounter(player.box, enemies);
        if (foe) openEncounter(foe);
    }

    function render() {
        renderer.clear(camera.viewW, camera.viewH);
        renderer.drawMap(tilemap, camera);
        renderer.drawInteractables(interactables, camera);
        renderer.drawEnemies(enemies, camera);
        renderer.drawPlayer(player, camera);

        hud.textContent = nearest
            ? `Нажми E — ${nearest.emoji} ${nearest.label}`
            : "WASD / стрелки — движение · E — действие · I — рюкзак";
        hud.classList.toggle("active", !!nearest);
    }

    refreshStats();
    const loop = new Loop(update, render);
    loop.start();

    // Expose for debugging / future bridging.
    window.__v2 = { player, tilemap, camera, input, loop };
})();
