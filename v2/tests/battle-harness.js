"use strict";

/**
 * v2 battle-bridge harness — loads the v1 combat engine (from ../../js) plus the
 * v2 Battle2D controller into one VM context, so the bridge can be tested with
 * the real combat logic. DOM-coupled v1 files (game.js/main.js/audio.js) are
 * excluded; Battle's log is overridden by Battle2D so no DOM is required.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO = path.resolve(__dirname, "..", "..");
const V2 = path.resolve(__dirname, "..");

const V1_FILES = [
    "js/util.js", "js/data.js", "js/item.js", "js/craft.js",
    "js/ally.js", "js/player.js", "js/enemy.js", "js/battle.js"
].map(f => path.join(REPO, f));

const V2_FILES = ["js/battle/battle2d.js"].map(f => path.join(V2, f));

const EXPORTED = ["GAME_DATA", "Player", "Enemy", "createEnemy", "Battle", "Battle2D", "Craft"];

function loadBattle(opts = {}) {
    const mathObj = Object.create(Math);
    if (opts.random) mathObj.random = opts.random;
    const sandbox = { Math: mathObj, console };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    // Minimal document so any stray reference degrades gracefully (unused here).
    sandbox.document = { getElementById: () => null, createElement: () => ({}) };
    vm.createContext(sandbox);

    const src = [...V1_FILES, ...V2_FILES].map(f => fs.readFileSync(f, "utf8")).join("\n;\n");
    const tail = "\n;globalThis.__bb = { " + EXPORTED.join(", ") + " };";
    vm.runInContext(src + tail, sandbox, { filename: "v2.battle.bundle.js" });
    return { exports: sandbox.__bb, sandbox };
}

module.exports = { loadBattle };
