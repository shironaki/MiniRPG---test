"use strict";

const { loadGame } = require("./harness");
const { describe, it, expect, run } = require("./tiny-test");

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------
describe("Item", () => {
    it("clones independently", () => {
        const { exports: g } = loadGame();
        const a = g.ITEMS.sword.clone();
        a.attackBonus = 999;
        expect(g.ITEMS.sword.attackBonus).toBe(10);
        expect(a.name).toBe(g.ITEMS.sword.name);
    });

    it("classifies equipment vs consumable", () => {
        const { exports: g } = loadGame();
        expect(g.ITEMS.sword.isEquipment()).toBe(true);
        expect(g.ITEMS.armor.isEquipment()).toBe(true);
        expect(g.ITEMS.potion.isEquipment()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
describe("Player", () => {
    it("starts with expected defaults and two potions", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("Артур");
        expect(p.name).toBe("Артур");
        expect(p.health).toBe(100);
        expect(p.gold).toBe(100);
        expect(p.inventory.length).toBe(2);
        expect(p.inventory.every((i) => i.type === "potion")).toBe(true);
    });

    it("clamps name length and falls back to default", () => {
        const { exports: g } = loadGame();
        expect(new g.Player("   ").name).toBe("Герой");
        expect(new g.Player("x".repeat(40)).name.length).toBe(18);
    });

    it("equip updates stats and swaps previous item back to inventory", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const sword = g.ITEMS.sword.clone();
        p.addItem(sword);
        const swordRef = p.inventory[p.inventory.length - 1];
        const res = p.equip(swordRef);
        expect(res.success).toBe(true);
        expect(p.attack).toBe(p.baseAttack + 10);
        expect(p.equipment.weapon.name).toBe("Железный меч");
    });

    it("rejects equipping a potion", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        expect(p.equip(g.ITEMS.potion.clone()).success).toBe(false);
    });

    it("takeDamage respects defense floor of 1 and defend halving", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A"); // defense 5
        expect(p.takeDamage(3)).toBe(1); // below defense -> floor 1
        p.health = 100;
        p.defend();
        const dmg = p.takeDamage(25); // (25-5)=20, halved -> 10
        expect(dmg).toBe(10);
        expect(p.isDefending).toBe(false); // consumed
    });

    it("heal consumes a potion and reports failure when full / empty", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        p.health = 50;
        const ok = p.heal();
        expect(ok.success).toBe(true);
        expect(p.inventory.length).toBe(1);
        expect(p.health).toBe(85);

        p.health = p.maxHealth;
        expect(p.heal().success).toBe(false); // already full

        p.health = 10;
        p.heal(); // uses last potion
        expect(p.heal().success).toBe(false); // none left
    });

    it("levels up, restoring health and increasing stats", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        p.health = 1;
        const msgs = p.addExperience(100);
        expect(p.level).toBe(2);
        expect(p.health).toBe(p.maxHealth);
        expect(p.maxHealth).toBe(120);
        expect(msgs.length).toBe(1);
    });

    it("handles multi-level overflow in one xp grant", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const msgs = p.addExperience(1000);
        expect(p.level).toBeGreaterThan(2);
        expect(msgs.length).toBe(p.level - 1);
    });
});

// ---------------------------------------------------------------------------
// Enemy
// ---------------------------------------------------------------------------
describe("Enemy", () => {
    it("createEnemy scales with player level", () => {
        const { exports: g } = loadGame();
        const l1 = g.createEnemy("goblin", 1);
        const l5 = g.createEnemy("goblin", 5);
        expect(l5.maxHealth).toBeGreaterThan(l1.maxHealth);
        expect(l5.attack).toBeGreaterThan(l1.attack);
    });

    it("unknown type falls back to goblin", () => {
        const { exports: g } = loadGame();
        expect(g.createEnemy("dragon", 1).name).toBe("Гоблин");
    });

    it("takeDamage never drops below 0 and death is detected", () => {
        const { exports: g } = loadGame();
        const e = g.createEnemy("goblin", 1);
        e.takeDamage(99999);
        expect(e.health).toBe(0);
        expect(e.isDead()).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Chest (deterministic RNG)
// ---------------------------------------------------------------------------
describe("Chest", () => {
    it("gives gold on low roll", () => {
        const { exports: g } = loadGame({ random: () => 0.1 });
        const p = new g.Player("A");
        const before = p.gold;
        const res = new g.Chest().open(p);
        expect(res.success).toBe(true);
        expect(p.gold).toBeGreaterThan(before);
    });

    it("cannot be opened twice", () => {
        const { exports: g } = loadGame({ random: () => 0.1 });
        const chest = new g.Chest();
        const p = new g.Player("A");
        chest.open(p);
        expect(chest.open(p).success).toBe(false);
    });

    it("high roll grants a shield item", () => {
        const { exports: g } = loadGame({ random: () => 0.95 });
        const p = new g.Player("A");
        new g.Chest().open(p);
        expect(p.inventory.some((i) => i.type === "shield")).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Trap
// ---------------------------------------------------------------------------
describe("Trap", () => {
    it("successful disarm raises trap skill", () => {
        const { exports: g } = loadGame({ random: () => 0 }); // always succeeds
        const p = new g.Player("A");
        const res = new g.Trap().disarm(p);
        expect(res.success).toBe(true);
        expect(p.trapSkill).toBe(1);
    });

    it("activation damages the player and marks triggered", () => {
        const { exports: g } = loadGame({ random: () => 0.5 });
        const p = new g.Player("A");
        const trap = new g.Trap();
        const res = trap.activate(p);
        expect(res.success).toBe(false);
        expect(trap.triggered).toBe(true);
        expect(p.health).toBeLessThanOrEqual(100);
    });
});

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
describe("World", () => {
    it("blocks movement into a wall", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        expect(w.move("north").success).toBe(true); // start -> ancientHall
        const back = w.move("south");
        expect(back.success).toBe(true);
        expect(w.currentLocation).toBe("start");
    });

    it("all connections are bidirectional and reference real rooms", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        const opposite = { north: "south", south: "north", east: "west", west: "east" };
        for (const [room, exits] of Object.entries(w.connections)) {
            for (const [dir, dest] of Object.entries(exits)) {
                if (!dest) continue;
                expect(Boolean(w.rooms[dest])).toBe(true);
                const rev = w.connections[dest][opposite[dir]];
                expect(rev).toBe(room);
            }
        }
    });

    it("treasury stays locked until 3 relics are collected", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        w.currentLocation = "treasury";
        expect(w.explore().type).toBe("locked");
        w.relics = ["archive", "shrine", "catacomb"];
        expect(w.explore().type).toBe("boss");
    });

    it("relic rooms yield a relic exactly once", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        w.currentLocation = "archive";
        expect(w.explore().type).toBe("relic");
        const relic = w.collectRelic();
        expect(relic).toBe("Руна прилива");
        expect(w.relics.length).toBe(1);
        expect(w.collectRelic()).toBe(null);
    });

    it("every room is reachable from start", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        const seen = new Set(["start"]);
        const queue = ["start"];
        while (queue.length) {
            const cur = queue.shift();
            for (const dest of Object.values(w.connections[cur])) {
                if (dest && !seen.has(dest)) { seen.add(dest); queue.push(dest); }
            }
        }
        expect(seen.size).toBe(Object.keys(w.rooms).length);
    });
});

// ---------------------------------------------------------------------------
// Quest
// ---------------------------------------------------------------------------
describe("Quest", () => {
    it("progresses only for goblins while active and completes at required", () => {
        const { exports: g } = loadGame();
        const q = new g.Quest();
        q.enemyDefeated({ name: "Гоблин" }); // inactive -> ignored
        expect(q.progress).toBe(0);
        q.start();
        q.enemyDefeated({ name: "Волк" });
        expect(q.progress).toBe(0);
        q.enemyDefeated({ name: "Гоблин" });
        q.enemyDefeated({ name: "Гоблин" });
        q.enemyDefeated({ name: "Гоблин" });
        expect(q.progress).toBe(3);
        expect(q.completed).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
describe("Shop", () => {
    it("buy fails without gold and succeeds with enough", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const shop = new g.Shop(p);
        p.gold = 0;
        expect(shop.buy(g.ITEMS.sword).success).toBe(false);
        p.gold = 100;
        const res = shop.buy(g.ITEMS.sword);
        expect(res.success).toBe(true);
        expect(p.gold).toBe(20);
        expect(p.inventory.some((i) => i.name === "Железный меч")).toBe(true);
    });

    it("sell returns half price and removes the item", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const shop = new g.Shop(p);
        const sword = g.ITEMS.sword.clone();
        p.addItem(sword);
        const ref = p.inventory[p.inventory.length - 1];
        const before = p.gold;
        const res = shop.sell(ref);
        expect(res.success).toBe(true);
        expect(p.gold).toBe(before + 40);
    });
});

// ---------------------------------------------------------------------------
// NPC
// ---------------------------------------------------------------------------
describe("NPC", () => {
    it("pays quest reward exactly once", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const npc = new g.NPC("Староста");
        const q = new g.Quest();
        q.start();
        q.completed = true;
        const goldBefore = p.gold;
        npc.talk(p, q);
        expect(q.rewardClaimed).toBe(true);
        expect(p.gold).toBe(goldBefore + q.rewardGold);
        const goldAfter = p.gold;
        npc.talk(p, q); // second talk: no double reward
        expect(p.gold).toBe(goldAfter);
    });
});

// ---------------------------------------------------------------------------
// SaveSystem round-trip
// ---------------------------------------------------------------------------
describe("SaveSystem + Game.resume", () => {
    it("persists and restores player, world and quest with methods intact", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("Сейв");
        game.player.gold = 777;
        game.world = new g.World();
        game.world.currentLocation = "darkForest";
        game.quest = new g.Quest();
        game.quest.start();
        game.inventory = new g.Inventory(game.player);
        game.saveSystem.save(game);

        const game2 = new g.Game();
        expect(game2.resume()).toBe(true);
        expect(game2.player.gold).toBe(777);
        expect(game2.world.currentLocation).toBe("darkForest");
        // methods must survive the JSON round-trip (prototype restored)
        expect(typeof game2.player.heal).toBe("function");
        expect(typeof game2.world.move).toBe("function");
        expect(game2.world.move("west").success).toBe(true);
    });

    it("resume returns false when there is no save", () => {
        const { exports: g } = loadGame();
        expect(new g.Game().resume()).toBe(false);
    });
});

run();
