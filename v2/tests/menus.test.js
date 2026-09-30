"use strict";

const { describe, it, expect, run } = require("../../tests/tiny-test.js");
const { loadVillage } = require("./menus-harness.js");

describe("v2 village menus drive the real v1 systems", () => {
    it("Shop: buying costs gold and grants the item; selling refunds", () => {
        const { exports: v } = loadVillage();
        const hero = new v.Player("Тест");
        const shop = new v.Shop(hero);
        const before = hero.gold;
        const sword = shop.items.find(i => i.type === "weapon");
        const r = shop.buy(sword);
        expect(r.success).toBe(true);
        expect(hero.gold < before).toBe(true);
        expect(hero.inventory.some(i => i.name === sword.name)).toBe(true);
        const owned = hero.inventory.find(i => i.name === sword.name);
        const midGold = hero.gold;
        expect(shop.sell(owned).success).toBe(true);
        expect(hero.gold > midGold).toBe(true);
    });

    it("Forge: an equipment item upgrades a rarity tier when paid for", () => {
        const { exports: v } = loadVillage();
        const hero = new v.Player("Тест");
        hero.gold = 999;
        const sword = v.ITEMS.sword.clone();
        hero.inventory.push(sword, v.Craft.essence(), v.Craft.essence());
        const atk0 = sword.attackBonus;
        const res = v.Craft.upgrade(hero, sword);
        expect(res.success).toBe(true);
        expect(sword.rarity).toBe("rare");
        expect(sword.attackBonus > atk0).toBe(true);
        expect(v.Craft.essenceCount(hero)).toBe(1); // one essence spent
    });

    it("Quests: accept, progress via kills, then claim the reward once", () => {
        const { exports: v } = loadVillage();
        const hero = new v.Player("Тест");
        const j = new v.QuestJournal();
        const host = { player: hero, adjustKarma(n) { hero.karma = (hero.karma || 0) + n; } };
        expect(j.available(hero).some(d => d.id === "cullWolves")).toBe(true);
        j.accept("cullWolves", hero);
        const wolf = v.createEnemy("wolf", 1);
        j.onEnemyDefeated(wolf);
        j.onEnemyDefeated(wolf);
        expect(j.entry("cullWolves").completed).toBe(false);
        j.onEnemyDefeated(wolf);
        expect(j.entry("cullWolves").completed).toBe(true);
        const goldBefore = hero.gold;
        const claim = j.claim("cullWolves", host);
        expect(claim.reward.gold).toBe(120);
        expect(hero.gold).toBe(goldBefore + 120);
        expect(hero.karma).toBe(5);
        expect(j.claim("cullWolves", host)).toBe(null); // cannot double-claim
    });

    it("Dialogue: a choice applies its karma/xp effect through the host", () => {
        const { exports: v } = loadVillage();
        const hero = new v.Player("Тест");
        const host = { player: hero, adjustKarma(n) { hero.karma = (hero.karma || 0) + n; } };
        const d = new v.Dialogue(v.GAME_DATA.dialogues.elder);
        // root -> prisoner (index 2), then "mercy" (index 0): karma +15, xp +20.
        d.choose(2, host);
        const before = hero.karma || 0;
        d.choose(0, host);
        expect((hero.karma || 0) - before).toBe(15);
        expect(hero.experience >= 20 || hero.level > 1).toBe(true);
    });

    it("Dungeon: generates floors and always ends on an elite", () => {
        const { exports: v } = loadVillage();
        const seq = [0.4, 0.6, 0.75, 0.88, 0.1, 0.2, 0.3, 0.4, 0.5];
        let k = 0;
        const dg = v.Dungeon.generate(3, 5, () => seq[(k++) % seq.length]);
        expect(dg.depth).toBe(5);
        expect(dg.floors[dg.floors.length - 1].type).toBe("elite");
        expect(dg.isComplete()).toBe(false);
    });
});

run();
