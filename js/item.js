class Item {
    constructor(name, type, price, description, attackBonus = 0, defenseBonus = 0, healAmount = 0, emoji = "📦") {
        this.name = name; this.type = type; this.price = price; this.description = description;
        this.attackBonus = attackBonus; this.defenseBonus = defenseBonus; this.healAmount = healAmount; this.emoji = emoji;
    }
    isEquipment() { return ["weapon", "armor", "shield"].includes(this.type); }
    clone() { return new Item(this.name, this.type, this.price, this.description, this.attackBonus, this.defenseBonus, this.healAmount, this.emoji); }
}

const ITEMS = {
    sword: new Item("Железный меч", "weapon", 80, "Надёжное оружие ближнего боя.", 10, 0, 0, "⚔️"),
    bow: new Item("Деревянный лук", "weapon", 75, "Лёгкое оружие для метких ударов.", 8, 0, 0, "🏹"),
    shield: new Item("Железный щит", "shield", 60, "Снижает урон от атак.", 0, 7, 0, "🛡️"),
    armor: new Item("Кожаная броня", "armor", 120, "Прочная и лёгкая защита.", 0, 10, 0, "🧥"),
    potion: new Item("Зелье здоровья", "potion", 20, "Восстанавливает 35 HP.", 0, 0, 35, "🧪")
};
