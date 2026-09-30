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
            "T..HHH...,.....,..HHH..T",
            "T......,.....,....,....T",
            "T....wwww.........wwww.T",
            "TTTTTTTTTTTTTTTTTTTTTTTT"
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
        ]
    }
};

function getMap(id) { return MAPS[id] || MAPS.village; }

if (typeof module !== "undefined" && module.exports) module.exports = { MAPS, getMap };
