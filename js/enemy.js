class Enemy {
    constructor(name, health, attack, defense, experience, gold, emoji = "👹") { Object.assign(this, { name, maxHealth: health, health, attack, defense, experience, gold, emoji }); this.statuses = []; }
    takeDamage(damage) { const result = Math.max(damage - this.defense, 1); this.health = Math.max(this.health - result, 0); return result; }
    attackPlayer(player) { return player.takeDamage(this.attack + Math.floor(Math.random() * 7)); }
    isDead() { return this.health <= 0; }
}
function createEnemy(type, level = 1) {
    const scale = Math.max(level - 1, 0);
    const table = (typeof GAME_DATA !== "undefined" && GAME_DATA.enemies) || {};
    const fallback = { name: "Гоблин", health: 52, attack: 11, defense: 3, experience: 32, gold: 28, emoji: "👹" };
    const key = table[type] ? type : "goblin";
    const d = table[type] || table.goblin || fallback;
    const enemy = new Enemy(d.name, d.health + scale * 14, d.attack + scale * 3, d.defense + scale, d.experience + scale * 10, d.gold + scale * 8, d.emoji);
    enemy.key = key;
    if (d.inflict) { enemy.inflict = d.inflict; enemy.inflictChance = d.inflictChance || 0; }
    return enemy;
}
