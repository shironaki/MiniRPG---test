class Enemy {

    constructor(
        name,
        health,
        attack,
        defense,
        experience,
        gold,
        emoji = "👹"
    ) {

        this.name = name;

        this.emoji = emoji;

        this.maxHealth = health;
        this.health = health;

        this.attack = attack;
        this.defense = defense;

        this.experience = experience;
        this.gold = gold;
    }


    takeDamage(damage) {

        const finalDamage =
            Math.max(
                damage - this.defense,
                1
            );


        this.health -=
            finalDamage;


        if (this.health < 0) {

            this.health = 0;
        }


        return finalDamage;
    }


    attackPlayer(player) {

        const damage =
            this.attack +
            Math.floor(
                Math.random() * 6
            );


        return player.takeDamage(
            damage
        );
    }


    isDead() {

        return this.health <= 0;
    }
}


/*
=========================================
ФАБРИКА ВРАГОВ
=========================================
*/

function createEnemy(type) {

    switch (type) {


        case "goblin":

            return new Enemy(
                "Гоблин",
                50,
                10,
                3,
                30,
                25,
                "👹"
            );


        case "wolf":

            return new Enemy(
                "Волк",
                65,
                13,
                4,
                40,
                35,
                "🐺"
            );


        case "skeleton":

            return new Enemy(
                "Скелет",
                80,
                15,
                6,
                55,
                45,
                "💀"
            );


        case "boss":

            return new Enemy(
                "Страж сокровища",
                180,
                22,
                10,
                200,
                250,
                "👑"
            );


        default:

            return createEnemy(
                "goblin"
            );
    }
}