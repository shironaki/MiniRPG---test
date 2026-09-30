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
 * was watered the previous day — so watering matters (a real consequence). A
 * full in-game day is short, so crops mature in a couple of days of play.
 * Pure logic; rng injectable for deterministic harvest yields.
 */
const CROP = { res: "veg", name: "Морковь", emoji: "🥕", growDays: 2 };

class FarmPlot {
    constructor(col, row) {
        this.col = col;
        this.row = row;
        this.state = "empty";     // empty | tilled | growing | ready
        this.progress = 0;        // grow-days accumulated
        this.growDays = 0;
        this.plantedDay = 0;
        this.wateredDay = -1;     // last day this plot was watered
    }
    get watered() { return this.state === "growing" && this.wateredDay >= this.plantedDay; }
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
    plant(col, row, day, seedsAvailable) {
        const p = this.plot(col, row);
        if (p.state !== "tilled") return { ok: false, msg: "Сначала вспаши грядку." };
        if ((seedsAvailable || 0) <= 0) return { ok: false, msg: "Нет семян." };
        p.state = "growing";
        p.progress = 0;
        p.growDays = CROP.growDays;
        p.plantedDay = day;
        p.wateredDay = -1;
        return { ok: true, consumeSeed: true, msg: `🌱 Посажено: ${CROP.name}.` };
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
        p.state = "tilled";
        p.progress = 0;
        p.growDays = 0;
        p.plantedDay = 0;
        p.wateredDay = -1;
        const amount = 1 + (this.rng() < 0.4 ? 1 : 0);   // occasional bumper crop
        return { ok: true, crop: CROP.res, amount, msg: `${CROP.emoji} Собрано ×${amount}!` };
    }

    // Advance all growing plots at dawn: +1 stage if watered the day before.
    onNewDay(day) {
        for (const k in this.plots) {
            const p = this.plots[k];
            if (p.state !== "growing") continue;
            if (p.wateredDay === day - 1) {
                p.progress += 1;
                if (p.progress >= p.growDays) p.state = "ready";
            }
        }
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
    module.exports = { Farm, FarmPlot, CROP };
}
