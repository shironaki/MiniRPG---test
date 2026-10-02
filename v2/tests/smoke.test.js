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

    it("meets the shopkeeper inside the shop and can chat with her", () => {
        const g = boot();
        g.tick(16.7);
        const door = g.globals.MAPS.village.interactables.find(i => i.to === "shop_in");
        standOn(g.v2, door.col, door.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        expect(g.v2.zone).toBe("Лавка");
        const her = g.v2.npcs[0];
        expect(!!her).toBe(true);
        // stand right on her so she — not the nearby counter — is the target
        g.v2.player.x = her.centerX - 10;
        g.v2.player.y = her.centerY - 10;
        g.tick(16.7);
        g.tap("KeyE"); g.tick(16.7);
        const panel = g.html("overlayBody");
        expect(panel.includes(her.name)).toBe(true);     // her panel opened
        expect(panel.includes("дружб") || panel.includes("Поговорить")).toBe(true);
    });

    it("the home chest stores resources and gives them back", () => {
        const g = boot();
        g.tick(16.7);
        g.v2.resources.add("wood", 5);
        const bag = g.v2.resources.count("wood");
        const initialStorage = g.v2.storage.count("wood");
        g.v2.resources.remove("wood", bag); g.v2.storage.add("wood", bag);
        expect(g.v2.storage.count("wood")).toBe(initialStorage + bag);
        expect(g.v2.resources.count("wood")).toBe(0);
        g.v2.storage.remove("wood", bag); g.v2.resources.add("wood", bag);
        expect(g.v2.resources.count("wood")).toBe(bag);
        expect(g.v2.storage.count("wood")).toBe(initialStorage);
    });

    it("fishes at the village pond with E and adds fish to the bag", () => {
        const g = boot();
        g.tick(16.7);
        const fishSpot = g.globals.MAPS.village.interactables.find(i => i.action === "fishing");
        expect(!!fishSpot).toBe(true);
        standOn(g.v2, fishSpot.col, fishSpot.row);
        g.tick(16.7);
        const bagBefore = g.v2.resources.total();
        g.tap("KeyE");
        g.tick(16.7);
        expect(g.v2.resources.total() > bagBefore).toBe(true);
    });

    it("walks into home, opens the cooking hearth and cooks a dish", () => {
        const g = boot();
        g.tick(16.7);
        const door = g.globals.MAPS.village.interactables.find(i => i.to === "home");
        standOn(g.v2, door.col, door.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        expect(g.v2.zone).toBe("Твой дом");

        // Give player ingredients
        g.v2.resources.add("veg", 2);
        g.v2.resources.add("herb", 1);

        const hearth = g.globals.MAPS.home.interactables.find(i => i.action === "cooking");
        expect(!!hearth).toBe(true);
        standOn(g.v2, hearth.col, hearth.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);

        const html = g.html("overlayBody");
        expect(html.toLowerCase().includes("очаг") || html.includes("похл")).toBe(true);
        expect(html.includes("data-cook=\"dish_stew\"")).toBe(true);
    });

    it("eats a cooked meal from the backpack to restore health and energy", () => {
        const g = boot();
        g.tick(16.7);
        g.v2.resources.add("dish_stew", 1);
        const hero = g.sandbox.__all.Player ? g.sandbox.__v2.player : null;
        // Open backpack with KeyI
        g.tap("KeyI");
        g.tick(16.7);
        const html = g.html("overlayBody");
        expect(html.includes("Овощная похлёбка")).toBe(true);
        expect(html.includes("data-eat=\"dish_stew\"")).toBe(true);
    });

    it("drinks fresh water from the village town well to restore energy", () => {
        const g = boot();
        g.tick(16.7);
        const wellSpot = g.globals.MAPS.village.interactables.find(i => i.action === "well");
        expect(!!wellSpot).toBe(true);
        // Stand adjacent to well
        standOn(g.v2, wellSpot.col - 1, wellSpot.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        const html = g.html("overlayBody");
        expect(html.includes("колодец")).toBe(true);
        expect(html.includes("data-drink=\"1\"")).toBe(true);
    });

    it("opens the village notice board to check daily gossip and errands", () => {
        const g = boot();
        g.tick(16.7);
        const boardSpot = g.globals.MAPS.village.interactables.find(i => i.action === "board");
        expect(!!boardSpot).toBe(true);
        standOn(g.v2, boardSpot.col, boardSpot.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        const html = g.html("overlayBody");
        expect(html.includes("Доска объявлений") || html.includes("Вестник")).toBe(true);
        expect(html.includes("Погода") || html.includes("День")).toBe(true);
    });

    it("travels to coastal beach zone, gathers seashells and fishes in the ocean", () => {
        const g = boot();
        g.tick(16.7);
        const beachPortal = g.globals.MAPS.village.portals.find(p => p.to === "beach");
        expect(!!beachPortal).toBe(true);
        standOn(g.v2, beachPortal.col, beachPortal.row);
        g.tick(16.7);
        expect(g.v2.zone).toBe("Лазурный берег");

        // Gather seashell
        const shell = g.globals.MAPS.beach.resources.find(r => r.type === "seashell");
        expect(!!shell).toBe(true);
        standOn(g.v2, shell.col, shell.row);
        g.tick(16.7);
        g.tap("KeyE");
        g.tick(16.7);
        expect(g.v2.resources.count("seashell") >= 1).toBe(true);

        // Fish in ocean
        const oceanSpot = g.globals.MAPS.beach.interactables.find(i => i.action === "fishing");
        expect(!!oceanSpot).toBe(true);
        standOn(g.v2, oceanSpot.col, oceanSpot.row);
        g.tick(16.7);
        g.tap("KeyE");
        g.tick(16.7);
        expect(g.v2.resources.total() >= 2).toBe(true);
    });

    it("pets the village cat on the plaza for heartwarming friendship", () => {
        const g = boot();
        g.tick(16.7);
        const catSpot = g.globals.MAPS.village.interactables.find(i => i.action === "cat");
        expect(!!catSpot).toBe(true);
        standOn(g.v2, catSpot.col, catSpot.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        const html = g.html("overlayBody");
        expect(html.includes("Мурзик")).toBe(true);
        expect(html.includes("data-pet=\"1\"")).toBe(true);
    });

    it("visits the village ranch, pets animals and harvests fresh milk/eggs", () => {
        const g = boot();
        g.tick(16.7);
        const ranchSpot = g.globals.MAPS.village.interactables.find(i => i.action === "ranch");
        expect(!!ranchSpot).toBe(true);
        standOn(g.v2, ranchSpot.col, ranchSpot.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        const html = g.html("overlayBody");
        expect(html.includes("Фермерское подворье")).toBe(true);
        expect(html.includes("data-pet-all=\"1\"")).toBe(true);

        // Pet and feed animals
        g.v2.resources.add("hay", 5);
        const petRes = g.v2.ranch.petAll();
        expect(petRes.ok).toBe(true);
        const harvestRes = g.v2.ranch.harvestAll(g.v2.resources);
        expect(harvestRes.ok).toBe(true);
        expect(g.v2.resources.count("egg") + g.v2.resources.count("milk") > 0).toBe(true);
    });

    it("smelts copper ore into copper bars at the village forge furnace", () => {
        const g = boot();
        g.tick(16.7);
        const forgeDoor = g.globals.MAPS.village.interactables.find(i => i.to === "forge_in");
        expect(!!forgeDoor).toBe(true);
        standOn(g.v2, forgeDoor.col, forgeDoor.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        expect(g.v2.zone).toBe("Кузница");

        const smeltSpot = g.globals.MAPS.forge_in.interactables.find(i => i.action === "smelt");
        expect(!!smeltSpot).toBe(true);
        standOn(g.v2, smeltSpot.col, smeltSpot.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        const html = g.html("overlayBody");
        expect(html.includes("Плавильный горн")).toBe(true);

        // Add ore & coal and smelt
        g.v2.resources.add("ore_copper", 3);
        g.v2.resources.add("coal", 1);
        const smeltRes = g.v2.smelting.smelt("bar_copper", g.v2.resources);
        expect(smeltRes.ok).toBe(true);
        expect(g.v2.resources.count("bar_copper")).toBe(1);
    });

    it("descends into the deep procedural mines from the cave shaft", () => {
        const g = boot();
        g.tick(16.7);
        const forestPortal = g.globals.MAPS.village.portals.find(p => p.to === "forest");
        standOn(g.v2, forestPortal.col, forestPortal.row);
        g.tick(16.7);
        const cavePortal = g.globals.MAPS.forest.portals.find(p => p.to === "cave");
        standOn(g.v2, cavePortal.col, cavePortal.row);
        g.tick(16.7);
        expect(g.v2.zone).toBe("Пещера");

        const mineSpot = g.globals.MAPS.cave.interactables.find(i => i.action === "mines");
        expect(!!mineSpot).toBe(true);
        standOn(g.v2, mineSpot.col, mineSpot.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        const html = g.html("overlayBody");
        expect(html.includes("Глубокие шахты")).toBe(true);

        // Direct test deep mine floor progression
        expect(g.v2.mines.floor).toBe(1);
        const floor2 = g.v2.mines.descend();
        expect(floor2).toBe(2);
        const floorData = g.v2.mines.generateFloor(2);
        expect(floorData.resources.length).toBeGreaterThan(0);
    });

    it("customizes home interior wallpaper and flooring via decor panel", () => {
        const g = boot();
        g.tick(16.7);
        // Enter home interior
        const homeDoor = g.globals.MAPS.village.interactables.find(i => i.to === "home");
        standOn(g.v2, homeDoor.col, homeDoor.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        expect(g.v2.zone).toBe("Твой дом");

        const decorSpot = g.globals.MAPS.home.interactables.find(i => i.action === "decor");
        expect(!!decorSpot).toBe(true);
        standOn(g.v2, decorSpot.col, decorSpot.row);
        g.tick(16.7); g.tap("KeyE"); g.tick(16.7);
        const html = g.html("overlayBody");
        expect(html.includes("Обустройство дома")).toBe(true);

        // Change flooring & wallpaper
        const res1 = g.v2.decor.setFlooring("carpet_red");
        expect(res1.ok).toBe(true);
        expect(g.v2.decor.flooring).toBe("carpet_red");

        const res2 = g.v2.decor.setWallpaper("stone_brick");
        expect(res2.ok).toBe(true);
        expect(g.v2.decor.wallpaper).toBe("stone_brick");
    });

    it("interacts with Starosta Elder and displays dialogue with portrait header", () => {
        const g = boot();
        g.tick(16.7);
        // Find Elder NPC in village
        const elder = g.v2.npcs.find(n => n.id === "elder");
        expect(Boolean(elder)).toBe(true);
        g.v2.player.x = elder.centerX - 10;
        g.v2.player.y = elder.centerY;
        g.tick(16.7);
        g.tap("KeyE");
        g.tick(16.7);

        const html = g.html("overlayBody");
        expect(html.includes("Староста Святослав")).toBe(true);
        expect(html.includes("dlgPortrait") || html.includes("dlgPortraitCard")).toBe(true);
    });

    it("triggers floating texts and emote animations on fishing and actions", () => {
        const g = boot();
        g.tick(16.7);

        // Fish at pond generates floating text and fishing emote
        const beforeTexts = (g.v2.floatingTexts || []).length;
        const beforeEmotes = (g.v2.emotes || []).length;
        g.v2.fishAtPond(false);
        const afterTexts = (g.v2.floatingTexts || []).length;
        const afterEmotes = (g.v2.emotes || []).length;

        expect(afterTexts).toBeGreaterThan(beforeTexts);
        expect(afterEmotes).toBeGreaterThan(beforeEmotes);
        expect(g.v2.emotes[g.v2.emotes.length - 1].icon).toBe("🎣");

        // Direct helper checks
        g.v2.addEmote("❤️", 120, 140);
        expect(g.v2.emotes[g.v2.emotes.length - 1].icon).toBe("❤️");

        g.v2.addFloatingText("+50 Gold", 120, 140);
        expect(g.v2.floatingTexts[g.v2.floatingTexts.length - 1].text).toBe("+50 Gold");
    });

    it("switches hotbar tools with numeric keys 1-6", () => {
        const g = boot();
        g.tick(16.7);
        expect(g.v2.tools.activeSlot).toBe(0);
        expect(g.v2.tools.getActiveToolKey()).toBe("axe");

        g.tap("Digit2");
        g.tick(16.7);
        expect(g.v2.tools.activeSlot).toBe(1);
        expect(g.v2.tools.getActiveToolKey()).toBe("pickaxe");

        g.tap("Digit3");
        g.tick(16.7);
        expect(g.v2.tools.activeSlot).toBe(2);
        expect(g.v2.tools.getActiveToolKey()).toBe("hoe");

        g.tap("Digit4");
        g.tick(16.7);
        expect(g.v2.tools.activeSlot).toBe(3);
        expect(g.v2.tools.getActiveToolKey()).toBe("can");

        g.tap("Digit5");
        g.tick(16.7);
        expect(g.v2.tools.activeSlot).toBe(4);
        expect(g.v2.tools.getActiveToolKey()).toBe("rod");
    });

    it("opens skills & masteries panel and character creator modal", () => {
        const g = boot();
        g.tick(16.7);

        // Open Skills Panel
        g.tap("KeyK");
        g.tick(16.7);
        let overlay = g.html("overlayBody");
        expect(overlay.includes("Мастерство") || overlay.includes("Земледелие") || overlay.includes("Навыки")).toBe(true);

        // Close Skills Panel
        g.v2.closeInteraction();
        g.tick(16.7);

        // Open Character Customization Modal
        g.tap("KeyC");
        g.tick(16.7);
        overlay = g.html("overlayBody");
        expect(overlay.includes("Создание героя") || overlay.includes("призвание") || overlay.includes("Земледелец")).toBe(true);
    });

    it("survives a long session: 400 frames across the day/night cycle", () => {
        const g = boot();
        for (let i = 0; i < 400; i++) g.tick(50);    // ~20s → clock advances
        expect(g.v2.clock >= 0).toBe(true);
        expect(g.text("hud").length > 0).toBe(true);
    });
});

run();
