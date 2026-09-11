class Room {
    constructor(id, name, description) { this.id = id; this.name = name; this.description = description; this.event = null; this.explored = false; this.cleared = false; this.visits = 0; this.chest = null; this.trap = null; }
    generateEvent() { this.visits++; const roll = Math.random(); if (roll < 0.42) this.event = "enemy"; else if (roll < 0.62) this.event = "chest"; else if (roll < 0.80) this.event = "trap"; else if (roll < 0.91) this.event = "rest"; else this.event = "nothing"; }
    toJSON() {
        return {
            id: this.id, name: this.name, description: this.description,
            event: this.event, explored: this.explored, cleared: this.cleared,
            visits: this.visits,
            chest: this.chest ? this.chest.toJSON() : null,
            trap: this.trap ? this.trap.toJSON() : null
        };
    }
    static fromJSON(data) {
        const room = Object.assign(Object.create(Room.prototype), data);
        if (data.chest) room.chest = Chest.fromJSON(data.chest);
        if (data.trap) room.trap = Trap.fromJSON(data.trap);
        return room;
    }
}
