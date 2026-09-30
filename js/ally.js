/**
 * Companion / ally system with a simple relationship model.
 *
 * An ally has a role that decides its battle support, and an `affinity`
 * (0..100) that grows when you treat it well and drops when you don't. Higher
 * affinity = stronger support and better perks. If affinity hits 0 the ally may
 * abandon the party.
 */
class Ally {
    constructor(id, name, emoji, role, affinity = 20) {
        this.id = id;
        this.name = name;
        this.emoji = emoji;
        this.role = role;                 // "warrior" | "healer" | "scout"
        this.affinity = affinity;         // 0..100
    }

    tier() { return this.affinity >= 75 ? 3 : this.affinity >= 40 ? 2 : 1; }

    tierLabel() {
        const t = this.tier();
        return t >= 3 ? "Верный друг" : t >= 2 ? "Товарищ" : "Знакомый";
    }

    changeAffinity(delta) {
        this.affinity = Math.max(0, Math.min(100, this.affinity + (delta || 0)));
        return this.affinity;
    }

    hasLeft() { return this.affinity <= 0; }

    /**
     * Ally acts once per player turn in battle.
     * @returns {{kind:string, amount?:number, damage?:number, message:string}}
     */
    support(player, enemy) {
        const t = this.tier();

        if (this.role === "healer") {
            if (player.health >= player.maxHealth) {
                return { kind: "idle", message: `${this.emoji} ${this.name} держится рядом, готовая помочь.` };
            }
            const amount = Math.min(6 + t * 4, player.maxHealth - player.health);
            player.health += amount;
            return { kind: "heal", amount, message: `${this.emoji} ${this.name} лечит тебя на ${amount} HP.` };
        }

        if (this.role === "scout") {
            const damage = enemy.takeDamage(5 + t * 3);
            return { kind: "attack", damage, message: `${this.emoji} ${this.name} стреляет из лука: ${damage} урона.` };
        }

        // warrior (default)
        const damage = enemy.takeDamage(8 + t * 5);
        return { kind: "attack", damage, message: `${this.emoji} ${this.name} рубит врага: ${damage} урона.` };
    }
}

// Recruitable companions.
const ALLIES = {
    warrior: () => new Ally("warrior", "Наёмник Гром", "🛡️", "warrior", 20),
    healer: () => new Ally("healer", "Травница Лия", "🌿", "healer", 30),
    scout: () => new Ally("scout", "Разведчик Кай", "🏹", "scout", 25)
};
