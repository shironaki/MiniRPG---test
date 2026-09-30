"use strict";

/**
 * v2 village-systems harness — loads the v1 logic that the v2 menus drive
 * (Shop, Craft, QuestJournal, Dialogue, Dungeon) into one VM context, with no
 * DOM. Lets the bridge data-flow be tested with the real game systems.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO = path.resolve(__dirname, "..", "..");
const FILES = [
    "js/util.js", "js/data.js", "js/item.js", "js/craft.js", "js/ally.js",
    "js/player.js", "js/enemy.js", "js/battle.js",
    "js/shop.js", "js/quest.js", "js/dungeon.js", "js/dialogue.js"
].map(f => path.join(REPO, f));

const EXPORTED = ["GAME_DATA", "ITEMS", "Item", "Player", "createEnemy", "Craft",
    "Shop", "Quest", "QuestJournal", "Dungeon", "Dialogue"];

function loadVillage(opts = {}) {
    const mathObj = Object.create(Math);
    if (opts.random) mathObj.random = opts.random;
    const sandbox = { Math: mathObj, console };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    const src = FILES.map(f => fs.readFileSync(f, "utf8")).join("\n;\n");
    vm.runInContext(src + "\n;globalThis.__v = { " + EXPORTED.join(", ") + " };", sandbox,
        { filename: "v2.village.bundle.js" });
    return { exports: sandbox.__v, sandbox };
}

module.exports = { loadVillage };
