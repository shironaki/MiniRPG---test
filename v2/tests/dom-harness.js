"use strict";

/**
 * v2 smoke harness — boots the WHOLE game the way the browser does.
 *
 * Every script listed in v2/index.html is evaluated, in order, inside one VM
 * context with a minimal fake DOM and a no-op canvas. That means a missing
 * <script> tag, a typo at file scope, or a crash on the first frame is caught
 * by `npm test` instead of by a white screen in the browser.
 *
 * The animation frame callback is captured rather than scheduled, so tests
 * drive time by hand with `tick(ms)` and stay deterministic.
 *
 * Nothing here asserts anything — see smoke.test.js.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO = path.resolve(__dirname, "..", "..");

// Load order mirrors v2/index.html exactly (v1 logic first, then v2).
const FILES = [
    "js/util.js", "js/data.js", "js/item.js", "js/craft.js", "js/ally.js",
    "js/player.js", "js/enemy.js", "js/battle.js", "js/shop.js", "js/quest.js",
    "js/dungeon.js", "js/dialogue.js",
    "v2/js/engine/vec.js", "v2/js/engine/input.js", "v2/js/engine/camera.js",
    "v2/js/engine/loop.js",
    "v2/js/world/tiles.js", "v2/js/world/tilemap.js", "v2/js/world/social.js",
    "v2/js/world/resources.js", "v2/js/world/farming.js",
    "v2/js/world/fishing.js", "v2/js/world/cooking.js", "v2/js/world/tools.js",
    "v2/js/world/requests.js", "v2/js/world/maps.js",
    "v2/js/entities/mover.js", "v2/js/entities/player.js", "v2/js/entities/enemy.js",
    "v2/js/entities/npc.js",
    "v2/js/battle/battle2d.js", "v2/js/battle/battleui.js",
    "v2/js/ui/menus.js",
    "v2/js/render/tilesart.js", "v2/js/render/buildings.js", "v2/js/render/furniture.js",
    "v2/js/render/character.js", "v2/js/render/mobs.js", "v2/js/render/renderer.js",
    "v2/js/main.js"
];

// Names main.js/menus.js define at file scope; surfaced for assertions.
const EXPORTED = [
    "MAPS", "getMap", "Player", "QuestJournal", "Social", "ResourceBag",
    "Requests", "Farm", "NPC2D", "ITEMS", "TILES", "tileInfo", "TileMap",
    "FishingSystem", "CookingSystem", "Tools", "RECIPES", "TOOL_TIERS"
];

// Every canvas method becomes a no-op; a few must return usable objects.
function makeCtx() {
    const stub = {
        measureText: () => ({ width: 8 }),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        createImageData: () => ({ data: new Uint8ClampedArray(4) }),
        canvas: { width: 640, height: 384 }
    };
    return new Proxy(stub, {
        get(t, k) {
            if (k in t) return t[k];
            if (typeof k === "symbol") return undefined;
            return () => undefined;     // any drawing call is a no-op
        },
        set(t, k, v) { t[k] = v; return true; }
    });
}

function makeCanvas() {
    const cv = {
        width: 640, height: 384,
        getContext: () => makeCtx(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 384 }),
        addEventListener() {}, removeEventListener() {},
        style: makeStyle(), classList: makeClassList(),
        dataset: {}, querySelectorAll: () => [], querySelector: () => null
    };
    return cv;
}

function makeStyle() {
    const s = {};
    s.setProperty = (k, v) => { s[k] = v; };
    s.removeProperty = (k) => { delete s[k]; };
    s.getPropertyValue = (k) => s[k] || "";
    return s;
}

function makeClassList() {
    const set = new Set();
    return {
        add: (...c) => c.forEach(x => set.add(x)),
        remove: (...c) => c.forEach(x => set.delete(x)),
        toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c))
            : (on ? set.add(c) : set.delete(c))),
        contains: (c) => set.has(c),
        _set: set
    };
}

function makeEl(id) {
    const el = {
        id,
        _html: "", _text: "",
        children: [],
        style: makeStyle(),
        classList: makeClassList(),
        dataset: {},
        addEventListener() {}, removeEventListener() {},
        appendChild(c) { el.children.push(c); return c; },
        querySelectorAll: () => [],
        querySelector: () => null,
        getContext: () => makeCtx(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 384 }),
        focus() {}, blur() {}, remove() {},
        requestFullscreen: () => Promise.resolve(),
        get innerHTML() { return el._html; },
        set innerHTML(v) { el._html = String(v); },
        get textContent() { return el._text; },
        set textContent(v) { el._text = String(v); }
    };
    return el;
}

/** Boot the game. Returns { sandbox, v2, tick, el, text, html }. */
function boot() {
    const els = {};
    const getEl = (id) => (els[id] || (els[id] = id === "game" ? Object.assign(makeEl(id), makeCanvas()) : makeEl(id)));

    let pendingRAF = null;
    let hrNow = 0;

    const document = {
        getElementById: getEl,
        createElement: (tag) => (tag === "canvas" ? Object.assign(makeEl(tag), makeCanvas()) : makeEl(tag)),
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener() {}, removeEventListener() {},
        body: makeEl("body"),
        documentElement: makeEl("html"),
        fullscreenElement: null,
        exitFullscreen: () => Promise.resolve()
    };

    const sandbox = {
        console,
        Math,
        document,
        navigator: { userAgent: "node", vibrate() {}, maxTouchPoints: 0 },
        location: { href: "http://localhost/v2/", search: "" },
        localStorage: {
            _d: {},
            getItem(k) { return k in this._d ? this._d[k] : null; },
            setItem(k, v) { this._d[k] = String(v); },
            removeItem(k) { delete this._d[k]; }
        },
        requestAnimationFrame: (cb) => { pendingRAF = cb; return 1; },
        cancelAnimationFrame: () => { pendingRAF = null; },
        setTimeout: (fn) => { return 0; },          // never fires: keeps runs deterministic
        clearTimeout() {},
        setInterval: () => 0, clearInterval() {},
        performance: { now: () => hrNow },
        addEventListener() {}, removeEventListener() {},
        matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
        AudioContext: undefined,
        innerWidth: 900, innerHeight: 600,
        devicePixelRatio: 1
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    vm.createContext(sandbox);

    for (const f of FILES) {
        const src = fs.readFileSync(path.join(REPO, f), "utf8");
        vm.runInContext(src + "\n//# " + f, sandbox, { filename: f });
    }
    // Classes/consts declared at file scope are lexical, not properties of the
    // sandbox object — re-export them explicitly.
    vm.runInContext("globalThis.__all = { " + EXPORTED.join(", ") + " };", sandbox);

    // Advance the game by `ms`, running exactly one frame.
    function tick(ms) {
        hrNow += (ms === undefined ? 16.7 : ms);
        const cb = pendingRAF;
        pendingRAF = null;
        if (cb) cb(hrNow);
    }

    return {
        sandbox,
        globals: sandbox.__all,
        v2: sandbox.__v2,
        tick,
        el: getEl,
        text: (id) => getEl(id)._text,
        html: (id) => getEl(id)._html,
        // A key "tap": press + release, because input is edge-triggered.
        tap: (code) => { sandbox.__v2.input.press(code); sandbox.__v2.input.release(code); }
    };
}

module.exports = { boot, FILES };
