/**
 * v2 village menus — DOM panels that drive the REAL v1 systems (Shop, Craft,
 * QuestJournal, Dialogue, Dungeon) with no v1 DOM. Each opener renders into the
 * shared #overlay/#overlayBody card; the persistent #overlayClose button (wired
 * by main.js) closes the panel and unpauses the world.
 *
 * ctx = { hero, journal, host, refresh } where:
 *   hero    — persistent v1 Player (stats/progression)
 *   journal — persistent QuestJournal
 *   host    — { player, adjustKarma } stub for Dialogue/Quest effects
 *   refresh — repaint the overworld stats HUD
 *
 * Exposed as window.V2Menus.
 */
(function () {
    const el = (id) => document.getElementById(id);
    const esc = (s) => (typeof escapeHtml === "function" ? escapeHtml(s) : String(s));

    function paint(html, onClick) {
        const body = el("overlayBody");
        body.innerHTML = html;
        body.onclick = onClick || null;
        el("overlay").classList.remove("hidden");
    }

    function statLine(it) {
        const p = [];
        if (it.attackBonus) p.push(`+${it.attackBonus}⚔️`);
        if (it.defenseBonus) p.push(`+${it.defenseBonus}🛡️`);
        if (it.healAmount) p.push(`+${it.healAmount}❤️`);
        return p.join(" ");
    }

    function rewardText(r) {
        const p = [];
        if (r.gold) p.push(`💰 ${r.gold}`);
        if (r.xp) p.push(`✨ ${r.xp}`);
        if (r.karma) p.push(`☯️ ${r.karma > 0 ? "+" : ""}${r.karma}`);
        if (r.affinity) p.push(`❤ +${r.affinity}`);
        return p.join(" · ");
    }

    const slotEmoji = (slot) => ({ weapon: "⚔️", armor: "🛡️", shield: "🔰" }[slot] || "📦");

    // ---- Shop ----------------------------------------------------------------
    function shop(ctx) {
        const s = new Shop(ctx.hero);
        let msg = "";
        function render() {
            const buy = s.items.map((it, i) => `
                <div class="row"><span>${it.emoji || "📦"} ${esc(it.name)} <small>${statLine(it)}</small></span>
                <button class="mBtn" data-buy="${i}">Купить ${s.priceOf(it)}💰</button></div>`).join("");
            const sell = ctx.hero.inventory.length
                ? ctx.hero.inventory.map((it, i) => `
                    <div class="row"><span>${it.emoji || "📦"} ${esc(it.name)}</span>
                    <button class="mBtn ghost" data-sell="${i}">Продать ${Math.floor((it.price || 0) / 2)}💰</button></div>`).join("")
                : `<p class="hint">Рюкзак пуст.</p>`;
            paint(`<h2>🏪 Лавка</h2><p class="gold">💰 ${ctx.hero.gold}</p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <h4 class="mGroup">Товары</h4>${buy}
                <h4 class="mGroup">Продажа</h4>${sell}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.buy !== undefined) msg = s.buy(s.items[+b.dataset.buy]).message;
            else if (b.dataset.sell !== undefined) msg = s.sell(ctx.hero.inventory[+b.dataset.sell]).message;
            else return;
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Forge (crafting) ----------------------------------------------------
    function upgradables(hero) {
        const list = [];
        ["weapon", "armor", "shield"].forEach(slot => {
            const it = hero.equipment[slot];
            if (it) list.push({ it, where: "экип." });
        });
        hero.inventory.forEach(it => {
            if (it.isEquipment && it.isEquipment()) list.push({ it, where: "рюкзак" });
        });
        return list;
    }
    function forge(ctx) {
        let msg = "";
        function render() {
            const ess = Craft.essenceCount(ctx.hero);
            const rows = upgradables(ctx.hero).map((x, i) => {
                const info = Craft.rarityInfo(x.it.rarity || "common");
                const btn = Craft.canUpgrade(x.it)
                    ? (() => { const c = Craft.upgradeCost(x.it); return `<button class="mBtn" data-up="${i}">⬆️ ${c.gold}💰 · ${c.essence}🔩</button>`; })()
                    : `<span class="hint">макс.</span>`;
                return `<div class="row"><span>${info.emoji} ${esc(x.it.name)} <small>${statLine(x.it)} · ${x.where}</small></span>${btn}</div>`;
            });
            const body = rows.length ? rows.join("") : `<p class="hint">Нет снаряжения для улучшения. Купи оружие или броню в лавке.</p>`;
            paint(`<h2>🔨 Кузница</h2><p class="gold">💰 ${ctx.hero.gold} · 🔩 ${ess}</p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}${body}
                <p class="hint">🔩 Эссенции ковки выпадают из побеждённых врагов.</p>`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b || b.dataset.up === undefined) return;
            const target = upgradables(ctx.hero)[+b.dataset.up];
            const r = Craft.upgrade(ctx.hero, target.it);
            msg = r.message || (r.success ? "Улучшено!" : "Не удалось.");
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Quest board ---------------------------------------------------------
    function quests(ctx) {
        const j = ctx.journal;
        let msg = "";
        function render() {
            const active = j.activeEntries().map(({ id, def, entry }) => {
                const state = entry.claimed ? "✅ Награда получена"
                    : entry.completed ? `<button class="mBtn" data-claim="${id}">🏆 Забрать</button>`
                    : `⚔️ ${entry.progress}/${def.objective.count}`;
                const tag = def.giver === "ally" ? "🤝 Личный" : "🏘️ Деревня";
                return `<div class="qcard ${entry.completed ? "done" : ""}"><strong>${esc(def.title)}</strong>
                    <span class="qtag">${tag}</span><p>${esc(def.desc)}</p>
                    <p class="qr">🎁 ${rewardText(def.reward)}</p><p>${state}</p></div>`;
            }).join("");
            const offers = j.available(ctx.hero).map(def => {
                const tag = def.giver === "ally" ? "🤝 Личный" : "🏘️ Деревня";
                return `<div class="qcard offer"><strong>${esc(def.title)}</strong>
                    <span class="qtag">${tag}</span><p>${esc(def.desc)}</p>
                    <p class="qr">🎁 ${rewardText(def.reward)}</p>
                    <button class="mBtn" data-accept="${def.id}">📜 Взять</button></div>`;
            }).join("");
            let html = `<h2>📜 Доска квестов</h2>${msg ? `<p class="flash">${esc(msg)}</p>` : ""}`;
            html += active ? `<h4 class="mGroup">Активные</h4>${active}` : "";
            html += offers ? `<h4 class="mGroup">Доступные</h4>${offers}` : "";
            if (!active && !offers) html += `<p class="hint">Пока нет заданий. Подними репутацию или найди спутника — появятся новые.</p>`;
            paint(html, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.accept) { const def = j.accept(b.dataset.accept, ctx.hero); msg = def ? `📜 Принято: ${def.title}` : "Нельзя взять."; }
            else if (b.dataset.claim) { const r = j.claim(b.dataset.claim, ctx.host); msg = r ? `🏆 Награда: ${rewardText(r.reward)}` : "Нельзя забрать."; }
            else return;
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Elder dialogue ------------------------------------------------------
    function dialogue(ctx) {
        const tree = (typeof GAME_DATA !== "undefined" && GAME_DATA.dialogues && GAME_DATA.dialogues.elder);
        const d = new Dialogue(tree);
        let extra = "";
        function render() {
            if (d.isEnded()) {
                paint(`<h2>🧑 Староста</h2><p>Береги себя, странник.</p>${extra ? `<p class="flash">${esc(extra)}</p>` : ""}`);
                return;
            }
            const node = d.current();
            const opts = node.choices
                .map((c, i) => ({ c, i }))
                .filter(({ c, i }) => !(c.once && d.taken[`${d.nodeId}:${i}`]));
            const btns = opts.map(({ c, i }) => `<button class="mBtn wide" data-c="${i}">${esc(c.label)}</button>`).join("");
            paint(`<h2>${esc(node.speaker || "🧑 Староста")}</h2><p>${esc(node.text)}</p>
                ${extra ? `<p class="flash">${esc(extra)}</p>` : ""}${btns}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b || b.dataset.c === undefined) return;
            const res = d.choose(+b.dataset.c, ctx.host);
            extra = (res.messages || []).join(" ");
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Townsfolk (living NPC social panel) ---------------------------------
    function townsfolk(ctx) {
        const { npc, social, hero, resources, refresh } = ctx;
        let msg = "";
        // pick one greeting line for this visit
        const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
        const RES = (typeof RESOURCES !== "undefined") ? RESOURCES : {};

        function likes(name, resKey) {
            return npc.likes.some(l =>
                (resKey && resKey === l) ||
                (name && name.toLowerCase().includes(String(l).toLowerCase())));
        }
        function heartBar() {
            const h = social.hearts(npc.id);
            return "❤️".repeat(h) + "🤍".repeat(10 - h);
        }
        function render() {
            const talkBtn = social.canTalk(npc.id)
                ? `<button class="mBtn wide" data-talk="1">💬 Поговорить</button>`
                : `<p class="hint">Вы уже общались сегодня.</p>`;
            // gifts: resources first, then equippable/consumable items
            let gifts = "";
            if (social.canGift(npc.id)) {
                const resBtns = (resources ? resources.entries() : []).map(e => {
                    const m = RES[e.res] || {};
                    const love = likes(m.name, e.res) ? " 💖" : "";
                    return `<button class="mBtn ghost" data-gres="${e.res}">${m.emoji || "📦"} ${esc(m.name || e.res)} ×${e.n}${love}</button>`;
                }).join("");
                const itemBtns = hero.inventory.map((it, i) => {
                    const love = likes(it.name) ? " 💖" : "";
                    return `<button class="mBtn ghost" data-gitem="${i}">${it.emoji || "📦"} ${esc(it.name)}${love}</button>`;
                }).join("");
                const any = resBtns + itemBtns;
                gifts = `<h4 class="mGroup">Подарить</h4>${any || `<p class="hint">Нет предметов для подарка.</p>`}`;
            } else {
                gifts = `<p class="hint">Подарок уже вручён сегодня.</p>`;
            }
            const likeHint = npc.likes.length
                ? `<p class="hint">Любит подарки: ${npc.likes.map(esc).join(", ")}.</p>` : "";
            paint(`<h2>${npc.emoji} ${esc(npc.name)}</h2>
                <p class="hint">${esc(npc.role || "Житель деревни")}</p>
                <p class="qr">${heartBar()} <small>${social.points(npc.id)}/1000</small></p>
                <p>“${esc(line)}”</p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                ${talkBtn}
                ${gifts}
                ${likeHint}`, onClick);
        }
        function afterGift(r, loved, label) {
            if (r.already) { msg = "Вы уже дарили подарок сегодня."; return; }
            msg = (loved ? `😍 ${npc.name} обожает ${label}! ` : `🙂 ${npc.name}: «Спасибо!» `) + `+${r.gained} к дружбе.`;
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.talk) {
                const r = social.talk(npc.id);
                msg = r.already ? "Вы уже общались сегодня." : `💬 Приятная беседа. +${r.gained} к дружбе!`;
            } else if (b.dataset.gres) {
                const key = b.dataset.gres;
                if (!resources || resources.count(key) <= 0) return;
                const m = RES[key] || {};
                const loved = likes(m.name, key);
                const r = social.gift(npc.id, loved);
                if (!r.already) resources.remove(key, 1);
                afterGift(r, loved, m.name || key);
            } else if (b.dataset.gitem !== undefined) {
                const idx = +b.dataset.gitem;
                const it = hero.inventory[idx];
                if (!it) return;
                const loved = likes(it.name);
                const r = social.gift(npc.id, loved);
                if (!r.already) hero.inventory.splice(idx, 1);
                afterGift(r, loved, it.name);
            } else return;
            refresh(); render();
        }
        render();
    }

    // ---- Procedural dungeon --------------------------------------------------
    function dungeon(ctx) {
        const dg = Dungeon.generate(ctx.hero.level);
        let msg = "Ты входишь во Врата испытаний…";
        function levelFor(f) { return ctx.hero.level + (f.type === "elite" ? 2 : 0); }
        function finishFloor() {
            dg.advance();
            if (!dg.active) {
                const bonusG = 50 * dg.level, bonusX = 60 * dg.level;
                ctx.hero.gold += bonusG;
                const lv = ctx.hero.addExperience(bonusX);
                msg = `🏆 Подземелье пройдено! +${bonusG}💰 · +${bonusX}✨ ${lv.join(" ")}`;
            }
            ctx.refresh(); render();
        }
        function render() {
            if (!dg.active) { paint(`<h2>🏰 Врата испытаний</h2><p class="flash">${esc(msg)}</p>`); return; }
            const f = dg.current();
            let action = "";
            if (f.type === "enemy" || f.type === "elite") {
                const en = createEnemy(f.enemy, levelFor(f));
                action = `<button class="mBtn" data-fight="1">${f.type === "elite" ? "⚔️ Элитный бой" : "⚔️ В бой"}: ${en.emoji} ${esc(en.name)}</button>`;
            } else if (f.type === "chest") action = `<button class="mBtn" data-loot="1">🎁 Открыть сундук</button>`;
            else if (f.type === "trap") action = `<button class="mBtn" data-trap="1">⚠️ Пройти ловушку</button>`;
            else if (f.type === "rest") action = `<button class="mBtn" data-rest="1">🔥 Отдохнуть у костра</button>`;
            paint(`<h2>🏰 Врата испытаний</h2><p class="hint">Этаж ${dg.index + 1}/${dg.depth}</p>
                <p class="flash">${esc(msg)}</p><p>❤️ ${ctx.hero.health}/${ctx.hero.maxHealth} · ⚡ ${ctx.hero.energy}/${ctx.hero.maxEnergy}</p>
                ${action}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            const f = dg.current();
            if (b.dataset.fight) {
                el("overlay").classList.add("hidden");
                openBattle(ctx.hero, f.enemy, levelFor(f), {
                    onWin(bc) { ctx.journal.onEnemyDefeated(bc.enemy); msg = `Победа над ${bc.enemy.name}!`; el("overlay").classList.remove("hidden"); finishFloor(); },
                    onFlee() { dg.active = false; msg = "🏃 Ты сбежал из подземелья."; el("overlay").classList.remove("hidden"); ctx.refresh(); render(); },
                    onLose() { dg.active = false; ctx.hero.health = ctx.hero.maxHealth; msg = "💀 Поражение. Тебя вытащили на поверхность."; el("overlay").classList.remove("hidden"); ctx.refresh(); render(); }
                });
            } else if (b.dataset.loot) {
                const gold = 20 + Math.floor(Math.random() * 30 * dg.level);
                ctx.hero.gold += gold;
                let bonus = "";
                if (Math.random() < 0.5) { ctx.hero.addItem(Craft.essence()); bonus = " и 🔩 эссенцию"; }
                ctx.journal.onChestOpened();
                msg = `🎁 В сундуке ${gold}💰${bonus}.`; finishFloor();
            } else if (b.dataset.trap) {
                const dmg = Math.max(5, Math.floor(ctx.hero.maxHealth * 0.12));
                ctx.hero.health = Math.max(1, ctx.hero.health - dmg);
                msg = `⚠️ Ловушка сработала! −${dmg}❤️.`; finishFloor();
            } else if (b.dataset.rest) {
                const heal = Math.floor(ctx.hero.maxHealth * 0.4);
                ctx.hero.health = Math.min(ctx.hero.maxHealth, ctx.hero.health + heal);
                ctx.hero.energy = ctx.hero.maxEnergy;
                msg = `🔥 Отдых восстановил ${heal}❤️ и всю энергию.`; finishFloor();
            }
        }
        render();
    }

    // ---- Inventory / equipment (key I) --------------------------------------
    function inventory(ctx) {
        let msg = "";
        function render() {
            const eq = ["weapon", "armor", "shield"].map(slot => {
                const it = ctx.hero.equipment[slot];
                const label = { weapon: "Оружие", armor: "Броня", shield: "Щит" }[slot];
                return `<div class="row"><span>${slotEmoji(slot)} ${label}: ${it ? esc(it.name) : "—"}</span>
                    ${it ? `<button class="mBtn ghost" data-uneq="${slot}">Снять</button>` : ""}</div>`;
            }).join("");
            const inv = ctx.hero.inventory.length ? ctx.hero.inventory.map((it, i) => {
                let btn = "";
                if (it.isEquipment && it.isEquipment()) btn = `<button class="mBtn" data-eq="${i}">Экипировать</button>`;
                else if (it.type === "potion") btn = `<button class="mBtn" data-use="${i}">Выпить</button>`;
                return `<div class="row"><span>${it.emoji || "📦"} ${esc(it.name)} <small>${statLine(it)}</small></span>${btn}</div>`;
            }).join("") : `<p class="hint">Рюкзак пуст.</p>`;
            const RES = (typeof RESOURCES !== "undefined") ? RESOURCES : {};
            const bag = ctx.resources ? ctx.resources.entries() : [];
            const res = bag.length
                ? `<div class="row">${bag.map(e => { const m = RES[e.res] || {}; return `<span>${m.emoji || "📦"} ${esc(m.name || e.res)}: ${e.n}</span>`; }).join(" &nbsp; ")}</div>`
                : `<p class="hint">Ресурсы не собраны. Руби деревья 🌳, добывай камень 🪨, собирай ягоды 🫐 и травы 🌿.</p>`;
            paint(`<h2>🎒 Снаряжение</h2>
                <p class="gold">⚔️ ${ctx.hero.attack} · 🛡️ ${ctx.hero.defense} · ❤️ ${ctx.hero.health}/${ctx.hero.maxHealth}</p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <h4 class="mGroup">Экипировка</h4>${eq}
                <h4 class="mGroup">Рюкзак</h4>${inv}
                <h4 class="mGroup">Ресурсы</h4>${res}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.eq !== undefined) msg = ctx.hero.equip(ctx.hero.inventory[+b.dataset.eq]).message;
            else if (b.dataset.uneq) msg = ctx.hero.unequip(b.dataset.uneq).message;
            else if (b.dataset.use !== undefined) msg = ctx.hero.heal().message;
            else return;
            ctx.refresh(); render();
        }
        render();
    }

    window.V2Menus = { shop, forge, quests, dialogue, dungeon, inventory, townsfolk };
})();
