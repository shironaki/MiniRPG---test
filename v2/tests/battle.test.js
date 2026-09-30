"use strict";

const { describe, it, expect, run } = require("../../tests/tiny-test.js");
const { loadBattle } = require("./battle-harness.js");

describe("Battle2D bridge", () => {
    it("wraps the real engine and exposes level-gated skills", () => {
        const { exports: b } = loadBattle();
        const hero = new b.Player("Тест");
        hero.level = 5;
        const bc = new b.Battle2D(hero, "goblin", 1);
        const ids = bc.availableSkills().map(s => s.id);
        expect(ids.includes("powerStrike")).toBe(true); // level 1
        expect(ids.includes("arcaneBolt")).toBe(true);   // level 5
    });

    it("a strong hero wins and gains gold + xp", () => {
        const { exports: b } = loadBattle({ random: () => 0.99 /* no crit noise, no drops */ });
        const hero = new b.Player("Тест");
        hero.attack = 999; hero.baseAttack = 999;
        const goldBefore = hero.gold;
        let ended = null;
        const bc = new b.Battle2D(hero, "goblin", 1, { onEnd: r => { ended = r; } });
        bc.attack();
        expect(bc.finished).toBe(true);
        expect(ended).toBe("win");
        expect(hero.gold > goldBefore).toBe(true);
    });

    it("a doomed hero loses and triggers game over", () => {
        const { exports: b } = loadBattle({ random: () => 0.99 });
        const hero = new b.Player("Тест");
        hero.health = 1; hero.defense = 0; hero.baseDefense = 0;
        let ended = null;
        const bc = new b.Battle2D(hero, "boss", 5, { onEnd: r => { ended = r; } });
        bc.attack(); // enemy retaliates and finishes the hero
        expect(ended).toBe("lose");
        expect(bc.result).toBe("lose");
    });

    it("fleeing ends the encounter without a game over", () => {
        const { exports: b } = loadBattle({ random: () => 0 /* flee always succeeds */ });
        const hero = new b.Player("Тест");
        let ended = null;
        const bc = new b.Battle2D(hero, "wolf", 1, { onEnd: r => { ended = r; } });
        bc.flee();
        expect(ended).toBe("flee");
    });

    it("elemental skill damage applies through the bridge", () => {
        const { exports: b } = loadBattle({ random: () => 0.5 });
        const hero = new b.Player("Тест");
        hero.level = 6; hero.energy = 100; hero.maxEnergy = 100; hero.attack = 40;
        const bc = new b.Battle2D(hero, "wolf", 1); // wolf = nature, weak to fire
        const hp0 = bc.enemy.health;
        bc.useSkill("flameSlash"); // fire vs nature -> super effective
        expect(bc.enemy.health < hp0).toBe(true);
        expect(bc.lines.some(l => l.includes("Огненный разрез"))).toBe(true);
    });
});

run();
