class Item {

    constructor(
        name,
        type,
        price,
        description,
        attackBonus = 0,
        defenseBonus = 0,
        healAmount = 0
    ) {

        this.name = name;
        this.type = type;
        this.price = price;
        this.description = description;

        this.attackBonus = attackBonus;
        this.defenseBonus = defenseBonus;
        this.healAmount = healAmount;
    }


    isEquipment() {

        return (
            this.type === "weapon" ||
            this.type === "armor" ||
            this.type === "shield"
        );
    }


    isConsumable() {

        return this.type === "potion";
    }
}


const ITEMS = {

    sword: new Item(
        "⚔️ Железный меч",
        "weapon",
        80,
        "Надёжный меч.",
        10
    ),

    bow: new Item(
        "🏹 Деревянный лук",
        "weapon",
        75,
        "Простой лук.",
        8
    ),

    shield: new Item(
        "🛡️ Железный щит",
        "shield",
        60,
        "Укреплённый щит.",
        0,
        7
    ),

    armor: new Item(
        "🧥 Кожаная броня",
        "armor",
        120,
        "Лёгкая броня.",
        0,
        10
    ),

    potion: new Item(
        "🧪 Зелье здоровья",
        "potion",
        20,
        "Восстанавливает 30 HP.",
        0,
        0,
        30
    )
};