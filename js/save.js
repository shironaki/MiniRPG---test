class SaveSystem {

    // A previous good save is mirrored to a backup key before every overwrite,
    // so a corrupted or partially-written primary can be recovered on load.
    static get KEY() { return "miniRPG9"; }
    static get BACKUP() { return "miniRPG9_bak"; }
    static get VERSION() { return 1; }

    // True when localStorage is usable (it throws in some private-mode browsers
    // and when the quota is exhausted).
    available() {
        try {
            const probe = "__miniRPG_probe__";
            localStorage.setItem(probe, "1");
            localStorage.removeItem(probe);
            return true;
        } catch {
            return false;
        }
    }

    save(game) {
        const data = {
            version: SaveSystem.VERSION,
            player: game.player,
            world: game.world,
            quest: game.quest,
            journal: game.journal,
            stats: game.stats
        };

        let json;
        try {
            json = JSON.stringify(data);
        } catch {
            return { success: false, error: "serialize" };
        }

        try {
            // Preserve the last known-good state as a backup first.
            const prev = localStorage.getItem(SaveSystem.KEY);
            if (prev) localStorage.setItem(SaveSystem.BACKUP, prev);
            localStorage.setItem(SaveSystem.KEY, json);
            return { success: true };
        } catch {
            // Full disk / private mode / quota — never crash the game over a save.
            return { success: false, error: "write" };
        }
    }

    clear() {
        try {
            localStorage.removeItem(SaveSystem.KEY);
            localStorage.removeItem(SaveSystem.BACKUP);
        } catch {
            /* nothing we can do; ignore */
        }
    }

    // Parse and shape-check a raw JSON string. Returns a valid save object or
    // null if it is missing, malformed, or structurally invalid.
    _parse(raw) {
        if (!raw) return null;
        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            return null;
        }
        if (!data || typeof data !== "object") return null;
        if (!data.player || typeof data.player !== "object") return null;
        if (!data.world || typeof data.world !== "object") return null;
        return data;
    }

    load() {
        let primary = null;
        try {
            primary = this._parse(localStorage.getItem(SaveSystem.KEY));
        } catch {
            primary = null;
        }
        if (primary) return primary;

        // Primary missing or corrupt — fall back to the backup copy.
        try {
            return this._parse(localStorage.getItem(SaveSystem.BACKUP));
        } catch {
            return null;
        }
    }

    // Whether any (primary or backup) save is present.
    hasSave() {
        try {
            return !!(localStorage.getItem(SaveSystem.KEY) || localStorage.getItem(SaveSystem.BACKUP));
        } catch {
            return false;
        }
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { SaveSystem };
