class World {
    constructor() {
        this.currentLocation = "start"; this.relics = [];
        this.rooms = {
            start: new Room("start", "🏕️ Перекрёсток", "Старый лагерь у трёх ведущих вглубь троп."),
            abandonedWing: new Room("abandonedWing", "🏚️ Заброшенное крыло", "Ветер гонит пыль по залам с выбитыми окнами."),
            forge: new Room("forge", "🔥 Затухшая кузня", "На остывшей наковальне ещё видны следы древней работы."),
            catacomb: new Room("catacomb", "🦴 Катакомбы", "Ниши в стенах хранят память о тех, кто не вышел."),
            ancientHall: new Room("ancientHall", "🏛️ Древний зал", "Колонны тянутся к потолку, скрытому во тьме."),
            archive: new Room("archive", "📚 Затопленный архив", "Среди размокших свитков мерцает первая печать."),
            shrine: new Room("shrine", "🕯️ Святилище", "Три потухшие чаши окружают каменный пьедестал."),
            darkForest: new Room("darkForest", "🌲 Тёмная роща", "Корни пробили пол, а шёпот идёт из-за деревьев."),
            ruins: new Room("ruins", "🧱 Руины дозора", "Здесь можно увидеть тропы, расходящиеся по всему комплексу."),
            camp: new Room("camp", "⛺ Лагерь разведчиков", "Забытый костёр ещё хранит немного тепла."),
            marsh: new Room("marsh", "🌫️ Туманный топь", "Под водой что-то медленно движется в сторону выхода."),
            treasury: new Room("treasury", "💎 Врата сокровищницы", "За печатью ждёт Страж и ответ на все вопросы.")
        };
        this.connections = {
            start: { north: "ancientHall", south: "camp", east: "darkForest", west: "abandonedWing" },
            abandonedWing: { north: "catacomb", south: null, east: "start", west: "forge" }, forge: { north: null, south: "camp", east: "abandonedWing", west: null },
            catacomb: { north: null, south: "abandonedWing", east: "ancientHall", west: null }, ancientHall: { north: "archive", south: "start", east: "shrine", west: "catacomb" },
            archive: { north: null, south: "ancientHall", east: null, west: null }, shrine: { north: null, south: "darkForest", east: null, west: "ancientHall" },
            darkForest: { north: "shrine", south: "ruins", east: "marsh", west: "start" }, ruins: { north: "darkForest", south: null, east: "treasury", west: "camp" },
            camp: { north: "start", south: null, east: "ruins", west: "forge" }, marsh: { north: null, south: "treasury", east: null, west: "darkForest" },
            treasury: { north: "marsh", south: null, east: null, west: "ruins" }
        };
        this.relicRooms = { archive: "Руна прилива", shrine: "Руна пламени", catacomb: "Руна праха" }; this.treasureFound = false;
    }
    getCurrentRoom() { return this.rooms[this.currentLocation]; }
    getCurrentLocation() { return this.getCurrentRoom(); }
    move(direction) { const next = this.connections[this.currentLocation][direction]; if (!next) return { success: false, message: "🧱 В этом направлении пути нет." }; this.currentLocation = next; return { success: true, room: this.getCurrentRoom() }; }
    explore() {
        const room = this.getCurrentRoom();
        if (room.id === "treasury") { room.explored = true; if (this.relics.length < 3) { room.event = "bossLocked"; return { type: "locked", message: `🔒 Печать не поддаётся. Нужно рун: ${this.relics.length}/3.` }; } room.event = "boss"; return { type: "boss", message: "👑 Три руны вспыхнули. Страж сокровищницы пробуждается!" }; }
        if (room.explored) return { type: "already", message: "🔎 Здесь ты уже нашёл всё, что было доступно." };
        if (this.relicRooms[room.id] && !this.relics.includes(room.id)) { room.explored = true; room.event = "relic"; return { type: "relic", message: `✨ Ты нашёл: ${this.relicRooms[room.id]}.` }; }
        room.explored = true; room.generateEvent(); return this.eventResult(room);
    }
    eventResult(room) {
        const results = { enemy: ["enemy", "👹 Шорох становится всё ближе — тебя заметили!"], chest: ["chest", "📦 Среди обломков блеснул запертый сундук."], trap: ["trap", "⚠️ На пути виден подозрительный механизм."], rest: ["rest", "🔥 Ты нашёл безопасное место для короткого привала."], nothing: ["nothing", "🌙 Пока здесь тихо, но подземелье не спит."] };
        const [type, message] = results[room.event] || results.nothing; if (type === "chest") room.chest = new Chest(); if (type === "trap") room.trap = new Trap(); if (type === "nothing") room.cleared = true; return { type, message };
    }
    collectRelic() { const room = this.getCurrentRoom(); if (!this.relicRooms[room.id] || this.relics.includes(room.id)) return null; this.relics.push(room.id); room.cleared = true; room.event = "cleared"; return this.relicRooms[room.id]; }
    toJSON() {
        const roomsJSON = {};
        for (const key of Object.keys(this.rooms)) {
            roomsJSON[key] = this.rooms[key].toJSON();
        }
        return {
            currentLocation: this.currentLocation, relics: this.relics,
            rooms: roomsJSON, connections: this.connections,
            relicRooms: this.relicRooms, treasureFound: this.treasureFound
        };
    }
    static fromJSON(data) {
        const world = Object.assign(Object.create(World.prototype), data);
        const rooms = {};
        for (const key of Object.keys(data.rooms)) {
            rooms[key] = Room.fromJSON(data.rooms[key]);
        }
        world.rooms = rooms;
        return world;
    }
}
