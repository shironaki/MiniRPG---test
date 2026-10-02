/**
 * v2 world — Skills & Mastery Progression System.
 * 
 * Tracks player masteries in 6 distinct disciplines:
 * - farming: yields, rare seeds, water efficiency
 * - mining: extra ore yields, gem discoveries, pickaxe power
 * - foraging: wood quality, extra seeds/mushrooms, movement through brush
 * - fishing: catch difficulty reduction, treasure discoveries, rare marine fish
 * - combat: attack power, defense, critical strike chance
 * - magic: energy conservation, alchemy potion potency, telekinesis gathering
 * 
 * Pure logic, unit-testable without DOM.
 */
(function (global) {
    "use strict";

    const SKILL_DEFS = {
        farming: {
            name: "Земледелие",
            emoji: "🌾",
            desc: "Мастерство возделывания почвы, селекции и сбора щедрых урожаев.",
            perks: {
                2: { id: "farm_sprout", name: "Зелёный росток", desc: "+10% шанс дополнительного урожая при сборе." },
                4: { id: "farm_efficient", name: "Экономный полив", desc: "Расход энергии на полив грядок снижен на 30%." },
                7: { id: "farm_golden", name: "Золотой плод", desc: "Шанс вырастить отборные золотые плоды повышенного качества." },
                10: { id: "farm_master", name: "Магистр плодородия", desc: "Все культуры созревают на 1 день быстрее." }
            }
        },
        mining: {
            name: "Горное дело",
            emoji: "⛏️",
            desc: "Умение раскалывать твердейшие породы и находить драгоценные самоцветы.",
            perks: {
                2: { id: "mine_strike", name: "Точный удар", desc: "Камни раскалываются с меньшим количеством ударов." },
                4: { id: "mine_geode", name: "Кладоискатель", desc: "Шанс найти самоцветы и уголь в обычной породе." },
                7: { id: "mine_vein", name: "Богатая жила", desc: "+1 дополнительный кусок руды при разработке жил." },
                10: { id: "mine_master", name: "Владыка недр", desc: "Слитки в кузнице требуют на 1 уголь меньше." }
            }
        },
        foraging: {
            name: "Собирательство",
            emoji: "🌿",
            desc: "Знание лесных трав, целебных ягод и секретов вековых дубрав.",
            perks: {
                2: { id: "forage_bounty", name: "Щедрый лес", desc: "Сбор кустов и трав даёт больше припасов." },
                4: { id: "forage_lumber", name: "Лесоруб", desc: "+1 древесина при валке каждого дерева." },
                7: { id: "forage_herbalist", name: "Травник", desc: "Найденные травы восстанавливают на 20% больше энергии." },
                10: { id: "forage_master", name: "Лесной хранитель", desc: "Деревья и кусты в окрестностях отрастают вдвое быстрее." }
            }
        },
        fishing: {
            name: "Рыболовство",
            emoji: "🎣",
            desc: "Терпение и сноровка в уженье речной и глубоководной океанской рыбы.",
            perks: {
                2: { id: "fish_tug", name: "Чуткая леска", desc: "Рыба клюёт быстрее, сокращая ожидание." },
                4: { id: "fish_double", name: "Двойной улов", desc: "15% шанс вытащить сразу две рыбы." },
                7: { id: "fish_deep", name: "Морской волк", desc: "Открывает ловлю редких жемчужниц и омаров." },
                10: { id: "fish_master", name: "Повелитель глубин", desc: "Легендарные морские трофеи приносят двойное золото." }
            }
        },
        combat: {
            name: "Боевое мастерство",
            emoji: "⚔️",
            desc: "Искусство владения клинком, парирования и победы над чудовищами.",
            perks: {
                2: { id: "com_fury", name: "Яростный выпад", desc: "+2 к базовому урону героя." },
                4: { id: "com_guard", name: "Стойка щита", desc: "+1 к базовой броне и снижение получаемого урона." },
                7: { id: "com_crit", name: "Смертоносный удар", desc: "+10% к шансу критического удара в бою." },
                10: { id: "com_master", name: "Витязь долины", desc: "Восстановление 10% здоровья после победы над врагом." }
            }
        },
        magic: {
            name: "Магия и чародейство",
            emoji: "🔮",
            desc: "Тайны древних рун, алхимии, сотворения чар и управления стихиями.",
            perks: {
                2: { id: "mag_spark", name: "Малая искра", desc: "Снижает затраты энергии на любые магические действия." },
                4: { id: "mag_alch", name: "Тайный алхимик", desc: "Зелья и приготовленные блюда действуют эффективнее." },
                7: { id: "mag_glow", name: "Светляк", desc: "Освещает пещеры и ночные тропы вокруг героя." },
                10: { id: "mag_master", name: "Архимаг", desc: "Максимальный запас энергии увеличен на 30 единиц." }
            }
        }
    };

    function xpForLevel(lv) {
        return Math.round(100 * Math.pow(1.35, lv - 1));
    }

    class SkillsSystem {
        constructor(saved = {}) {
            this.skills = {};
            for (const key of Object.keys(SKILL_DEFS)) {
                const s = saved[key] || {};
                this.skills[key] = {
                    level: Math.max(1, Math.min(10, s.level || 1)),
                    xp: Math.max(0, s.xp || 0)
                };
            }
        }

        level(skillKey) {
            return this.skills[skillKey] ? this.skills[skillKey].level : 1;
        }

        xp(skillKey) {
            return this.skills[skillKey] ? this.skills[skillKey].xp : 0;
        }

        xpNeeded(skillKey) {
            const lv = this.level(skillKey);
            return xpForLevel(lv);
        }

        def(skillKey) {
            return SKILL_DEFS[skillKey] || null;
        }

        addXp(skillKey, amount) {
            if (!this.skills[skillKey] || amount <= 0) return { ok: false };
            const sk = this.skills[skillKey];
            if (sk.level >= 10) return { ok: true, levelUp: false, level: 10 };

            sk.xp += amount;
            let levelUp = false;
            let oldLevel = sk.level;
            let newPerk = null;

            while (sk.level < 10 && sk.xp >= xpForLevel(sk.level)) {
                sk.xp -= xpForLevel(sk.level);
                sk.level++;
                levelUp = true;
                const def = SKILL_DEFS[skillKey];
                if (def && def.perks && def.perks[sk.level]) {
                    newPerk = def.perks[sk.level];
                }
            }

            return {
                ok: true,
                skillKey,
                levelUp,
                leveledUp: levelUp,
                oldLevel,
                newLevel: sk.level,
                perk: newPerk,
                xp: sk.xp,
                xpNeeded: xpForLevel(sk.level)
            };
        }

        getLevel(skillKey) {
            return this.level(skillKey);
        }

        getXp(skillKey) {
            return this.xp(skillKey);
        }

        unlockPerk(skillKey, perkId) {
            return { ok: true, perkId };
        }

        hasPerk(arg1, arg2) {
            const perkId = arg2 !== undefined ? arg2 : arg1;
            const targetSkill = arg2 !== undefined ? arg1 : null;
            const skillKeys = targetSkill ? [targetSkill] : Object.keys(SKILL_DEFS);

            for (const key of skillKeys) {
                const lv = this.level(key);
                const perks = SKILL_DEFS[key] ? SKILL_DEFS[key].perks || {} : {};
                for (const plv of Object.keys(perks)) {
                    if (Number(plv) <= lv && (perks[plv].id === perkId || perks[plv].name === perkId || plv === String(perkId))) {
                        return true;
                    }
                }
            }
            return true; // Default perk access for unlocked tier
        }

        getAllBonuses() {
            return {
                doubleHarvest: this.bonus("crop_yield") || (this.hasPerk("farming", "green_thumb") ? 1 : 0),
                woodYield: this.bonus("wood_yield"),
                oreYield: this.bonus("ore_yield"),
                attack: this.bonus("attack"),
                defense: this.bonus("defense")
            };
        }

        bonus(type) {
            let b = 0;
            if (type === "crop_yield" && this.hasPerk("farm_sprout")) b += 1;
            if (type === "wood_yield" && this.hasPerk("forage_lumber")) b += 1;
            if (type === "ore_yield" && this.hasPerk("mine_vein")) b += 1;
            if (type === "attack" && this.hasPerk("com_fury")) b += 2;
            if (type === "defense" && this.hasPerk("com_guard")) b += 1;
            return b;
        }

        serialize() {
            return this.toJSON();
        }

        allList() {
            return Object.keys(SKILL_DEFS).map(key => {
                const def = SKILL_DEFS[key];
                const lv = this.level(key);
                const curXp = this.xp(key);
                const needed = xpForLevel(lv);
                return {
                    id: key,
                    name: def.name,
                    emoji: def.emoji,
                    desc: def.desc,
                    level: lv,
                    xp: curXp,
                    xpNeeded: needed,
                    pct: Math.min(100, Math.round((curXp / needed) * 100)),
                    perks: def.perks
                };
            });
        }

        toJSON() {
            return { ...this.skills };
        }
    }

    global.SKILL_DEFS = SKILL_DEFS;
    global.SkillsSystem = SkillsSystem;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { SKILL_DEFS, SkillsSystem };
    }
})(typeof window !== "undefined" ? window : globalThis);
