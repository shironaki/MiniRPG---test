"use strict";

/**
 * Zero-dependency test harness for Mini RPG.
 *
 * The game ships as plain <script> files that declare browser globals
 * (class Player, const ITEMS, ...). Those declarations are lexical, so we
 * concatenate the sources with an explicit export tail and evaluate them once
 * inside a vm context that provides minimal browser shims. This lets us unit
 * test the real gameplay logic without a build step or a headless browser.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const JS_DIR = path.join(ROOT, "js");

// Load order mirrors index.html (minus the DOM-wiring entry point main.js).
const LOGIC_FILES = [
    "item.js",
    "player.js",
    "inventory.js",
    "enemy.js",
    "chest.js",
    "trap.js",
    "room.js",
    "shop.js",
    "npc.js",
    "quest.js",
    "world.js",
    "battle.js",
    "save.js",
    "game.js"
];

const EXPORTED = [
    "Item", "ITEMS", "Player", "Inventory", "Enemy", "createEnemy",
    "Chest", "Trap", "Room", "Shop", "NPC", "Quest", "World",
    "Battle", "SaveSystem", "Game"
];

// ---- Minimal browser shims -------------------------------------------------

function createElementStub() {
    const el = {
        innerHTML: "",
        textContent: "",
        value: "",
        style: {},
        dataset: {},
        children: [],
        classList: {
            add() {},
            remove() {},
            toggle() {},
            contains() { return false; }
        },
        scrollTop: 0,
        scrollHeight: 0,
        appendChild(child) { this.children.push(child); return child; },
        prepend(child) { this.children.unshift(child); return child; },
        addEventListener() {},
        querySelectorAll() { return []; },
        set onclick(_) {},
        get onclick() { return null; }
    };
    return el;
}

function createDocumentStub() {
    const cache = new Map();
    return {
        getElementById(id) {
            if (!cache.has(id)) cache.set(id, createElementStub());
            return cache.get(id);
        },
        createElement() { return createElementStub(); },
        querySelectorAll() { return []; },
        addEventListener() {}
    };
}

function createLocalStorageStub() {
    const store = new Map();
    return {
        getItem(key) { return store.has(key) ? store.get(key) : null; },
        setItem(key, value) { store.set(key, String(value)); },
        removeItem(key) { store.delete(key); },
        clear() { store.clear(); }
    };
}

/**
 * Build a fresh sandbox with all game classes loaded. Each call is isolated,
 * so tests never share mutable module state (ITEMS templates, etc.).
 *
 * @param {object} [opts]
 * @param {() => number} [opts.random] deterministic replacement for Math.random
 */
function loadGame(opts = {}) {
    const sandboxMath = Object.create(Math);
    if (typeof opts.random === "function") {
        sandboxMath.random = opts.random;
    }

    const sandbox = {
        Math: sandboxMath,
        Object, Array, JSON, String, Number, Boolean, Date, Error,
        console,
        document: createDocumentStub(),
        localStorage: createLocalStorageStub(),
        prompt: () => opts.promptValue ?? "Тестовый герой",
        alert: () => {},
        setTimeout: (fn) => { if (typeof fn === "function") fn(); return 0; },
        clearTimeout: () => {},
        // UI globals that live in main.js in the browser; no-ops for logic tests.
        addLog: () => {},
        showScreen: () => {},
        renderLocation: () => {},
        renderWorld: () => {},
        renderQuest: () => {}
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;

    const source = LOGIC_FILES
        .map((file) => fs.readFileSync(path.join(JS_DIR, file), "utf8"))
        .join("\n;\n");

    const exportTail =
        "\n;globalThis.__game_exports = { " +
        EXPORTED.map((name) => `${name}: typeof ${name} !== "undefined" ? ${name} : undefined`).join(", ") +
        " };";

    vm.createContext(sandbox);
    vm.runInContext(source + exportTail, sandbox, { filename: "minirpg.bundle.js" });

    return { exports: sandbox.__game_exports, sandbox };
}

module.exports = { loadGame };
