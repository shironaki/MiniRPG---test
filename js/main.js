const game =
    new Game();


// =============================================
// ОБЩИЕ ФУНКЦИИ
// =============================================

let previousScreen = "menuScreen";

function showScreen(id) {

    // Remember the last "real" screen so Settings can return to it.
    if (id !== "settingsScreen") previousScreen = id;

    // Progressive UI: the player panel and journal only exist once you're
    // actually in a run. The menu and end screens stay clean and minimal.
    const gameRoot = document.getElementById("game");
    if (gameRoot) {
        if (id === "menuScreen" || id === "endScreen") gameRoot.classList.remove("playing");
        else if (id !== "settingsScreen") gameRoot.classList.add("playing");
    }

    document
        .querySelectorAll(".screen")
        .forEach(screen => {

            screen.classList.add(
                "hidden"
            );
        });


    const target = document.getElementById(id);
    target.classList.remove("hidden");

    // Retrigger the entrance animation on each switch.
    target.classList.remove("screenEnter");
    void target.offsetWidth; // reflow so the animation can replay
    target.classList.add("screenEnter");
}


function addLog(message) {

    const log =
        document.getElementById(
            "log"
        );


    const line =
        document.createElement(
            "div"
        );


    line.innerHTML =
        message;


    log.prepend(line);
}


// =============================================
// НОВАЯ ИГРА
// =============================================

document
    .getElementById("newGameButton")
    .addEventListener(
        "click",
        () => {

            game.start();

        }
    );


const continueButton =
    document.getElementById("continueGameButton");

continueButton.addEventListener("click", () => {
    if (!game.resume()) {
        alert("💾 Сохранение ещё не найдено.");
        refreshContinueButton();
    }
});

// Reflect save availability so players aren't offered a dead "Continue".
function refreshContinueButton() {
    const hasSave = Boolean(game.saveSystem.load()?.player);
    continueButton.disabled = !hasSave;
    continueButton.title = hasSave
        ? "Продолжить сохранённое приключение"
        : "Сохранение ещё не найдено";
}

refreshContinueButton();

// =============================================
// КАК ИГРАТЬ
// =============================================

document
    .getElementById("helpButton")
    .addEventListener(
        "click",
        () => {

            alert(`

MINI RPG 9.0

🎮 Создай героя.

🏘️ В городе:
- разговаривай с NPC
- бери квесты
- покупай предметы
- управляй инвентарём

🗺️ В мире:
- перемещайся по направлениям
- исследуй комнаты
- в каждой комнате есть одна ценная находка или опасность
- используй новые выходы, чтобы исследовать другие ветки
- собери 3 руны, чтобы открыть сокровищницу
- каждую руну стережёт мини-босс — победи его, чтобы забрать руну

⚔️ В бою:
- атакуй
- лечись
- защищайся
- пытайся сбежать: неудача даёт врагу удар

⚠️ Ловушки:
- обезвреживай их на удачу
- успешные попытки повышают навык механика

💥 Критический удар: 15%

💾 Прогресс автоматически сохраняется в браузере.

💀 Если HP станет 0 —
игра закончится.

🏆 Найди сокровище
и заверши приключение!

            `);

        }
    );


// =============================================
// NPC
// =============================================

document
    .getElementById("npcButton")
    .addEventListener(
        "click",
        () => {

            showScreen(
                "npcScreen"
            );


            document
                .getElementById(
                    "npcDialogue"
                )
                .innerHTML =
                    game.npc.talk(
                        game.player,
                        game.quest
                    );
        }
    );


// =============================================
// ПОЛУЧИТЬ КВЕСТ
// =============================================

document
    .getElementById("npcQuestButton")
    .addEventListener(
        "click",
        () => {

            if (
                !game.quest.active
            ) {

                addLog(
                    game.quest.start()
                );
            }


            document
                .getElementById(
                    "npcDialogue"
                )
                .innerHTML =
                    game.npc.talk(
                        game.player,
                        game.quest
                    );


            renderQuest();
            refreshMenus();
        }
    );


// =============================================
// КВЕСТЫ
// =============================================

document
    .getElementById("questButton")
    .addEventListener(
        "click",
        () => {

            showScreen(
                "questScreen"
            );

            renderQuest();
        }
    );


// =============================================
// НАВЫКИ (ПЕРКИ)
// =============================================

document
    .getElementById("perkButton")
    .addEventListener("click", openPerks);

document
    .getElementById("perkBackButton")
    .addEventListener("click", () => showScreen("villageScreen"));


// =============================================
// КУЗНИЦА
// =============================================

document
    .getElementById("forgeButton")
    .addEventListener("click", openForge);

document
    .getElementById("forgeBackButton")
    .addEventListener("click", () => showScreen("villageScreen"));


// Progressive disclosure of village options: the quest board appears after the
// Elder's call; the perks screen appears once you have a point (or a perk).
function refreshMenus() {
    const questBtn = document.getElementById("questButton");
    if (questBtn) {
        const unlocked = Boolean(game && game.quest && game.quest.active);
        questBtn.style.display = unlocked ? "" : "none";
    }
    const perkBtn = document.getElementById("perkButton");
    if (perkBtn) {
        const p = game && game.player;
        const unlocked = p && (((p.perkPoints || 0) > 0) || (p.perks && Object.keys(p.perks).length > 0));
        perkBtn.style.display = unlocked ? "" : "none";
    }
    const forgeBtn = document.getElementById("forgeButton");
    if (forgeBtn) {
        const p = game && game.player;
        const unlocked = p && typeof Craft !== "undefined" && Craft.essenceCount(p) > 0;
        forgeBtn.style.display = unlocked ? "" : "none";
    }
}


function openPerks() {
    showScreen("perkScreen");
    renderPerks();
}

function renderPerks() {
    const pointsEl = document.getElementById("perkPoints");
    if (pointsEl) pointsEl.innerHTML = `🧠 Очки навыков: <strong>${(game.player && game.player.perkPoints) || 0}</strong>`;
    const list = document.getElementById("perkList");
    if (!list) return;
    const defs = (typeof GAME_DATA !== "undefined" && GAME_DATA.perks) || [];
    list.innerHTML = defs.map(def => {
        const rank = (game.player.perks && game.player.perks[def.id]) || 0;
        const maxed = rank >= def.maxRank;
        const afford = (game.player.perkPoints || 0) >= (def.cost || 1);
        const pips = "●".repeat(rank) + "○".repeat(def.maxRank - rank);
        const action = maxed
            ? `<span class="perkMax">МАКС</span>`
            : `<button class="perkBuy" onclick="buyPerk('${def.id}')"${afford ? "" : " disabled"}>Улучшить</button>`;
        return `<div class="perkCard ${maxed ? "maxed" : ""}">
            <strong>${def.emoji} ${def.name}</strong>
            <span class="perkPips">${pips}</span>
            <p>${def.desc}</p>
            ${action}
        </div>`;
    }).join("");
}

function buyPerk(id) {
    const res = game.buyPerk(id);
    if (res.success) {
        addLog(`🧠 Навык улучшен: ${res.def.emoji} ${res.def.name} (ранг ${res.rank}).`);
        if (typeof sfx !== "undefined") sfx.play("relic");
    } else if (res.message) {
        addLog(`⚠️ ${res.message}`);
    }
    game.updateUI();
    renderPerks();
}


// =============================================
// КУЗНИЦА (КРАФТ / РЕДКОСТЬ)
// =============================================

function forgeItems() {
    // Every upgradeable piece the player owns: equipped slots + inventory gear.
    const p = game.player;
    const equipped = Object.values(p.equipment || {}).filter(Boolean);
    const bag = (p.inventory || []).filter(i => i.isEquipment && i.isEquipment());
    return equipped.concat(bag);
}

function openForge() {
    showScreen("forgeScreen");
    renderForge();
}

function renderForge() {
    const p = game.player;
    const resEl = document.getElementById("forgeResources");
    if (resEl) resEl.innerHTML = `🔩 Эссенции: <strong>${Craft.essenceCount(p)}</strong> &nbsp;·&nbsp; 💰 Золото: <strong>${p.gold}</strong>`;
    const list = document.getElementById("forgeList");
    if (!list) return;

    const items = forgeItems();
    game._forgeItems = items;
    if (!items.length) {
        list.innerHTML = `<p class="muted">Нет снаряжения для улучшения. Найдите или купите оружие и броню.</p>`;
        return;
    }

    list.innerHTML = items.map((item, idx) => {
        const info = Craft.rarityInfo(item.rarity || "common");
        const next = Craft.nextRarity(item.rarity || "common");
        const bonus = item.attackBonus ? `⚔️ +${item.attackBonus}` : (item.defenseBonus ? `🛡️ +${item.defenseBonus}` : "");
        let action;
        if (!next) {
            action = `<span class="perkMax">МАКС</span>`;
        } else {
            const cost = Craft.upgradeCost(item);
            const afford = p.gold >= cost.gold && Craft.essenceCount(p) >= cost.essence;
            action = `<button class="perkBuy" onclick="upgradeItem(${idx})"${afford ? "" : " disabled"}>💰${cost.gold} · 🔩${cost.essence}</button>`;
        }
        return `<div class="forgeCard" style="border-left-color:${info.color}">
            <strong>${item.emoji} ${item.name}</strong>
            <span class="rarityTag" style="color:${info.color}">${info.emoji} ${info.label}</span>
            <span class="forgeBonus">${bonus}</span>
            ${action}
        </div>`;
    }).join("");
}

function upgradeItem(idx) {
    const item = (game._forgeItems || [])[idx];
    if (!item) return;
    const res = Craft.upgrade(game.player, item);
    if (res.success) {
        addLog(`🔨 Улучшено: ${item.emoji} ${item.name}!`);
        if (typeof sfx !== "undefined") sfx.play("relic");
    } else if (res.message) {
        addLog(`⚠️ ${res.message}`);
    }
    game.updateUI();
    renderForge();
}


function renderQuest() {

    const journalHtml = game.journal ? game.journal.render(game.player) : "";

    document
        .getElementById(
            "questList"
        )
        .innerHTML =
            game.quest.render() + journalHtml;
}


function acceptQuest(id) {
    if (!game.journal) return;
    const def = game.journal.accept(id, game.player);
    if (def) {
        addLog(`📜 Взято задание: ${def.title}`);
        if (typeof sfx !== "undefined") sfx.play("relic");
    }
    game.updateUI();
    renderQuest();
}


function claimQuest(id) {
    if (!game.journal) return;
    const res = game.journal.claim(id, game);
    if (res) {
        const r = res.reward;
        const parts = [];
        if (r.gold) parts.push(`💰 +${r.gold}`);
        if (r.xp) parts.push(`✨ +${r.xp} XP`);
        if (r.karma) parts.push(`☯️ ${r.karma > 0 ? "+" : ""}${r.karma}`);
        if (r.affinity) parts.push(`❤ +${r.affinity}`);
        addLog(`🏆 Награда за «${res.def.title}»: ${parts.join(", ")}`);
        res.levelMsgs.forEach(m => addLog(m));
        if (typeof sfx !== "undefined") sfx.play("win");
    }
    game.updateUI();
    renderQuest();
}


// =============================================
// МАГАЗИН
// =============================================

document
    .getElementById("shopButton")
    .addEventListener(
        "click",
        () => {

            showShop();

        }
    );


function showShop() {

    showScreen(
        "shopScreen"
    );


    document
        .getElementById(
            "shopGold"
        )
        .innerHTML =
            `💰 Золото: ${game.player.gold}`;


    document
        .getElementById(
            "shopItems"
        )
        .innerHTML = `

            ${game.shop.renderShop()}

            <button
                onclick="showSellItems()"
            >
                💰 Продать предметы
            </button>

        `;
}


function buyItem(index) {

    const item =
        game.shop.items[index];


    const result =
        game.shop.buy(item);


    addLog(
        result.message
    );


    showShop();

    game.updateUI();
}


function showSellItems() {

    showScreen(
        "shopScreen"
    );


    document
        .getElementById(
            "shopGold"
        )
        .innerHTML =
            `💰 Золото: ${game.player.gold}`;


    document
        .getElementById(
            "shopItems"
        )
        .innerHTML = `

            <h3>
                💰 Продажа
            </h3>

            ${game.shop.renderPlayerItems()}

            <button
                onclick="showShop()"
            >
                🛒 Покупки
            </button>

        `;
}


function sellItem(index) {

    const item =
        game.player.inventory[index];


    const result =
        game.shop.sell(item);


    addLog(
        result.message
    );


    showSellItems();

    game.updateUI();
}


// =============================================
// ИНВЕНТАРЬ
// =============================================

document
    .getElementById("inventoryButton")
    .addEventListener(
        "click",
        showInventory
    );


function showInventory() {

    showScreen(
        "inventoryScreen"
    );


    document
        .getElementById(
            "inventoryList"
        )
        .innerHTML =
            game.inventory.render();
}


function inventoryUse(index) {

    const item =
        game.inventory.getItems()[index];


    const result =
        game.inventory.use(item);


    addLog(
        result.message
    );


    showInventory();

    game.updateUI();
}


function inventoryRemove(index) {

    const item =
        game.inventory.getItems()[index];


    if (
        game.inventory.remove(item)
    ) {

        addLog(
            `🗑️ ${item.name} удалён.`
        );
    }


    showInventory();
}


// =============================================
// МИР
// =============================================

document
    .getElementById("worldButton")
    .addEventListener(
        "click",
        showWorld
    );


function showWorld() {

    showScreen(
        "worldScreen"
    );


    renderWorld();
}


function renderWorld() {

    const world = game.world;
    const location = world.getCurrentLocation();
    const coords = world.coords;

    // Bounding box of the spatial layout.
    const cells = Object.values(coords);
    const minX = Math.min(...cells.map(c => c.x));
    const maxX = Math.max(...cells.map(c => c.x));
    const minY = Math.min(...cells.map(c => c.y));
    const maxY = Math.max(...cells.map(c => c.y));

    const map = document.getElementById("miniMap");
    map.className = "worldMapGrid";
    map.style.gridTemplateColumns = `repeat(${maxX - minX + 1}, 1fr)`;
    map.style.gridTemplateRows = `repeat(${maxY - minY + 1}, 1fr)`;

    map.innerHTML = Object.keys(world.rooms).map(id => {
        const c = coords[id];
        if (!c) return "";

        const col = c.x - minX + 1;      // x → column (west→east)
        const row = maxY - c.y + 1;      // y → row (north on top)
        const pos = `grid-column:${col};grid-row:${row}`;

        // Fog of war: undiscovered rooms are hidden behind "?".
        if (!world.isVisible(id)) {
            return `<div class="mapCell fog" style="${pos}">❓</div>`;
        }

        const room = world.rooms[id];
        const isCurrent = id === world.currentLocation;
        const reachable = world.directionTo(id) !== null; // adjacent to current
        const locked = id === "treasury" && world.relics.length < 3;

        const status = id === "treasury"
            ? `🔒 Руны ${world.relics.length}/3`
            : room.cleared ? "Исследовано"
            : room.visited ? "Открыто"
            : "Неизведано";

        const smallText = isCurrent ? "📍 ТЫ ЗДЕСЬ" : status;

        const classes = [
            "mapCell", "mapRoom",
            isCurrent ? "current" : "",
            room.cleared ? "cleared" : "",
            !room.visited && !isCurrent ? "undiscovered" : "",
            reachable && !isCurrent ? "reachable" : "",
            locked ? "locked" : ""
        ].filter(Boolean).join(" ");

        const clickable = reachable && !isCurrent;
        const onclick = clickable ? ` onclick="moveToRoom('${id}')"` : "";

        const zoneAccent = ((typeof GAME_DATA !== "undefined" && GAME_DATA.zones && GAME_DATA.zones[id]) || {}).accent || "#3a4a63";

        const badge = roomBadge(room, world);
        const badgeHtml = badge ? `<em class="mapBadge">${badge}</em>` : "";
        const markerHtml = isCurrent ? `<em class="mapMarker">📍</em>` : "";
        const thumbHtml = mapCreatureThumb(room);

        return `<div class="${classes}" data-room="${id}" style="${pos};--cell-accent:${zoneAccent}" title="${room.name}"${onclick}>
            ${markerHtml}
            ${thumbHtml || badgeHtml}
            <span>${room.name}</span>
            <small>${smallText}</small>
        </div>`;
    }).join("");

    drawMapConnectors(map);

    document
        .getElementById("worldDescription")
        .innerHTML = `
            <h3>${location.name}</h3>
            <p>${location.description}</p>
            <p>✨ Руны для сокровищницы: ${world.relics.length}/3</p>
            <p class="mapHint">👆 Нажми на соседнюю комнату — или используй стрелки / WASD / свайпы.</p>
        `;
}

// Small creature sprite for a map cell when a fightable foe is present.
// Returns "" (falls back to the emoji badge) when there is nothing to show.
function mapCreatureThumb(room) {
    let key = null;
    if (room.event === "enemy" && !room.cleared && room.enemyType) key = room.enemyType;
    else if (room.event === "miniboss" && room.guardianType && !room.guardianDefeated) key = room.guardianType;
    else if (room.event === "boss") key = "boss";
    if (!key || typeof game === "undefined" || !game.spriteFor) return "";
    const path = game.spriteFor("enemy", key);
    return path ? `<img class="mapThumb" src="${path}" alt="" onerror="this.remove()">` : "";
}

// Status badge for a map cell: what a discovered room currently holds.
function roomBadge(room, world) {
    if (room.id === "treasury") {
        return world.relics.length >= 3 ? "👑" : "🔒";
    }
    if (!room.explored) return "";              // discovered on the map but not entered/searched
    if (room.cleared) return "✅";
    switch (room.event) {
        case "chest": return room.chest && !room.chest.opened ? "💰" : "✅";
        case "trap": return room.trap && !room.trap.triggered && !room.trap.disarmed ? "⚠️" : "✅";
        case "relic": return "✨";
        case "rest": return "🔥";
        case "recruit": return "🤝";
        case "wanderer": return "🧍";
        case "miniboss": return "🗿";
        case "enemy": return "👹";
        case "boss": return "👑";
        default: return "";
    }
}

// Draw connector lines between centres of connected, visible rooms.
// Purely decorative; safely no-ops outside a real DOM (tests) or when hidden.
function drawMapConnectors(map) {
    if (!document.createElementNS || typeof map.querySelectorAll !== "function") return;

    const world = game.world;
    const width = map.clientWidth;
    const height = map.clientHeight;
    if (!width || !height) return;

    const cells = {};
    map.querySelectorAll("[data-room]").forEach(cell => { cells[cell.dataset.room] = cell; });

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "mapLines");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    const drawn = new Set();
    Object.keys(world.connections).forEach(id => {
        const a = cells[id];
        if (!a || !world.isVisible(id)) return;
        Object.values(world.connections[id]).forEach(dest => {
            if (!dest) return;
            const key = [id, dest].sort().join("|");
            if (drawn.has(key)) return;
            const b = cells[dest];
            if (!b || !world.isVisible(dest)) return;
            drawn.add(key);

            const line = document.createElementNS(NS, "line");
            line.setAttribute("x1", a.offsetLeft + a.offsetWidth / 2);
            line.setAttribute("y1", a.offsetTop + a.offsetHeight / 2);
            line.setAttribute("x2", b.offsetLeft + b.offsetWidth / 2);
            line.setAttribute("y2", b.offsetTop + b.offsetHeight / 2);
            svg.appendChild(line);
        });
    });

    map.insertBefore(svg, map.firstChild);
}

// Click-to-move on the map: one step to an adjacent, connected room only.
function moveToRoom(id) {
    const result = game.world.moveTo(id);
    if (!result.success) {
        addLog(result.message);
        return;
    }
    game.bumpStat("steps");
    addLog(`🗺️ Ты переместился: ${result.room.name}`);
    renderLocation();
    showScreen("locationScreen");
}

function inventoryUnequip(slot) {
    const result = game.player.unequip(slot);
    addLog(result.message);
    showInventory();
    game.updateUI();
}


// =============================================
// ПЕРЕМЕЩЕНИЕ
// =============================================

document
    .querySelectorAll(
        "[data-direction]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                movePlayer(
                    button.dataset.direction
                );

            }
        );

    });


function movePlayer(direction) {

    const result = game.world.move(direction);

    if (!result.success) {

        addLog(result.message);

        return;
    }

    game.bumpStat("steps");

    addLog(
        `🗺️ Ты переместился: ${result.room.name}`
    );

    renderLocation();

    showScreen("locationScreen");
}

// =============================================
// УНИВЕРСАЛЬНОЕ УПРАВЛЕНИЕ
// PC / LAPTOP / ANDROID / iOS
// =============================================

const keyboardDirections = {
    ArrowUp: "north",
    ArrowDown: "south",
    ArrowLeft: "west",
    ArrowRight: "east",

    w: "north",
    W: "north",

    s: "south",
    S: "south",

    a: "west",
    A: "west",

    d: "east",
    D: "east"
};


// ---------------------------------------------
// КЛАВИАТУРА
// ---------------------------------------------

document.addEventListener("keydown", event => {

    // Не мешаем вводу текста
    const tag = event.target.tagName;

    if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
    ) {
        return;
    }

    const direction =
        keyboardDirections[event.key];

    if (!direction) {
        return;
    }

    // Чтобы стрелки не прокручивали страницу
    event.preventDefault();

    // Не двигаем персонажа во время боя,
    // в магазине, инвентаре и т.д.
    const worldScreen =
        document.getElementById("worldScreen");

    if (
        !worldScreen ||
        worldScreen.classList.contains("hidden")
    ) {
        return;
    }

    movePlayer(direction);
});


// ---------------------------------------------
// СВАЙПЫ НА ТЕЛЕФОНЕ / ПЛАНШЕТЕ
// ---------------------------------------------

let touchStartX = null;
let touchStartY = null;

const worldScreen =
    document.getElementById("worldScreen");

if (worldScreen) {

    worldScreen.addEventListener(
        "pointerdown",
        event => {

            if (
                event.pointerType !== "touch"
            ) {
                return;
            }

            touchStartX =
                event.clientX;

            touchStartY =
                event.clientY;
        }
    );


    worldScreen.addEventListener(
        "pointerup",
        event => {

            if (
                event.pointerType !== "touch"
            ) {
                return;
            }

            if (
                touchStartX === null ||
                touchStartY === null
            ) {
                return;
            }

            const dx =
                event.clientX -
                touchStartX;

            const dy =
                event.clientY -
                touchStartY;

            touchStartX = null;
            touchStartY = null;

            const threshold = 35;

            if (
                Math.abs(dx) < threshold &&
                Math.abs(dy) < threshold
            ) {
                return;
            }

            if (
                Math.abs(dx) >
                Math.abs(dy)
            ) {

                movePlayer(
                    dx > 0
                        ? "east"
                        : "west"
                );

            } else {

                movePlayer(
                    dy > 0
                        ? "south"
                        : "north"
                );
            }
        }
    );
}

// =============================================
// ЛОКАЦИЯ
// =============================================

// Swap a broken/missing sprite <img> for its emoji fallback.
function spriteFallback(img, emoji) {
    const div = document.createElement("div");
    div.className = "fighterEmoji";
    div.textContent = emoji;
    if (img && img.replaceWith) img.replaceWith(div);
}

// Render the unlocked skill buttons for the current battle, disabling any the
// player can't currently afford.
function renderBattleSkills() {
    const box = document.getElementById("battleSkills");
    if (!box) return;
    const skills = (typeof GAME_DATA !== "undefined" && GAME_DATA.skills) || {};
    const p = game.player;
    if (!p || !game.battle) { box.innerHTML = ""; return; }
    box.innerHTML = "";
    Object.keys(skills).forEach(id => {
        const s = skills[id];
        if (p.level < s.level) return; // not yet unlocked
        const btn = document.createElement("button");
        btn.className = "skillButton";
        btn.innerHTML = `${s.emoji} ${s.name} <small>⚡${s.cost}</small>`;
        btn.title = s.desc || "";
        btn.disabled = (p.energy || 0) < s.cost;
        btn.onclick = () => useSkill(id);
        box.appendChild(btn);
    });
}

function useSkill(id) {
    if (!game.battle) return;
    const skill = ((typeof GAME_DATA !== "undefined" && GAME_DATA.skills) || {})[id];
    const res = game.battle.playerUseSkill(id);
    if (res && res.success) {
        sfx.play(skill && skill.type === "heal" ? "heal" : "attack");
    }
    if (game.gameEnded) sfx.play("lose");
    else if (!game.battle) sfx.play("win"); // enemy defeated
    if (game.battle) {
        game.showEnemy();
        renderBattleSkills();
    }
    game.updateUI();
}

// Pick the sprite that best represents what's happening in a room:
// the lurking creature, a recruitable ally, or the hero exploring.
function locationArtSubject(room) {
    const enemies = (typeof GAME_DATA !== "undefined" && GAME_DATA.enemies) || {};
    if (room.event === "enemy" && !room.cleared && room.enemyType) {
        return { kind: "enemy", key: room.enemyType, emoji: (enemies[room.enemyType] || {}).emoji || "👹", frame: "danger" };
    }
    if (room.event === "miniboss" && room.guardianType && !room.guardianDefeated) {
        return { kind: "enemy", key: room.guardianType, emoji: (enemies[room.guardianType] || {}).emoji || "🗿", frame: "danger" };
    }
    if (room.event === "boss") {
        return { kind: "enemy", key: "boss", emoji: "👑", frame: "danger" };
    }
    if (room.event === "recruit" && !room.recruitResolved && room.recruitType) {
        const a = (typeof ALLIES !== "undefined" && ALLIES[room.recruitType]) ? ALLIES[room.recruitType]() : null;
        return { kind: "ally", key: room.recruitType, emoji: a ? a.emoji : "🤝", frame: "friendly" };
    }
    return { kind: "hero", key: "hero", emoji: "🧑", frame: "calm" };
}

function renderLocationArt(room) {
    const box = document.getElementById("locationArt");
    if (!box) return;
    const subject = locationArtSubject(room);
    const path = (typeof game !== "undefined" && game.spriteFor) ? game.spriteFor(subject.kind, subject.key) : null;
    const art = path
        ? `<img class="locationSprite" src="${path}" alt="" onerror="spriteFallback(this,'${subject.emoji}')">`
        : `<div class="fighterEmoji">${subject.emoji}</div>`;
    box.className = `locationArt ${subject.frame}`;
    box.innerHTML = art;
}

function renderLocation() {

    const room =
        game.world.getCurrentRoom();


    // Tint the location screen with the zone's accent colour.
    const zone = (typeof GAME_DATA !== "undefined" && GAME_DATA.zones && GAME_DATA.zones[room.id]) || null;
    const locScreen = document.getElementById("locationScreen");
    if (locScreen && zone && locScreen.style && locScreen.style.setProperty) {
        locScreen.style.setProperty("--zone-accent", zone.accent);
    }

    renderLocationArt(room);


    document
        .getElementById(
            "locationName"
        )
        .textContent =
            room.name;


    document
        .getElementById(
            "locationDescription"
        )
        .textContent =
            room.description;


    const actions =
        document.getElementById(
            "locationActions"
        );

    const exits = document.getElementById("locationExits");
    const directions = { north: "↑ Север", south: "↓ Юг", east: "→ Восток", west: "← Запад" };
    exits.innerHTML = Object.entries(game.world.connections[room.id])
        .filter(([, destination]) => destination)
        .map(([direction, destination]) => `<button class="exitButton" onclick="movePlayer('${direction}')">${directions[direction]} · ${game.world.rooms[destination].name}</button>`)
        .join("");


    actions.innerHTML = "";


    /*
    ========================================
    ЕСЛИ КОМНАТА ЕЩЁ НЕ ИССЛЕДОВАНА
    ========================================
    */

    if (!room.explored) {

        const exploreButton =
            document.createElement(
                "button"
            );


        exploreButton.textContent =
            "🔎 Исследовать";


        exploreButton.onclick =
            exploreRoom;


        actions.appendChild(
            exploreButton
        );


        return;
    }


    /*
    ========================================
    ЕСЛИ В КОМНАТЕ СУНДУК
    ========================================
    */

    if (
        room.event === "chest" &&
        room.chest &&
        !room.chest.opened
    ) {

        const chestButton =
            document.createElement(
                "button"
            );


        chestButton.textContent =
            "📦 Открыть сундук";


        chestButton.onclick =
            openChest;


        actions.appendChild(
            chestButton
        );


        return;
    }


    /*
    ========================================
    ЛОВУШКА
    ========================================
    */

    if (
        room.event === "trap" &&
        room.trap &&
        !room.trap.triggered &&
        !room.trap.disarmed
    ) {

        const disarmButton = document.createElement("button");
        disarmButton.textContent = `🧰 Обезвредить (${room.trap.chance(game.player)}%)`;
        disarmButton.onclick = disarmTrap;
        actions.appendChild(disarmButton);

        const trapButton =
            document.createElement(
                "button"
            );


        trapButton.textContent =
            "⚠️ Рискнуть и пройти";


        trapButton.onclick =
            activateTrap;


        actions.appendChild(
            trapButton
        );


        return;
    }


    /*
    ========================================
    БОСС
    ========================================
    */

    if (
        room.event === "boss"
    ) {

        const bossButton =
            document.createElement(
                "button"
            );


        bossButton.textContent =
            "👑 Сразиться со Стражем";


        bossButton.onclick =
            startBossBattle;


        actions.appendChild(
            bossButton
        );


        return;
    }

    if (room.event === "bossLocked") {
        actions.innerHTML = `<div class="locationEmpty">🔒 Руны: ${game.world.relics.length}/3</div>`;
        const sealButton = document.createElement("button");
        sealButton.textContent = "✨ Проверить печать снова";
        sealButton.onclick = exploreRoom;
        actions.appendChild(sealButton);
        return;
    }

    if (room.event === "relic") {
        const relicButton = document.createElement("button");
        relicButton.textContent = "✨ Забрать руну";
        relicButton.onclick = claimRelic;
        actions.appendChild(relicButton);
        return;
    }

    if (room.event === "rest") {
        const restButton = document.createElement("button");
        restButton.textContent = "🔥 Отдохнуть у огня";
        restButton.onclick = restAtCamp;
        actions.appendChild(restButton);
        return;
    }

    // Recruit a companion.
    if (room.event === "recruit" && !room.recruitResolved) {
        const template = (typeof ALLIES !== "undefined" && ALLIES[room.recruitType]) ? ALLIES[room.recruitType]() : null;
        const name = template ? `${template.emoji} ${template.name}` : "Союзник";
        const note = document.createElement("div");
        note.className = "locationChoice";
        note.innerHTML = `<p>🤝 ${name} готов присоединиться к тебе.${game.player.ally ? "<br><small>Он заменит текущего спутника.</small>" : ""}</p>`;
        actions.appendChild(note);

        const joinButton = document.createElement("button");
        joinButton.textContent = "🤝 Взять в отряд";
        joinButton.onclick = recruitHere;
        actions.appendChild(joinButton);

        const declineButton = document.createElement("button");
        declineButton.textContent = "🚶 Отказаться";
        declineButton.onclick = declineRecruit;
        actions.appendChild(declineButton);
        return;
    }

    // Wandering traveller: a moral choice with consequences.
    if (room.event === "wanderer" && !room.wandererResolved) {
        const note = document.createElement("div");
        note.className = "locationChoice";
        note.innerHTML = `<p>🧍 Измождённый путник просит о помощи. Как поступишь?</p>`;
        actions.appendChild(note);

        const helpButton = document.createElement("button");
        helpButton.textContent = "❤️ Помочь (−15 💰)";
        helpButton.onclick = () => resolveWanderer("help");
        actions.appendChild(helpButton);

        const robButton = document.createElement("button");
        robButton.textContent = "🗡️ Ограбить";
        robButton.onclick = () => resolveWanderer("rob");
        actions.appendChild(robButton);

        const ignoreButton = document.createElement("button");
        ignoreButton.textContent = "🚶 Пройти мимо";
        ignoreButton.onclick = () => resolveWanderer("ignore");
        actions.appendChild(ignoreButton);
        return;
    }

    // Enemy still lurking here (e.g. after a successful flee): let the player re-engage.
    if (room.event === "enemy" && !room.cleared) {
        const fightButton = document.createElement("button");
        fightButton.textContent = "⚔️ Враг всё ещё здесь — атаковать";
        fightButton.onclick = startRandomEnemy;
        actions.appendChild(fightButton);
        return;
    }

    // Relic guardian still blocking (first visit or after a flee).
    if (room.event === "miniboss" && !room.guardianDefeated) {
        const guardianButton = document.createElement("button");
        guardianButton.textContent = "⚔️ Сразиться со стражем руны";
        guardianButton.onclick = startMiniboss;
        actions.appendChild(guardianButton);
        return;
    }

     /*
    ========================================
    СОКРОВИЩЕ
    ========================================
    */

    if (
        room.event === "treasure"
    ) {

        const treasureButton =
            document.createElement(
                "button"
            );


        treasureButton.textContent =
            "💎 Забрать сокровище";


        treasureButton.onclick =
            () => {

                game.world.treasureFound =
                    true;


                game.player.gold +=
                    500;


                addLog(
                    "💎 Ты нашёл легендарное сокровище!"
                );


                sfx.play("win");

                game.victory();

            };


        actions.appendChild(
            treasureButton
        );


        return;
    }       
    

    /*
    ========================================
    КОМНАТА ОЧИЩЕНА
    ========================================
    */

    actions.innerHTML = `<div class="locationEmpty">✅ Комната исследована. Все находки собраны — время выбрать новый путь.</div>`;
}

function exploreRoom() {

    const result =
        game.world.explore();


    addLog(
        result.message
    );


    switch (
        result.type
    ) {


        case "enemy":

            startRandomEnemy();

            return;


        case "miniboss":

            startMiniboss();

            return;


        case "chest":

            renderLocation();

            return;


        case "trap":

            renderLocation();

            return;


        case "boss":

            renderLocation();

            return;


        case "nothing":

            renderLocation();

            return;


        case "already":

            renderLocation();

            return;

        case "locked":

        case "relic":

        case "rest":

        case "recruit":

        case "wanderer":

            renderLocation();

            return;
    }


    game.updateUI();
}

function startRandomEnemy() {

    const room = game.world.getCurrentRoom();

    // Reuse the enemy type stored for this room so a foe the player fled from
    // returns as the same kind. Fall back to a random pick for safety.
    const pool = game.world.enemyPool || ["goblin", "wolf", "skeleton"];
    const enemyType =
        room.enemyType || pool[Math.floor(Math.random() * pool.length)];

    if (!room.enemyType) room.enemyType = enemyType;


    const enemy =
        createEnemy(enemyType, game.player.level);


    addLog(
        `⚔️ Появился ${enemy.emoji} ${enemy.name}!`
    );


    game.startBattle(
        enemy
    );
}

function openChest() {

    const room =
        game.world.getCurrentRoom();


    const result =
        room.chest.open(
            game.player,
            game.world.chestLootFor(room.id)
        );

    if (result.success) { game.bumpStat("chests"); sfx.play("chest"); }


    addLog(
        result.message
    );

    if (result.success && game.journal) {
        game.journal.onChestOpened().forEach(id => {
            const e = game.journal.entry(id);
            const d = game.journal.def(id);
            if (!e || !d) return;
            if (e.completed) addLog(`🏆 Задание «${d.title}» выполнено! Забери награду в журнале.`);
            else addLog(`📜 «${d.title}»: ${e.progress}/${d.objective.count}`);
        });
    }


    room.cleared =
        true;


    renderLocation();

    game.updateUI();
}

function activateTrap() {

    const room =
        game.world.getCurrentRoom();


    const result =
        room.trap.activate(
            game.player
        );

    sfx.play("hurt");


    addLog(
        result.message
    );


    room.cleared =
        true;


    game.updateUI();


    if (
        game.player.isDead()
    ) {

        sfx.play("lose");

        game.gameOver();

        return;
    }


    renderLocation();
}

function disarmTrap() {
    const room = game.world.getCurrentRoom();
    const result = room.trap.disarm(game.player);
    if (result.success) { game.bumpStat("traps"); sfx.play("relic"); } else { sfx.play("hurt"); }
    addLog(result.message);
    room.cleared = true;
    game.updateUI();
    if (game.player.isDead()) {
        sfx.play("lose");
        game.gameOver();
        return;
    }
    renderLocation();
}

function claimRelic() {
    const relic = game.world.collectRelic();
    if (relic) { addLog(`✨ Получена ${relic}. Печать Стража ослабла: ${game.world.relics.length}/3.`); sfx.play("relic"); }
    game.updateUI();
    renderLocation();
}

function recruitHere() {
    const room = game.world.getCurrentRoom();
    const ally = game.recruitAlly(room.recruitType);
    room.recruitResolved = true;
    room.cleared = true;
    room.event = "cleared";
    if (ally) {
        addLog(`🤝 ${ally.emoji} ${ally.name} присоединяется к отряду!`);
        sfx.play("relic");
    }
    game.updateUI();
    renderLocation();
}

function declineRecruit() {
    const room = game.world.getCurrentRoom();
    room.recruitResolved = true;
    room.cleared = true;
    room.event = "cleared";
    addLog("🚶 Ты отказался от спутника.");
    game.updateUI();
    renderLocation();
}

function resolveWanderer(choice) {
    const room = game.world.getCurrentRoom();
    room.wandererResolved = true;
    room.cleared = true;
    room.event = "cleared";
    const p = game.player;

    if (choice === "help") {
        let cost = "";
        if (p.gold >= 15) { p.gold -= 15; cost = "Ты отдал 15 золота."; }
        else {
            const idx = p.inventory.findIndex(i => i.type === "potion");
            if (idx >= 0) { p.inventory.splice(idx, 1); cost = "Ты отдал зелье."; }
            else cost = "У тебя не было чем поделиться, но ты помог делом.";
        }
        game.adjustKarma(8);
        addLog(`❤️ Ты помог путнику. ${cost} Карма выросла (☯️ ${game.karmaLabel()}).`);
        if (p.ally) {
            p.ally.changeAffinity(6);
            addLog(`🙂 ${p.ally.name} одобряет поступок (привязанность ❤ ${p.ally.affinity}).`);
        } else {
            const ally = game.recruitAlly("healer");
            if (ally) addLog(`🌿 Благодарный путник оказался травницей — ${ally.name} присоединяется к тебе!`);
        }
        sfx.play("relic");
    } else if (choice === "rob") {
        const gold = 25 + Math.floor(Math.random() * 36);
        p.gold += gold;
        game.adjustKarma(-10);
        addLog(`🗡️ Ты ограбил путника (+${gold} 💰). Карма упала (☯️ ${game.karmaLabel()}).`);
        if (p.ally) {
            p.ally.changeAffinity(-12);
            addLog(`😠 ${p.ally.name} осуждает тебя (привязанность ❤ ${p.ally.affinity}).`);
            if (p.ally.hasLeft()) {
                addLog(`💔 ${p.ally.name} покидает отряд, разочаровавшись в тебе.`);
                p.ally = null;
            }
        }
        sfx.play("hurt");
    } else {
        addLog("🚶 Ты прошёл мимо путника.");
    }

    game.updateUI();
    renderLocation();
}

function restAtCamp() {
    const healed = Math.min(25, game.player.maxHealth - game.player.health);
    game.player.health += healed;
    const room = game.world.getCurrentRoom();
    room.cleared = true;
    room.event = "cleared";
    addLog(`🔥 Привал восстановил ${healed} HP. Ты снова настороже.`);
    game.updateUI();
    renderLocation();
}

function startBossBattle() {

    const enemy =
        createEnemy("boss", game.player.level);


    addLog(
        "👑 Страж сокровища выходит на бой!"
    );


    game.startBattle(
        enemy
    );
}


function startMiniboss() {

    const room = game.world.getCurrentRoom();
    const type = room.guardianType || game.world.relicGuardians[room.id] || "skeleton";

    const enemy = createEnemy(type, game.player.level);
    enemy.isGuardian = true;
    enemy.relicRoom = room.id;

    addLog(`⚔️ ${enemy.emoji} ${enemy.name} преграждает путь к руне!`);

    game.startBattle(enemy);
}




// =============================================
// НАЗАД К КАРТЕ
// =============================================

document
    .getElementById(
        "locationBackButton"
    )
    .addEventListener(
        "click",
        () => {

            showWorld();

        }
    );


// =============================================
// БОЙ
// =============================================

document
    .getElementById(
        "attackButton"
    )
    .addEventListener(
        "click",
        () => {

            if (!game.battle) {
                return;
            }


            game.battle.playerAttack();
            sfx.play("attack");

            if (game.gameEnded) {
                sfx.play("lose");
            } else if (!game.battle) {
                sfx.play("win"); // enemy defeated
            }

            if (game.battle) {
                game.showEnemy();
            }

            game.updateUI();
        }
    );


document
    .getElementById(
        "healButton"
    )
    .addEventListener(
        "click",
        () => {

            if (!game.battle) {
                return;
            }


            game.battle.playerHeal();
            sfx.play("heal");
            if (game.gameEnded) sfx.play("lose");

            game.showEnemy();
        }
    );


document
    .getElementById(
        "defendButton"
    )
    .addEventListener(
        "click",
        () => {

            if (!game.battle) {
                return;
            }


            game.battle.playerDefend();
            sfx.play("defend");
            if (game.gameEnded) sfx.play("lose");

            game.showEnemy();
        }
    );

document
    .getElementById("fleeButton")
    .addEventListener("click", () => {
        if (!game.battle) return;
        game.battle.playerFlee();
        if (game.gameEnded) sfx.play("lose");
        else if (!game.battle) sfx.play("flee"); // escaped
        if (game.battle) game.showEnemy();
        game.updateUI();
    });


// =============================================
// КНОПКИ НАЗАД
// =============================================

document
    .getElementById(
        "inventoryBackButton"
    )
    .addEventListener(
        "click",
        () => {

            showScreen(
                "villageScreen"
            );
        }
    );


document
    .getElementById(
        "shopBackButton"
    )
    .addEventListener(
        "click",
        () => {

            showScreen(
                "villageScreen"
            );
        }
    );


document
    .getElementById(
        "npcBackButton"
    )
    .addEventListener(
        "click",
        () => {

            showScreen(
                "villageScreen"
            );
        }
    );


document
    .getElementById(
        "questBackButton"
    )
    .addEventListener(
        "click",
        () => {

            showScreen(
                "villageScreen"
            );
        }
    );


document
    .getElementById(
        "returnVillageButton"
    )
    .addEventListener(
        "click",
        () => {

            showScreen(
                "villageScreen"
            );
        }
    );


// =============================================
// RESTART
// =============================================

document
    .getElementById(
        "restartButton"
    )
    .addEventListener(
        "click",
        () => {

            location.reload();

        }
    );


// =============================================
// ЗВУК (mute)
// =============================================

(function setupMuteButton() {
    const button = document.getElementById("muteButton");
    if (!button) return;

    function refresh() {
        button.textContent = sfx.muted ? "🔇" : "🔊";
        button.setAttribute("aria-pressed", String(sfx.muted));
    }

    button.addEventListener("click", () => {
        const nowMuted = sfx.toggleMute();
        if (!nowMuted) sfx.play("heal"); // brief confirmation blip when unmuting
        refresh();
    });

    refresh();
})();


// =============================================
// НАСТРОЙКИ
// =============================================

function renderSettings() {
    const soundButton = document.getElementById("settingsSoundButton");
    if (soundButton) soundButton.textContent = sfx.muted ? "Выкл" : "Вкл";

    const statsBox = document.getElementById("settingsStats");
    if (statsBox) {
        statsBox.innerHTML = game.player
            ? game.renderStats()
            : `<p class="settingsHint">Начни игру, чтобы увидеть статистику забега.</p>`;
    }
}

function openSettings() {
    showScreen("settingsScreen");
    renderSettings();
}

(function setupSettings() {
    const openButton = document.getElementById("settingsButton");
    if (openButton) openButton.addEventListener("click", openSettings);

    const soundButton = document.getElementById("settingsSoundButton");
    if (soundButton) {
        soundButton.addEventListener("click", () => {
            const nowMuted = sfx.toggleMute();
            if (!nowMuted) sfx.play("heal");
            renderSettings();
            const headerMute = document.getElementById("muteButton");
            if (headerMute) headerMute.textContent = nowMuted ? "🔇" : "🔊";
        });
    }

    const resetButton = document.getElementById("settingsResetButton");
    if (resetButton) {
        resetButton.addEventListener("click", () => {
            const ok = confirm("Удалить сохранение и начать заново? Это действие необратимо.");
            if (!ok) return;
            game.saveSystem.clear();
            location.reload();
        });
    }

    const backButton = document.getElementById("settingsBackButton");
    if (backButton) {
        backButton.addEventListener("click", () => showScreen(previousScreen));
    }
})();
