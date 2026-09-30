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
        // Living townsfolk who walk a daily schedule (minutes since midnight).
        // Talk (E) once a day for friendship; gift items/resources they like.
        npcs: [
            {
                id: "marta", name: "Марта", emoji: "👩‍🌾", role: "Фермерша",
                look: { shirt: "#4b9e57", shirtSh: "#357a41", hair: "#8a5a2b", hairSh: "#5f3d1c", hat: null, pants: "#6b4a2e", pantsSh: "#4a331f" },
                likes: ["berry", "herb", "Зелье"],
                dialogue: [
                    "Урожай в этом году добрый, если дожди не подведут.",
                    "Свежие ягоды? Обожаю! Не поделишься находкой?",
                    "Земля кормит того, кто её уважает."
                ],
                schedule: [
                    { from: 0,    col: 5,  row: 6,  activity: "sleep" },
                    { from: 420,  col: 2,  row: 10, activity: "field" },
                    { from: 720,  col: 13, row: 8,  activity: "market" },
                    { from: 1080, col: 9,  row: 8,  activity: "well" },
                    { from: 1260, col: 5,  row: 6,  activity: "home" }
                ]
            },
            {
                id: "boris", name: "Борис", emoji: "🧔", role: "Дровосек",
                look: { shirt: "#3a6ea5", shirtSh: "#284f78", hair: "#3b2a1a", hairSh: "#241a10", hat: "#5a3a22", hatSh: "#3f2814", pants: "#41352a" },
                likes: ["wood", "stone", "Меч", "эссенц"],
                dialogue: [
                    "Топор остёр, спина крепка — что ещё нужно мужику?",
                    "Хорошее дерево на вес золота. Ценю тех, кто это понимает.",
                    "В лесу зверьё пошаливает. В деревню, к счастью, не суётся."
                ],
                schedule: [
                    { from: 0,    col: 21, row: 6,  activity: "sleep" },
                    { from: 480,  col: 23, row: 5,  activity: "work" },
                    { from: 780,  col: 12, row: 9,  activity: "market" },
                    { from: 1140, col: 21, row: 5,  activity: "shop" },
                    { from: 1320, col: 21, row: 6,  activity: "home" }
                ]
            },
            {
                id: "lena", name: "Лена", emoji: "👧", role: "Цветочница",
                look: { shirt: "#d46a9f", shirtSh: "#a84c7c", hair: "#e6c34d", hairSh: "#c49a2b", hat: null, pants: "#7a5a86", pantsSh: "#573f61" },
                likes: ["berry", "herb", "цвет"],
                dialogue: [
                    "Смотри, какие цветы у пруда — прелесть!",
                    "Ты принёс мне травы? Ты самый добрый!",
                    "Староста опять грустит. Отнеси ему хорошие вести!"
                ],
                schedule: [
                    { from: 0,    col: 18, row: 14, activity: "sleep" },
                    { from: 540,  col: 12, row: 10, activity: "plaza" },
                    { from: 720,  col: 15, row: 9,  activity: "flowers" },
                    { from: 1020, col: 13, row: 6,  activity: "board" },
                    { from: 1200, col: 18, row: 14, activity: "home" }
                ]
            }
        ],
        // Gatherable resource nodes (E to harvest; they regrow over time).
        resources: [
            { type: "tree", col: 2,  row: 6  },
            { type: "tree", col: 20, row: 7  },
            { type: "tree", col: 3,  row: 10 },
            { type: "tree", col: 22, row: 10 },
            { type: "rock", col: 1,  row: 10 },
            { type: "rock", col: 22, row: 8  },
            { type: "bush", col: 6,  row: 6  },
            { type: "bush", col: 17, row: 8  },
            { type: "herb", col: 16, row: 10 },
            { type: "herb", col: 7,  row: 4  }
        ],
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
        // Forageables scattered in the wilds (harvest between fights).
        resources: [
            { type: "bush", col: 2,  row: 2  },
            { type: "herb", col: 20, row: 2  },
            { type: "herb", col: 2,  row: 14 },
            { type: "bush", col: 21, row: 14 },
            { type: "bush", col: 6,  row: 10 }
        ],
        portals: [
            { col: 11, row: 1,  to: "village", spawn: { col: 11, row: 13 }, label: "Назад в деревню", emoji: "🏘️" },
            { col: 11, row: 16, to: "cave",    spawn: { col: 2,  row: 1 },  label: "Вход в пещеру",   emoji: "🕳️" }
        ]
    },

    cave: {
        name: "Пещера",
        tileSize: 32,
        indoor: true,   // underground: no outdoor day/night lighting
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
