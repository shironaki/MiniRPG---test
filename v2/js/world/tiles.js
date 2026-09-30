/**
 * v2 world — tile legend. Each tile key maps to properties used for collision
 * and rendering. `solid` blocks movement; `color` is the flat fallback fill
 * (used until/if a tileset image is attached). Keys are single characters so
 * maps can be authored as readable string rows.
 */
const TILES = {
    ".": { name: "grass",  solid: false, color: "#3d7a3a" },
    ",": { name: "grass2", solid: false, color: "#427f3f" },
    "p": { name: "path",   solid: false, color: "#b79a63" },
    "P": { name: "plaza",  solid: false, color: "#c7ad78" },
    "w": { name: "water",  solid: true,  color: "#2f6d8f" },
    "T": { name: "tree",   solid: true,  color: "#20502a" },
    "#": { name: "wall",   solid: true,  color: "#6b6152" },
    "H": { name: "house",  solid: true,  color: "#8a5a3b" },
    "f": { name: "fence",  solid: true,  color: "#7a5a3a" },
    // Wilds & cave tiles (added with the multi-zone world).
    "F": { name: "forest", solid: false, color: "#2f5d33" },
    "t": { name: "tree2",  solid: true,  color: "#173a1f" },
    "d": { name: "dirt",   solid: false, color: "#5b4a34" },
    "r": { name: "rock",   solid: true,  color: "#453f38" },
    "b": { name: "bridge", solid: false, color: "#8a6a42" },
    "g": { name: "gate",   solid: false, color: "#caa24b" }
};

const DEFAULT_TILE = { name: "void", solid: true, color: "#101319" };

function tileInfo(key) { return TILES[key] || DEFAULT_TILE; }

if (typeof module !== "undefined" && module.exports) module.exports = { TILES, DEFAULT_TILE, tileInfo };
