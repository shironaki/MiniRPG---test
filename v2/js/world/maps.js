/**
 * v2 world — authored map data. Rows are strings of tile keys (see tiles.js).
 * The village is the starting zone. Interactables are placed by tile coord and
 * bridge into the existing game systems (NPC talk, shop, dungeon, etc.).
 */
const MAPS = {
    village: {
        name: "Деревня",
        tileSize: 32,
        // 24 wide x 16 tall. Border of trees, a plaza, houses and paths.
        rows: [
            "TTTTTTTTTTTTTTTTTTTTTTTT",
            "T......,..,....,.......T",
            "T..HHH...,....,..HHH...T",
            "T..HHH......p.....HHH..T",
            "T..........,p,.........T",
            "T....,....ppPpp....,...T",
            "T........ppPPPpp.......T",
            "T..,....ppPPPPPpp...,..T",
            "T.......ppPPPPPpp......T",
            "T........ppPPPpp....,..T",
            "T....,....ppPpp........T",
            "T..HHH......p......HHH.T",
            "T..HHH...,.p...,..HHH..T",
            "T......,...p.,....,....T",
            "T....wwww..p......wwww.T",
            "TTTTTTTTTTTgTTTTTTTTTTTT"
        ],
        // Player spawn in tile coords (centre plaza).
        spawn: { col: 11, row: 8 },
        // Interactable points: { col,row, action, label, emoji }
        interactables: [
            { col: 4,  row: 3,  action: "npc",     label: "Староста",  emoji: "🧑" },
            { col: 19, row: 3,  action: "shop",    label: "Лавка",     emoji: "🛒" },
            { col: 4,  row: 12, action: "forge",   label: "Кузница",   emoji: "🔨" },
            { col: 19, row: 12, action: "dungeon", label: "Врата испытаний", emoji: "🚪" },
            { col: 11, row: 4,  action: "quests",  label: "Доска квестов", emoji: "📜" }
        ],
        // Roaming foes that wandered in from the wilds. { col,row, kind, emoji }
        enemies: [
            { col: 2,  row: 6,  kind: "goblin", emoji: "👹", wanderRadius: 80 },
            { col: 21, row: 8,  kind: "wolf",   emoji: "🐺", wanderRadius: 90 },
            { col: 6,  row: 13, kind: "goblin", emoji: "👹", wanderRadius: 70 }
        ],
        // Walk onto a portal tile to travel. { col,row, to, spawn, label, emoji }
        portals: [
            { col: 11, row: 15, to: "forest", spawn: { col: 11, row: 1 }, label: "Тропа в лес", emoji: "🌲" }
        ]
    },

    forest: {
        name: "Тёмный лес",
        tileSize: 32,
        // 24 x 18. A winding forest with paths; north returns to the village,
        // a southern gate descends into the cave.
        rows: [
            "tttttttttttttttttttttttt",
            "tF.FF.FF.FFpFF.FF.FF.FFt",
            "t.FF.FF.FF.pF.FF.FF.FF.t",
            "tFF.Ft.FF.Fp.FF.FF.FF.Ft",
            "tF.FF.FF.FFpFF.FF.FF.FFt",
            "t.FF.FF.Ft.pF.FF.FF.FF.t",
            "tFF.FF.FF.Fp.FF.FF.FF.Ft",
            "tF.FF.FF.FFpFF.tF.FF.FFt",
            "t.FpppppppppF.FF.FF.FF.t",
            "tFF.FFtFFpFp.FF.FF.FF.Ft",
            "tF.FF.FF.pFptF.FF.FF.FFt",
            "t.FF.FF.Fp.pF.FF.tF.FF.t",
            "tFF.FF.FFpFp.FF.FF.FF.Ft",
            "tF.Ft.FF.pFpFF.FF.FF.FFt",
            "t.FF.FF.tp.pF.FF.FF.FF.t",
            "tFF.FF.FFpFp.FF.FF.FF.Ft",
            "tF.FF.FF.pFgFF.FF.FF.FFt",
            "tttttttttttttttttttttttt"
        ],
        spawn: { col: 11, row: 2 },
        interactables: [
            { col: 3, row: 8, action: "npc", label: "Отшельник", emoji: "🧙" }
        ],
        enemies: [
            { col: 4,  row: 4,  kind: "wolf",     emoji: "🐺", wanderRadius: 90 },
            { col: 18, row: 5,  kind: "goblin",   emoji: "👹", wanderRadius: 80 },
            { col: 16, row: 11, kind: "wolf",     emoji: "🐺", wanderRadius: 100 },
            { col: 6,  row: 13, kind: "skeleton", emoji: "💀", wanderRadius: 80 }
        ],
        portals: [
            { col: 11, row: 1,  to: "village", spawn: { col: 11, row: 13 }, label: "Назад в деревню", emoji: "🏘️" },
            { col: 11, row: 16, to: "cave",    spawn: { col: 2,  row: 1 },  label: "Вход в пещеру",   emoji: "🕳️" }
        ]
    },

    cave: {
        name: "Пещера",
        tileSize: 32,
        // 20 x 14. Open rocky chamber with scattered pillars; a trial lair deep in.
        rows: [
            "rrgrrrrrrrrrrrrrrrrr",
            "rddddddddddddddddddr",
            "rdddrdddddddddrddddr",
            "rddddddddddddddddddr",
            "rdddddddrddddddddddr",
            "rddddddddddddddrdddr",
            "rddrdddddddddddddddr",
            "rdddddddddrddddddddr",
            "rddddddddddddddddddr",
            "rdddddrddddddrdddddr",
            "rddddddddddddddddrdr",
            "rdddrddddddddddddddr",
            "rddddddddddddddddddr",
            "rrrrrrrrrrrrrrrrrrrr"
        ],
        spawn: { col: 2, row: 1 },
        interactables: [
            { col: 17, row: 11, action: "dungeon", label: "Логово (испытание)", emoji: "🗝️" }
        ],
        enemies: [
            { col: 5,  row: 5,  kind: "skeleton", emoji: "💀", wanderRadius: 70 },
            { col: 12, row: 6,  kind: "skeleton", emoji: "💀", wanderRadius: 80 },
            { col: 8,  row: 8,  kind: "goblin",   emoji: "👹", wanderRadius: 70 },
            { col: 15, row: 10, kind: "wolf",     emoji: "🐺", wanderRadius: 80 }
        ],
        portals: [
            { col: 2, row: 0, to: "forest", spawn: { col: 11, row: 15 }, label: "Выход из пещеры", emoji: "🌲" }
        ]
    }
};

function getMap(id) { return MAPS[id] || MAPS.village; }

if (typeof module !== "undefined" && module.exports) module.exports = { MAPS, getMap };
