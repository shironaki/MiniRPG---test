/**
 * v2 battle UI — a DOM battle screen driven by the Battle2D bridge (which runs
 * the real v1 combat engine). Shows both fighters with HP/energy bars, the
 * enemy's element & weakness, a scrolling log, and action buttons.
 *
 * openBattle(hero, kind, level, { onWin, onLose, onFlee }) → Battle2D
 * Exposed globally for main.js.
 */
function openBattle(hero, kind, level, callbacks = {}) {
    const root = document.getElementById("battle");
    const enemyEl = document.getElementById("bEnemy");
    const heroEl = document.getElementById("bHero");
    const logEl = document.getElementById("bLog");
    const actionsEl = document.getElementById("bActions");
    const resultEl = document.getElementById("bResult");

    const esc = (s) => (typeof escapeHtml === "function" ? escapeHtml(s) : String(s));
    const elements = (typeof GAME_DATA !== "undefined" && GAME_DATA.elements) || {};
    const SPRITE_KINDS = ["goblin", "wolf", "skeleton"];

    const bc = new Battle2D(hero, kind, level, {
        onUpdate: render,
        onLog: appendLog,
        onEnd: showResult
    });

    resultEl.classList.add("hidden");
    resultEl.innerHTML = "";
    logEl.innerHTML = "";
    root.classList.remove("hidden");

    function bar(cur, max, cls) {
        const pct = Math.max(0, Math.min(100, (cur / max) * 100));
        return `<div class="bBar"><div class="${cls}" style="width:${pct}%"></div></div>`;
    }

    function elementLine(enemy) {
        const el = elements[enemy.element];
        if (!el) return "";
        const weakKey = (typeof Battle !== "undefined" && Battle.weaknessOf) ? Battle.weaknessOf(enemy.element) : null;
        const weak = weakKey && elements[weakKey]
            ? ` · уязвим: ${elements[weakKey].emoji}` : "";
        return `<div class="bElement">${el.emoji} ${esc(el.name)}${weak}</div>`;
    }

    function statusChips(list) {
        if (!list || !list.length) return "";
        const defs = (typeof GAME_DATA !== "undefined" && GAME_DATA.statuses) || {};
        return `<div class="bStatuses">` + list.map(s => {
            const d = defs[s.type] || {};
            return `<span class="bStatus">${d.emoji || "✨"}${s.turns}</span>`;
        }).join("") + `</div>`;
    }

    // Render a pixel rig (hero or mob) to a crisp data URL for the battle panel.
    function rigDataURL(what) {
        try {
            let composed = null;
            if (what === "hero" && typeof CharacterRig !== "undefined") {
                composed = CharacterRig.compose("down", 0, null);
            } else if (typeof MobRig !== "undefined") {
                composed = MobRig.compose(what, 0);
            }
            if (!composed) return null;
            const { w, h, grid } = composed;
            const cv = document.createElement("canvas");
            cv.width = w; cv.height = h;
            const c = cv.getContext("2d");
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
                if (grid[y][x]) { c.fillStyle = grid[y][x]; c.fillRect(x, y, 1, 1); }
            return cv.toDataURL();
        } catch (_) { return null; }
    }

    const enemyURL = SPRITE_KINDS.includes(kind) ? rigDataURL(kind) : null;
    const enemyArt = enemyURL
        ? `<img class="bImg" src="${enemyURL}" alt="">`
        : null;
    const heroURL = rigDataURL("hero");
    const heroArt = heroURL
        ? `<img class="bImg heroImg" src="${heroURL}" alt="">`
        : "";

    function render() {
        const e = bc.enemy;
        enemyEl.innerHTML = `
            <div class="bSprite">${enemyArt || e.emoji}</div>
            <div class="bName">${esc(e.name)}</div>
            ${bar(e.health, e.maxHealth, "bHp")}
            <div class="bNums">❤️ ${Math.max(0, e.health)} / ${e.maxHealth}</div>
            ${elementLine(e)}
            ${statusChips(e.statuses)}`;

        const p = bc.player;
        heroEl.innerHTML = `
            <div class="bSprite">${heroArt}</div>
            <div class="bName">${esc(p.name)} · ур.${p.level}</div>
            ${bar(p.health, p.maxHealth, "bHp")}
            <div class="bNums">❤️ ${Math.max(0, p.health)} / ${p.maxHealth}</div>
            ${bar(p.energy || 0, p.maxEnergy || 1, "bEn")}
            <div class="bNums">⚡ ${p.energy || 0} / ${p.maxEnergy || 0}</div>
            ${statusChips(p.statuses)}`;

        renderActions();
    }

    function renderActions() {
        actionsEl.innerHTML = "";
        if (bc.finished) return;
        addBtn("⚔️ Атака", () => bc.attack());
        addBtn("🛡️ Защита", () => bc.defend());
        addBtn("🧪 Лечение", () => bc.heal());
        for (const s of bc.availableSkills()) {
            const disabled = (bc.player.energy || 0) < s.cost;
            addBtn(`${s.emoji} ${s.name} ⚡${s.cost}`, () => bc.useSkill(s.id), disabled, "skill");
        }
        addBtn("🏃 Бежать", () => bc.flee(), false, "flee");
    }

    function addBtn(label, fn, disabled, cls) {
        const b = document.createElement("button");
        b.className = "bBtn" + (cls ? " " + cls : "");
        b.textContent = label;
        if (disabled) b.disabled = true;
        b.onclick = fn;
        actionsEl.appendChild(b);
    }

    function appendLog(msg) {
        const line = document.createElement("div");
        line.innerHTML = msg;
        logEl.appendChild(line);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function showResult(result) {
        actionsEl.innerHTML = "";
        const title = result === "win" ? "🏆 Победа!" : result === "lose" ? "💀 Поражение…" : "🏃 Побег удался";
        resultEl.classList.remove("hidden");
        resultEl.innerHTML = `<h2>${title}</h2>`;
        const cont = document.createElement("button");
        cont.className = "bBtn";
        cont.textContent = "Продолжить";
        cont.onclick = () => {
            root.classList.add("hidden");
            if (result === "win" && callbacks.onWin) callbacks.onWin(bc);
            else if (result === "lose" && callbacks.onLose) callbacks.onLose(bc);
            else if (callbacks.onFlee) callbacks.onFlee(bc);
        };
        resultEl.appendChild(cont);
    }

    render();
    return bc;
}
