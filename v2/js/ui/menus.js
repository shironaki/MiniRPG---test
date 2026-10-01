/**
 * v2 village menus — DOM panels that drive the REAL v1 systems (Shop, Craft,
 * QuestJournal, Dialogue, Dungeon) and v2 systems (Cooking, Tools, Storage, Townsfolk).
 * Each opener renders into the shared #overlay/#overlayBody card; the persistent
 * #overlayClose button (wired by main.js) closes the panel and unpauses the world.
 *
 * ctx = { hero, journal, host, refresh, social, resources, requests, storage, tools, cooking, day }
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
        const RES = (typeof RESOURCES !== "undefined") ? RESOURCES : {};
        let msg = "";
        function render() {
            const buyItems = s.items.map((it, i) => `
                <div class="row"><span>${it.emoji || "📦"} ${esc(it.name)} <small>${statLine(it)}</small></span>
                <button class="mBtn" data-buy="${i}">Купить ${s.priceOf(it)}💰</button></div>`).join("");

            // Seed packets available at the shop
            const seedPrice = (RES.seeds && RES.seeds.buyPrice) || 4;
            const buySeeds = `
                <div class="row"><span>🌰 ${esc(RES.seeds ? RES.seeds.name : "Семена")} <small>для посева на грядках</small></span>
                <button class="mBtn" data-buy-seeds="1">Купить ${seedPrice}💰</button></div>`;

            // Sell equipment from hero inventory
            const sellEquip = ctx.hero.inventory.length
                ? ctx.hero.inventory.map((it, i) => `
                    <div class="row"><span>${it.emoji || "📦"} ${esc(it.name)}</span>
                    <button class="mBtn ghost" data-sell="${i}">Продать ${Math.floor((it.price || 0) / 2)}💰</button></div>`).join("")
                : "";

            // Sell fish, produce and surplus from resource bag
            const bag = ctx.resources ? ctx.resources.entries() : [];
            const sellRes = bag.map(e => {
                const meta = RES[e.res] || {};
                const price = meta.sellPrice || 1;
                return `<div class="row"><span>${meta.emoji || "📦"} ${esc(meta.name || e.res)} ×${e.n}</span>
                    <button class="mBtn ghost" data-sell-res="${e.res}">Продать 1 шт. (${price}💰)</button></div>`;
            }).join("");

            const sellHtml = (sellEquip || sellRes)
                ? `${sellEquip}${sellRes}`
                : `<p class="hint">Рюкзак пуст.</p>`;

            paint(`<h2>🏪 Лавка</h2><p class="gold">💰 ${ctx.hero.gold}</p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <h4 class="mGroup">Товары</h4>${buyItems}${buySeeds}
                <h4 class="mGroup">Продажа</h4>${sellHtml}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.buy !== undefined) {
                msg = s.buy(s.items[+b.dataset.buy]).message;
            } else if (b.dataset.buySeeds !== undefined) {
                const seedPrice = (RES.seeds && RES.seeds.buyPrice) || 4;
                if (ctx.hero.gold >= seedPrice) {
                    ctx.hero.gold -= seedPrice;
                    ctx.resources.add("seeds", 1);
                    msg = "Куплены семена 🌰!";
                } else {
                    msg = "Не хватает золота.";
                }
            } else if (b.dataset.sell !== undefined) {
                msg = s.sell(ctx.hero.inventory[+b.dataset.sell]).message;
            } else if (b.dataset.sellRes) {
                const key = b.dataset.sellRes;
                if (ctx.resources && ctx.resources.count(key) > 0) {
                    const meta = RES[key] || {};
                    const price = meta.sellPrice || 1;
                    ctx.resources.remove(key, 1);
                    ctx.hero.gold += price;
                    msg = `Продано: ${meta.name || key} (+${price}💰).`;
                }
            } else return;
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Forge (crafting + tools) --------------------------------------------
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
        let tab = "gear"; // "gear" | "tools"
        const tools = ctx.tools || (typeof Tools !== "undefined" ? new Tools() : null);

        function render() {
            const ess = (typeof Craft !== "undefined") ? Craft.essenceCount(ctx.hero) : 0;
            const gearRows = upgradables(ctx.hero).map((x, i) => {
                const info = Craft.rarityInfo(x.it.rarity || "common");
                const btn = Craft.canUpgrade(x.it)
                    ? (() => { const c = Craft.upgradeCost(x.it); return `<button class="mBtn" data-up="${i}">⬆️ ${c.gold}💰 · ${c.essence}🔩</button>`; })()
                    : `<span class="hint">макс.</span>`;
                return `<div class="row"><span>${info.emoji} ${esc(x.it.name)} <small>${statLine(x.it)} · ${x.where}</small></span>${btn}</div>`;
            });
            const gearBody = gearRows.length ? gearRows.join("") : `<p class="hint">Нет снаряжения для улучшения. Купи оружие или броню в лавке.</p>`;

            let toolsBody = "";
            if (tools) {
                const allTools = tools.all();
                toolsBody = allTools.map(t => {
                    const cur = t.current;
                    const next = t.next;
                    let btn = `<span class="hint">макс.</span>`;
                    if (next) {
                        const cost = next.cost || {};
                        const p = [];
                        if (cost.gold) p.push(`${cost.gold}💰`);
                        if (cost.wood) p.push(`${cost.wood}🪵`);
                        if (cost.stone) p.push(`${cost.stone}🪨`);
                        if (cost.essence) p.push(`${cost.essence}🔩`);
                        btn = `<button class="mBtn" data-tool-up="${t.key}">⬆️ ${p.join(" · ")}</button>`;
                    }
                    return `<div class="row"><div><strong>${cur.emoji} ${esc(cur.name)}</strong> <small>(ур. ${cur.level})</small><br><small class="hint">${esc(cur.desc)}</small></div>${btn}</div>`;
                }).join("");
            }

            const tabs = `
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <button class="mBtn ${tab === "gear" ? "" : "ghost"}" data-tab="gear">⚔️ Снаряжение</button>
                    <button class="mBtn ${tab === "tools" ? "" : "ghost"}" data-tab="tools">🪓 Инструменты</button>
                </div>`;

            paint(`<h2>🔨 Кузница</h2><p class="gold">💰 ${ctx.hero.gold} · 🔩 ${ess}</p>
                ${tabs}
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                ${tab === "gear" ? gearBody : toolsBody}
                <p class="hint">🔩 Эссенции ковки выпадают из побеждённых врагов и сундуков.</p>`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.tab) {
                tab = b.dataset.tab;
            } else if (b.dataset.up !== undefined) {
                const target = upgradables(ctx.hero)[+b.dataset.up];
                const r = Craft.upgrade(ctx.hero, target.it);
                msg = r.message || (r.success ? "Улучшено!" : "Не удалось.");
            } else if (b.dataset.toolUp) {
                const key = b.dataset.toolUp;
                if (tools) {
                    const r = tools.upgrade(key, ctx.hero, ctx.resources);
                    msg = r.msg || (r.ok ? "Инструмент улучшен!" : "Не удалось улучшить.");
                }
            } else return;
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Cooking (hearth/stove) ----------------------------------------------
    function cooking(ctx) {
        const cs = ctx.cooking || (typeof CookingSystem !== "undefined" ? new CookingSystem() : null);
        const RES = (typeof RESOURCES !== "undefined") ? RESOURCES : {};
        let msg = "";

        function render() {
            if (!cs) {
                paint(`<h2>🍲 Очаг</h2><p class="hint">Кулинарная книга ещё не готова.</p>`);
                return;
            }
            const list = cs.list(ctx.resources, ctx.storage);
            const cards = list.map(r => {
                const reqParts = Object.entries(r.activeIngredients).map(([k, needed]) => {
                    const meta = RES[k] || {};
                    const have = (ctx.resources ? ctx.resources.count(k) : 0) + (ctx.storage ? ctx.storage.count(k) : 0);
                    const mark = have >= needed ? "✓" : "✗";
                    return `<span>${meta.emoji || "📦"} ${meta.name || k}: ${have}/${needed} <small>(${mark})</small></span>`;
                }).join(" · ");

                const effect = `❤️ +${r.heal || 0} · ⚡ +${r.energy || 0}`;
                const btn = r.canCook
                    ? `<button class="mBtn" data-cook="${r.id}">🍲 Приготовить</button>`
                    : `<span class="hint">Нужны припасы</span>`;

                return `<div class="qcard ${r.canCook ? "" : "offer"}">
                    <strong>${r.emoji} ${esc(r.name)}</strong>
                    <span class="qtag">Восст.: ${effect}</span>
                    <p>${esc(r.desc)}</p>
                    <p class="qr">Ингредиенты: ${reqParts}</p>
                    <p>${btn}</p>
                </div>`;
            }).join("");

            paint(`<h2>🍲 Домашний очаг</h2>
                <p class="hint">Готовь сытные блюда из рыбы, овощей, ягод и трав.</p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                ${cards}`, onClick);
        }

        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.cook) {
                const res = cs.cook(b.dataset.cook, ctx.resources, ctx.storage);
                msg = res.msg;
                ctx.refresh();
                render();
            }
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
        const { npc, social, hero, resources, refresh, requests } = ctx;
        let msg = "";
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
        function requestBlock() {
            if (!requests) return "";
            const req = requests.ensure(npc.id, social.points(npc.id), ctx.day || 0);
            if (!req) return `<p class="hint">Поговорите почаще — и вас начнут просить о помощи.</p>`;
            const m = RES[req.res] || {};
            const have = resources ? resources.count(req.res) : 0;
            const done = requests.completed(npc.id);
            const can = requests.canFulfil(npc.id, have);
            return `<div class="qcard ${can ? "" : "offer"}">
                <strong>Поручение (выполнено ${done})</strong>
                <p>«${esc(req.text)}»</p>
                <p class="qr">Принести: ${m.emoji || "📦"} ${esc(m.name || req.res)} ×${req.n} (у вас: ${have}) · Награда: 💰 ${req.gold}</p>
                <button class="mBtn ${can ? "" : "ghost"}" data-fulfil="1" ${can ? "" : "disabled"}>${can ? "Отдать припасы" : "Не хватает"}</button>
            </div>`;
        }
        function render() {
            const canTalk = social.canTalk(npc.id);
            const canGift = social.canGift(npc.id);
            const bag = resources ? resources.entries() : [];
            const resGifts = bag.map(e => {
                const m = RES[e.res] || {};
                const loved = likes(m.name, e.res);
                return `<button class="mBtn ghost" data-gres="${e.res}" ${canGift ? "" : "disabled"}>
                    ${m.emoji || "📦"} ${esc(m.name || e.res)} ×${e.n} ${loved ? "💖" : ""}</button>`;
            }).join("");
            const itemGifts = hero.inventory.map((it, i) => {
                const loved = likes(it.name);
                return `<button class="mBtn ghost" data-gitem="${i}" ${canGift ? "" : "disabled"}>
                    ${it.emoji || "📦"} ${esc(it.name)} ${loved ? "💖" : ""}</button>`;
            }).join("");

            paint(`<h2>${npc.emoji || "🧑"} ${esc(npc.name)} <small>${esc(npc.role || "")}</small></h2>
                <p class="gold">${heartBar()} (${social.points(npc.id)}/1000)</p>
                <p><em>«${esc(line)}»</em></p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <h4 class="mGroup">Общение</h4>
                <div class="row"><span>Поговорить</span>
                <button class="mBtn" data-talk="1" ${canTalk ? "" : "disabled"}>${canTalk ? "💬 Поболтать" : "Уже говорили"}</button></div>
                <h4 class="mGroup">Поручения</h4>${requestBlock()}
                <h4 class="mGroup">Подарить</h4>
                ${canGift ? `<p class="hint">💖 — житель особенно любит этот предмет.</p>` : `<p class="hint">Сегодня подарок уже вручён.</p>`}
                <div>${resGifts || ""}${itemGifts || ""}${(!resGifts && !itemGifts) ? `<p class="hint">Нечего подарить.</p>` : ""}</div>`, onClick);
        }
        function afterGift(r, loved, name) {
            msg = r.already ? "Подарок сегодня уже вручён."
                : (loved ? `💖 «Обожаю ${name}! Спасибо огромное!» ` : `🎁 «Спасибо!» `) + `+${r.gained} к дружбе.`;
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.talk) {
                const r = social.talk(npc.id);
                msg = r.already ? "Вы уже общались сегодня." : `💬 Приятная беседа. +${r.gained} к дружбе!`;
            } else if (b.dataset.fulfil) {
                const req = requests.current(npc.id);
                if (!req) return;
                const r = requests.fulfil(npc.id, resources ? resources.count(req.res) : 0);
                if (!r.ok) { msg = r.msg; render(); return; }
                resources.remove(r.res, r.take);
                hero.gold += r.gold;
                social.award(npc.id, r.friendship);
                msg = `🎉 ${r.msg}`;
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

    // ---- Home storage chest --------------------------------------------------
    function storage(ctx) {
        const { resources, storage: chest, refresh } = ctx;
        const RES = (typeof RESOURCES !== "undefined") ? RESOURCES : {};
        let msg = "";
        function row(e, dir) {
            const m = RES[e.res] || {};
            return `<button class="mBtn ghost" data-${dir}="${e.res}">${m.emoji || "📦"} ${esc(m.name || e.res)} ×${e.n}</button>`;
        }
        function render() {
            const bag = resources ? resources.entries() : [];
            const kept = chest ? chest.entries() : [];
            paint(`<h2>🧰 Домашний сундук</h2>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <h4 class="mGroup">Положить из рюкзака</h4>
                ${bag.length ? bag.map(e => row(e, "put")).join("") : `<p class="hint">Рюкзак пуст.</p>`}
                <h4 class="mGroup">Взять из сундука</h4>
                ${kept.length ? kept.map(e => row(e, "take")).join("") : `<p class="hint">В сундуке пусто.</p>`}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            const put = b.dataset.put, take = b.dataset.take;
            if (put) {
                const n = resources.count(put);
                if (n <= 0) return;
                resources.remove(put, n); chest.add(put, n);
                msg = `Убрано в сундук: ×${n}.`;
            } else if (take) {
                const n = chest.count(take);
                if (n <= 0) return;
                chest.remove(take, n); resources.add(take, n);
                msg = `Взято из сундука: ×${n}.`;
            } else return;
            refresh && refresh(); render();
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
        const RES = (typeof RESOURCES !== "undefined") ? RESOURCES : {};

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

            const bag = ctx.resources ? ctx.resources.entries() : [];
            const res = bag.length
                ? bag.map(e => {
                    const m = RES[e.res] || {};
                    let action = "";
                    if (m.heal || m.energy) {
                        const effect = [];
                        if (m.heal) effect.push(`+${m.heal}❤️`);
                        if (m.energy) effect.push(`+${m.energy}⚡`);
                        const verb = e.res === "dish_tea" ? "Выпить" : "Съесть";
                        action = `<button class="mBtn" data-eat="${e.res}">${verb} <small>(${effect.join(" ")})</small></button>`;
                    }
                    return `<div class="row"><span>${m.emoji || "📦"} ${esc(m.name || e.res)} ×${e.n}</span>${action}</div>`;
                }).join("")
                : `<p class="hint">Ресурсы не собраны. Руби деревья 🌳, добывай камень 🪨, лови рыбу 🎣 и собирай урожай 🥕.</p>`;

            paint(`<h2>🎒 Снаряжение</h2>
                <p class="gold">⚔️ ${ctx.hero.attack} · 🛡️ ${ctx.hero.defense} · ❤️ ${ctx.hero.health}/${ctx.hero.maxHealth} · ⚡ ${ctx.hero.energy}/${ctx.hero.maxEnergy}</p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <h4 class="mGroup">Экипировка</h4>${eq}
                <h4 class="mGroup">Рюкзак</h4>${inv}
                <h4 class="mGroup">Припасы и еда</h4>${res}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.eq !== undefined) {
                msg = ctx.hero.equip(ctx.hero.inventory[+b.dataset.eq]).message;
            } else if (b.dataset.uneq) {
                msg = ctx.hero.unequip(b.dataset.uneq).message;
            } else if (b.dataset.use !== undefined) {
                msg = ctx.hero.heal().message;
            } else if (b.dataset.eat) {
                const key = b.dataset.eat;
                if (ctx.resources && ctx.resources.count(key) > 0) {
                    const m = RES[key] || {};
                    ctx.resources.remove(key, 1);
                    const heal = m.heal || 0;
                    const energy = m.energy || 0;
                    ctx.hero.health = Math.min(ctx.hero.maxHealth, ctx.hero.health + heal);
                    ctx.hero.energy = Math.min(ctx.hero.maxEnergy, ctx.hero.energy + energy);
                    msg = `✨ ${m.emoji || "🍴"} Съедено: ${m.name || key} (+${heal}❤️, +${energy}⚡).`;
                }
            } else return;
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Town Notice Board --------------------------------------------------
    function board(ctx) {
        let msg = "";
        const RES = (typeof RESOURCES !== "undefined") ? RESOURCES : {};

        function render() {
            // Daily village news & gossip based on day
            const GOSSIP = [
                "☀️ Сегодня в долине тепло и ясно. Идеальный день для рыбалки на пруду и ухода за грядками!",
                "🍃 В воздухе пахнет свежей хвоей. В лесу созрели сочные ягоды и целебные травы.",
                "⚒️ Кузнец Кузьма раздувает меха с самого рассвета — в кузнице ждут новые инструменты!",
                "🍲 В домах топятся печи и пахнет сытной похлёбкой. Не забудь приготовить горячий обед!",
                "✨ Старейшины говорят, что в глубине тёмного леса открылись древние врата испытаний..."
            ];
            const news = GOSSIP[(ctx.day || 1) % GOSSIP.length];

            // List of active errands
            const villagers = [
                { id: "marta", name: "Марта", emoji: "👩‍🌾" },
                { id: "boris", name: "Борис", emoji: "🧔" },
                { id: "lena", name: "Лена", emoji: "👧" },
                { id: "tomila", name: "Томила", emoji: "👩‍🦰" },
                { id: "kuzma", name: "Кузьма", emoji: "🧔‍♂️" }
            ];

            let errandRows = "";
            for (const v of villagers) {
                const req = ctx.requests ? ctx.requests.current(v.id) : null;
                if (!req) {
                    errandRows += `<div class="row"><span>${v.emoji} ${esc(v.name)}</span><small class="hint">Пока нет просьб (поговори с жителем)</small></div>`;
                } else {
                    const have = ctx.resources ? ctx.resources.count(req.res) : 0;
                    const meta = RES[req.res] || {};
                    const ok = have >= req.n;
                    const btn = ok
                        ? `<button class="mBtn" data-deliver="${v.id}">Сдать (${have}/${req.n})</button>`
                        : `<button class="mBtn ghost" disabled>${have}/${req.n} в наличии</button>`;
                    errandRows += `
                        <div class="row">
                            <span>${v.emoji} <strong>${esc(v.name)}:</strong> ${meta.emoji || "📦"} ${esc(meta.name || req.res)} ×${req.n} <small>(Награда: 💰 ${req.gold})</small></span>
                            ${btn}
                        </div>`;
                }
            }

            paint(`<h2>📜 Доска объявлений деревни</h2>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <h4 class="mGroup">📰 Вестник деревни</h4>
                <div class="row"><p style="margin:4px 0;line-height:1.4">${esc(news)}</p></div>
                <h4 class="mGroup">📋 Заказы жителей</h4>
                ${errandRows}
                <div style="margin-top:16px;text-align:center">
                    <button class="mBtn" data-quests="1">⚔️ Открыть охотничьи контракты</button>
                </div>`, onClick);
        }

        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.deliver) {
                const id = b.dataset.deliver;
                const have = ctx.resources ? ctx.resources.count(ctx.requests.current(id).res) : 0;
                const r = ctx.requests.fulfil(id, have);
                if (r.ok) {
                    ctx.resources.remove(r.res, r.take);
                    ctx.hero.gold += r.gold;
                    ctx.hero.gainXp(r.xp);
                    if (ctx.social) ctx.social.award(id, r.friendship);
                    msg = `🎉 Заказ сдан! Получено 💰 ${r.gold}, ✨ ${r.xp} опыта и ❤ дружба!`;
                } else {
                    msg = `Не хватает ещё ${r.short} шт.`;
                }
                ctx.refresh(); render();
            } else if (b.dataset.quests) {
                quests(ctx);
            }
        }
        render();
    }

    // ---- Town Well ----------------------------------------------------------
    function well(ctx) {
        let msg = "";
        function render() {
            paint(`<h2>🪣 Деревенский колодец</h2>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <p class="hint">Глубокий каменный колодец с чистейшей прохладной родниковой водой. Вода приятно освежает и восстанавливает силы.</p>
                <div class="row">
                    <span>💧 Напиться студёной воды</span>
                    <button class="mBtn" data-drink="1">Сделать глоток (+25⚡)</button>
                </div>
                <div class="row">
                    <span>🚰 Наполнить лейку</span>
                    <button class="mBtn" data-fill="1">Набрать воды</button>
                </div>`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.drink) {
                ctx.hero.energy = Math.min(ctx.hero.maxEnergy, ctx.hero.energy + 25);
                msg = `💧 Ты сделал глоток чистой колодезной воды. Прохлада наполнила тело энергией (+25⚡)!`;
            } else if (b.dataset.fill) {
                msg = `🚰 Лейка наполнена свежей водой до самых краёв!`;
            }
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Village Cat (Мурзик) ------------------------------------------------
    function cat(ctx) {
        let msg = "";
        const RES = (typeof RESOURCES !== "undefined") ? RESOURCES : {};
        function render() {
            const fishCount = (ctx.resources ? (ctx.resources.count("perch") + ctx.resources.count("carp") + ctx.resources.count("pike")) : 0);
            paint(`<h2>🐱 Кот Мурзик</h2>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <p class="hint">Рыжий деревенский кот с пушистым хвостом и белыми лапками. Он довольно жмурится на солнышке и мурлычет.</p>
                <div class="row">
                    <span>🐾 Погладить за ушком</span>
                    <button class="mBtn" data-pet="1">Погладить (+15❤️)</button>
                </div>
                <div class="row">
                    <span>🐟 Угостить свежей рыбкой</span>
                    ${fishCount > 0 ? `<button class="mBtn" data-feed="1">Дать рыбку</button>` : `<button class="mBtn ghost" disabled>Нет рыбы в сумке</button>`}
                </div>`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.pet) {
                ctx.hero.health = Math.min(ctx.hero.maxHealth, ctx.hero.health + 15);
                msg = `💖 Муррр... Мурзик довольно заурчал и потёрся головой о твою ладонь (+15❤️)!`;
            } else if (b.dataset.feed) {
                let fishKey = "perch";
                if (ctx.resources.count("perch") > 0) fishKey = "perch";
                else if (ctx.resources.count("carp") > 0) fishKey = "carp";
                else if (ctx.resources.count("pike") > 0) fishKey = "pike";

                if (ctx.resources && ctx.resources.count(fishKey) > 0) {
                    ctx.resources.remove(fishKey, 1);
                    ctx.hero.gold += 10;
                    ctx.hero.gainXp(25);
                    msg = `🐟 Мурзик с удовольствием схрумкал рыбку и выкатил лапкой из-под крыльца блестящую монетку (+10💰, +25✨)!`;
                }
            }
            ctx.refresh(); render();
        }
        render();
    }

    window.V2Menus = { shop, forge, quests, dialogue, dungeon, inventory, townsfolk, storage, cooking, board, well, cat };
})();
