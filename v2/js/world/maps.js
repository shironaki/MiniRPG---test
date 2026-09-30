/**
 * v2 world — authored map data. Rows are strings of tile keys (see tiles.js).
 * The village is the starting zone. Interactables are placed by tile coord and
 * bridge into the existing game systems (NPC talk, shop, dungeon, etc.).
 */
const MAPS = {
    village: {
        name: "Деревня",
        tileSize: 32,
        // 26 wide x 18 tall. Tree border, central plaza, a pond, a stream with a
        // bridge, paths, and four distinct buildings (footprints are solid 'H';
        // the real building art is drawn from the `buildings` metadata).
        rows: [
            "TTTTTTTTTTTTTTTTTTTTTTTTTT",
            "T,.......,.......,.......T",
            "T.,HHHH...,.......,HHHH..T",
            "T..HHHH.tt.,.....t.HHHH..T",
            "T..HHHH.....,......HHHH..T",
            "T....pppppppppppppppppp..T",
            "T.....,.....pp,.......,..T",
            "T.t...www..PppP,......t,.T",
            "T.....www..PppP.,.......,T",
            "T,.t..www,.PppP..,.....t.T",
            "T.,.......,PppP...,......T",
            "T..,.....wwwbbww...HHH...T",
            "T..HHHH..wwwbbww...HHH...T",
            "T.tHHHH.....pp.....HHH.t.T",
            "T..HHHH.....pp,....HHH,..T",
            "T....ppppppppppppppppp.,.T",
            "T.......,...pp..,.......,T",
            "TTTTTTTTTTTTppTTTTTTTTTTTT"
        ],
        // Player spawn on the central plaza.
        spawn: { col: 12, row: 8 },
        // Buildings drawn as whole structures over their solid footprints.
        buildings: [
            { col: 3,  row: 2,  w: 4, h: 3, type: "house" },
            { col: 19, row: 2,  w: 4, h: 3, type: "shop" },
            { col: 3,  row: 12, w: 4, h: 3, type: "forge" },
            { col: 19, row: 11, w: 3, h: 4, type: "gate" }
        ],
        // Interactable points sit in front of each building's door.
        interactables: [
            { col: 5,  row: 5,  action: "npc",     label: "Староста",       emoji: "🧑" },
            { col: 21, row: 5,  action: "shop",    label: "Лавка",          emoji: "🛒" },
            { col: 5,  row: 15, action: "forge",   label: "Кузница",        emoji: "🔨" },
            { col: 20, row: 15, action: "dungeon", label: "Врата испытаний", emoji: "🚪" },
            { col: 13, row: 6,  action: "quests",  label: "Доска квестов",   emoji: "📜" }
        ],
        // The village is a peaceful zone — no enemies here (they roam the wilds).
        enemies: [],
        // Walk onto a portal tile to travel. { col,row, to, spawn, label, emoji }
        portals: [
            { col: 12, row: 16, to: "forest", spawn: { col: 11, row: 1 }, label: "Тропа в лес", emoji: "🌲" }
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
