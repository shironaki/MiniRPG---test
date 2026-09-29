const game =
    new Game();


// =============================================
// ОБЩИЕ ФУНКЦИИ
// =============================================

function showScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(screen => {

            screen.classList.add(
                "hidden"
            );
        });


    document
        .getElementById(id)
        .classList.remove(
            "hidden"
        );
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


function renderQuest() {

    document
        .getElementById(
            "questList"
        )
        .innerHTML =
            game.quest.render();
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

    const location =
        game.world.getCurrentLocation();

    const map = document.getElementById("miniMap");
    map.className = "worldMapGrid";
    map.innerHTML = Object.values(game.world.rooms).map(room => `
        <div class="mapRoom" data-room="${room.id}" title="${room.name}">
            <span>${room.name}</span>
            <small>${room.id === "treasury" ? `Руны ${game.world.relics.length}/3` : room.cleared ? "Исследовано" : room.explored ? "Открыто" : "Неизведано"}</small>
        </div>
    `).join("");


    document
        .getElementById(
            "worldDescription"
        )
        .innerHTML = `

            <h3>
                ${location.name}
            </h3>

            <p>
                ${location.description}
            </p>

            <p>✨ Руны для сокровищницы: ${game.world.relics.length}/3</p>

        `;

    document.querySelectorAll("[data-room]").forEach(mapRoom => {
        const room = game.world.rooms[mapRoom.dataset.room];
        mapRoom.classList.toggle("current", mapRoom.dataset.room === game.world.currentLocation);
        mapRoom.classList.toggle("cleared", Boolean(room.cleared));
    });
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

function renderLocation() {

    const room =
        game.world.getCurrentRoom();


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

    // Enemy still lurking here (e.g. after a successful flee): let the player re-engage.
    if (room.event === "enemy" && !room.cleared) {
        const fightButton = document.createElement("button");
        fightButton.textContent = "⚔️ Враг всё ещё здесь — атаковать";
        fightButton.onclick = startRandomEnemy;
        actions.appendChild(fightButton);
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

            renderLocation();

            return;
    }


    game.updateUI();
}

function startRandomEnemy() {

    const enemies = [

        "goblin",
        "wolf",
        "skeleton"

    ];


    const randomIndex =
        Math.floor(
            Math.random() *
            enemies.length
        );


    const enemyType =
        enemies[randomIndex];


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
            game.player
        );


    addLog(
        result.message
    );


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


    addLog(
        result.message
    );


    room.cleared =
        true;


    game.updateUI();


    if (
        game.player.isDead()
    ) {

        game.gameOver();

        return;
    }


    renderLocation();
}

function disarmTrap() {
    const room = game.world.getCurrentRoom();
    const result = room.trap.disarm(game.player);
    addLog(result.message);
    room.cleared = true;
    game.updateUI();
    if (game.player.isDead()) {
        game.gameOver();
        return;
    }
    renderLocation();
}

function claimRelic() {
    const relic = game.world.collectRelic();
    if (relic) addLog(`✨ Получена ${relic}. Печать Стража ослабла: ${game.world.relics.length}/3.`);
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

            game.showEnemy();
        }
    );

document
    .getElementById("fleeButton")
    .addEventListener("click", () => {
        if (!game.battle) return;
        game.battle.playerFlee();
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
