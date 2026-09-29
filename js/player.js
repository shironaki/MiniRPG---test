class Player {
    constructor(name) {
        this.name = (typeof name === "string" ? name : "").replace(/[<>&"]/g, "").trim().slice(0, 18) || "Герой"; this.level = 1; this.experience = 0; this.experienceToNextLevel = 100;
        this.maxHealth = 100; this.health = 100; this.baseAttack = 15; this.baseDefense = 5; this.attack = 15; this.defense = 5; this.gold = 100;
        this.inventory = [ITEMS.potion.clone(), ITEMS.potion.clone()]; this.equipment = { weapon: null, armor: null, shield: null }; this.isDefending = false; this.trapSkill = 0;
    }
    updateStats() { this.attack = this.baseAttack + (this.equipment.weapon?.attackBonus || 0); this.defense = this.baseDefense + (this.equipment.armor?.defenseBonus || 0) + (this.equipment.shield?.defenseBonus || 0); }
    attackEnemy(enemy) { const critical = Math.random() < 0.15; const raw = this.attack + Math.floor(Math.random() * 9) + (critical ? this.attack : 0); return { damage: enemy.takeDamage(raw), critical }; }
    takeDamage(damage) { let result = Math.max(damage - this.defense, 1); if (this.isDefending) { result = Math.max(Math.floor(result / 2), 1); this.isDefending = false; } this.health = Math.max(this.health - result, 0); return result; }
    defend() { this.isDefending = true; return "🛡️ Ты занял защитную стойку: следующий удар слабее."; }
    heal() { const index = this.inventory.findIndex(item => item.type === "potion"); if (index === -1) return { success: false, message: "❌ В рюкзаке нет зелий." }; if (this.health >= this.maxHealth) return { success: false, message: "❤️ Здоровье уже полное." }; const potion = this.inventory.splice(index, 1)[0]; const amount = Math.min(potion.healAmount, this.maxHealth - this.health); this.health += amount; return { success: true, message: `🧪 Восстановлено ${amount} HP.` }; }
    addItem(item) { this.inventory.push(item.clone ? item.clone() : item); return `🎒 Получен предмет: ${item.name}`; }
    removeItem(item) { const i = this.inventory.indexOf(item); if (i < 0) return false; this.inventory.splice(i, 1); return true; }
    equip(item) { if (!item?.isEquipment()) return { success: false, message: "❌ Этот предмет нельзя экипировать." }; const slot = item.type; const previous = this.equipment[slot]; this.equipment[slot] = item; this.removeItem(item); if (previous) this.inventory.push(previous); this.updateStats(); return { success: true, message: `${item.emoji || "⚔️"} ${item.name} экипирован.` }; }
    unequip(slot) { const item = this.equipment[slot]; if (!item) return { success: false, message: "❌ Этот слот уже пуст." }; this.equipment[slot] = null; this.inventory.push(item); this.updateStats(); return { success: true, message: `📦 ${item.name} снят и возвращён в рюкзак.` }; }
    addExperience(amount) { this.experience += amount; const messages = []; while (this.experience >= this.experienceToNextLevel) { this.experience -= this.experienceToNextLevel; this.level++; this.maxHealth += 20; this.health = this.maxHealth; this.baseAttack += 4; this.baseDefense += 2; this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.3); this.updateStats(); messages.push(`🌟 Новый уровень: ${this.level}! Здоровье полностью восстановлено.`); } return messages; }
    isDead() { return this.health <= 0; }
}
