/**
 * Small security / robustness helpers shared across the game.
 *
 * escapeHtml — neutralises HTML metacharacters so untrusted text (e.g. a saved
 *   hero name, possibly hand-edited in localStorage) can never inject markup or
 *   scripts when written via innerHTML.
 * sanitizeName — the primary defence: strips control chars and angle brackets
 *   from a player-entered name and caps its length, so the stored value is safe
 *   everywhere it is later used.
 */
function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function sanitizeName(raw) {
    let s = String(raw == null ? "" : raw);
    // Drop control characters and anything that could start an HTML tag.
    s = s.replace(/[\u0000-\u001F\u007F<>]/g, "");
    // Collapse whitespace runs and trim.
    s = s.replace(/\s+/g, " ").trim();
    if (s.length > 24) s = s.slice(0, 24).trim();
    return s || "Герой";
}

if (typeof module !== "undefined" && module.exports) module.exports = { escapeHtml, sanitizeName };
