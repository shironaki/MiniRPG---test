class World {

    constructor() {

        this.currentLocation = "start";

        this.rooms = {

            start: new Room(
                "start",
                "🏕️ Старт",
                "Ты находишься у входа в подземелье."
            ),

            room1: new Room(
                "room1",
                "🏚️ Старая комната",
                "Пыльная комната с разрушенной мебелью."
            ),

            room2: new Room(
                "room2",
                "🏰 Каменный зал",
                "Высокий зал с древними стенами."
            ),

            room3: new Room(
                "room3",
                "🌲 Тёмный лес",
                "Мрачное место. Здесь может быть опасно."
            ),

            room4: new Room(
                "room4",
                "💎 Зал сокровища",
                "Последняя комната подземелья."
            )
        };


        /*
        ========================================
        СВЯЗИ МЕЖДУ КОМНАТАМИ
        ========================================
        */

        this.connections = {

            start: {

                north: "room2",
                south: null,
                east: "room3",
                west: "room1"
            },


            room1: {

                north: null,
                south: null,
                east: "start",
                west: null
            },


            room2: {

                north: null,
                south: "start",
                east: null,
                west: null
            },


            room3: {

                north: null,
                south: "room4",
                east: null,
                west: "start"
            },


            room4: {

                north: "room3",
                south: null,
                east: null,
                west: null
            }
        };


        /*
        ========================================
        СОКРОВИЩЕ
        ========================================
        */

        this.treasureFound = false;
    }


    getCurrentRoom() {

        return this.rooms[
            this.currentLocation
        ];
    }


    move(direction) {

        const connections =
            this.connections[
                this.currentLocation
            ];


        const nextRoom =
            connections[direction];


        if (!nextRoom) {

            return {

                success: false,

                message:
                    "🧱 В этом направлении пути нет."
            };
        }


        this.currentLocation =
            nextRoom;


        return {

            success: true,

            room:
                this.getCurrentRoom()
        };
    }


    explore() {

        const room =
            this.getCurrentRoom();


        /*
        ========================================
        КОМНАТА УЖЕ ИССЛЕДОВАНА
        ========================================
        */

        if (room.explored) {

            return {

                type: "already",

                message:
                    "🔎 Ты уже исследовал эту комнату."
            };
        }


        room.explored = true;


        /*
        ========================================
        ФИНАЛЬНАЯ КОМНАТА
        ========================================
        */

        if (
            room.id === "room4"
        ) {

            room.event =
                "boss";

            return {

                type: "boss",

                message:
                    "👑 Перед тобой Страж сокровища!"
            };
        }


        /*
        ========================================
        СЛУЧАЙНОЕ СОБЫТИЕ
        ========================================
        */

        room.generateEvent();


        switch (
            room.event
        ) {


            case "enemy":

                return {

                    type: "enemy",

                    message:
                        "👹 В комнате враг!"
                };


            case "chest":

                room.chest =
                    new Chest();


                return {

                    type: "chest",

                    message:
                        "📦 Ты заметил сундук!"
                };


            case "trap":

                room.trap =
                    new Trap();


                return {

                    type: "trap",

                    message:
                        "⚠️ Ты заметил подозрительное место..."
                };


            case "nothing":

                room.cleared =
                    true;


                return {

                    type: "nothing",

                    message:
                        "🌙 Здесь ничего нет."
                };
        }
    }
}