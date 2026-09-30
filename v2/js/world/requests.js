/**
 * v2 world — villager requests (small errands that turn friendship into play).
 *
 * Once you have chatted with a villager at least once, they start asking for
 * things they need: Марта wants produce, Борис wants building materials, Лена
 * wants pretty things. Bring the goods and you are paid in gold and, more
 * importantly, friendship — which in turn unlocks better-paying requests.
 *
 * One open request per villager at a time, so the world never nags. Pure
 * logic: no DOM, no timers, injectable `rng`, fully unit-testable.
 */

// What each villager may ask for, and the flavour text they ask it with.
const REQUEST_POOL = {
    marta: [
        { res: "wood",  n: 4, text: "Подпорки для грядок совсем сгнили." },
        { res: "berry", n: 5, text: "Хочу сварить варенье, да ягод не хватает." },
        { res: "veg",   n: 3, text: "Сготовлю похлёбку на всю улицу, нужны овощи." },
        { res: "herb",  n: 4, text: "Травы для настоя от простуды — выручишь?" }
    ],
    boris: [
        { res: "wood",  n: 6, text: "Пилу наточил, а брёвен нет. Смешно, да?" },
        { res: "stone", n: 4, text: "Камень нужен — подлатать фундамент кузницы." },
        { res: "herb",  n: 3, text: "Спина ноет. Говорят, травяной отвар помогает." }
    ],
    lena: [
        { res: "herb",  n: 5, text: "Плету венки на праздник, нужны травы." },
        { res: "berry", n: 4, text: "Ягоды для краски — получается чудесный цвет." },
        { res: "veg",   n: 2, text: "Морковку? Не для еды — для зайца в сарае!" },
        { res: "seeds", n: 3, text: "Хочу посадить цветы у калитки." }
    ]
};

// Rewards grow as the villager trusts you more.
const REQUEST_BASE_GOLD = 25;
const REQUEST_STEP_GOLD = 15;      // per already-completed request
const REQUEST_FRIENDSHIP = 45;     // more than a gift: errands matter
const REQUEST_MIN_POINTS = 20;     // one chat is enough to be asked

class Requests {
    constructor(opts) {
        opts = opts || {};
        this.rng = opts.rng || Math.random;
        this.pool = opts.pool || REQUEST_POOL;
        this.open = {};        // npcId -> { res, n, text, gold, day }
        this.done = {};        // npcId -> completed count
    }

    completed(npcId) { return this.done[npcId] || 0; }
    current(npcId) { return this.open[npcId] || null; }

    goldFor(npcId) {
        return REQUEST_BASE_GOLD + REQUEST_STEP_GOLD * this.completed(npcId);
    }

    // Is this villager willing to ask for something yet?
    unlocked(npcId, points) { return (points || 0) >= REQUEST_MIN_POINTS; }

    /**
     * Return the villager's open request, creating one if they are friendly
     * enough and have nothing pending. Returns null when still a stranger.
     */
    ensure(npcId, points, day) {
        if (!this.unlocked(npcId, points)) return null;
        if (this.open[npcId]) return this.open[npcId];
        const pool = this.pool[npcId];
        if (!pool || !pool.length) return null;
        const pick = pool[Math.floor(this.rng() * pool.length) % pool.length];
        this.open[npcId] = {
            res: pick.res,
            n: pick.n,
            text: pick.text,
            gold: this.goldFor(npcId),
            day: day || 0
        };
        return this.open[npcId];
    }

    // Enough goods in the bag to satisfy the open request?
    canFulfil(npcId, have) {
        const r = this.open[npcId];
        return !!r && (have || 0) >= r.n;
    }

    /**
     * Hand the goods over. The caller removes `take` from the bag and adds the
     * gold — this class only decides and records.
     */
    fulfil(npcId, have) {
        const r = this.open[npcId];
        if (!r) return { ok: false, msg: "Сейчас ничего не нужно." };
        if ((have || 0) < r.n) {
            return { ok: false, short: r.n - (have || 0), msg: `Не хватает: ещё ${r.n - (have || 0)}.` };
        }
        delete this.open[npcId];
        this.done[npcId] = this.completed(npcId) + 1;
        return {
            ok: true,
            take: r.n,
            res: r.res,
            gold: r.gold,
            friendship: REQUEST_FRIENDSHIP,
            msg: `Поручение выполнено! 💰 +${r.gold}, дружба +${REQUEST_FRIENDSHIP}.`
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        Requests, REQUEST_POOL, REQUEST_BASE_GOLD, REQUEST_STEP_GOLD,
        REQUEST_FRIENDSHIP, REQUEST_MIN_POINTS
    };
}
