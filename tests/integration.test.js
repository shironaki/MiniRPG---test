"use strict";

// Integration tests: load the FULL game (audio.js + main.js) against DOM shims
// and verify the render/navigation wiring runs end-to-end without throwing and
// produces the expected markup. No external headless-browser dependency.

const { loadFullGame } = require("./harness");
const { describe, it, expect, run } = require("./tiny-test");

describe("Integration: boot", () => {
    it("starts a new game and sets up the model", () => {
        const { exports: ui } = loadFullGame();
        ui.game.start();
        expect(ui.game.player !== null).toBe(true);
        expect(ui.game.world.currentLocation).toBe("start");
        expect(typeof ui.sfx.play).toBe("function");
    });
});

describe("Integration: world map", () => {
    it("renders a spatial fog-of-war map with all 12 rooms", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        ui.showWorld();
        const html = sandbox.document.getElementById("miniMap").innerHTML;
        expect((html.match(/mapCell/g) || []).length).toBe(12);
        expect(/fog/.test(html)).toBe(true);
        expect(/reachable/.test(html)).toBe(true);
    });

    it("click-to-move steps to a neighbour but rejects far rooms", () => {
        const { exports: ui } = loadFullGame();
        ui.game.start();
        ui.showWorld();
        ui.moveToRoom("darkForest");
        expect(ui.game.world.currentLocation).toBe("darkForest");
        expect(ui.game.stats.steps).toBe(1);
        ui.moveToRoom("treasury"); // not adjacent
        expect(ui.game.world.currentLocation).toBe("darkForest");
    });

    it("roomBadge reflects room contents", () => {
        const { exports: ui } = loadFullGame();
        ui.game.start();
        const r = ui.game.world.rooms;
        r.darkForest.explored = true; r.darkForest.event = "chest"; r.darkForest.chest = { opened: false };
        r.camp.explored = true; r.camp.cleared = true;
        expect(ui.roomBadge(r.darkForest, ui.game.world)).toBe("💰");
        expect(ui.roomBadge(r.camp, ui.game.world)).toBe("✅");
        expect(ui.roomBadge(r.treasury, ui.game.world)).toBe("🔒");
    });
});

describe("Integration: end screen", () => {
    it("victory renders the run-stats summary", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        ui.game.stats = { steps: 9, kills: 4, chests: 1, traps: 2 };
        ui.game.victory();
        const end = sandbox.document.getElementById("endMessage").innerHTML;
        expect(/Итоги забега/.test(end)).toBe(true);
        expect(/Шагов: 9/.test(end)).toBe(true);
    });
});

describe("Integration: settings", () => {
    it("shows a hint before a game starts and stats afterwards", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.openSettings();
        expect(/Начни игру/.test(sandbox.document.getElementById("settingsStats").innerHTML)).toBe(true);
        ui.game.start();
        ui.game.stats = { steps: 3, kills: 1, chests: 0, traps: 0 };
        ui.renderSettings();
        expect(/Итоги забега/.test(sandbox.document.getElementById("settingsStats").innerHTML)).toBe(true);
    });

    it("reflects the mute state on the sound button", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.renderSettings();
        const label = sandbox.document.getElementById("settingsSoundButton").textContent;
        expect(label === "Вкл" || label === "Выкл").toBe(true);
    });
});

describe("Integration: moral choices", () => {
    it("helping a wanderer raises karma and recruits a healer when soloing", () => {
        const { exports: ui } = loadFullGame();
        ui.game.start();
        const room = ui.game.world.getCurrentRoom();
        room.event = "wanderer"; room.wandererResolved = false;
        const karmaBefore = ui.game.player.karma;
        ui.resolveWanderer("help");
        expect(ui.game.player.karma).toBeGreaterThan(karmaBefore);
        expect(ui.game.player.ally !== null).toBe(true);
        expect(ui.game.player.ally.role).toBe("healer");
    });

    it("robbing a wanderer lowers karma and can turn an ally away", () => {
        const { exports: ui } = loadFullGame();
        ui.game.start();
        ui.game.recruitAlly("warrior");
        ui.game.player.ally.affinity = 5; // fragile bond
        const goldBefore = ui.game.player.gold;
        const room = ui.game.world.getCurrentRoom();
        room.event = "wanderer"; room.wandererResolved = false;
        ui.resolveWanderer("rob");
        expect(ui.game.player.karma).toBeLessThan(0);
        expect(ui.game.player.gold).toBeGreaterThan(goldBefore);
        expect(ui.game.player.ally).toBe(null); // disapproved and left
    });

    it("recruiting at a camp attaches the warrior companion", () => {
        const { exports: ui } = loadFullGame();
        ui.game.start();
        const room = ui.game.world.getCurrentRoom();
        room.event = "recruit"; room.recruitType = "warrior"; room.recruitResolved = false;
        ui.recruitHere();
        expect(ui.game.player.ally.role).toBe("warrior");
        expect(room.recruitResolved).toBe(true);
    });
});

describe("Integration: location & map art", () => {
    it("shows the lurking enemy sprite on the location screen", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        const room = ui.game.world.getCurrentRoom();
        room.explored = true; room.event = "enemy"; room.cleared = false; room.enemyType = "skeleton";
        ui.renderLocation();
        expect(/skeleton\.png/.test(sandbox.document.getElementById("locationArt").innerHTML)).toBe(true);
    });

    it("falls back to the hero sprite for peaceful rooms", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        const room = ui.game.world.getCurrentRoom();
        room.explored = true; room.event = "rest";
        ui.renderLocation();
        expect(/hero\.png/.test(sandbox.document.getElementById("locationArt").innerHTML)).toBe(true);
    });
});

describe("Integration: quest journal", () => {
    it("accept via UI, progress on kills, then claim the reward", () => {
        const { exports: ui } = loadFullGame();
        ui.game.start();
        ui.acceptQuest("cullWolves");
        expect(ui.game.journal.isAccepted("cullWolves")).toBe(true);

        const gold = ui.game.player.gold;
        ui.game.enemyDefeated({ name: "Волк" });
        ui.game.enemyDefeated({ name: "Волк" });
        ui.game.enemyDefeated({ name: "Волк" });
        expect(ui.game.journal.entry("cullWolves").completed).toBe(true);

        ui.claimQuest("cullWolves");
        expect(ui.game.player.gold).toBe(gold + 120);
        expect(ui.game.journal.entry("cullWolves").claimed).toBe(true);
    });

    it("renderQuest shows offers gated by the player's state", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        ui.renderQuest();
        const html = sandbox.document.getElementById("questList").innerHTML;
        expect(/Волчья угроза/.test(html)).toBe(true); // always-available offer
        expect(/Тёмная сделка/.test(html)).toBe(false); // needs low karma
    });
});

describe("Integration: progressive UI", () => {
    it("hides the quest board until the first quest is accepted", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        ui.refreshMenus();
        expect(sandbox.document.getElementById("questButton").style.display).toBe("none");
        ui.game.quest.start(); // answer the Elder's call
        ui.refreshMenus();
        expect(sandbox.document.getElementById("questButton").style.display).toBe("");
    });

    it("omits karma from the HUD until the player has any", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        expect(/☯️/.test(sandbox.document.getElementById("quickStats").textContent)).toBe(false);
        ui.game.adjustKarma(12);
        ui.game.updateUI();
        expect(/☯️/.test(sandbox.document.getElementById("quickStats").textContent)).toBe(true);
    });
});

describe("Integration: perks UI", () => {
    it("hides the perks button until a point is earned, then buys via UI", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        ui.refreshMenus();
        expect(sandbox.document.getElementById("perkButton").style.display).toBe("none");

        ui.game.player.perkPoints = 2;
        ui.refreshMenus();
        expect(sandbox.document.getElementById("perkButton").style.display).toBe("");

        const atk = ui.game.player.attack;
        ui.openPerks();
        ui.buyPerk("power");
        expect(ui.game.player.attack).toBe(atk + 3);
        expect(ui.game.player.perkPoints).toBe(1);
        expect(/Сила/.test(sandbox.document.getElementById("perkList").innerHTML)).toBe(true);
    });
});

describe("Integration: dialogue UI", () => {
    it("opens a branching talk and applies a choice's consequence", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        ui.game.player.karma = 0;
        ui.game.dialogue = new ui.Dialogue(ui.GAME_DATA.dialogues.elder);
        ui.renderDialogue();
        expect(sandbox.document.getElementById("npcChat").innerHTML.includes("Староста")).toBe(true);
        expect(ui.game.dialogue.choices().length).toBe(4);

        ui.chooseDialogue(2); // -> prisoner
        ui.chooseDialogue(0); // mercy -> karma +15
        expect(ui.game.player.karma).toBe(15);
    });
});

describe("Integration: dungeon UI", () => {
    it("opens the trial gate, renders the track, and advances a rest floor", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        ui.game.player.level = 5;
        ui.refreshMenus();
        expect(sandbox.document.getElementById("dungeonButton").style.display).toBe("");

        ui.game.enterDungeon();
        expect(ui.game.dungeon.active).toBe(true);
        // Inject a deterministic, non-combat-first layout.
        ui.game.dungeon.floors = [{ n: 1, type: "rest" }, { n: 2, type: "elite", enemy: "goblin" }];
        ui.game.dungeon.index = 0;
        ui.renderDungeon();
        expect(sandbox.document.getElementById("dungeonTrack").innerHTML.length > 0).toBe(true);

        const hp0 = ui.game.player.health = 10;
        ui.game.player.maxHealth = 100;
        ui.dungeonAction(); // resolves rest -> advances to floor 2
        expect(ui.game.player.health > hp0).toBe(true);
        expect(ui.game.dungeon.index).toBe(1);
    });

    it("finishDungeon rewards gold and closes the run", () => {
        const { exports: ui } = loadFullGame();
        ui.game.start();
        ui.game.player.gold = 0;
        ui.game.dungeon = new ui.Dungeon([{ n: 1, type: "elite", enemy: "goblin" }], 3);
        ui.game.dungeon.index = 1;
        ui.game.dungeon.cleared = true;
        ui.game.finishDungeon();
        expect(ui.game.player.gold > 0).toBe(true);
        expect(ui.game.dungeon.active).toBe(false);
    });
});

describe("Integration: forge UI", () => {
    it("reveals the forge once essence is held and upgrades an item via UI", () => {
        const { exports: ui, sandbox } = loadFullGame();
        ui.game.start();
        ui.refreshMenus();
        expect(sandbox.document.getElementById("forgeButton").style.display).toBe("none");

        ui.game.player.gold = 500;
        ui.game.player.addItem(ui.Craft.essence());
        const sword = ui.ITEMS.sword.clone();
        ui.game.player.addItem(sword);
        ui.refreshMenus();
        expect(sandbox.document.getElementById("forgeButton").style.display).toBe("");

        ui.openForge();
        // The sword is the only equipment in the bag -> index it and upgrade.
        const idx = ui.game._forgeItems.findIndex(i => i.type === "weapon");
        ui.upgradeItem(idx);
        const weapon = ui.game.player.inventory.find(i => i.type === "weapon");
        expect(weapon.rarity).toBe("rare");
        expect(/Редкий/.test(sandbox.document.getElementById("forgeList").innerHTML)).toBe(true);
    });
});

describe("Integration: audio safety", () => {
    it("all SFX calls are no-ops without a real AudioContext", () => {
        const { exports: ui } = loadFullGame();
        ["attack", "crit", "heal", "chest", "hurt", "win", "lose", "flee", "relic"].forEach(name => {
            ui.sfx.play(name); // must not throw
        });
        const muted = ui.sfx.toggleMute();
        expect(typeof muted).toBe("boolean");
        ui.sfx.toggleMute();
    });
});

run();
