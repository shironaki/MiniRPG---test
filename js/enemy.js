class Enemy {
    constructor(name, health, attack, defense, experience, gold, emoji = "👹") { Object.assign(this, { name, maxHealth: health, health, attack, defense, experience, gold, emoji }); }
    takeDamage(damage) { const result = Math.max(damage - this.defense, 1); this.health = Math.max(this.health - result, 0); return result; }
    attackPlayer(player) { return player.takeDamage(this.attack + Math.floor(Math.random() * 7)); }
    isDead() { return this.health <= 0; }
}
function createEnemy(type, level = 1) { const scale = Math.max(level - 1, 0); const data = { goblin: ["Гоблин", 52, 11, 3, 32, 28, "👹"], wolf: ["Волк", 68, 14, 4, 44, 38, "🐺"], skeleton: ["Скелет", 84, 17, 6, 60, 50, "💀"], boss: ["Страж сокровища", 190, 24, 10, 220, 250, "👑"] }[type] || ["Гоблин", 52, 11, 3, 32, 28, "👹"]; return new Enemy(data[0], data[1] + scale * 14, data[2] + scale * 3, data[3] + scale, data[4] + scale * 10, data[5] + scale * 8, data[6]); }
