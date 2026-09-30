/**
 * Branching dialogue engine. A tree is plain data (see GAME_DATA.dialogues):
 *   { start: "id", nodes: { id: { speaker, text, choices: [{ label, next, effect, once }] } } }
 * An `effect` may carry { karma, gold, xp, end } and is applied via the Game so
 * consequences (karma shifts, rewards) are real. Nodes with no choices end talk.
 */
class Dialogue {
    constructor(tree) {
        this.tree = tree || { start: "start", nodes: {} };
        this.nodeId = this.tree.start;
        this.ended = false;
        this.taken = {}; // choice keys already used (for `once` choices)
    }

    current() { return this.tree.nodes[this.nodeId] || null; }
    isEnded() { return this.ended || !this.current(); }

    // Choices still selectable from the current node (hides spent `once` ones).
    choices() {
        const node = this.current();
        if (!node || !node.choices) return [];
        return node.choices.filter((c, i) => !(c.once && this.taken[`${this.nodeId}:${i}`]));
    }

    // Apply choice `index`. Returns { node, messages } for the resulting node.
    choose(index, game) {
        const node = this.current();
        const messages = [];
        if (!node || !node.choices || !node.choices[index]) return { node, messages };
        const choice = node.choices[index];
        if (choice.once) this.taken[`${this.nodeId}:${index}`] = true;

        const eff = choice.effect || {};
        if (game) {
            if (eff.karma && typeof game.adjustKarma === "function") game.adjustKarma(eff.karma);
            if (eff.gold && game.player) { game.player.gold += eff.gold; messages.push(eff.gold > 0 ? `💰 +${eff.gold} золота.` : `💰 ${eff.gold} золота.`); }
            if (eff.xp && game.player && typeof game.player.addExperience === "function") {
                game.player.addExperience(eff.xp).forEach(m => messages.push(m));
                messages.push(`✨ +${eff.xp} опыта.`);
            }
        }

        if (eff.end || choice.next == null) { this.ended = true; return { node: this.current(), messages }; }
        this.nodeId = choice.next;
        if (!this.current()) this.ended = true;
        return { node: this.current(), messages };
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = { Dialogue };
