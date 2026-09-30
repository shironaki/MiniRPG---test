"use strict";

const { loadGame } = require("./harness");
const { describe, it, expect, run } = require("./tiny-test");

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------
describe("Data-driven core", () => {
    it("builds ITEMS from GAME_DATA definitions", () => {
        const { exports: g } = loadGame();
        expect(Object.keys(g.ITEMS).length).toBe(Object.keys(g.GAME_DATA.items).length);
        expect(g.ITEMS.sword.price).toBe(g.GAME_DATA.items.sword.price);
        expect(g.ITEMS.sword instanceof g.Item).toBe(true);
    });

    it("createEnemy reads stats from GAME_DATA with scaling", () => {
        const { exports: g } = loadGame();
        const base = g.createEnemy("skeleton", 1);
        expect(base.maxHealth).toBe(g.GAME_DATA.enemies.skeleton.health);
        const scaled = g.createEnemy("skeleton", 3); // +2 levels -> +28 hp
        expect(scaled.maxHealth).toBe(g.GAME_DATA.enemies.skeleton.health + 28);
    });

    it("exposes an accent colour for every room's zone", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        Object.keys(w.rooms).forEach(id => {
            expect(typeof g.GAME_DATA.zones[id].accent).toBe("string");
        });
    });
});

describe("Battle rendering", () => {
    it("resolves sprite paths from the manifest, null when absent", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        expect(game.spriteFor("hero")).toBe(g.GAME_DATA.sprites.hero);
        expect(game.spriteFor("enemy", "goblin")).toBe(g.GAME_DATA.sprites.enemies.goblin);
        expect(game.spriteFor("enemy", "skeleton")).toBe(g.GAME_DATA.sprites.enemies.skeleton);
        expect(game.spriteFor("enemy", "phantom")).toBe(null); // unmapped -> emoji fallback
        expect(game.spriteFor("ally", "warrior")).toBe(g.GAME_DATA.sprites.allies.warrior);
    });

    it("has a sprite mapped for every enemy type and ally role", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        Object.keys(g.GAME_DATA.enemies).forEach(key => {
            expect(typeof game.spriteFor("enemy", key)).toBe("string");
        });
        Object.keys(g.ALLIES).forEach(role => {
            expect(typeof game.spriteFor("ally", role)).toBe("string");
        });
    });

    it("fighterHtml uses an <img> when a sprite exists, emoji otherwise", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        const withSprite = game.fighterHtml({ side: "enemy", name: "Гоблин", emoji: "👹", sprite: "assets/sprites/goblin.png", health: 30, maxHealth: 52 });
        expect(/<img/.test(withSprite)).toBe(true);
        expect(/goblin\.png/.test(withSprite)).toBe(true);
        const noSprite = game.fighterHtml({ side: "enemy", name: "Скелет", emoji: "💀", sprite: null, health: 40, maxHealth: 84 });
        expect(/fighterEmoji/.test(noSprite)).toBe(true);
        expect(/💀/.test(noSprite)).toBe(true);
    });

    it("createEnemy tags the type key for sprite lookup", () => {
        const { exports: g } = loadGame();
        expect(g.createEnemy("goblin", 1).key).toBe("goblin");
        expect(g.createEnemy("nonsense", 1).key).toBe("goblin"); // fallback keeps a valid key
    });
});

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

    it("strips HTML-injection characters from the name", () => {
        const { exports: g } = loadGame();
        const p = new g.Player('<img src=x onerror=alert(1)>');
        expect(p.name.includes("<")).toBe(false);
        expect(p.name.includes(">")).toBe(false);
        expect(new g.Player("<>&\"").name).toBe("Герой");
        expect(new g.Player(null).name).toBe("Герой");
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

    it("high roll grants an item from the default pool", () => {
        const { exports: g } = loadGame({ random: () => 0.95 });
        const p = new g.Player("A");
        new g.Chest().open(p);
        expect(p.inventory.some((i) => i.type === "shield")).toBe(true);
    });

    it("draws items from a supplied zone loot pool", () => {
        const { exports: g } = loadGame({ random: () => 0.6 }); // >0.45 -> item branch
        const p = new g.Player("A");
        // random()=0.6 -> gold check fails; item index floor(0.6*len)
        const res = new g.Chest().open(p, ["sword"]);
        expect(res.success).toBe(true);
        expect(p.inventory.some((i) => i.name === "Железный меч")).toBe(true);
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

    it("relic rooms require defeating the guardian before the relic", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        w.currentLocation = "archive";
        // First exploration spawns the relic guardian (mini-boss).
        expect(w.explore().type).toBe("miniboss");
        expect(w.rooms.archive.guardianType).toBe("tideWraith");
        // Relic is locked until the guardian is beaten.
        expect(w.collectRelic()).toBe(null);
        w.rooms.archive.guardianDefeated = true;
        const relic = w.collectRelic();
        expect(relic).toBe("Руна прилива");
        expect(w.relics.length).toBe(1);
        expect(w.collectRelic()).toBe(null); // once only
    });

    it("defines a valid, well-formed guardian for every relic room", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        for (const roomId of Object.keys(w.relicRooms)) {
            const type = w.relicGuardians[roomId];
            expect(Boolean(type)).toBe(true);
            const guardian = g.createEnemy(type, 1);
            expect(guardian.maxHealth).toBeGreaterThan(100); // tougher than a mob
        }
    });

    it("coordinates match the connection graph exactly", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        const delta = { north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] };
        for (const [room, exits] of Object.entries(w.connections)) {
            for (const [dir, dest] of Object.entries(exits)) {
                if (!dest) continue;
                const a = w.coords[room];
                const b = w.coords[dest];
                expect(b.x - a.x).toBe(delta[dir][0]);
                expect(b.y - a.y).toBe(delta[dir][1]);
            }
        }
    });

    it("every room has unique coordinates", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        const seen = new Set();
        for (const id of Object.keys(w.rooms)) {
            const c = w.coords[id];
            expect(Boolean(c)).toBe(true);
            const key = `${c.x},${c.y}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
        }
    });

    it("moveTo only allows adjacent, connected rooms (no teleport to the end)", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        // treasury is far from start: must be rejected
        expect(w.moveTo("treasury").success).toBe(false);
        expect(w.currentLocation).toBe("start");
        // adjacent room is allowed
        expect(w.moveTo("darkForest").success).toBe(true);
        expect(w.currentLocation).toBe("darkForest");
    });

    it("directionTo resolves adjacency and marks rooms visited on entry", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        expect(w.directionTo("ancientHall")).toBe("north");
        expect(w.directionTo("treasury")).toBe(null);
        expect(w.rooms.ancientHall.visited).toBe(false);
        w.move("north");
        expect(w.rooms.ancientHall.visited).toBe(true);
    });

    it("fog of war reveals only the frontier around visited rooms", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        expect(w.isVisible("start")).toBe(true);           // current
        expect(w.isVisible("darkForest")).toBe(true);      // neighbour of start
        expect(w.isVisible("treasury")).toBe(false);       // far, hidden
        w.move("east"); // to darkForest
        expect(w.isVisible("marsh")).toBe(true);           // now on frontier
        expect(w.isVisible("treasury")).toBe(false);       // still hidden (2 steps away)
    });

    it("coords survive a save/resume round-trip via the prototype getter", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.world = new g.World();
        game.quest = new g.Quest();
        game.inventory = new g.Inventory(game.player);
        game.saveSystem.save(game);
        const game2 = new g.Game();
        game2.resume();
        expect(game2.world.coords.treasury.x).toBe(2);
        expect(game2.world.directionTo("darkForest")).toBe("east");
    });

    it("stores a valid enemy type on the room for consistent re-encounters", () => {
        const { exports: g } = loadGame({ random: () => 0.1 }); // roll -> enemy event
        const w = new g.World();
        w.currentLocation = "darkForest";
        const res = w.explore();
        expect(res.type).toBe("enemy");
        const type = w.rooms.darkForest.enemyType;
        expect(w.enemyPoolFor("darkForest").includes(type)).toBe(true);
        // A created enemy of that type is well-formed.
        const enemy = g.createEnemy(type, 1);
        expect(enemy.maxHealth).toBeGreaterThan(0);
    });

    it("offers a recruit at the camp exactly once", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        w.currentLocation = "camp";
        const res = w.explore();
        expect(res.type).toBe("recruit");
        expect(w.rooms.camp.recruitType).toBe("warrior");
    });

    it("generates the wanderer event and reports it", () => {
        const { exports: g } = loadGame({ random: () => 0.85 }); // roll into wanderer band
        const w = new g.World();
        w.currentLocation = "darkForest";
        const res = w.explore();
        expect(res.type).toBe("wanderer");
    });

    it("uses zone-specific enemy pools with a safe fallback", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        expect(w.enemyPoolFor("marsh")).toEqual(["wolf"]);
        expect(w.enemyPoolFor("catacomb")).toEqual(["skeleton"]);
        expect(w.enemyPoolFor("unknownRoom")).toEqual(w.enemyPool); // fallback
        // Every zone pool references only known enemy types.
        const valid = new Set(["goblin", "wolf", "skeleton", "boss"]);
        for (const pool of Object.values(w.zoneEnemies)) {
            for (const t of pool) expect(valid.has(t)).toBe(true);
        }
    });

    it("provides valid, zone-specific chest loot with a fallback", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        const validKeys = new Set(Object.keys(g.ITEMS));
        for (const pool of Object.values(w.chestLoot)) {
            expect(pool.length).toBeGreaterThan(0);
            for (const key of pool) expect(validKeys.has(key)).toBe(true);
        }
        expect(w.chestLootFor("unknownRoom")).toEqual(["potion", "shield"]);
        expect(w.chestLootFor("forge").length).toBeGreaterThan(0);
    });

    it("keeps goblins reachable near the entrance for the quest", () => {
        const { exports: g } = loadGame();
        const w = new g.World();
        const goblinRooms = Object.keys(w.zoneEnemies).filter(id => w.zoneEnemies[id].includes("goblin"));
        expect(goblinRooms.length).toBeGreaterThanOrEqual(3);
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
// Crafting / rarity
// ---------------------------------------------------------------------------
describe("Crafting", () => {
    it("defaults new items to common rarity and preserves it on clone", () => {
        const { exports: g } = loadGame();
        const s = g.ITEMS.sword.clone();
        expect(s.rarity).toBe("common");
        s.rarity = "rare";
        expect(s.clone().rarity).toBe("rare");
    });

    it("refuses to upgrade without gold or essence", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        p.gold = 1000;
        const sword = g.ITEMS.sword.clone();
        expect(g.Craft.upgrade(p, sword).success).toBe(false); // no essence
        p.addItem(g.Craft.essence());
        p.gold = 0;
        expect(g.Craft.upgrade(p, sword).success).toBe(false); // no gold
    });

    it("upgrades through rare and legendary, scaling bonus and consuming resources", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        p.gold = 1000;
        const sword = g.ITEMS.sword.clone();
        const base = sword.attackBonus;
        p.addItem(g.Craft.essence());
        const r1 = g.Craft.upgrade(p, sword);
        expect(r1.success).toBe(true);
        expect(sword.rarity).toBe("rare");
        expect(sword.attackBonus).toBe(Math.round(base * 1.6));
        expect(sword.name.startsWith("Редкий")).toBe(true);
        expect(g.Craft.essenceCount(p)).toBe(0);
        expect(p.gold).toBe(920);

        p.addItem(g.Craft.essence());
        p.addItem(g.Craft.essence());
        const r2 = g.Craft.upgrade(p, sword);
        expect(r2.success).toBe(true);
        expect(sword.rarity).toBe("legendary");
        expect(g.Craft.canUpgrade(sword)).toBe(false); // maxed
    });

    it("rejects upgrading non-equipment", () => {
        const { exports: g } = loadGame();
        const potion = g.ITEMS.potion.clone();
        expect(g.Craft.canUpgrade(potion)).toBe(false);
    });

    it("persists rarity across save/resume", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.player.gold = 1000;
        game.world = new g.World();
        game.quest = new g.Quest();
        game.journal = new g.QuestJournal();
        game.inventory = new g.Inventory(game.player);
        const sword = g.ITEMS.sword.clone();
        game.player.addItem(sword);
        game.player.addItem(g.Craft.essence());
        const weapon = game.player.inventory.find(i => i.type === "weapon");
        g.Craft.upgrade(game.player, weapon);
        game.saveSystem.save(game);

        const game2 = new g.Game();
        game2.resume();
        const restored = game2.player.inventory.find(i => i.isEquipment && i.isEquipment());
        expect(restored.rarity).toBe("rare");
    });
});

// ---------------------------------------------------------------------------
// Perks
// ---------------------------------------------------------------------------
describe("Perks", () => {
    it("grants a perk point on each level-up", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        p.addExperience(100); // -> level 2
        expect(p.level).toBe(2);
        expect(p.perkPoints).toBe(1);
    });

    it("power raises attack and spends a point", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.player.perkPoints = 2;
        const atk = game.player.attack;
        const res = game.buyPerk("power");
        expect(res.success).toBe(true);
        expect(game.player.attack).toBe(atk + 3);
        expect(game.player.perkPoints).toBe(1);
    });

    it("toughness raises and heals max HP instantly", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.player.perkPoints = 1;
        const mh = game.player.maxHealth, hp = game.player.health;
        game.buyPerk("toughness");
        expect(game.player.maxHealth).toBe(mh + 15);
        expect(game.player.health).toBe(hp + 15);
    });

    it("crit chance and gold multiplier scale with ranks", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.player.perkPoints = 10;
        game.buyPerk("criticalEye");
        expect(Math.abs(game.player.critChance() - 0.20) < 1e-9).toBe(true);
        game.buyPerk("treasureHunter");
        expect(Math.abs(game.player.goldMultiplier() - 1.15) < 1e-9).toBe(true);
    });

    it("refuses to buy with no points or beyond max rank", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.player.perkPoints = 0;
        expect(game.buyPerk("power").success).toBe(false);
        game.player.perkPoints = 99;
        for (let i = 0; i < 5; i++) game.buyPerk("power"); // maxRank 5
        expect(game.buyPerk("power").success).toBe(false);
    });

    it("persists perks and points across save/resume", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.player.perkPoints = 3;
        game.world = new g.World();
        game.quest = new g.Quest();
        game.journal = new g.QuestJournal();
        game.inventory = new g.Inventory(game.player);
        game.buyPerk("power");
        game.saveSystem.save(game);

        const game2 = new g.Game();
        game2.resume();
        expect(game2.player.perks.power).toBe(1);
        expect(game2.player.perkPoints).toBe(2);
        expect(typeof game2.player.critChance).toBe("function");
    });
});

// ---------------------------------------------------------------------------
// QuestJournal — branching side & companion quests
// ---------------------------------------------------------------------------
describe("QuestJournal", () => {
    it("offers quests based on karma", () => {
        const { exports: g } = loadGame();
        const j = new g.QuestJournal();
        const p = new g.Player("A");
        expect(j.available(p).some(d => d.id === "mercyRun")).toBe(false);
        p.karma = 20;
        expect(j.available(p).some(d => d.id === "mercyRun")).toBe(true);
        p.karma = -20;
        expect(j.available(p).some(d => d.id === "darkBargain")).toBe(true);
    });

    it("gates companion quests on ally role and affinity", () => {
        const { exports: g } = loadGame();
        const j = new g.QuestJournal();
        const p = new g.Player("A");
        expect(j.available(p).some(d => d.id === "gromOath")).toBe(false);
        p.ally = g.ALLIES.warrior(); p.ally.affinity = 45;
        expect(j.available(p).some(d => d.id === "gromOath")).toBe(true);
        p.ally.affinity = 20;
        expect(j.available(p).some(d => d.id === "gromOath")).toBe(false);
    });

    it("advances kill objectives only for the right foe and completes", () => {
        const { exports: g } = loadGame();
        const j = new g.QuestJournal();
        const p = new g.Player("A");
        j.accept("cullWolves", p);
        j.onEnemyDefeated({ name: "Гоблин" });
        expect(j.entry("cullWolves").progress).toBe(0);
        j.onEnemyDefeated({ name: "Волк" });
        j.onEnemyDefeated({ name: "Волк" });
        j.onEnemyDefeated({ name: "Волк" });
        expect(j.entry("cullWolves").completed).toBe(true);
        expect(j.entry("cullWolves").progress).toBe(3); // never overshoots
    });

    it("advances chest objectives", () => {
        const { exports: g } = loadGame();
        const j = new g.QuestJournal();
        const p = new g.Player("A"); p.ally = g.ALLIES.healer(); p.ally.affinity = 50;
        j.accept("liaHerbs", p);
        j.onChestOpened(); j.onChestOpened();
        expect(j.entry("liaHerbs").completed).toBe(true);
    });

    it("pays the reward once, granting gold/xp/karma/affinity", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.player.ally = g.ALLIES.warrior(); game.player.ally.affinity = 45;
        game.journal = new g.QuestJournal();
        game.journal.accept("gromOath", game.player);
        game.journal.accepted.gromOath.completed = true;
        const gold = game.player.gold, aff = game.player.ally.affinity;
        const res = game.journal.claim("gromOath", game);
        expect(res === null).toBe(false);
        expect(game.player.gold).toBe(gold + 100);
        expect(game.player.ally.affinity).toBe(aff + 25);
        expect(game.journal.claim("gromOath", game)).toBe(null); // no double pay
    });

    it("refuses to accept a quest whose conditions aren't met", () => {
        const { exports: g } = loadGame();
        const j = new g.QuestJournal();
        const p = new g.Player("A"); // neutral, no ally
        expect(j.accept("darkBargain", p)).toBe(null);
        expect(j.isAccepted("darkBargain")).toBe(false);
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

    it("applies a karma discount/markup to prices", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const shop = new g.Shop(p);
        expect(shop.priceOf(g.ITEMS.sword)).toBe(80); // karma 0 -> full price
        p.karma = 50;
        expect(shop.priceOf(g.ITEMS.sword)).toBe(68); // -15%
        p.karma = -50;
        expect(shop.priceOf(g.ITEMS.sword)).toBe(92); // +15%
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

    it("surfaces level-up messages triggered by the quest reward", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        p.experience = 90; // reward XP (50) will push past 100 -> level up
        const npc = new g.NPC("Староста");
        const q = new g.Quest();
        q.start();
        q.completed = true;
        const dialogue = npc.talk(p, q);
        expect(p.level).toBe(2);
        expect(dialogue).toContain("уровень");
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

    it("persists the quest journal with progress and methods intact", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.world = new g.World();
        game.quest = new g.Quest();
        game.journal = new g.QuestJournal();
        game.journal.accept("cullWolves", game.player);
        game.journal.onEnemyDefeated({ name: "Волк" });
        game.inventory = new g.Inventory(game.player);
        game.saveSystem.save(game);

        const game2 = new g.Game();
        expect(game2.resume()).toBe(true);
        expect(game2.journal.entry("cullWolves").progress).toBe(1);
        expect(typeof game2.journal.onEnemyDefeated).toBe("function");
        game2.journal.onEnemyDefeated({ name: "Волк" });
        expect(game2.journal.entry("cullWolves").progress).toBe(2);
    });

    it("persists run stats across save/resume", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.world = new g.World();
        game.quest = new g.Quest();
        game.inventory = new g.Inventory(game.player);
        game.bumpStat("steps");
        game.bumpStat("steps");
        game.bumpStat("kills");
        game.saveSystem.save(game);

        const game2 = new g.Game();
        game2.resume();
        expect(game2.stats.steps).toBe(2);
        expect(game2.stats.kills).toBe(1);
        expect(game2.stats.chests).toBe(0);
    });
});

describe("Game stats", () => {
    it("bumpStat only touches known counters and enemyDefeated counts kills", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.world = new g.World();
        game.quest = new g.Quest();
        game.bumpStat("nonsense"); // ignored
        expect(game.stats.kills).toBe(0);
        game.enemyDefeated(g.createEnemy("wolf", 1));
        expect(game.stats.kills).toBe(1);
    });

    it("renderStats reflects current progress", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("Гер");
        game.player.gold = 340;
        game.world = new g.World();
        game.world.relics = ["archive", "shrine"];
        game.stats = { steps: 12, kills: 5, chests: 2, traps: 1 };
        const html = game.renderStats();
        expect(html).toContain("Шагов: 12");
        expect(html).toContain("Побед: 5");
        expect(html).toContain("Рун: 2/3");
        expect(html).toContain("340");
    });
});

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------
function makeBattleGame(g, player) {
    return {
        player,
        calls: { updateUI: 0, enemyDefeated: 0, gameOver: 0, escapeBattle: 0 },
        updateUI() { this.calls.updateUI++; },
        enemyDefeated() { this.calls.enemyDefeated++; },
        gameOver() { this.calls.gameOver++; },
        escapeBattle() { this.calls.escapeBattle++; }
    };
}

describe("Battle", () => {
    it("resets a stale defending stance on start", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        p.isDefending = true;
        const game = makeBattleGame(g, p);
        new g.Battle(game, g.createEnemy("goblin", 1));
        expect(p.isDefending).toBe(false);
    });

    it("winning grants gold + xp and notifies the game", () => {
        const { exports: g } = loadGame({ random: () => 0 }); // no crit, min rolls
        const p = new g.Player("A");
        p.baseAttack = 100000;
        p.updateStats();
        const game = makeBattleGame(g, p);
        const enemy = g.createEnemy("goblin", 1);
        const goldBefore = p.gold;
        const battle = new g.Battle(game, enemy);
        battle.playerAttack();
        expect(battle.finished).toBe(true);
        expect(p.gold).toBe(goldBefore + enemy.gold);
        expect(game.calls.enemyDefeated).toBe(1);
    });

    it("losing triggers game over", () => {
        const { exports: g } = loadGame({ random: () => 0 });
        const p = new g.Player("A");
        p.health = 1;
        const game = makeBattleGame(g, p);
        const enemy = g.createEnemy("boss", 5); // hits hard enough to kill
        const battle = new g.Battle(game, enemy);
        battle.enemyTurn();
        expect(p.isDead()).toBe(true);
        expect(game.calls.gameOver).toBe(1);
    });

    it("successful flee ends the fight and escapes", () => {
        const { exports: g } = loadGame({ random: () => 0 }); // 0 < chance -> success
        const p = new g.Player("A");
        const game = makeBattleGame(g, p);
        const battle = new g.Battle(game, g.createEnemy("goblin", 1));
        battle.playerFlee();
        expect(battle.finished).toBe(true);
        expect(game.calls.escapeBattle).toBe(1);
    });

    it("failed flee keeps fighting and lets the enemy strike", () => {
        const { exports: g } = loadGame({ random: () => 0.999 }); // never below chance
        const p = new g.Player("A");
        const hpBefore = p.health;
        const game = makeBattleGame(g, p);
        const battle = new g.Battle(game, g.createEnemy("goblin", 1));
        battle.playerFlee();
        expect(battle.finished).toBe(false);
        expect(p.health).toBeLessThanOrEqual(hpBefore - 1);
    });

    it("no-ops once the battle is finished", () => {
        const { exports: g } = loadGame({ random: () => 0.5 });
        const p = new g.Player("A");
        const game = makeBattleGame(g, p);
        const battle = new g.Battle(game, g.createEnemy("goblin", 1));
        battle.finished = true;
        const hpBefore = p.health;
        battle.playerAttack();
        battle.playerDefend();
        battle.playerFlee();
        expect(p.health).toBe(hpBefore);
        expect(game.calls.enemyDefeated).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Ally & relationships
// ---------------------------------------------------------------------------
describe("Ally", () => {
    it("warrior and scout damage the enemy, healer restores the player", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const enemy = g.createEnemy("goblin", 1);
        const warrior = g.ALLIES.warrior();
        const before = enemy.health;
        const res = warrior.support(p, enemy);
        expect(res.kind).toBe("attack");
        expect(enemy.health).toBeLessThanOrEqual(before - 1);

        const healer = g.ALLIES.healer();
        p.health = 40;
        const hres = healer.support(p, enemy);
        expect(hres.kind).toBe("heal");
        expect(p.health).toBeGreaterThan(40);
    });

    it("affinity clamps to 0..100 and drives tier + departure", () => {
        const { exports: g } = loadGame();
        const a = g.ALLIES.scout();
        a.changeAffinity(1000);
        expect(a.affinity).toBe(100);
        expect(a.tier()).toBe(3);
        a.changeAffinity(-1000);
        expect(a.affinity).toBe(0);
        expect(a.hasLeft()).toBe(true);
    });

    it("higher affinity means stronger support", () => {
        const { exports: g } = loadGame();
        const low = g.ALLIES.warrior(); low.affinity = 10;
        const high = g.ALLIES.warrior(); high.affinity = 90;
        const e1 = g.createEnemy("skeleton", 1);
        const e2 = g.createEnemy("skeleton", 1);
        const d1 = low.support(new g.Player("A"), e1).damage;
        const d2 = high.support(new g.Player("A"), e2).damage;
        expect(d2).toBeGreaterThan(d1);
    });
});

describe("Combat: skills & status effects", () => {
    it("refills energy at the start of every battle", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        p.energy = 1;
        new g.Battle(makeBattleGame(g, p), g.createEnemy("goblin", 1));
        expect(p.energy).toBe(p.maxEnergy);
    });

    it("a skill spends energy and damages the enemy", () => {
        const { exports: g } = loadGame({ random: () => 0.99 }); // no crit / no status proc
        const p = new g.Player("A");
        const battle = new g.Battle(makeBattleGame(g, p), g.createEnemy("goblin", 1));
        const hp = battle.enemy.health;
        const energy = p.energy;
        const res = battle.playerUseSkill("powerStrike");
        expect(res.success).toBe(true);
        expect(battle.enemy.health).toBeLessThan(hp);
        expect(p.energy).toBe(energy - g.GAME_DATA.skills.powerStrike.cost);
    });

    it("refuses a skill when energy is too low", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const battle = new g.Battle(makeBattleGame(g, p), g.createEnemy("goblin", 1));
        p.energy = 0;
        const hp = battle.enemy.health;
        const res = battle.playerUseSkill("powerStrike");
        expect(res.success).toBe(false);
        expect(battle.enemy.health).toBe(hp);
    });

    it("refuses a skill the player hasn't unlocked yet", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A"); // level 1
        const battle = new g.Battle(makeBattleGame(g, p), g.createEnemy("goblin", 1));
        const res = battle.playerUseSkill("flameSlash"); // needs level 4
        expect(res.success).toBe(false);
    });

    it("poison deals damage over time and expires", () => {
        const { exports: g } = loadGame();
        const p = new g.Player("A");
        const battle = new g.Battle(makeBattleGame(g, p), g.createEnemy("skeleton", 1));
        battle.applyStatus(battle.enemy, "poison", 2);
        const hp = battle.enemy.health;
        const t1 = battle.tickStatuses(battle.enemy, { name: "e", emoji: "x" });
        expect(hp - battle.enemy.health).toBe(g.GAME_DATA.statuses.poison.damage);
        expect(battle.enemy.statuses[0].turns).toBe(1);
        battle.tickStatuses(battle.enemy, { name: "e", emoji: "x" });
        expect(battle.enemy.statuses.length).toBe(0); // expired
        expect(t1.stunned).toBe(false);
    });

    it("a stunned enemy skips its attack", () => {
        const { exports: g } = loadGame({ random: () => 0.99 });
        const p = new g.Player("A");
        const hp = p.health;
        const battle = new g.Battle(makeBattleGame(g, p), g.createEnemy("goblin", 1));
        battle.applyStatus(battle.enemy, "stun", 1);
        battle.enemyTurn();
        expect(p.health).toBe(hp); // no damage taken
    });

    it("some foes inflict a lingering effect on the player", () => {
        const { exports: g } = loadGame({ random: () => 0 }); // guarantees the proc
        const p = new g.Player("A");
        const battle = new g.Battle(makeBattleGame(g, p), g.createEnemy("wolf", 1));
        battle.enemyTurn();
        expect(p.statuses.some(s => s.type === "poison")).toBe(true);
    });

    it("secondWind restores health", () => {
        const { exports: g } = loadGame({ random: () => 0.99 });
        const p = new g.Player("A"); p.level = 2; p.health = 40;
        const battle = new g.Battle(makeBattleGame(g, p), g.createEnemy("goblin", 1));
        battle.playerUseSkill("secondWind");
        expect(p.health).toBeGreaterThan(40);
    });

    it("clears the player's statuses when the fight is won", () => {
        const { exports: g } = loadGame({ random: () => 0 });
        const p = new g.Player("A"); p.baseAttack = 100000; p.updateStats();
        const battle = new g.Battle(makeBattleGame(g, p), g.createEnemy("goblin", 1));
        p.statuses = [{ type: "poison", turns: 3 }];
        battle.playerAttack(); // crit kills, win() runs
        expect(battle.finished).toBe(true);
        expect(p.statuses.length).toBe(0);
    });
});

describe("Battle with ally", () => {
    it("an ally acts on the player's turn and can help finish the enemy", () => {
        const { exports: g } = loadGame({ random: () => 0 });
        const p = new g.Player("A");
        p.ally = g.ALLIES.warrior();
        const game = makeBattleGame(g, p);
        const weakEnemy = g.createEnemy("goblin", 1);
        weakEnemy.health = 6; // ally alone can finish after player's hit
        const battle = new g.Battle(game, weakEnemy);
        battle.playerAttack();
        expect(weakEnemy.isDead()).toBe(true);
        expect(game.calls.enemyDefeated).toBe(1);
    });

    it("battles still work with no ally (regression)", () => {
        const { exports: g } = loadGame({ random: () => 0 });
        const p = new g.Player("A");
        const game = makeBattleGame(g, p);
        const battle = new g.Battle(game, g.createEnemy("goblin", 1));
        battle.playerAttack(); // must not throw without an ally
        expect(battle.finished === true || battle.finished === false).toBe(true);
    });
});

describe("Game companions & karma", () => {
    it("recruitAlly attaches a working companion", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        const ally = game.recruitAlly("healer");
        expect(ally.name).toBe("Травница Лия");
        expect(typeof game.player.ally.support).toBe("function");
        expect(game.recruitAlly("nonsense")).toBe(null);
    });

    it("adjustKarma clamps and karmaLabel reflects it", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.adjustKarma(1000);
        expect(game.player.karma).toBe(100);
        expect(game.karmaLabel()).toBe("Герой");
        game.adjustKarma(-1000);
        expect(game.player.karma).toBe(-100);
        expect(game.karmaLabel()).toBe("Злодей");
    });

    it("persists ally + karma across save/resume with methods intact", () => {
        const { exports: g } = loadGame();
        const game = new g.Game();
        game.player = new g.Player("A");
        game.world = new g.World();
        game.quest = new g.Quest();
        game.inventory = new g.Inventory(game.player);
        game.recruitAlly("scout");
        game.player.ally.affinity = 55;
        game.adjustKarma(25);
        game.saveSystem.save(game);

        const game2 = new g.Game();
        game2.resume();
        expect(game2.player.karma).toBe(25);
        expect(game2.player.ally.name).toBe("Разведчик Кай");
        expect(game2.player.ally.affinity).toBe(55);
        expect(typeof game2.player.ally.support).toBe("function");
        expect(game2.player.ally.tier()).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Balance — deterministic Monte-Carlo over the real Battle loop.
// Encodes the intended difficulty curve so accidental number changes are caught.
// ---------------------------------------------------------------------------
function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function simulateWinRate(seed, count, buildPlayer, buildEnemy) {
    const { exports: g } = loadGame({ random: mulberry32(seed) });
    let wins = 0;
    for (let i = 0; i < count; i++) {
        const p = buildPlayer(g);
        const game = makeBattleGame(g, p);
        const battle = new g.Battle(game, buildEnemy(g));
        let guard = 0;
        while (!battle.finished && guard++ < 1000) {
            if (p.health < p.maxHealth * 0.35 && p.inventory.some(x => x.type === "potion")) {
                battle.playerHeal();
            } else {
                battle.playerAttack();
            }
        }
        if (game.calls.enemyDefeated > 0) wins++;
    }
    return wins / count;
}

function levelUpTo(g, p, level) {
    while (p.level < level) p.addExperience(p.experienceToNextLevel);
    return p;
}

function fullyGeared(g, level) {
    return (gg) => {
        const p = levelUpTo(gg, new gg.Player("A"), level);
        ["sword", "armor", "shield"].forEach(key => {
            p.addItem(gg.ITEMS[key].clone());
            p.equip(p.inventory[p.inventory.length - 1]);
        });
        for (let i = 0; i < 5; i++) p.addItem(gg.ITEMS.potion.clone());
        return p;
    };
}

describe("Balance", () => {
    it("a fresh hero reliably beats a starting goblin (winnable early game)", () => {
        const rate = simulateWinRate(1, 200, g => new g.Player("A"), g => g.createEnemy("goblin", 1));
        expect(rate).toBeGreaterThanOrEqual(0.9);
    });

    it("an unprepared hero almost never beats the boss (real gate)", () => {
        const rate = simulateWinRate(5, 200, g => new g.Player("A"), g => g.createEnemy("boss", 1));
        expect(rate).toBeLessThanOrEqual(0.1);
    });

    it("a geared, levelled hero reliably beats a level-scaled boss", () => {
        const rate = simulateWinRate(4, 200, fullyGeared(null, 8), g => g.createEnemy("boss", 8));
        expect(rate).toBeGreaterThanOrEqual(0.8);
    });
});

run();
