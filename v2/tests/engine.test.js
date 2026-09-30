"use strict";

const { describe, it, expect, run } = require("../../tests/tiny-test.js");
const { loadEngine } = require("./harness.js");

// ---------------------------------------------------------------------------
// Vectors & rects
// ---------------------------------------------------------------------------
describe("Vec2 / Rect", () => {
    it("normalises a diagonal to unit length", () => {
        const { Vec2 } = loadEngine().exports;
        const v = new Vec2(3, 4).normalize();
        expect(Math.abs(v.length() - 1) < 1e-9).toBe(true);
    });
    it("keeps a zero vector zero", () => {
        const { Vec2 } = loadEngine().exports;
        const v = new Vec2(0, 0).normalize();
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
    });
    it("detects rect overlap and separation", () => {
        const { Rect } = loadEngine().exports;
        expect(Rect.intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
        expect(Rect.intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 5, h: 5 })).toBe(false);
    });
    it("clamps values", () => {
        const { clamp } = loadEngine().exports;
        expect(clamp(15, 0, 10)).toBe(10);
        expect(clamp(-3, 0, 10)).toBe(0);
        expect(clamp(5, 0, 10)).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
describe("Input", () => {
    it("tracks held keys and movement axis", () => {
        const { Input } = loadEngine().exports;
        const i = new Input();
        i.press("KeyD");
        expect(i.isDown("KeyD")).toBe(true);
        expect(i.axis().x).toBe(1);
        i.press("KeyW");
        expect(i.axis().y).toBe(-1);
        i.release("KeyD");
        expect(i.axis().x).toBe(0);
    });
    it("edge-triggers wasPressed until consumed", () => {
        const { Input } = loadEngine().exports;
        const i = new Input();
        i.press("KeyE");
        expect(i.wasPressed("KeyE")).toBe(true);
        i.consumePressed();
        expect(i.wasPressed("KeyE")).toBe(false);
        // holding does not re-trigger without a fresh press
        i.press("KeyE");
        expect(i.wasPressed("KeyE")).toBe(false);
    });
    it("arrow keys map to the same axis as WASD", () => {
        const { Input } = loadEngine().exports;
        const i = new Input();
        i.press("ArrowLeft");
        expect(i.axis().x).toBe(-1);
        i.press("ArrowDown");
        expect(i.axis().y).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
describe("Camera", () => {
    it("clamps to map edges", () => {
        const { Camera } = loadEngine().exports;
        const cam = new Camera(200, 100);
        cam.follow(0, 0, 1000, 1000);
        expect(cam.x).toBe(0);
        expect(cam.y).toBe(0);
        cam.follow(1000, 1000, 1000, 1000);
        expect(cam.x).toBe(800);
        expect(cam.y).toBe(900);
    });
    it("centres a map smaller than the viewport", () => {
        const { Camera } = loadEngine().exports;
        const cam = new Camera(400, 400);
        cam.follow(50, 50, 200, 200);
        expect(cam.x).toBe(-100);
        expect(cam.y).toBe(-100);
    });
    it("computes visibility", () => {
        const { Camera } = loadEngine().exports;
        const cam = new Camera(100, 100);
        cam.follow(50, 50, 1000, 1000); // x=0,y=0
        expect(cam.isVisible({ x: 10, y: 10, w: 5, h: 5 })).toBe(true);
        expect(cam.isVisible({ x: 500, y: 500, w: 5, h: 5 })).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// TileMap
// ---------------------------------------------------------------------------
describe("TileMap", () => {
    const rows = [
        "####",
        "#..#",
        "#.T#",
        "####"
    ];
    function map(g) { const { TileMap } = loadEngine().exports; return new TileMap(g, 32); }

    it("reports dimensions in tiles and pixels", () => {
        const m = map(rows);
        expect(m.colsCount).toBe(4);
        expect(m.rowsCount).toBe(4);
        expect(m.pixelWidth).toBe(128);
        expect(m.pixelHeight).toBe(128);
    });
    it("resolves tiles and solidity, treating OOB as solid", () => {
        const m = map(rows);
        expect(m.tileAt(1, 1)).toBe(".");
        expect(m.isSolidTile(0, 0)).toBe(true);  // wall
        expect(m.isSolidTile(1, 1)).toBe(false); // grass
        expect(m.isSolidTile(2, 2)).toBe(true);  // tree
        expect(m.isSolidTile(-1, 0)).toBe(true); // out of bounds
    });
    it("maps pixels to tiles", () => {
        const m = map(rows);
        expect(m.colAtPixel(40)).toBe(1);
        expect(m.rowAtPixel(70)).toBe(2);
        expect(m.isSolidAtPixel(70, 70)).toBe(true); // (col2,row2)=tree
    });
});

// ---------------------------------------------------------------------------
// Collision (moveAndCollide)
// ---------------------------------------------------------------------------
describe("moveAndCollide", () => {
    function setup() {
        const { TileMap, moveAndCollide } = loadEngine().exports;
        // 5x3 arena: solid border, open middle row.
        const m = new TileMap(["#####", "#...#", "#####"], 32);
        return { m, moveAndCollide };
    }
    it("moves freely in open space", () => {
        const { m, moveAndCollide } = setup();
        const res = moveAndCollide({ x: 40, y: 40, w: 16, h: 16 }, 10, 0, m);
        expect(res.x).toBe(50);
        expect(res.hitX).toBe(false);
    });
    it("stops against a wall on the right", () => {
        const { m, moveAndCollide } = setup();
        // box near the right open cell (col3 = x96..128 wall at col4 x128)
        const res = moveAndCollide({ x: 100, y: 40, w: 16, h: 16 }, 40, 0, m);
        expect(res.hitX).toBe(true);
        expect(res.x + 16 <= 128).toBe(true); // never past the wall
    });
    it("stops against a wall going up", () => {
        const { m, moveAndCollide } = setup();
        const res = moveAndCollide({ x: 40, y: 40, w: 16, h: 16 }, 0, -40, m);
        expect(res.hitY).toBe(true);
        expect(res.y >= 32).toBe(true); // pushed out of the top wall (row0)
    });
});

// ---------------------------------------------------------------------------
// Player2D
// ---------------------------------------------------------------------------
describe("Player2D", () => {
    it("moves and sets facing from input", () => {
        const { Player2D } = loadEngine().exports;
        const p = new Player2D(100, 100, { speed: 100 });
        p.update(0.1, { x: 1, y: 0 }, null);
        expect(p.x > 100).toBe(true);
        expect(p.facing).toBe("right");
        p.update(0.1, { x: 0, y: -1 }, null);
        expect(p.facing).toBe("up");
    });
    it("is idle (frame 0) when not moving", () => {
        const { Player2D } = loadEngine().exports;
        const p = new Player2D(0, 0);
        p.update(0.1, { x: 0, y: 0 }, null);
        expect(p.moving).toBe(false);
        expect(p.frame).toBe(0);
    });
    it("cycles animation frames while walking", () => {
        const { Player2D } = loadEngine().exports;
        const p = new Player2D(0, 0, { frameDuration: 0.1, frameCount: 4 });
        for (let i = 0; i < 3; i++) p.update(0.1, { x: 1, y: 0 }, null);
        expect(p.frame >= 0 && p.frame < 4).toBe(true);
        expect(p.moving).toBe(true);
    });
    it("respects tile collision when a map is given", () => {
        const { Player2D, TileMap } = loadEngine().exports;
        const m = new TileMap(["###", "#.#", "###"], 32);
        const p = new Player2D(40, 40, { w: 16, h: 16, speed: 1000 });
        p.update(1, { x: 1, y: 0 }, m); // slam into the right wall
        expect(p.x + p.w <= 64).toBe(true);
    });
});

run();
