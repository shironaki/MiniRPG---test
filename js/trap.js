class Trap {
    constructor() { this.triggered = false; this.disarmed = false; }
    chance(player) { return Math.min(35 + player.trapSkill * 12, 83); }
    disarm(player) {
        if (this.triggered || this.disarmed) return { success: false, message: "⚠️ С ловушкой уже всё решено." };
        if (Math.random() * 100 < this.chance(player)) { this.disarmed = true; player.trapSkill++; return { success: true, message: `🧰 Ловушка обезврежена! Навык механика: ${player.trapSkill}.` }; }
        return this.activate(player, true);
    }
    activate(player, failedDisarm = false) {
        if (this.triggered) return { success: false, message: "⚠️ Ловушка уже сработала." };
        this.triggered = true;
        const damage = (failedDisarm ? 6 : 12) + Math.floor(Math.random() * (failedDisarm ? 13 : 19));
        const actualDamage = player.takeDamage(damage);
        return { success: false, message: `${failedDisarm ? "💥 Механизм сорвался" : "⚠️ ЛОВУШКА"}! Ты получил ${actualDamage} урона.` };
    }
}
