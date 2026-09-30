"use strict";

/**
 * v2 test harness — loads the pure-logic engine files into one shared VM
 * context (mirroring how the browser evaluates the classic <script> tags) and
 * exposes the classes/functions for assertions. DOM-only files (loop, renderer,
 * main) are intentionally excluded.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

// Load order mirrors index.html (pure logic only).
const FILES = [
    "js/engine/vec.js",
    "js/engine/input.js",
    "js/engine/camera.js",
    "js/world/tiles.js",
    "js/world/tilemap.js",
    "js/world/social.js",
    "js/world/resources.js",
    "js/world/maps.js",
    "js/entities/mover.js",
    "js/entities/player.js",
    "js/entities/enemy.js",
    "js/entities/npc.js"
];

const EXPORTED = [
    "Vec2", "Rect", "clamp",
    "Input", "Camera",
    "TILES", "DEFAULT_TILE", "tileInfo",
    "TileMap", "MAPS", "getMap",
    "moveAndCollide", "Player2D", "Enemy2D", "detectEncounter",
    "NPC2D", "Social", "ResourceNode", "ResourceBag", "RESOURCES", "NODE_TYPES"
];

function loadEngine() {
    const sandbox = {};
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.Math = Math;
    vm.createContext(sandbox);

    const source = FILES.map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n;\n");
    const exportTail = "\n;globalThis.__v2_exports = { " + EXPORTED.join(", ") + " };";
    vm.runInContext(source + exportTail, sandbox, { filename: "v2.bundle.js" });

    return { exports: sandbox.__v2_exports, sandbox };
}

module.exports = { loadEngine };
