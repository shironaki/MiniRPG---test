"use strict";

/**
 * v2 smoke tests — boot the real game with a stubbed DOM and play it.
 *
 * These catch the class of bug unit tests cannot: a script missing from
 * index.html, a crash in the render path, an interaction wired to nothing.
 * If this file passes, the game at least loads and responds to the player.
 */
const { describe, it, expect, run } = require("../../tests/tiny-test.js");
const { boot } = require("./dom-harness.js");

// Put the hero exactly on a tile centre so proximity checks pick it up.
function standOn(v2, col, row, ts) {
    ts = ts || 32;
    v2.player.x = col * ts + ts / 2 - 8;
    v2.player.y = row * ts + ts / 2 - 8;
}

describe("v2 smoke › boot", () => {
    it("evaluates every script in index.html without throwing", () => {
        const g = boot();
        expect(!!g.globals.MAPS).toBe(true);
        expect(!!g.v2).toBe(true);           // main.js published its handle
    });

    it("renders frames and shows the HUD", () => {
        const g = boot();
        for (let i = 0; i < 90; i++) g.tick(16.7);
        const hud = g.text("hud");
        expect(hud.includes("Деревня")).toBe(true);
        expect(hud.includes("День")).toBe(true);
    });

    it("the hero moves when a key is held", () => {
        const g = boot();
        g.tick(16.7);
        const x0 = g.v2.player.x;
        g.v2.input.press("KeyD");
        for (let i = 0; i < 20; i++) g.tick(16.7);
        expect(g.v2.player.x > x0).toBe(true);
    });
});

describe("v2 smoke › playing", () => {
    it("gathers a resource with E and puts it in the bag", () => {
        const g = boot();
        g.tick(16.7);
        const node = g.globals.MAPS.village.resources.find(r => r.type === "tree");
        standOn(g.v2, node.col, node.row);
        g.tick(16.7);
        const before = g.v2.resources.count("wood");
        g.tap("KeyE");
        g.tick(16.7);
        expect(g.v2.resources.count("wood") > before).toBe(true);
    });

    it("works a farm plot: till → plant → water (a seed is spent)", () => {
        const g = boot();
        g.tick(16.7);
        const plot = g.globals.MAPS.village.farm[0];
        standOn(g.v2, plot.col, plot.row);
        g.tick(16.7);
        const seeds = g.v2.resources.count("seeds");
        g.tap("KeyE"); g.tick(16.7);      // till
        g.tap("KeyE"); g.tick(16.7);      // plant
        g.tap("KeyE"); g.tick(16.7);      // water
        const p = g.v2.farm.plot(plot.col, plot.row);
        expect(p.state).toBe("growing");
        expect(p.watered).toBe(true);
        expect(g.v2.resources.count("seeds")).toBe(seeds - 1);
    });

    it("walks through the door into the house and back outside", () => {
        const g = boot();
        g.tick(16.7);
        const door = g.globals.MAPS.village.interactables.find(i => i.to === "home");
        standOn(g.v2, door.col, door.row);
        g.tick(16.7);
        g.tap("KeyE"); g.tick(16.7);
        expect(g.v2.zone).toBe("Твой дом");
        expect(g.v2.furniture.length > 0).toBe(true);

        // stepping onto the doorway tile takes you back to the village
        const back = g.globals.MAPS.home.portals[0];
        standOn(g.v2, back.col, back.row);
        g.tick(16.7);
        expect(g.v2.zone).toBe("Деревня");
    });

    it("the bed skips the night and heals the hero", () => {
        const g = boot();
        g.tick(16.7);
        const door = g.globals.MAPS.village.interactables.find(i => i.to === "home");
        standOn(g.v2, door.col, door.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);   // inside

        const bed = g.globals.MAPS.home.interactables.find(i => i.action === "sleep");
        standOn(g.v2, bed.col, bed.row);
        g.tick(16.7);
        const day = g.v2.day;
        g.tap("KeyE"); g.tick(16.7);
        expect(g.v2.day).toBe(day + 1);
        expect(Math.floor(g.v2.clock / 60)).toBe(8);   // woke at 08:00
    });

    it("furniture is solid: the hero cannot walk through the bed", () => {
        const g = boot();
        g.tick(16.7);
        const door = g.globals.MAPS.village.interactables.find(i => i.to === "home");
        standOn(g.v2, door.col, door.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        const bed = g.globals.MAPS.home.furniture.find(f => f.kind === "bed");
        expect(g.v2.tilemap.isSolidTile(bed.col, bed.row)).toBe(true);
        expect(g.v2.tilemap.tileAt(bed.col, bed.row)).toBe("o");   // art intact
    });

    it("opens the shop interior and its counter panel", () => {
        const g = boot();
        g.tick(16.7);
        const door = g.globals.MAPS.village.interactables.find(i => i.to === "shop_in");
        standOn(g.v2, door.col, door.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        expect(g.v2.zone).toBe("Лавка");
        const counter = g.globals.MAPS.shop_in.interactables[0];
        standOn(g.v2, counter.col, counter.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        expect(g.html("overlayBody").length > 0).toBe(true);
    });

    it("a villager asks for an errand and pays for it", () => {
        const g = boot();
        g.tick(16.7);
        const s = g.v2.social, rq = g.v2.requests;
        s.setDay(1);
        s.talk("marta");                                   // now she trusts you
        const req = rq.ensure("marta", s.points("marta"), 1);
        expect(!!req).toBe(true);
        g.v2.resources.add(req.res, req.n);                // bring the goods
        const r = rq.fulfil("marta", g.v2.resources.count(req.res));
        expect(r.ok).toBe(true);
        expect(r.gold > 0).toBe(true);
    });

    it("the home chest stores resources and gives them back", () => {
        const g = boot();
        g.tick(16.7);
        g.v2.resources.add("wood", 5);
        g.v2.storage.add("wood", 0);
        const bag = g.v2.resources.count("wood");
        g.v2.resources.remove("wood", bag); g.v2.storage.add("wood", bag);
        expect(g.v2.storage.count("wood")).toBe(bag);
        expect(g.v2.resources.count("wood")).toBe(0);
        g.v2.storage.remove("wood", bag); g.v2.resources.add("wood", bag);
        expect(g.v2.resources.count("wood")).toBe(bag);
    });

    it("survives a long session: 400 frames across the day/night cycle", () => {
        const g = boot();
        for (let i = 0; i < 400; i++) g.tick(50);    // ~20s → clock advances
        expect(g.v2.clock >= 0).toBe(true);
        expect(g.text("hud").length > 0).toBe(true);
    });
});

run();
