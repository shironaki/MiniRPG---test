/**
 * v2 world — friendship / social store.
 *
 * Tracks relationship points per NPC id. Points map to HEARTS (0..10, 100 pts
 * each). Talking to someone advances the friendship once per in-game day; giving
 * a gift advances it more (extra if they like the gift), also once per day.
 * `day` is set by the game loop from the day counter so the once-per-day gates
 * reset naturally at each dawn. Pure logic, unit-testable.
 */
const SOCIAL_MAX = 1000;                 // 10 hearts * 100
const SOCIAL_TALK = 20;
const SOCIAL_GIFT = 35;
const SOCIAL_GIFT_LIKED = 90;

class Social {
    constructor() {
        this.data = {};
        this.day = 0;
    }

    _e(id) {
        return this.data[id] || (this.data[id] = { points: 0, talkedDay: -1, giftedDay: -1 });
    }

    setDay(day) { this.day = day; }

    points(id) { return this._e(id).points; }
    hearts(id) { return Math.floor(this._e(id).points / 100); }

    _add(id, n) {
        const e = this._e(id);
        e.points = Math.max(0, Math.min(SOCIAL_MAX, e.points + n));
        return e.points;
    }

    // Direct award (errands, story beats) — no once-a-day gate.
    award(id, n) { return this._add(id, n); }

    canTalk(id) { return this._e(id).talkedDay !== this.day; }
    canGift(id) { return this._e(id).giftedDay !== this.day; }

    // Chat once per day for a small friendship bump.
    talk(id) {
        const e = this._e(id);
        if (e.talkedDay === this.day) return { gained: 0, already: true, points: e.points };
        e.talkedDay = this.day;
        this._add(id, SOCIAL_TALK);
        return { gained: SOCIAL_TALK, already: false, points: e.points };
    }

    // Gift once per day; `liked` grants the bigger bump.
    gift(id, liked) {
        const e = this._e(id);
        if (e.giftedDay === this.day) return { gained: 0, already: true, points: e.points };
        e.giftedDay = this.day;
        const g = liked ? SOCIAL_GIFT_LIKED : SOCIAL_GIFT;
        this._add(id, g);
        return { gained: g, already: false, liked: !!liked, points: e.points };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { Social, SOCIAL_MAX, SOCIAL_TALK, SOCIAL_GIFT, SOCIAL_GIFT_LIKED };
}
