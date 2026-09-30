/**
 * v2 world — a tile grid with collision & coordinate helpers.
 * `rows` is an array of equal-length strings; each character is a tile key
 * resolved through the tiles legend. Pure logic, fully unit-testable.
 */
class TileMap {
    constructor(rows, tileSize = 32, legendLookup = tileInfo) {
        this.rows = rows.map(r => String(r));
        this.tileSize = tileSize;
        this.lookup = legendLookup;
        this.rowsCount = this.rows.length;
        this.colsCount = this.rows.reduce((m, r) => Math.max(m, r.length), 0);
        // Cells blocked on top of the tile legend (furniture, props).
        this.blocked = new Set();
    }

    // Mark a cell impassable without changing the underlying tile art.
    block(col, row) { this.blocked.add(col + "," + row); return this; }
    isBlocked(col, row) { return this.blocked.has(col + "," + row); }

    get pixelWidth() { return this.colsCount * this.tileSize; }
    get pixelHeight() { return this.rowsCount * this.tileSize; }

    inBounds(col, row) {
        return row >= 0 && row < this.rowsCount && col >= 0 && col < (this.rows[row] ? this.rows[row].length : 0);
    }

    tileAt(col, row) {
        if (row < 0 || row >= this.rowsCount) return null;
        const line = this.rows[row];
        if (col < 0 || col >= line.length) return null;
        return line[col];
    }

    infoAt(col, row) {
        const key = this.tileAt(col, row);
        return key == null ? this.lookup(null) : this.lookup(key);
    }

    // Solid if out of bounds (treated as wall) or the tile is flagged solid.
    isSolidTile(col, row) {
        const key = this.tileAt(col, row);
        if (key == null) return true;
        if (this.isBlocked(col, row)) return true;
        return !!this.lookup(key).solid;
    }

    colAtPixel(px) { return Math.floor(px / this.tileSize); }
    rowAtPixel(py) { return Math.floor(py / this.tileSize); }
    isSolidAtPixel(px, py) { return this.isSolidTile(this.colAtPixel(px), this.rowAtPixel(py)); }

    // Iterate every tile (col,row,key,info) — used by the renderer.
    forEach(cb) {
        for (let row = 0; row < this.rowsCount; row++) {
            const line = this.rows[row];
            for (let col = 0; col < line.length; col++) {
                cb(col, row, line[col], this.lookup(line[col]));
            }
        }
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { TileMap };
