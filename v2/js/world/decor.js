/**
 * v2 world — home interior customization and furniture decoration.
 *
 * Allows buying wall coverings, floor stylings, and decorative furniture pieces
 * from the shop to customize the player's cozy house.
 */

const FLOOR_STYLES = {
    floor:       { id: "floor",       name: "Дубовый паркет",  emoji: "🪵", cost: 0,  tile: "floor" },
    carpet_red:  { id: "carpet_red",  name: "Красный ковёр",   emoji: "🧶", cost: 35, tile: "carpet" },
    tiles_blue:  { id: "tiles_blue",  name: "Синяя мозаика",   emoji: "🟦", cost: 50, tile: "floorStone" }
};

const WALL_STYLES = {
    wallIn:      { id: "wallIn",      name: "Деревянные панели", emoji: "🪵", cost: 0,  tile: "wallIn" },
    stone_brick: { id: "stone_brick", name: "Каменная кладка",   emoji: "🧱", cost: 40, tile: "wall" }
};

const DECOR_CATALOG = {
    decor_bookshelf: { id: "decor_bookshelf", name: "Книжный шкаф",     emoji: "📚", cost: 45, wood: 4, kind: "bookshelf", w: 2, h: 2, desc: "Полки из резного дуба с фолиантами." },
    decor_sofa:      { id: "decor_sofa",      name: "Мягкий диван",      emoji: "🛋️", cost: 85, wood: 3, wool: 2, kind: "sofa", w: 2, h: 1, desc: "Удобный бархатный диван для отдыха." },
    decor_plant:     { id: "decor_plant",     name: "Комнатный папоротник", emoji: "🪴", cost: 25, herb: 2, kind: "plant", w: 1, h: 1, desc: "Живое зелёное растение в глиняном горшке." },
    decor_clock:     { id: "decor_clock",     name: "Настенные часы",    emoji: "🕰️", cost: 60, wood: 3, kind: "clock", w: 1, h: 1, desc: "Старинные часы с маятником и боем." },
    decor_rug:       { id: "decor_rug",       name: "Тканый коврик",     emoji: "🧶", cost: 35, wool: 2, kind: "rug", w: 2, h: 1, desc: "Уютный мягкий коврик из овечьей шерсти." },
    decor_armchair:  { id: "decor_armchair",  name: "Кресло у очага",    emoji: "🪑", cost: 50, wood: 2, wool: 1, kind: "armchair", w: 1, h: 1, desc: "Мягкое глубокое кресло." }
};

class DecorSystem {
    constructor(saved = {}) {
        this.flooring = saved.flooring || "floor";
        this.wallpaper = saved.wallpaper || "wallIn";
        this.furniture = Array.isArray(saved.furniture) ? saved.furniture.slice() : [];
    }

    listCatalog() {
        return Object.values(DECOR_CATALOG);
    }

    listFloors() {
        return Object.values(FLOOR_STYLES);
    }

    listWalls() {
        return Object.values(WALL_STYLES);
    }

    setFlooring(styleId) {
        if (FLOOR_STYLES[styleId]) {
            this.flooring = styleId;
            return { ok: true, msg: `Пол обновлен: ${FLOOR_STYLES[styleId].name}!` };
        }
        return { ok: false, msg: "Неизвестный стиль пола." };
    }

    setWallpaper(styleId) {
        if (WALL_STYLES[styleId]) {
            this.wallpaper = styleId;
            return { ok: true, msg: `Стены обновлены: ${WALL_STYLES[styleId].name}!` };
        }
        return { ok: false, msg: "Неизвестный стиль стен." };
    }

    buyAndPlace(itemId, col, row, bag, goldCallback) {
        const item = DECOR_CATALOG[itemId];
        if (!item) return { ok: false, msg: "Предмет не найден." };
        if (item.wood && bag.count("wood") < item.wood) {
            return { ok: false, msg: `Нужно древесины: ${item.wood}.` };
        }
        if (item.wool && bag.count("wool") < item.wool) {
            return { ok: false, msg: `Нужно шерсти: ${item.wool}.` };
        }
        if (typeof goldCallback === "function") {
            const paid = goldCallback(item.cost);
            if (!paid) return { ok: false, msg: `Недостаточно золота (${item.cost} 💰).` };
        }
        if (item.wood) bag.remove("wood", item.wood);
        if (item.wool) bag.remove("wool", item.wool);

        const piece = { id: itemId, kind: item.kind, col: col || 3, row: row || 4, name: item.name, emoji: item.emoji };
        this.furniture.push(piece);
        return { ok: true, piece, msg: `Куплено и установлено: ${item.name}! ${item.emoji}` };
    }

    serialize() {
        return {
            flooring: this.flooring,
            wallpaper: this.wallpaper,
            furniture: this.furniture
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { FLOOR_STYLES, WALL_STYLES, DECOR_CATALOG, DecorSystem };
}
