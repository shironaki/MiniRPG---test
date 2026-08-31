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


// =============================================
// КАК ИГРАТЬ
// =============================================

document
    .getElementById("helpButton")
    .addEventListener(
        "click",
        () => {

            alert(`

MINI RPG 7.0

🎮 Создай героя.

🏘️ В городе:
- разговаривай с NPC
- бери квесты
- покупай предметы
- управляй инвентарём

🗺️ В мире:
- перемещайся по направлениям
- исследуй комнаты
- встречай врагов

⚔️ В бою:
- атакуй
- лечись
- защищайся

💥 Критический удар:
10%

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

        `;
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

    const result =
        game.world.move(
            direction
        );


    if (!result.success) {

        addLog(
            result.message
        );

        return;
    }


    addLog(
        `🗺️ Ты переместился: ${result.location.name}`
    );


    renderLocation();


    showScreen(
        "locationScreen"
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
        !room.trap.triggered
    ) {

        const trapButton =
            document.createElement(
                "button"
            );


        trapButton.textContent =
            "⚠️ Осмотреть ловушку";


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

    actions.innerHTML = `

        <div class="locationEmpty">

            ✅ Комната исследована.

        </div>

    `;
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
        createEnemy(
            enemyType
        );


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

function startBossBattle() {

    const enemy =
        createEnemy(
            "boss"
        );


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

            game.showEnemy();

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