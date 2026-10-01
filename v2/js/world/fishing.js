/**
 * v2 world — fishing system.
 *
 * Provides fishing logic at water bodies (ponds, streams). Interacting at a
 * fishing spot casts a line. After a short bite window, the catch is resolved.
 * Better fishing rods unlock rarer fish (pike), faster bite times, and bonus
 * treasure (essences / extra catches).
 *
 * Pure logic (rng injectable), unit-testable without DOM.
 */
const FISH_TABLE = [
    { res: "fish_perch", name: "Окунь",       emoji: "🐟", weight: 40, minRod: 1, xp: 5 },
    { res: "crayfish",   name: "Речной рак",  emoji: "🦐", weight: 30, minRod: 1, xp: 4 },
    { res: "fish_carp",  name: "Карп",        emoji: "🐠", weight: 20, minRod: 1, xp: 8 },
    { res: "fish_pike",  name: "Щука",        emoji: "🐡", weight: 10, minRod: 2, xp: 15 }
];

class FishingSystem {
    constructor(opts = {}) {
        this.rng = opts.rng || Math.random;
        this.fishTable = opts.fishTable || FISH_TABLE;
        this.active = false;
        this.castTime = 0;
        this.rodLevel = 1;
    }

    /**
     * Start a fishing attempt with a given rod tier (1..3).
     * Returns the delay (in seconds) until the fish bites.
     */
    cast(rodLevel = 1) {
        this.active = true;
        this.rodLevel = Math.max(1, rodLevel || 1);
        // Better rods attract fish faster: 1.0..2.2s (tier 1), 0.8..1.6s (tier 2), 0.5..1.2s (tier 3)
        const baseMin = Math.max(0.4, 1.2 - (this.rodLevel - 1) * 0.35);
        const baseSpan = Math.max(0.6, 1.2 - (this.rodLevel - 1) * 0.3);
        const delay = baseMin + this.rng() * baseSpan;
        return {
            rodLevel: this.rodLevel,
            delay: Math.round(delay * 10) / 10,
            msg: "🎣 Закинул удочку в воду... ждём поклёвки."
        };
    }

    /**
     * Resolve a catch after a bite.
     * Evaluates available fish based on rod level and weights.
     */
    catchFish(rodLevel = 1) {
        const level = Math.max(1, rodLevel || this.rodLevel || 1);
        const eligible = this.fishTable.filter(f => f.minRod <= level);
        
        // Weight calculation with rod level bonuses for rare catches
        let totalWeight = 0;
        const weights = eligible.map(f => {
            let w = f.weight;
            if (f.res === "fish_pike" && level >= 2) w += (level - 1) * 15;
            if (f.res === "fish_carp" && level >= 2) w += (level - 1) * 10;
            totalWeight += w;
            return { fish: f, weight: w };
        });

        let roll = this.rng() * totalWeight;
        let chosen = eligible[0];
        for (const entry of weights) {
            if (roll < entry.weight) {
                chosen = entry.fish;
                break;
            }
            roll -= entry.weight;
        }

        // Occasional treasure or double catch on higher tier rods
        let amount = 1;
        let bonus = null;
        const treasureRoll = this.rng();
        if (treasureRoll < 0.12 * level) {
            if (this.rng() < 0.5) {
                amount = 2; // double catch
            } else {
                bonus = { res: "stone", name: "Камень со дна", emoji: "🪨", amount: 1 };
            }
        }

        this.active = false;
        return {
            ok: true,
            res: chosen.res,
            name: chosen.name,
            emoji: chosen.emoji,
            amount,
            bonus,
            xp: chosen.xp * amount,
            msg: amount > 1
                ? `${chosen.emoji} Поймано сразу две рыбы: ${chosen.name} ×${amount}!`
                : `${chosen.emoji} Поймана рыба: ${chosen.name}!`
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { FishingSystem, FISH_TABLE };
}
