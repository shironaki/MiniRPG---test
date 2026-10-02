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
            const seedKeys = ["seeds", "seeds_strawberry", "seeds_tomato", "seeds_corn", "seeds_pumpkin", "seeds_wheat"];
            const buySeeds = seedKeys.map(k => {
                const meta = RES[k];
                if (!meta) return "";
                const price = meta.buyPrice || 4;
                return `<div class="row"><span>${meta.emoji || "🌰"} ${esc(meta.name)}</span>
                <button class="mBtn" data-buy-seed="${k}">Купить ${price}💰</button></div>`;
            }).join("");

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

            const portrait = (typeof Portraits !== "undefined")
                ? Portraits.portraitHtml("tomila")
                : `<div class="dlgPortraitBox"><span>🛍️</span></div>`;

            paint(`
                <div class="dlgLayout" style="margin-bottom:8px;">
                    <div class="dlgPortraitCol">
                        <div class="dlgPortraitBox">${portrait}</div>
                        <div class="dlgSpeakerName">Томила</div>
                    </div>
                    <div class="dlgSpeechCol">
                        <div class="dlgBubble"><p>«Добро пожаловать в деревенскую лавку! У меня только лучшие семена, снаряжение и припасы.»</p></div>
                        ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                    </div>
                </div>
                <p class="gold">💰 Золото: ${ctx.hero.gold}</p>
                <h4 class="mGroup">Товары</h4>${buyItems}${buySeeds}
                <h4 class="mGroup">Продажа</h4>${sellHtml}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.buy !== undefined) {
                msg = s.buy(s.items[+b.dataset.buy]).message;
            } else if (b.dataset.buySeed || b.dataset.buySeeds !== undefined) {
                const seedKey = b.dataset.buySeed || "seeds";
                const seedPrice = (RES[seedKey] && RES[seedKey].buyPrice) || 4;
                if (ctx.hero.gold >= seedPrice) {
                    ctx.hero.gold -= seedPrice;
                    ctx.resources.add(seedKey, 1);
                    const name = RES[seedKey] ? RES[seedKey].name : "Семена";
                    msg = `Куплены ${name} 🌰!`;
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

            const portrait = (typeof Portraits !== "undefined")
                ? Portraits.portraitHtml("kuzma")
                : `<div class="dlgPortraitBox"><span>🔨</span></div>`;

            paint(`
                <div class="dlgLayout" style="margin-bottom:8px;">
                    <div class="dlgPortraitCol">
                        <div class="dlgPortraitBox">${portrait}</div>
                        <div class="dlgSpeakerName">Кузнец Кузьма</div>
                    </div>
                    <div class="dlgSpeechCol">
                        <div class="dlgBubble"><p>«Огонь в горне пылает жарко! Закалю твоё оружие и выкую надёжные инструменты.»</p></div>
                        ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                    </div>
                </div>
                <p class="gold">💰 ${ctx.hero.gold} · 🔩 ${ess}</p>
                ${tabs}
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
                const reqParts = (r.ingredients || []).map(ing => {
                    const meta = RES[ing.res] || {};
                    const have = (ctx.resources ? ctx.resources.count(ing.res) : 0) + (ctx.storage ? ctx.storage.count(ing.res) : 0);
                    const mark = have >= ing.count ? "✓" : "✗";
                    return `<span>${meta.emoji || "📦"} ${esc(ing.name || meta.name || ing.res)}: ${have}/${ing.count} <small>(${mark})</small></span>`;
                }).join(" · ");

                const resMeta = RES[r.yield ? r.yield.res : r.id] || {};
                const heal = resMeta.heal || r.heal || 0;
                const energy = resMeta.energy || r.energy || 0;
                const effect = `❤️ +${heal} · ⚡ +${energy}`;
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
                const portrait = (typeof Portraits !== "undefined")
                    ? Portraits.portraitHtml("elder")
                    : `<div class="dlgPortraitBox"><span>🧑</span></div>`;
                paint(`
                    <div class="dlgLayout">
                        <div class="dlgPortraitCol">
                            <div class="dlgPortraitBox">${portrait}</div>
                            <div class="dlgSpeakerName">Староста Святослав</div>
                        </div>
                        <div class="dlgSpeechCol">
                            <div class="dlgBubble"><p>«Береги себя, странник. Пусть духи предков хранят тебя на тропах.»</p></div>
                            ${extra ? `<p class="flash">${esc(extra)}</p>` : ""}
                        </div>
                    </div>`);
                return;
            }
            const node = d.current();
            const opts = node.choices
                .map((c, i) => ({ c, i }))
                .filter(({ c, i }) => !(c.once && d.taken[`${d.nodeId}:${i}`]));
            const btns = opts.map(({ c, i }) => `<button class="mBtn dlgChoiceBtn" data-c="${i}">➤ ${esc(c.label)}</button>`).join("");
            const portrait = (typeof Portraits !== "undefined")
                ? Portraits.portraitHtml("elder")
                : `<div class="dlgPortraitBox"><span>🧑</span></div>`;

            paint(`
                <div class="dlgLayout">
                    <div class="dlgPortraitCol">
                        <div class="dlgPortraitBox">${portrait}</div>
                        <div class="dlgSpeakerName">${esc(node.speaker || "Староста Святослав")}</div>
                    </div>
                    <div class="dlgSpeechCol">
                        <div class="dlgBubble"><p>«${esc(node.text)}»</p></div>
                        ${extra ? `<p class="flash">${esc(extra)}</p>` : ""}
                        <div class="dlgChoices">${btns}</div>
                    </div>
                </div>`, onClick);
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
                <button class="mBtn ${can ? "primary" : "ghost"}" data-fulfil="1" ${can ? "" : "disabled"}>${can ? "Отдать припасы" : "Не хватает"}</button>
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

            const portrait = (typeof Portraits !== "undefined")
                ? Portraits.portraitHtml(npc.id)
                : `<div class="dlgPortraitBox"><span>${npc.emoji || "🧑"}</span></div>`;

            paint(`
                <div class="dlgLayout">
                    <div class="dlgPortraitCol">
                        <div class="dlgPortraitBox">${portrait}</div>
                        <div class="dlgSpeakerName">${esc(npc.name)}</div>
                        <div class="dlgHeartGauge">${heartBar()}</div>
                        <small style="color:#ffd88a;font-size:11px;">${social.points(npc.id)}/1000</small>
                    </div>
                    <div class="dlgSpeechCol">
                        <div class="dlgBubble">
                            <p>«${esc(line)}»</p>
                        </div>
                        ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                    </div>
                </div>
                <h4 class="mGroup">Общение</h4>
                <div class="row"><span>Поговорить</span>
                <button class="mBtn primary" data-talk="1" ${canTalk ? "" : "disabled"}>${canTalk ? "💬 Поболтать" : "Уже говорили"}</button></div>
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

            paint(`<h2>🎒 Рюкзак и снаряжение</h2>
                <div style="display:flex;gap:6px;margin-bottom:10px;">
                    <button class="mBtn" data-open-skills="1">⭐ Навыки</button>
                    <button class="mBtn" data-open-homestead="1">🏡 Усадьба</button>
                </div>
                <p class="gold">⚔️ Атака: ${ctx.hero.attack} · 🛡️ Защита: ${ctx.hero.defense} · ❤️ ${ctx.hero.health}/${ctx.hero.maxHealth} · ⚡ ${ctx.hero.energy}/${ctx.hero.maxEnergy}</p>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <h4 class="mGroup">Экипировка</h4>${eq}
                <h4 class="mGroup">Предметы в рюкзаке</h4>${inv}
                <h4 class="mGroup">Припасы, урожай и еда</h4>${res}`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.openSkills) {
                skills(ctx);
                return;
            } else if (b.dataset.openHomestead) {
                homestead(ctx);
                return;
            } else if (b.dataset.eq !== undefined) {
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
            // Weather and forecast
            let weatherForecastHtml = "";
            if (ctx.weather) {
                const curSeason = ctx.weather.getSeason(ctx.day || 1);
                const curW = ctx.weather.getWeather(ctx.day || 1);
                const tomorrow = ctx.weather.getTomorrowForecast(ctx.day || 1);
                weatherForecastHtml = `
                    <div class="row" style="background:rgba(255,255,255,0.05);border-radius:6px;padding:8px 10px;margin-bottom:10px">
                        <div>
                            <strong>${curSeason.emoji} ${curSeason.name} (День ${curSeason.dayInSeason}/28)</strong> · <span>Сегодня: ${curW.emoji} ${curW.name}</span><br>
                            <small class="hint">Завтра ожидается: ${tomorrow.weather.emoji} ${tomorrow.weather.name} ${tomorrow.weather.isRain ? "· 🌧️ Грядки польются дождём!" : ""}</small>
                        </div>
                    </div>`;
            }

            // Daily village news & gossip based on day
            const GOSSIP = [
                "☀️ В долине тепло и ясно. Идеальный день для рыбалки на пруду и ухода за грядками!",
                "🍃 В воздухе пахнет свежей хвоей. В лесу созрели сочные ягоды и целебные травы.",
                "⚒️ Кузнец Кузьма раздувает меха с самого рассвета — в кузнице ждут новые инструменты!",
                "🍲 В домах топятся печи и пахнет сытной похлёбкой. Не забудь приготовить горячий обед!",
                "🏖️ На Лазурном берегу плещутся волны и кричат чайки. Отличное место для глубоководной рыбалки!",
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
                <h4 class="mGroup">🌤️ Погода и вестник</h4>
                ${weatherForecastHtml}
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
            const portrait = (typeof Portraits !== "undefined")
                ? Portraits.portraitHtml("cat")
                : `<div class="dlgPortraitBox"><span>🐱</span></div>`;

            paint(`
                <div class="dlgLayout" style="margin-bottom:8px;">
                    <div class="dlgPortraitCol">
                        <div class="dlgPortraitBox">${portrait}</div>
                        <div class="dlgSpeakerName">Кот Мурзик</div>
                    </div>
                    <div class="dlgSpeechCol">
                        <div class="dlgBubble"><p>«Муррр... 🐾 (Мурзик греется на солнышке, довольно щурится и ласково мурлычет)»</p></div>
                        ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                    </div>
                </div>
                <div class="row">
                    <span>🐾 Погладить за ушком</span>
                    <button class="mBtn primary" data-pet="1">Погладить (+15❤️)</button>
                </div>
                <div class="row">
                    <span>🐟 Угостить свежей рыбкой</span>
                    ${fishCount > 0 ? `<button class="mBtn" data-feed="1">Дать рыбку (+10💰, +25✨)</button>` : `<button class="mBtn ghost" disabled>Нет рыбы в сумке</button>`}
                </div>`, onClick);
        }
        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.pet) {
                ctx.hero.health = Math.min(ctx.hero.maxHealth, ctx.hero.health + 15);
                if (typeof ctx.addEmote === "function") ctx.addEmote("❤️");
                if (typeof ctx.addFloatingText === "function") ctx.addFloatingText("+15 ❤️", undefined, undefined, "rgba(244, 114, 182, ALPHA)");
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
                    if (typeof ctx.addEmote === "function") ctx.addEmote("🐟");
                    if (typeof ctx.addFloatingText === "function") ctx.addFloatingText("+10 💰", undefined, undefined, "rgba(255, 215, 0, ALPHA)");
                    msg = `🐟 Мурзик с удовольствием схрумкал рыбку и выкатил лапкой из-под крыльца блестящую монетку (+10💰, +25✨)!`;
                }
            }
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Ranching & Farm Animals (Фермерский загон) -------------------------
    function ranch(ctx) {
        let msg = "";
        const rSystem = ctx.ranch;
        function render() {
            if (!rSystem) {
                paint(`<h2>🐮 Фермерский загон</h2><p>Загон пока пуст.</p>`, () => {});
                return;
            }
            const animals = rSystem.list;
            const rows = animals.map(a => {
                const heartsStr = "❤️".repeat(Math.max(1, a.hearts)) + "🤍".repeat(Math.max(0, 10 - a.hearts));
                const fedIcon = a.fed ? "🌾 Сит(а)" : "🍽️ Голоден";
                const prodIcon = a.hasProduct ? "🧺 Готова продукция!" : "⏳ Созревает";
                return `<div class="row" style="flex-direction: column; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; width: 100%;">
                        <strong>${a.meta.emoji} ${esc(a.name)} (${a.meta.name})</strong>
                        <span>${fedIcon} · ${prodIcon}</span>
                    </div>
                    <div style="font-size: 0.85em; color: #d0c8b8; margin: 4px 0;">Дружба: ${heartsStr} (${a.friendship}/1000)</div>
                    <div style="display: flex; gap: 6px;">
                        <button class="mBtn" data-pet-one="${esc(a.id)}" ${a.petted ? "disabled" : ""}>Ласка</button>
                        <button class="mBtn" data-feed-one="${esc(a.id)}" ${a.fed ? "disabled" : ""}>Кормить</button>
                        ${a.hasProduct ? `<button class="mBtn" data-harvest-one="${esc(a.id)}">${esc(a.meta.harvestVerb)}</button>` : ""}
                    </div>
                </div>`;
            }).join("");

            paint(`<h2>🐮 Фермерское подворье</h2>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <p class="hint">Ухаживайте за домашними животными каждый день: гладьте и кормите их пшеницей или сеном, чтобы получать отборные продукты.</p>
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <button class="mBtn" data-pet-all="1">❤️ Погладить всех</button>
                    <button class="mBtn" data-feed-all="1">🌾 Покормить всех</button>
                    <button class="mBtn" data-harvest-all="1">🧺 Собрать всё</button>
                </div>
                <div class="list">${rows}</div>
                <h3 style="margin-top: 14px;">Купить новых животных</h3>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="mBtn" data-buy-animal="chicken">Курочка (120💰)</button>
                    <button class="mBtn" data-buy-animal="cow">Коровка (350💰)</button>
                    <button class="mBtn" data-buy-animal="sheep">Овечка (260💰)</button>
                </div>`, onClick);
        }

        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.petOne) {
                const a = rSystem.getById(b.dataset.petOne);
                if (a) { const r = a.pet(); msg = r.msg; }
            } else if (b.dataset.feedOne) {
                const a = rSystem.getById(b.dataset.feedOne);
                if (a) { const r = a.feed(ctx.resources); msg = r.msg; }
            } else if (b.dataset.harvestOne) {
                const a = rSystem.getById(b.dataset.harvestOne);
                if (a) { const r = a.harvest(ctx.resources); msg = r.msg; }
            } else if (b.dataset.petAll) {
                const r = rSystem.petAll(); msg = r.msg;
            } else if (b.dataset.feedAll) {
                const r = rSystem.feedAll(ctx.resources); msg = r.msg;
            } else if (b.dataset.harvestAll) {
                const r = rSystem.harvestAll(ctx.resources);
                msg = r.ok ? `Собрано продукции у ${r.count} животных! 🧺` : "Пока нет готовой продукции.";
            } else if (b.dataset.buyAnimal) {
                const type = b.dataset.buyAnimal;
                const r = rSystem.addAnimal(type, null, ctx.resources, (cost) => {
                    if (ctx.hero.gold >= cost) { ctx.hero.gold -= cost; return true; }
                    return false;
                });
                msg = r.msg;
            }
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Forge Smelting Furnace (Плавильный горн) ---------------------------
    function smelt(ctx) {
        let msg = "";
        const sSys = ctx.smelting || new SmeltingSystem();
        function render() {
            const recipes = sSys.listRecipes();
            const listHtml = recipes.map(r => {
                const can = sSys.canSmelt(r.yield, ctx.resources);
                const haveOre = ctx.resources.count(r.ore);
                const haveCoal = ctx.resources.count("coal");
                return `<div class="row">
                    <div>
                        <strong>${r.emoji} ${esc(r.name)}</strong>
                        <div class="hint">${esc(r.desc)} (Есть: ${haveOre}/${r.oreCount} руды, ${haveCoal}/${r.coalCount} угля)</div>
                    </div>
                    <button class="mBtn ${can ? "" : "ghost"}" data-smelt="${esc(r.yield)}" ${can ? "" : "disabled"}>
                        Выплавить
                    </button>
                </div>`;
            }).join("");

            paint(`<h2>🔥 Плавильный горн</h2>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <p class="hint">В раскаленном горне кузнеца Кузьмы руда и уголь из шахт переплавляются в прочные металлические слитки.</p>
                <div class="list">${listHtml}</div>`, onClick);
        }

        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.smelt) {
                const res = sSys.smelt(b.dataset.smelt, ctx.resources);
                msg = res.msg;
                if (res.ok) {
                    ctx.hero.gainXp(15);
                }
            }
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Home Decoration & Interior (Интерьер дома) -------------------------
    function decor(ctx) {
        let msg = "";
        const dSys = ctx.decor || new DecorSystem();
        function render() {
            const floors = dSys.listFloors();
            const walls = dSys.listWalls();
            const catalog = dSys.listCatalog();

            const floorBtns = floors.map(f => `
                <button class="mBtn ${dSys.flooring === f.id ? "active" : ""}" data-set-floor="${esc(f.id)}">
                    ${f.emoji} ${esc(f.name)}
                </button>
            `).join("");

            const wallBtns = walls.map(w => `
                <button class="mBtn ${dSys.wallpaper === w.id ? "active" : ""}" data-set-wall="${esc(w.id)}">
                    ${w.emoji} ${esc(w.name)}
                </button>
            `).join("");

            const furnRows = catalog.map(it => {
                const canAfford = ctx.hero.gold >= it.cost && (!it.wood || ctx.resources.count("wood") >= it.wood) && (!it.wool || ctx.resources.count("wool") >= it.wool);
                const reqParts = [];
                if (it.cost) reqParts.push(`${it.cost}💰`);
                if (it.wood) reqParts.push(`${it.wood}🪵`);
                if (it.wool) reqParts.push(`${it.wool}🧶`);
                return `<div class="row">
                    <div>
                        <strong>${it.emoji} ${esc(it.name)}</strong>
                        <div class="hint">${esc(it.desc)} (${reqParts.join(", ")})</div>
                    </div>
                    <button class="mBtn ${canAfford ? "" : "ghost"}" data-buy-decor="${esc(it.id)}" ${canAfford ? "" : "disabled"}>Купить</button>
                </div>`;
            }).join("");

            paint(`<h2>🎨 Обустройство дома</h2>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <p class="hint">Украсьте своё жилище стильной отделкой и удобной мебелью для тепла и уюта.</p>
                <h3>Покрытие пола</h3>
                <div style="display: flex; gap: 6px; margin-bottom: 12px;">${floorBtns}</div>
                <h3>Стены и обои</h3>
                <div style="display: flex; gap: 6px; margin-bottom: 12px;">${wallBtns}</div>
                <h3>Каталог мебели и декора</h3>
                <div class="list">${furnRows}</div>`, onClick);
        }

        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.setFloor) {
                const r = dSys.setFlooring(b.dataset.setFloor);
                msg = r.msg;
            } else if (b.dataset.setWall) {
                const r = dSys.setWallpaper(b.dataset.setWall);
                msg = r.msg;
            } else if (b.dataset.buyDecor) {
                const r = dSys.buyAndPlace(b.dataset.buyDecor, 4, 3, ctx.resources, (cost) => {
                    if (ctx.hero.gold >= cost) { ctx.hero.gold -= cost; return true; }
                    return false;
                });
                msg = r.msg;
            }
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Skills & Mastery Tree (Навыки и мастерство в стиле Albion / Stardew) --------------------
    function skills(ctx) {
        const sSys = ctx.skills || (typeof SkillsSystem !== "undefined" ? new SkillsSystem() : null);
        const dClasses = (typeof DESTINY_CLASSES !== "undefined") ? DESTINY_CLASSES : {};

        function render() {
            if (!sSys) {
                paint(`<h2>⭐ Навыки и мастерство</h2><p class="hint">Система навыков пока недоступна.</p>`);
                return;
            }

            const activeTitle = (typeof CharacterProfile !== "undefined" && ctx.charProfile)
                ? ctx.charProfile.getActiveTitle(sSys)
                : (sSys.hasPerk && sSys.hasPerk("ruler") ? "Царь долины" : "Вольный путник");

            // 1. Mastery Cards
            const list = sSys.allList();
            const cards = list.map(sk => {
                const perksList = Object.keys(sk.perks || {}).map(plv => {
                    const p = sk.perks[plv];
                    const unlocked = sk.level >= Number(plv);
                    return `<div style="font-size:12px;margin:2px 0;opacity:${unlocked ? 1 : 0.55};">
                        ${unlocked ? "🌟" : "🔒"} <strong>Ур. ${plv} — ${esc(p.name)}:</strong> ${esc(p.desc)}
                    </div>`;
                }).join("");

                return `
                    <div style="background:rgba(255,255,255,0.04);border:1px solid #4a3828;border-radius:8px;padding:10px;margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <strong>${sk.emoji} ${esc(sk.name)}</strong>
                            <span style="color:#ffd88a;font-weight:bold;">Уровень ${sk.level}/10</span>
                        </div>
                        <p style="font-size:12px;margin:0 0 6px 0;color:#cbd5e1;">${esc(sk.desc)}</p>
                        <div style="background:#1e1e24;height:8px;border-radius:4px;overflow:hidden;margin-bottom:8px;">
                            <div style="background:linear-gradient(90deg,#eab308,#f59e0b);width:${sk.pct}%;height:100%;"></div>
                        </div>
                        <small style="color:#94a3b8;display:block;margin-bottom:6px;">Опыт: ${sk.xp}/${sk.xpNeeded} XP (${sk.pct}%)</small>
                        <div style="border-top:1px dashed rgba(255,255,255,0.1);padding-top:6px;">
                            ${perksList}
                        </div>
                    </div>`;
            }).join("");

            // 2. Emergent Destiny Classes (Доска достижений и открытые пути)
            const classCards = Object.keys(dClasses).map(k => {
                const cls = dClasses[k];
                let unlocked = true;
                const reqParts = [];
                for (const sk of Object.keys(cls.reqs || {})) {
                    const reqLv = cls.reqs[sk];
                    const curLv = sSys.getLevel(sk);
                    const skDef = sSys.def(sk) || { name: sk };
                    if (curLv < reqLv) unlocked = false;
                    reqParts.push(`${skDef.name} ${curLv}/${reqLv}`);
                }
                const reqText = reqParts.length ? reqParts.join(", ") : "Стартовый статус";

                return `
                    <div style="background:${unlocked ? "rgba(234,179,8,0.10)" : "rgba(0,0,0,0.3)"};border:1px solid ${unlocked ? "#eab308" : "#3a2a1a"};border-radius:8px;padding:8px 10px;margin-bottom:6px;opacity:${unlocked ? 1 : 0.6};">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong>${cls.emoji} ${esc(cls.name)} (${esc(cls.title)})</strong>
                            <span style="font-size:12px;color:${unlocked ? "#4ade80" : "#94a3b8"};">${unlocked ? "✨ Открыт" : "🔒 Скрыто"}</span>
                        </div>
                        <small style="color:#cbd5e1;display:block;margin:3px 0;">${esc(cls.desc)} — <em>${esc(cls.bonusText || "")}</em></small>
                        <div style="font-size:11px;color:${unlocked ? "#ffd88a" : "#78716c"};">Требования: ${esc(reqText)}</div>
                    </div>`;
            }).join("");

            paint(`<h2>⭐ Навыки, мастерство и путь судьбы</h2>
                <div style="background:rgba(234,179,8,0.15);border:1px solid #ca8a04;border-radius:8px;padding:10px;margin-bottom:12px;">
                    <span style="font-size:13px;color:#fef08a;">Текущее призвание героя:</span>
                    <h3 style="margin:2px 0 0 0;color:#facc15;">👑 ${esc(activeTitle)}</h3>
                </div>
                <p class="hint">В долине нет предопределённых классов. Ваш путь определяют ваши дела: рубите дубы, вспахивайте целину, добывайте самоцветы и варите эликсиры, открывая высшие призвания мастера и царя долины!</p>
                <h4 class="mGroup">Дисциплины мастерства</h4>
                <div class="list">${cards}</div>
                <h4 class="mGroup" style="margin-top:16px;">Доска судеб и призвания (Albion & Stardew)</h4>
                <div class="list">${classCards}</div>`, () => {});
        }
        render();
    }

    // ---- Homestead & City-Building (Усадьба и развитие) -------------------
    function homestead(ctx) {
        let msg = "";
        const hSys = ctx.homestead || (typeof HomesteadSystem !== "undefined" ? new HomesteadSystem() : null);

        function render() {
            if (!hSys) {
                paint(`<h2>🏡 Усадьба</h2><p class="hint">Усадьба пока недоступна.</p>`);
                return;
            }
            const curTier = hSys.getHouseTier();
            const nextTier = hSys.getNextHouseTier();

            let upgradeBlock = "";
            if (nextTier) {
                const cost = nextTier.cost || {};
                const costParts = [];
                if (cost.gold) costParts.push(`💰 ${cost.gold}`);
                if (cost.wood) costParts.push(`🪵 ${cost.wood}`);
                if (cost.stone) costParts.push(`🪨 ${cost.stone}`);
                if (cost.bar_copper) costParts.push(`🧱 ${cost.bar_copper} медных слитков`);

                const canUp = hSys.canUpgradeHouse(ctx.hero, ctx.resources).ok;
                upgradeBlock = `
                    <div style="background:rgba(255,255,255,0.04);border:1px solid #785a30;border-radius:8px;padding:12px;margin:12px 0;">
                        <h4 style="margin:0 0 6px 0;color:#ffd88a;">Следующее расширение: «${esc(nextTier.name)}»</h4>
                        <p style="font-size:13px;margin:0 0 6px 0;">${esc(nextTier.desc)}</p>
                        <p style="font-size:12px;margin:0 0 8px 0;" class="hint">Вместимость сундука: ${nextTier.chestSlots} ячеек · Доступно грядок: ${nextTier.maxFarmPlots}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <small class="hint">Стоимость: ${costParts.join(" · ")}</small>
                            <button class="mBtn ${canUp ? "primary" : "ghost"}" data-upgrade-house="1" ${canUp ? "" : "disabled"}>${canUp ? "Улучшить дом" : "Не хватает ресурсов"}</button>
                        </div>
                    </div>`;
            } else {
                upgradeBlock = `<div class="row" style="border-left:3px solid #22c55e;"><p style="margin:0;">🎉 Ваш дом улучшен до максимального уровня «${esc(curTier.name)}»!</p></div>`;
            }

            paint(`<h2>🏡 Твоя усадьба и владения</h2>
                ${msg ? `<p class="flash">${esc(msg)}</p>` : ""}
                <div class="row">
                    <div>
                        <strong>Текущее жилище: «${esc(curTier.name)}»</strong>
                        <p style="font-size:12px;margin:2px 0;">${esc(curTier.desc)}</p>
                        <small class="hint">Сундук: ${curTier.chestSlots} ячеек · Грядок в саду: ${hSys.unlockedPlots}</small>
                    </div>
                </div>
                ${upgradeBlock}
                <h4 class="mGroup">Общинные проекты деревни</h4>
                <p class="hint">Посетите Доску объявлений на деревенской площади, чтобы помочь жителям восстановить мост, мельницу, фонари и теплицу!</p>`, onClick);
        }

        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.upgradeHouse && hSys) {
                const res = hSys.upgradeHouse(ctx.hero, ctx.resources);
                if (res.ok) {
                    msg = `🎉 Усадьба успешно расширена до «${res.name}»! Вместимость и территория увеличены!`;
                    if (typeof ctx.addEmote === "function") ctx.addEmote("✨");
                } else {
                    msg = res.msg || "Ошибка улучшения.";
                }
            }
            ctx.refresh(); render();
        }
        render();
    }

    // ---- Character Creation Modal (Создание персонажа) -------------------
    function charCreation(ctx, onComplete) {
        let name = (ctx.hero && ctx.hero.name) || "Любомир";
        let gender = "masculine";
        let hairStyle = "short";
        let hairColor = "#5c3317";
        let shirtColor = "#2e5c8a";
        let pantsColor = "#2c3e50";
        let skinTone = "#ffdcb4";

        const HAIR_S = [
            { id: "short", name: "Короткая" },
            { id: "crop", name: "Под горшок" },
            { id: "long", name: "Длинные косы" },
            { id: "curly", name: "Кудри" }
        ];

        const HAIR_C = [
            { color: "#5c3317", name: "Каштановый" },
            { color: "#e8c374", name: "Пшеничный" },
            { color: "#221c16", name: "Тёмный" },
            { color: "#c85a2b", name: "Рыжий" },
            { color: "#dcdfe6", name: "Седой" }
        ];

        const SHIRT_C = [
            { color: "#2e5c8a", name: "Васильковая" },
            { color: "#a83232", name: "Кумачовая" },
            { color: "#3a7d44", name: "Изумрудная" },
            { color: "#e3dac9", name: "Льняная" },
            { color: "#6a3b7b", name: "Пурпурная" }
        ];

        function render() {
            const hairStyleButtons = HAIR_S.map(hs => `
                <button class="mBtn ${hairStyle === hs.id ? "primary" : "ghost"}" data-set-hs="${hs.id}" style="padding:4px 8px;font-size:12px;margin:2px;">
                    ${esc(hs.name)}
                </button>`).join("");

            const hairColorSwatches = HAIR_C.map(hc => `
                <span data-set-hc="${hc.color}" style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${hc.color};border:2px solid ${hairColor === hc.color ? "#eab308" : "#222"};margin:2px 4px;cursor:pointer;vertical-align:middle;" title="${esc(hc.name)}"></span>
            `).join("");

            const shirtColorSwatches = SHIRT_C.map(sc => `
                <span data-set-sc="${sc.color}" style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${sc.color};border:2px solid ${shirtColor === sc.color ? "#eab308" : "#222"};margin:2px 4px;cursor:pointer;vertical-align:middle;" title="${esc(sc.name)}"></span>
            `).join("");

            paint(`<h2>✨ Создание героя долины</h2>
                <p class="hint">Добро пожаловать в долину! Настройте имя и внешний вид персонажа. В нашем мире нет предопределённых классов — кем стать (пахарем, рудознатцем, чародеем или царём) определят ваши поступки и труд!</p>
                
                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;margin-bottom:4px;color:#ffd88a;">Имя персонажа:</label>
                    <input type="text" id="ccNameInput" value="${esc(name)}" maxlength="16" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #785a30;background:#18181f;color:#ffd88a;font-size:14px;">
                </div>

                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;margin-bottom:4px;color:#cbd5e1;">Причёска:</label>
                    <div>${hairStyleButtons}</div>
                </div>

                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;margin-bottom:4px;color:#cbd5e1;">Цвет волос:</label>
                    <div>${hairColorSwatches}</div>
                </div>

                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;margin-bottom:4px;color:#cbd5e1;">Цвет рубахи:</label>
                    <div>${shirtColorSwatches}</div>
                </div>

                <div style="background:rgba(234,179,8,0.10);border:1px dashed #ca8a04;border-radius:8px;padding:8px 10px;margin:12px 0;font-size:12px;color:#fef08a;">
                    🌱 <strong>Стартовый статус:</strong> Новичок долины. Осваивайте земледелие, горное дело, ремёсла и ратные подвиги для открытия скрытых призваний!
                </div>

                <div style="margin-top:16px;text-align:center;">
                    <button class="mBtn primary" id="ccStartBtn" style="padding:10px 24px;font-size:15px;">Начать путь в долине! 🌟</button>
                </div>`, onClick);
        }

        function onClick(e) {
            const hs = e.target.closest("[data-set-hs]");
            if (hs) {
                hairStyle = hs.dataset.setHs;
                render();
                return;
            }
            const hc = e.target.closest("[data-set-hc]");
            if (hc) {
                hairColor = hc.dataset.setHc;
                render();
                return;
            }
            const sc = e.target.closest("[data-set-sc]");
            if (sc) {
                shirtColor = sc.dataset.setSc;
                render();
                return;
            }
            if (e.target.id === "ccStartBtn" || e.target.closest("#ccStartBtn")) {
                const inp = document.getElementById("ccNameInput");
                if (inp && inp.value.trim()) name = inp.value.trim();

                const profile = (typeof CharacterProfile !== "undefined")
                    ? new CharacterProfile({ name, gender, hairStyle, hairColor, shirtColor, pantsColor, skinTone, origin: "novice" })
                    : { name, gender, origin: "novice" };

                try {
                    localStorage.setItem("v2_char_profile", JSON.stringify(profile.toJSON ? profile.toJSON() : profile));
                } catch (err) { /* ignore */ }

                if (ctx.hero) {
                    ctx.hero.name = name;
                }
                if (ctx.player && typeof ctx.player.look === "object") {
                    ctx.player.look = profile.getLook ? profile.getLook() : ctx.player.look;
                }

                if (typeof onComplete === "function") {
                    onComplete(profile);
                } else if (typeof ctx.closeInteraction === "function") {
                    ctx.closeInteraction();
                }
                if (ctx.refresh) ctx.refresh();
            }
        }
        render();
    }

    // ---- Deep Mines Entrance (Спуск в шахты) --------------------------------
    function mines(ctx) {
        const mSys = ctx.mines || new MinesSystem();
        paint(`<h2>⛏️ Глубокие шахты</h2>
            <p class="hint">Перед вами уходит вглубь каменный штрек древней шахты. В глубине залегают жилы меди, железа, золота и драгоценных камней, но берегитесь пещерных тварей!</p>
            <div class="row">
                <span>Текущий ярус: <strong>Ярус ${mSys.floor}</strong></span>
                <span>Рекорд глубины: <strong>Ярус ${mSys.deepestFloor}</strong></span>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 14px;">
                <button class="mBtn primary" data-enter-mines="1">Спуститься в шахту 🪜</button>
            </div>`, onClick);

        function onClick(e) {
            const b = e.target.closest("button"); if (!b) return;
            if (b.dataset.enterMines) {
                if (typeof ctx.enterMines === "function") {
                    ctx.enterMines(mSys.floor);
                }
            }
        }
    }

    window.V2Menus = { shop, forge, quests, dialogue, dungeon, inventory, townsfolk, storage, cooking, board, well, cat, ranch, smelt, decor, mines, skills, homestead, charCreation };
})();
