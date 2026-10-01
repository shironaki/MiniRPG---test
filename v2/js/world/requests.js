/**
 * v2 world — villager requests (small errands that turn friendship into play).
 *
 * Once you have chatted with a villager at least once, they start asking for
 * things they need: Марта wants produce and berries, Борис wants building materials
 * and fish, Лена wants pretty flowers, fruits and shells, Томила wants goods to sell,
 * Кузьма wants forge supplies and hearty meals.
 */

// What each villager may ask for, and the flavour text they ask it with.
const REQUEST_POOL = {
    marta: [
        { res: "wood",       n: 4, text: "Подпорки для грядок совсем сгнили." },
        { res: "berry",      n: 5, text: "Хочу сварить варенье, да ягод не хватает." },
        { res: "veg",        n: 3, text: "Сготовлю похлёбку на всю улицу, нужны овощи." },
        { res: "herb",       n: 4, text: "Травы для настоя от простуды — выручишь?" },
        { res: "strawberry", n: 3, text: "Сладкой клубники к чаю — вот бы порадовать детей!" },
        { res: "pumpkin",    n: 1, text: "Большая тыква нужна для праздничного пирога." },
        { res: "dish_pie",   n: 1, text: "Угостишь ягодным пирогом? Сил нет готовить." }
    ],
    boris: [
        { res: "wood",       n: 6, text: "Пилу наточил, а брёвен нет. Смешно, да?" },
        { res: "stone",      n: 4, text: "Камень нужен — подлатать фундамент кузницы." },
        { res: "herb",       n: 3, text: "Спина ноет. Говорят, травяной отвар помогает." },
        { res: "dish_fish",  n: 1, text: "Жареной рыбки с дымком бы к обеду." },
        { res: "fish_pike",  n: 1, text: "Настоящую щуку из пруда принесёшь?" },
        { res: "dish_cider", n: 1, text: "Кувшин яблочного сидра вернёт силы после валки леса." }
    ],
    tomila: [
        { res: "herb",          n: 4, text: "Скупаю травы — на них всегда спрос." },
        { res: "veg",           n: 3, text: "Овощи разлетаются быстрее хлеба." },
        { res: "wood",          n: 5, text: "Полки для лавки сами себя не сколотят." },
        { res: "fish_tuna",     n: 1, text: "Морской тунец с побережья — редкий деликатес!" },
        { res: "seashell",      n: 3, text: "Морские ракушки для столичных сувениров." },
        { res: "dish_jam",      n: 1, text: "Баночку клубничного варенья для витрины." }
    ],
    kuzma: [
        { res: "stone",         n: 5, text: "Камень нужен — горн переложить." },
        { res: "wood",          n: 6, text: "Угля нажечь не из чего. Дров бы." },
        { res: "apple",         n: 3, text: "Свежих яблок из сада. У горна весь день во рту сухо." },
        { res: "dish_soup",     n: 1, text: "Горячей ухи бы котелок — силы восстановить." },
        { res: "lobster",       n: 1, text: "Омара с побережья запечь на углях — пальчики оближешь!" }
    ],
    lena: [
        { res: "herb",          n: 5, text: "Плету венки на праздник, нужны травы." },
        { res: "berry",         n: 4, text: "Ягоды для краски — получается чудесный цвет." },
        { res: "cherry",        n: 3, text: "Спелая вишня из сада — самая вкусная ягода!" },
        { res: "seashell",      n: 2, text: "Красивые ракушки с пляжа для ожерелья." },
        { res: "dish_pie",      n: 1, text: "Ягодный пирог — самый вкусный на свете!" }
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
