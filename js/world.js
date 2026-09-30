class World {
    // Spatial layout of the dungeon (x → east, y → north). Kept on the
    // prototype via the getter below so it is NOT serialised into saves and is
    // always available after a resume(). Verified consistent with connections.
    static COORDS = {
        start: { x: 0, y: 0 }, ancientHall: { x: 0, y: 1 }, archive: { x: 0, y: 2 },
        camp: { x: 0, y: -1 }, darkForest: { x: 1, y: 0 }, shrine: { x: 1, y: 1 },
        ruins: { x: 1, y: -1 }, marsh: { x: 2, y: 0 }, treasury: { x: 2, y: -1 },
        abandonedWing: { x: -1, y: 0 }, catacomb: { x: -1, y: 1 }, forge: { x: -2, y: 0 }
    };
    get coords() { return World.COORDS; }

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
            abandonedWing: { north: "catacomb", south: null, east: "start", west: "forge" }, forge: { north: null, south: null, east: "abandonedWing", west: null },
            catacomb: { north: null, south: "abandonedWing", east: "ancientHall", west: null }, ancientHall: { north: "archive", south: "start", east: "shrine", west: "catacomb" },
            archive: { north: null, south: "ancientHall", east: null, west: null }, shrine: { north: null, south: "darkForest", east: null, west: "ancientHall" },
            darkForest: { north: "shrine", south: "ruins", east: "marsh", west: "start" }, ruins: { north: "darkForest", south: null, east: "treasury", west: "camp" },
            camp: { north: "start", south: null, east: "ruins", west: null }, marsh: { north: null, south: "treasury", east: null, west: "darkForest" },
            treasury: { north: "marsh", south: null, east: null, west: "ruins" }
        };
        this.relicRooms = { archive: "Руна прилива", shrine: "Руна пламени", catacomb: "Руна праха" }; this.treasureFound = false;
        this.enemyPool = ["goblin", "wolf", "skeleton"];
        this.rooms.start.visited = true;
    }
    getCurrentRoom() { return this.rooms[this.currentLocation]; }
    getCurrentLocation() { return this.getCurrentRoom(); }
    move(direction) { const next = this.connections[this.currentLocation][direction]; if (!next) return { success: false, message: "🧱 В этом направлении пути нет." }; this.currentLocation = next; const room = this.getCurrentRoom(); room.visited = true; return { success: true, room }; }

    // Direction from the current room to `roomId`, or null if they are not
    // directly connected. Drives click-to-move on the map.
    directionTo(roomId) { const exits = this.connections[this.currentLocation] || {}; return Object.keys(exits).find(dir => exits[dir] === roomId) || null; }

    // Ids of rooms directly connected to `roomId`.
    neighborsOf(roomId) { return Object.values(this.connections[roomId] || {}).filter(Boolean); }

    // Fog of war: a room is visible if visited, current, or adjacent to any
    // visited room (the explorable frontier).
    isVisible(roomId) {
        if (roomId === this.currentLocation) return true;
        const room = this.rooms[roomId]; if (!room) return false;
        if (room.visited) return true;
        return this.neighborsOf(roomId).some(id => this.rooms[id] && this.rooms[id].visited);
    }

    // Move to an adjacent, connected room by id (one step, no teleporting).
    moveTo(roomId) {
        const direction = this.directionTo(roomId);
        if (!direction) return { success: false, message: "🧭 Туда нельзя пройти отсюда — выбери соседнюю комнату." };
        return this.move(direction);
    }
    explore() {
        const room = this.getCurrentRoom();
        if (room.id === "treasury") { room.explored = true; if (this.relics.length < 3) { room.event = "bossLocked"; return { type: "locked", message: `🔒 Печать не поддаётся. Нужно рун: ${this.relics.length}/3.` }; } room.event = "boss"; return { type: "boss", message: "👑 Три руны вспыхнули. Страж сокровищницы пробуждается!" }; }
        if (room.explored) return { type: "already", message: "🔎 Здесь ты уже нашёл всё, что было доступно." };
        if (this.relicRooms[room.id] && !this.relics.includes(room.id)) { room.explored = true; room.event = "relic"; return { type: "relic", message: `✨ Ты нашёл: ${this.relicRooms[room.id]}.` }; }
        room.explored = true; room.generateEvent(); return this.eventResult(room);
    }
    eventResult(room) {
        const results = { enemy: ["enemy", "👹 Шорох становится всё ближе — тебя заметили!"], chest: ["chest", "📦 Среди обломков блеснул запертый сундук."], trap: ["trap", "⚠️ На пути виден подозрительный механизм."], rest: ["rest", "🔥 Ты нашёл безопасное место для короткого привала."], nothing: ["nothing", "🌙 Пока здесь тихо, но подземелье не спит."] };
        const [type, message] = results[room.event] || results.nothing; if (type === "chest") room.chest = new Chest(); if (type === "trap") room.trap = new Trap(); if (type === "enemy") room.enemyType = this.enemyPool[Math.floor(Math.random() * this.enemyPool.length)]; if (type === "nothing") room.cleared = true; return { type, message };
    }
    collectRelic() { const room = this.getCurrentRoom(); if (!this.relicRooms[room.id] || this.relics.includes(room.id)) return null; this.relics.push(room.id); room.cleared = true; room.event = "cleared"; return this.relicRooms[room.id]; }
}
