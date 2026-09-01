class Room {
    constructor(id, name, description) { this.id = id; this.name = name; this.description = description; this.event = null; this.explored = false; this.cleared = false; this.visits = 0; }
    generateEvent() { this.visits++; const roll = Math.random(); if (roll < 0.42) this.event = "enemy"; else if (roll < 0.62) this.event = "chest"; else if (roll < 0.80) this.event = "trap"; else if (roll < 0.91) this.event = "rest"; else this.event = "nothing"; }
}
