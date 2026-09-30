/**
 * v2 entities — swept AABB movement against a solid tile grid.
 * Resolves the X and Y axes independently (the classic top-down approach) so an
 * entity can slide along walls. The swept tile range is scanned so even large
 * per-step deltas cannot tunnel through walls. Pure logic, unit-testable.
 *
 * box: { x, y, w, h } in world pixels (top-left origin).
 * Returns { x, y, hitX, hitY } — the resolved position and per-axis hit flags.
 */
function moveAndCollide(box, dx, dy, tilemap) {
    let { x, y } = box;
    const { w, h } = box;
    const ts = tilemap.tileSize;
    const eps = 0.0001;
    let hitX = false, hitY = false;

    // --- X axis ---
    if (dx !== 0) {
        let nx = x + dx;
        const top = tilemap.rowAtPixel(y);
        const bottom = tilemap.rowAtPixel(y + h - eps);
        if (dx > 0) {
            const fromCol = tilemap.colAtPixel(x + w - eps);
            const toCol = tilemap.colAtPixel(nx + w - eps);
            for (let col = fromCol; col <= toCol; col++) {
                let blocked = false;
                for (let r = top; r <= bottom; r++) if (tilemap.isSolidTile(col, r)) { blocked = true; break; }
                if (blocked) { nx = Math.min(nx, col * ts - w); hitX = true; break; }
            }
        } else {
            const fromCol = tilemap.colAtPixel(x);
            const toCol = tilemap.colAtPixel(nx);
            for (let col = fromCol; col >= toCol; col--) {
                let blocked = false;
                for (let r = top; r <= bottom; r++) if (tilemap.isSolidTile(col, r)) { blocked = true; break; }
                if (blocked) { nx = Math.max(nx, (col + 1) * ts); hitX = true; break; }
            }
        }
        x = nx;
    }

    // --- Y axis (uses the already-resolved x) ---
    if (dy !== 0) {
        let ny = y + dy;
        const left = tilemap.colAtPixel(x);
        const right = tilemap.colAtPixel(x + w - eps);
        if (dy > 0) {
            const fromRow = tilemap.rowAtPixel(y + h - eps);
            const toRow = tilemap.rowAtPixel(ny + h - eps);
            for (let row = fromRow; row <= toRow; row++) {
                let blocked = false;
                for (let c = left; c <= right; c++) if (tilemap.isSolidTile(c, row)) { blocked = true; break; }
                if (blocked) { ny = Math.min(ny, row * ts - h); hitY = true; break; }
            }
        } else {
            const fromRow = tilemap.rowAtPixel(y);
            const toRow = tilemap.rowAtPixel(ny);
            for (let row = fromRow; row >= toRow; row--) {
                let blocked = false;
                for (let c = left; c <= right; c++) if (tilemap.isSolidTile(c, row)) { blocked = true; break; }
                if (blocked) { ny = Math.max(ny, (row + 1) * ts); hitY = true; break; }
            }
        }
        y = ny;
    }

    return { x, y, hitX, hitY };
}

if (typeof module !== "undefined" && module.exports) module.exports = { moveAndCollide };
