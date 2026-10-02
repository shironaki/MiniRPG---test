/**
 * v2 world — farming. A Farm owns plot states keyed by "col,row" so plots
 * persist across zone reloads (the Farm instance lives in main.js like Social).
 *
 * Plot lifecycle (each step is a quick, contextual E action in the field):
 *   empty  --till-->  tilled  --plant(seed)-->  growing  --harvest-->  tilled
 *                                     ^                       |
 *                                  (water once/day)       ready when
 *                                                       progress >= growDays
 *
 * Growth is day-driven: onNewDay() advances a growing plot ONE stage only if it
 * was watered the previous day (or if it rained!). Crops mature in 2-4 days.
 */
const CROPS = {
    veg:        { key: "veg",        res: "veg",        name: "Морковь",  emoji: "🥕", growDays: 2, seedRes: "seeds",            season: "all" },
    strawberry: { key: "strawberry", res: "strawberry", name: "Клубника", emoji: "🍓", growDays: 3, seedRes: "seeds_strawberry", season: "spring" },
    tomato:     { key: "tomato",     res: "tomato",     name: "Томаты",   emoji: "🍅", growDays: 3, seedRes: "seeds_tomato",     season: "summer" },
    corn:       { key: "corn",       res: "corn",       name: "Кукуруза", emoji: "🌽", growDays: 4, seedRes: "seeds_corn",       season: "summer" },
    pumpkin:    { key: "pumpkin",    res: "pumpkin",    name: "Тыква",    emoji: "🎃", growDays: 4, seedRes: "seeds_pumpkin",    season: "autumn" },
    wheat:      { key: "wheat",      res: "wheat",      name: "Пшеница",  emoji: "🌾", growDays: 2, seedRes: "seeds_wheat",      season: "autumn" }
};

// Backwards compatibility for existing references
const CROP = CROPS.veg;

class FarmPlot {
    constructor(col, row) {
        this.col = col;
        this.row = row;
        this.state = "empty";     // empty | tilled | growing | ready
        this.cropKey = "veg";     // which crop is planted
        this.progress = 0;        // grow-days accumulated
        this.growDays = 0;
        this.plantedDay = 0;
        this.wateredDay = -1;     // last day this plot was watered
    }
    get watered() { return this.state === "growing" && this.wateredDay >= this.plantedDay; }
    get crop() { return CROPS[this.cropKey] || CROPS.veg; }
}

class Farm {
    constructor(opts = {}) {
        this.plots = {};
        this.rng = opts.rng || Math.random;
    }
    _key(col, row) { return col + "," + row; }
    plot(col, row) {
        const k = this._key(col, row);
        return this.plots[k] || (this.plots[k] = new FarmPlot(col, row));
    }

    till(col, row) {
        const p = this.plot(col, row);
        if (p.state !== "empty") return { ok: false, msg: "Уже вспахано." };
        p.state = "tilled";
        return { ok: true, msg: "🌱 Грядка вспахана." };
    }

    // Plant needs a tilled plot and an available seed (caller consumes it).
    plant(col, row, day, seedsAvailable, cropKey = "veg") {
        const p = this.plot(col, row);
        if (p.state !== "tilled") return { ok: false, msg: "Сначала вспаши грядку." };
        if ((seedsAvailable || 0) <= 0) return { ok: false, msg: "Нет семян." };
        
        const crop = CROPS[cropKey] || CROPS.veg;
        p.state = "growing";
        p.cropKey = crop.key;
        p.progress = 0;
        p.growDays = crop.growDays;
        p.plantedDay = day;
        p.wateredDay = -1;
        return { ok: true, consumeSeed: true, cropKey: crop.key, msg: `🌱 Посажено: ${crop.name}.` };
    }

    water(col, row, day) {
        const p = this.plot(col, row);
        if (p.state !== "growing") return { ok: false, msg: "Здесь нечего поливать." };
        if (p.wateredDay === day) return { ok: false, already: true, msg: "Уже полито сегодня." };
        p.wateredDay = day;
        return { ok: true, msg: "💧 Полито." };
    }

    harvest(col, row) {
        const p = this.plot(col, row);
        if (p.state !== "ready") return { ok: false, msg: "Ещё не созрело." };
        const crop = p.crop;
        p.state = "tilled";
        p.progress = 0;
        p.growDays = 0;
        p.plantedDay = 0;
        p.wateredDay = -1;
        const amount = 1 + (this.rng() < 0.45 ? 1 : 0);   // occasional bumper crop
        return { ok: true, crop: crop.res, cropKey: crop.key, amount, emoji: crop.emoji, msg: `${crop.emoji} Собрано ${crop.name} ×${amount}!` };
    }

    // Advance all growing plots at dawn: +1 stage if watered (or rained) the day before.
    onNewDay(day, isRaining = false) {
        for (const k in this.plots) {
            const p = this.plots[k];
            if (p.state !== "growing") continue;
            // If yesterday or today was rainy, auto-water plot
            if (isRaining) {
                p.wateredDay = day - 1;
            }
            if (p.wateredDay === day - 1) {
                p.progress += 1;
                if (p.progress >= p.growDays) p.state = "ready";
            }
        }
    }

    onDawn(day, isRaining = false) {
        this.onNewDay(day, isRaining);
    }

    // Contextual label + the action a single E-press performs on this plot.
    actionFor(col, row) {
        const p = this.plot(col, row);
        switch (p.state) {
            case "empty": return "till";
            case "tilled": return "plant";
            case "growing": return "water";
            case "ready": return "harvest";
            default: return "till";
        }
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { Farm, FarmPlot, CROPS, CROP };
}
