/**
 * v2 world — tools and upgrades system.
 *
 * Tools (axe, pickaxe, hoe, watering can, fishing rod) can be upgraded at Kuzma's
 * forge using gold, gathered resources and forge essences. Upgraded tools
 * increase gathering yields, speed up work, and unlock rare fish.
 *
 * Pure logic, unit-testable without DOM.
 */
(function (global) {
    "use strict";

    const TOOL_TIERS = {
        axe: [
            { level: 1, name: "Топор дровосека", emoji: "🪓", desc: "Базовый топор для рубки деревьев и брёвен." },
            { level: 2, name: "Кованый топор", emoji: "🪓", desc: "Рубит деревья быстрее, +1 к выходу древесины.", cost: { gold: 45, wood: 5, essence: 1 } },
            { level: 3, name: "Стальной топор", emoji: "🪓", desc: "Быстрая валка деревьев, +2 к древесине.", cost: { gold: 110, stone: 8, essence: 3 } }
        ],
        pickaxe: [
            { level: 1, name: "Каменная кирка", emoji: "⛏️", desc: "Простая кирка для добычи камня и медной руды." },
            { level: 2, name: "Железная кирка", emoji: "⛏️", desc: "Добывает породу быстрее, +1 к выходу камня и руды.", cost: { gold: 45, stone: 6, essence: 1 } },
            { level: 3, name: "Титановая кирка", emoji: "⛏️", desc: "Мощная кирка, открывает добычу самоцветов и золота.", cost: { gold: 110, stone: 10, essence: 3 } }
        ],
        hoe: [
            { level: 1, name: "Деревянная мотыга", emoji: "🌾", desc: "Базовая мотыга для вспахивания грядок." },
            { level: 2, name: "Кованая мотыга", emoji: "🌾", desc: "Легче рыхлит почву, экономя силы.", cost: { gold: 35, wood: 4, essence: 1 } },
            { level: 3, name: "Стальная мотыга", emoji: "🌾", desc: "Вспахивает грядки с высоким шансом найти семена.", cost: { gold: 90, stone: 6, essence: 2 } }
        ],
        can: [
            { level: 1, name: "Глиняная лейка", emoji: "🪣", desc: "Обычная лейка для полива всходов." },
            { level: 2, name: "Медная лейка", emoji: "🪣", desc: "Качественный полив, повышает шансы хорошего урожая.", cost: { gold: 40, stone: 4, essence: 1 } },
            { level: 3, name: "Серебряная лейка", emoji: "🪣", desc: "Магический полив: частый двойной урожай.", cost: { gold: 100, stone: 8, essence: 2 } }
        ],
        rod: [
            { level: 1, name: "Деревянная удочка", emoji: "🎣", desc: "Простая удочка для ловли речной рыбы." },
            { level: 2, name: "Крепкая удочка", emoji: "🎣", desc: "Быстрее привлекает рыбу, открывает ловлю щуки.", cost: { gold: 50, wood: 6, essence: 1 } },
            { level: 3, name: "Мастерская удочка", emoji: "🎣", desc: "Шанс двойного улова и находок со дна.", cost: { gold: 120, wood: 12, essence: 3 } }
        ]
    };

    const HOTBAR_SLOTS = [
        { slot: 1, key: "axe", name: "Топор", emoji: "🪓" },
        { slot: 2, key: "pickaxe", name: "Кирка", emoji: "⛏️" },
        { slot: 3, key: "hoe", name: "Мотыга", emoji: "🌾" },
        { slot: 4, key: "can", name: "Лейка", emoji: "🪣" },
        { slot: 5, key: "rod", name: "Удочка", emoji: "🎣" },
        { slot: 6, key: "hand", name: "Руки", emoji: "✋" }
    ];

    class Tools {
        constructor(init = {}) {
            this.levels = {
                axe: init.axe || 1,
                pickaxe: init.pickaxe || 1,
                hoe: init.hoe || 1,
                can: init.can || 1,
                rod: init.rod || 1
            };
            this.activeSlot = init.activeSlot || 0; // 0..5
        }

        has(toolKey) {
            return (this.levels[toolKey] || 0) >= 1;
        }

        level(toolKey) {
            return this.levels[toolKey] || 1;
        }

        info(toolKey) {
            const tiers = TOOL_TIERS[toolKey] || [];
            const lv = this.level(toolKey);
            return tiers[lv - 1] || tiers[0];
        }

        getActiveTool() {
            const slotDef = HOTBAR_SLOTS[this.activeSlot] || HOTBAR_SLOTS[0];
            return slotDef.key;
        }

        getActiveToolKey() {
            const slotDef = HOTBAR_SLOTS[this.activeSlot] || HOTBAR_SLOTS[0];
            return slotDef.key;
        }

        require(toolKey, minLevel = 1) {
            return this.has(toolKey) && this.level(toolKey) >= minLevel;
        }

        setActiveSlot(index) {
            this.activeSlot = Math.max(0, Math.min(HOTBAR_SLOTS.length - 1, index));
            return this.getActiveTool();
        }

        nextUpgrade(toolKey) {
            const tiers = TOOL_TIERS[toolKey] || [];
            const lv = this.level(toolKey);
            if (lv >= tiers.length) return null;
            return tiers[lv];
        }

        _countEssence(hero) {
            if (!hero) return 0;
            if (typeof Craft !== "undefined" && Craft.essenceCount) {
                return Craft.essenceCount(hero);
            }
            if (Array.isArray(hero.inventory)) {
                return hero.inventory.filter(it => it && (it.name === "Эссенция ковки" || it.type === "essence")).length;
            }
            return 0;
        }

        _spendEssence(hero, count) {
            if (!hero || count <= 0) return;
            if (typeof Craft !== "undefined" && Craft.spendEssence) {
                Craft.spendEssence(hero, count);
                return;
            }
            if (Array.isArray(hero.inventory)) {
                for (let k = 0; k < count; k++) {
                    const idx = hero.inventory.findIndex(it => it && (it.name === "Эссенция ковки" || it.type === "essence"));
                    if (idx >= 0) hero.inventory.splice(idx, 1);
                }
            }
        }

        canUpgrade(toolKey, hero, resources) {
            const next = this.nextUpgrade(toolKey);
            if (!next) return { ok: false, reason: "Максимальный уровень." };

            const cost = next.cost || {};
            if (hero && hero.gold < (cost.gold || 0)) {
                return { ok: false, reason: `Не хватает золота (нужно ${cost.gold}💰).` };
            }
            if (cost.wood && (!resources || resources.count("wood") < cost.wood)) {
                return { ok: false, reason: `Не хватает древесины (нужно ${cost.wood}🪵).` };
            }
            if (cost.stone && (!resources || resources.count("stone") < cost.stone)) {
                return { ok: false, reason: `Не хватает камня (нужно ${cost.stone}🪨).` };
            }
            if (cost.essence) {
                const ess = this._countEssence(hero);
                if (ess < cost.essence) {
                    return { ok: false, reason: `Не хватает эссенций (нужно ${cost.essence}🔩).` };
                }
            }
            return { ok: true, cost };
        }

        upgrade(toolKey, hero, resources) {
            const check = this.canUpgrade(toolKey, hero, resources);
            if (!check.ok) return { ok: false, msg: check.reason };

            const next = this.nextUpgrade(toolKey);
            const cost = next.cost || {};

            if (hero && cost.gold) hero.gold -= cost.gold;
            if (resources && cost.wood) resources.remove("wood", cost.wood);
            if (resources && cost.stone) resources.remove("stone", cost.stone);
            if (hero && cost.essence) this._spendEssence(hero, cost.essence);

            this.levels[toolKey] = next.level;
            return { ok: true, name: next.name, level: next.level };
        }

        list() {
            return Object.keys(TOOL_TIERS).map(k => ({
                key: k,
                level: this.level(k),
                info: this.info(k),
                next: this.nextUpgrade(k)
            }));
        }

        getHotbar() {
            return HOTBAR_SLOTS.map((s, idx) => ({
                slot: s.slot,
                key: s.key,
                name: s.name,
                emoji: s.emoji,
                active: idx === this.activeSlot,
                level: s.key === "hand" ? 1 : this.level(s.key)
            }));
        }

        toJSON() {
            return {
                levels: { ...this.levels },
                activeSlot: this.activeSlot
            };
        }
    }

    global.TOOL_TIERS = TOOL_TIERS;
    global.HOTBAR_SLOTS = HOTBAR_SLOTS;
    global.Tools = Tools;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { TOOL_TIERS, HOTBAR_SLOTS, Tools };
    }
})(typeof window !== "undefined" ? window : globalThis);
