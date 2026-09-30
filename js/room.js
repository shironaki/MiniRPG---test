class Room {
    constructor(id, name, description) { this.id = id; this.name = name; this.description = description; this.event = null; this.explored = false; this.cleared = false; this.visited = false; this.visits = 0; }
    generateEvent() { this.visits++; const roll = Math.random(); if (roll < 0.38) this.event = "enemy"; else if (roll < 0.55) this.event = "chest"; else if (roll < 0.70) this.event = "trap"; else if (roll < 0.80) this.event = "rest"; else if (roll < 0.90) this.event = "wanderer"; else this.event = "nothing"; }
}
