/**
 * v2 world — Homestead Progression & Community Development System.
 * 
 * Manages:
 * 1. Player house expansions (Tier 1 Cabin -> Tier 2 Homestead -> Tier 3 Manor)
 * 2. Farm plot yard expansion (from 6 plots up to 24 plots)
 * 3. Town Community Restoration Projects (Bridge, Lanterns, Mill, Greenhouse)
 * 
 * Pure logic, unit-testable without DOM.
 */
(function (global) {
    "use strict";

    const HOUSE_TIERS = [
        {
            tier: 1,
            name: "Уютная лесная избушка",
            desc: "Небольшой деревянный дом со спальным местом, очагом и сундуком.",
            chestSlots: 10,
            maxFarmPlots: 8
        },
        {
            tier: 2,
            name: "Деревенская усадьба",
            desc: "Просторный дом с погребом для припасов, улучшенной кухней и расширенным двором.",
            cost: { gold: 350, wood: 40, stone: 25 },
            chestSlots: 20,
            maxFarmPlots: 16
        },
        {
            tier: 3,
            name: "Боярские хоромы",
            desc: "Величественный двухэтажный особняк с зимней оранжереей и каминным залом.",
            cost: { gold: 900, wood: 100, stone: 60, bar_copper: 5 },
            chestSlots: 35,
            maxFarmPlots: 24
        }
    ];

    const COMMUNITY_PROJECTS = {
        bridge: {
            id: "bridge",
            name: "Ремонт старого деревянного моста",
            emoji: "🌉",
            desc: "Восстановление разрушенной переправы через реку к горным пасекам и тайным пещерам.",
            cost: { gold: 200, wood: 30, stone: 15 },
            rewardText: "Открывает удобный короткий путь на север долины."
        },
        bridge_fix: {
            id: "bridge_fix",
            name: "Ремонт старого деревянного моста",
            emoji: "🌉",
            desc: "Восстановление разрушенной переправы через реку к горным пасекам и тайным пещерам.",
            cost: { gold: 200, wood: 30, stone: 15 },
            rewardText: "Открывает удобный короткий путь на север долины."
        },
        lanterns: {
            id: "lanterns",
            name: "Уличное освещение деревенских улиц",
            emoji: "🏮",
            desc: "Установка кованых фонарей вдоль всех главных дорожек деревни.",
            cost: { gold: 150, stone: 15, bar_copper: 3 },
            rewardText: "Деревенские тропинки ярко освещаются в сумерках и ночью."
        },
        windmill: {
            id: "windmill",
            name: "Восстановление деревенской мельницы",
            emoji: "🌾",
            desc: "Ремонт мельничных жерновов для помола собранной пшеницы в тонкую муку.",
            cost: { gold: 400, wood: 60, stone: 30 },
            rewardText: "Позволяет молоть пшеницу в муку для выпечки пирогов и хлеба."
        },
        greenhouse: {
            id: "greenhouse",
            name: "Общинная зимняя теплица",
            emoji: "🏡",
            desc: "Строительство застеклённой оранжереи для круглогодичного выращивания любых культур.",
            cost: { gold: 750, wood: 80, stone: 50, bar_iron: 4 },
            rewardText: "Даёт возможность выращивать любые сезонные культуры даже зимой."
        }
    };

    class HomesteadSystem {
        constructor(saved = {}) {
            this.houseTier = Math.max(1, Math.min(3, saved.houseTier || 1));
            this.projects = saved.projects || {};
            this.unlockedPlots = Math.max(6, saved.unlockedPlots || 8);
        }

        get tier() {
            return this.houseTier;
        }

        get maxGardenPlots() {
            return this.getHouseTier().maxFarmPlots;
        }

        getHouseTier() {
            return HOUSE_TIERS[this.houseTier - 1] || HOUSE_TIERS[0];
        }

        getNextHouseTier() {
            if (this.houseTier >= HOUSE_TIERS.length) return null;
            return HOUSE_TIERS[this.houseTier];
        }

        canUpgradeHouse(arg1, arg2) {
            const hero = (arg1 && typeof arg1.gold === "number") ? arg1 : (typeof arg2 === "function" ? { gold: 999999 } : arg2);
            const resources = (arg1 && typeof arg1.count === "function") ? arg1 : arg2;
            const next = this.getNextHouseTier();
            if (!next) return { ok: false, reason: "Дом улучшен до максимального уровня." };
            const cost = next.cost || {};

            if (hero && typeof hero.gold === "number" && hero.gold < (cost.gold || 0)) {
                return { ok: false, reason: `Не хватает золота (нужно ${cost.gold}💰).` };
            }
            if (cost.wood && (!resources || resources.count("wood") < cost.wood)) {
                return { ok: false, reason: `Не хватает древесины (нужно ${cost.wood}🪵).` };
            }
            if (cost.stone && (!resources || resources.count("stone") < cost.stone)) {
                return { ok: false, reason: `Не хватает камня (нужно ${cost.stone}🪨).` };
            }
            if (cost.bar_copper && (!resources || resources.count("bar_copper") < cost.bar_copper)) {
                return { ok: false, reason: `Не хватает медных слитков (нужно ${cost.bar_copper}🧱).` };
            }
            return { ok: true, cost, nextTier: next };
        }

        upgradeHouse(arg1, arg2) {
            const check = this.canUpgradeHouse(arg1, arg2);
            if (!check.ok) return { ok: false, msg: check.reason };

            const cost = check.cost;
            const hero = (arg1 && typeof arg1.gold === "number") ? arg1 : (typeof arg2 === "function" ? null : arg2);
            const resources = (arg1 && typeof arg1.count === "function") ? arg1 : arg2;
            const goldCb = typeof arg2 === "function" ? arg2 : null;

            if (hero && typeof hero.gold === "number" && cost.gold) hero.gold -= cost.gold;
            if (goldCb && cost.gold) goldCb(cost.gold);
            if (resources && cost.wood) resources.remove("wood", cost.wood);
            if (resources && cost.stone) resources.remove("stone", cost.stone);
            if (resources && cost.bar_copper) resources.remove("bar_copper", cost.bar_copper);

            this.houseTier++;
            const newTier = this.getHouseTier();
            this.unlockedPlots = Math.max(this.unlockedPlots, newTier.maxFarmPlots);
            return { ok: true, tier: this.houseTier, name: newTier.name };
        }

        isProjectCompleted(projectId) {
            return Boolean(this.projects[projectId]);
        }

        canBuildProject(projectId, arg1, arg2) {
            if (this.isProjectCompleted(projectId)) {
                return { ok: false, reason: "Проект уже построен." };
            }
            const p = COMMUNITY_PROJECTS[projectId];
            if (!p) return { ok: false, reason: "Неизвестный проект." };

            const hero = (arg1 && typeof arg1.gold === "number") ? arg1 : (typeof arg2 === "function" ? { gold: 999999 } : arg2);
            const resources = (arg1 && typeof arg1.count === "function") ? arg1 : arg2;
            const cost = p.cost || {};

            if (hero && typeof hero.gold === "number" && hero.gold < (cost.gold || 0)) {
                return { ok: false, reason: `Не хватает золота (нужно ${cost.gold}💰).` };
            }
            if (cost.wood && (!resources || resources.count("wood") < cost.wood)) {
                return { ok: false, reason: `Не хватает древесины (нужно ${cost.wood}🪵).` };
            }
            if (cost.stone && (!resources || resources.count("stone") < cost.stone)) {
                return { ok: false, reason: `Не хватает камня (нужно ${cost.stone}🪨).` };
            }
            if (cost.bar_copper && (!resources || resources.count("bar_copper") < cost.bar_copper)) {
                return { ok: false, reason: `Не хватает медных слитков (нужно ${cost.bar_copper}🧱).` };
            }
            if (cost.bar_iron && (!resources || resources.count("bar_iron") < cost.bar_iron)) {
                return { ok: false, reason: `Не хватает железных слитков (нужно ${cost.bar_iron}🧱).` };
            }
            return { ok: true, cost, project: p };
        }

        buildProject(projectId, arg1, arg2) {
            const check = this.canBuildProject(projectId, arg1, arg2);
            if (!check.ok) return { ok: false, msg: check.reason };

            const cost = check.cost;
            const hero = (arg1 && typeof arg1.gold === "number") ? arg1 : (typeof arg2 === "function" ? null : arg2);
            const resources = (arg1 && typeof arg1.count === "function") ? arg1 : arg2;
            const goldCb = typeof arg2 === "function" ? arg2 : null;

            if (hero && typeof hero.gold === "number" && cost.gold) hero.gold -= cost.gold;
            if (goldCb && cost.gold) goldCb(cost.gold);
            if (resources && cost.wood) resources.remove("wood", cost.wood);
            if (resources && cost.stone) resources.remove("stone", cost.stone);
            if (resources && cost.bar_copper) resources.remove("bar_copper", cost.bar_copper);
            if (resources && cost.bar_iron) resources.remove("bar_iron", cost.bar_iron);

            this.projects[projectId] = { completedAt: Date.now() };
            return { ok: true, project: check.project };
        }

        contributeProject(projectId, arg1, arg2) {
            return this.buildProject(projectId, arg1, arg2);
        }

        listProjects() {
            return Object.keys(COMMUNITY_PROJECTS).map(id => {
                const def = COMMUNITY_PROJECTS[id];
                return {
                    id,
                    name: def.name,
                    emoji: def.emoji,
                    desc: def.desc,
                    cost: def.cost,
                    rewardText: def.rewardText,
                    completed: this.isProjectCompleted(id)
                };
            });
        }

        toJSON() {
            return {
                houseTier: this.houseTier,
                projects: { ...this.projects },
                unlockedPlots: this.unlockedPlots
            };
        }
    }

    global.HOUSE_TIERS = HOUSE_TIERS;
    global.COMMUNITY_PROJECTS = COMMUNITY_PROJECTS;
    global.HomesteadSystem = HomesteadSystem;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { HOUSE_TIERS, COMMUNITY_PROJECTS, HomesteadSystem };
    }
})(typeof window !== "undefined" ? window : globalThis);
