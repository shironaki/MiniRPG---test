class Player {

    constructor(name) {

        this.name = name;

        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;

        this.maxHealth = 100;
        this.health = 100;

        this.baseAttack = 15;
        this.baseDefense = 5;

        this.attack = 15;
        this.defense = 5;

        this.gold = 100;

        this.inventory = [
            ITEMS.potion
        ];

        this.equipment = {
            weapon: null,
            armor: null,
            shield: null
        };

        this.isDefending = false;
    }


    updateStats() {

        this.attack =
            this.baseAttack;

        this.defense =
            this.baseDefense;


        if (this.equipment.weapon) {

            this.attack +=
                this.equipment.weapon.attackBonus;
        }


        if (this.equipment.armor) {

            this.defense +=
                this.equipment.armor.defenseBonus;
        }


        if (this.equipment.shield) {

            this.defense +=
                this.equipment.shield.defenseBonus;
        }
    }


    attackEnemy(enemy) {

        let damage =
            this.attack +
            Math.floor(Math.random() * 11);


        const critical =
            Math.random() < 0.10;


        if (critical) {

            damage *= 2;
        }


        const actualDamage =
            enemy.takeDamage(damage);


        return {
            damage: actualDamage,
            critical: critical
        };
    }


    takeDamage(damage) {

        let finalDamage =
            Math.max(
                damage - this.defense,
                1
            );


        if (this.isDefending) {

            finalDamage =
                Math.floor(
                    finalDamage / 2
                );

            this.isDefending = false;
        }


        this.health -=
            finalDamage;


        if (this.health < 0) {

            this.health = 0;
        }


        return finalDamage;
    }


    defend() {

        this.isDefending = true;

        return "🛡️ Ты приготовился защищаться!";
    }


    heal() {

        const index =
            this.inventory.findIndex(
                item => item.type === "potion"
            );


        if (index === -1) {

            return {
                success: false,
                message: "❌ Нет зелий."
            };
        }


        if (this.health >= this.maxHealth) {

            return {
                success: false,
                message: "❤️ HP уже полное."
            };
        }


        const potion =
            this.inventory[index];


        this.inventory.splice(index, 1);


        const oldHealth =
            this.health;


        this.health +=
            potion.healAmount;


        if (this.health > this.maxHealth) {

            this.health =
                this.maxHealth;
        }


        return {
            success: true,
            amount: this.health - oldHealth,
            message:
                `🧪 Восстановлено ${this.health - oldHealth} HP.`
        };
    }


    addItem(item) {

        this.inventory.push(item);

        return `🎒 Получен предмет: ${item.name}`;
    }


    removeItem(item) {

        const index =
            this.inventory.indexOf(item);


        if (index === -1) {

            return false;
        }


        this.inventory.splice(index, 1);

        return true;
    }


    equip(item) {

        if (!item || !item.isEquipment()) {

            return {
                success: false,
                message: "❌ Нельзя экипировать."
            };
        }


        if (item.type === "weapon") {

            this.equipment.weapon = item;
        }

        else if (item.type === "armor") {

            this.equipment.armor = item;
        }

        else if (item.type === "shield") {

            this.equipment.shield = item;
        }


        this.updateStats();


        return {
            success: true,
            message:
                `⚔️ ${item.name} экипирован!`
        };
    }


    unequip(type) {

        if (!this.equipment[type]) {

            return {
                success: false,
                message: "❌ Слот пуст."
            };
        }


        const item =
            this.equipment[type];


        this.equipment[type] = null;

        this.updateStats();


        return {
            success: true,
            message:
                `📦 ${item.name} снят.`
        };
    }


    addExperience(amount) {

        this.experience += amount;

        const messages = [];


        while (
            this.experience >=
            this.experienceToNextLevel
        ) {

            this.experience -=
                this.experienceToNextLevel;

            messages.push(
                this.levelUp()
            );
        }


        return messages;
    }


    levelUp() {

        this.level++;

        this.maxHealth += 20;

        this.health =
            this.maxHealth;

        this.baseAttack += 5;
        this.baseDefense += 2;

        this.experienceToNextLevel =
            Math.floor(
                this.experienceToNextLevel * 1.25
            );


        this.updateStats();


        return `
            🎉 Уровень повышен!
            Теперь уровень: ${this.level}
        `;
    }


    isDead() {

        return this.health <= 0;
    }


    showStats() {

        return `
            👤 ${this.name}<br>
            ❤️ HP: ${this.health}/${this.maxHealth}<br>
            ⚔️ Атака: ${this.attack}<br>
            🛡️ Защита: ${this.defense}<br>
            ⭐ Уровень: ${this.level}<br>
            ✨ XP: ${this.experience}/${this.experienceToNextLevel}<br>
            💰 Золото: ${this.gold}
        `;
    }
}