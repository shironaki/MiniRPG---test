class NPC {

    constructor(name) {

        this.name = name;

        this.questAvailable = true;
    }


    talk(player, quest) {

        if (
            quest &&
            quest.completed &&
            !quest.rewardClaimed
        ) {

            quest.rewardClaimed = true;

            player.gold +=
                quest.rewardGold;

            player.addExperience(
                quest.rewardXP
            );


            return `
                🧑 Староста:<br><br>

                Отличная работа, ${player.name}!<br>
                Ты выполнил задание.<br><br>

                💰 +${quest.rewardGold} золота<br>
                ✨ +${quest.rewardXP} XP
            `;
        }


        if (
            quest &&
            quest.active
        ) {

            return `
                🧑 Староста:<br><br>

                Продолжай выполнять
                задание.<br><br>

                👹 Гоблины:
                ${quest.progress}/
                ${quest.required}
            `;
        }


        return `
            🧑 Староста:<br><br>

            В лесу появились гоблины.
            Помоги деревне и уничтожь
            ${quest.required} гоблинов!
        `;
    }
}