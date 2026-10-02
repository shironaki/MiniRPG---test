/**
 * v2 world — Character Customization, Life Origins & Multiplayer Data Contract.
 * 
 * Provides:
 * 1. Character Identity & Palette Customization (Name, Gender, Hair, Outfit, Skin)
 * 2. 5 Distinct Life Origins / Starting Callings (Farmer, Warrior, Mage, Smith, Wanderer)
 * 3. Serializable Action/State Packets for Co-op / Multiplayer readiness
 * 
 * Pure logic, unit-testable without DOM.
 */
(function (global) {
    "use strict";

    const ORIGINS = {
        farmer: {
            id: "farmer",
            name: "Земледелец",
            emoji: "🌾",
            desc: "Дитя плодородных лугов. Знает толк в земледелии, заботе о ростках и сезонных всходах.",
            bonuses: { energy: 20, health: 0, speed: 0 },
            starterTools: ["hoe", "can", "axe"],
            starterItems: [
                { id: "seeds", count: 8 },
                { id: "wheat", count: 4 }
            ],
            bonusText: "+20 Энергии, стартовая мотыга, лейка, топор и запас семян."
        },
        warrior: {
            id: "warrior",
            name: "Странствующий Воин",
            emoji: "⚔️",
            desc: "Закалённый в битвах мечник. Сильный духом, стойкий в бою и готовый защищать долину.",
            bonuses: { energy: 0, health: 25, speed: 0 },
            starterTools: ["axe", "pickaxe"],
            starterItems: [
                { id: "potion", count: 2 },
                { id: "wood", count: 10 }
            ],
            bonusText: "+25 Здоровья, стартовый меч, топор, кирка и лечебные эликсиры."
        },
        mage: {
            id: "mage",
            name: "Ученик Чародея",
            emoji: "🔮",
            desc: "Искатель тайных знаний. Слышит шёпот древних камней и постигает алхимию стихий.",
            bonuses: { energy: 30, health: 0, speed: 0 },
            starterTools: ["rod", "can"],
            starterItems: [
                { id: "herb", count: 6 },
                { id: "dish_tea", count: 2 }
            ],
            bonusText: "+30 Маны/Энергии, стартовая удочка, лейка и запас целебного чая."
        },
        smith: {
            id: "smith",
            name: "Подмастерье Кузнеца",
            emoji: "🔨",
            desc: "Мастер молота и наковальни. Не боится жара горна и видит рудную жилу сквозь скалу.",
            bonuses: { energy: 10, health: 10, speed: 0 },
            starterTools: ["pickaxe", "axe"],
            starterItems: [
                { id: "ore_copper", count: 6 },
                { id: "coal", count: 3 }
            ],
            bonusText: "Медная кирка, топор, запас медной руды и каменного угля."
        },
        wanderer: {
            id: "wanderer",
            name: "Вольный Путник",
            emoji: "🧭",
            desc: "Свободный исследователь без предвзятого пути. Быстр на шаг и готов к любым открытиям.",
            bonuses: { energy: 10, health: 10, speed: 15 },
            starterTools: ["axe", "pickaxe", "hoe", "can", "rod"],
            starterItems: [
                { id: "seeds", count: 4 },
                { id: "apple", count: 3 }
            ],
            bonusText: "+15% к скорости бега, полный базовый набор всех 5 инструментов."
        }
    };

    const HAIR_STYLES = [
        { id: "short", name: "Короткая стрижка" },
        { id: "braids", name: "Плетёные косы" },
        { id: "long", name: "Длинные локоны" },
        { id: "warrior", name: "Стрижка витязя" }
    ];

    const HAIR_COLORS = [
        { id: "#4a321e", name: "Каштановый" },
        { id: "#d4883a", name: "Рыжий" },
        { id: "#ffd572", name: "Пшеничный блонд" },
        { id: "#1e1e24", name: "Смоляной чёрный" },
        { id: "#b84232", name: "Медно-красный" },
        { id: "#d4d4d4", name: "Пепельно-седой" }
    ];

    const SHIRT_COLORS = [
        { id: "#3a6080", name: "Васильковая туника" },
        { id: "#8b3a3a", name: "Бордовый кафтан" },
        { id: "#2d6a4f", name: "Лесной изумрудный" },
        { id: "#6a3a8a", name: "Сумеречный фиолетовый" },
        { id: "#b48c36", name: "Янтарный золотой" },
        { id: "#403d39", name: "Простой льняной" }
    ];

    const PANTS_COLORS = [
        { id: "#284560", name: "Тёмно-синие штаны" },
        { id: "#423d38", name: "Кожаные тёмные" },
        { id: "#5c4033", name: "Коричневые суконные" },
        { id: "#1e293b", name: "Сланцево-чёрные" }
    ];

    const SKIN_TONES = [
        { id: "#ffdcb4", name: "Светлая кожа" },
        { id: "#f0caa0", name: "Естественный тон" },
        { id: "#e0b080", name: "Тёплый загар" },
        { id: "#a87850", name: "Смуглый южный" }
    ];

    class CharacterProfile {
        constructor(init = {}) {
            this.name = String(init.name || "Любомир").trim().slice(0, 16) || "Любомир";
            this.gender = init.gender || "male";
            this.origin = ORIGINS[init.origin] ? init.origin : "wanderer";
            this.hairStyle = init.hairStyle || "short";
            this.hairColor = init.hairColor || "#4a321e";
            this.skinTone = init.skinTone || "#ffdcb4";
            this.shirtColor = init.shirtColor || "#3a6080";
            this.pantsColor = init.pantsColor || "#284560";
        }

        get originDef() {
            return ORIGINS[this.origin] || ORIGINS.wanderer;
        }

        applyToPlayer(player, tools, resources) {
            if (!player) return;
            player.name = this.name;
            const od = this.originDef;

            // Apply stat bonuses
            if (od.bonuses.health) {
                player.maxHealth = (player.maxHealth || 100) + od.bonuses.health;
                player.health = player.maxHealth;
            }
            if (od.bonuses.energy) {
                player.maxEnergy = (player.maxEnergy || 100) + od.bonuses.energy;
                player.energy = player.maxEnergy;
            }

            // Apply starting tools
            if (tools && od.starterTools) {
                for (const t of od.starterTools) {
                    if (tools.levels) tools.levels[t] = Math.max(1, tools.levels[t] || 1);
                }
            }

            // Apply starting bag resources
            if (resources && od.starterItems) {
                for (const it of od.starterItems) {
                    resources.add(it.id, it.count);
                }
            }
        }

        getLook() {
            return {
                shirt: this.shirtColor,
                shirtSh: "#1e293b",
                pants: this.pantsColor,
                pantsSh: "#111827",
                hair: this.hairColor,
                hairSh: "#261a10",
                skin: this.skinTone,
                skinSh: "#d4a373"
            };
        }

        toJSON() {
            return {
                name: this.name,
                gender: this.gender,
                origin: this.origin,
                hairStyle: this.hairStyle,
                hairColor: this.hairColor,
                skinTone: this.skinTone,
                shirtColor: this.shirtColor,
                pantsColor: this.pantsColor
            };
        }
    }

    // ---- Multiplayer / Co-op Packet Serialization Helpers ----
    const WorldSyncPacket = {
        MOVE: "MOVE",
        USE_TOOL: "USE_TOOL",
        INTERACT: "INTERACT",
        CHAT: "CHAT",
        TRADE: "TRADE",
        STATE: "STATE",

        createMove(playerId, x, y, facing, moving) {
            return { type: this.MOVE, id: playerId, x, y, facing, moving, t: Date.now() };
        },

        createStatePacket(data = {}) {
            return { type: this.STATE, ...data, t: Date.now() };
        },

        createTool(playerId, toolKey, targetCol, targetRow) {
            return { type: this.USE_TOOL, id: playerId, tool: toolKey, col: targetCol, row: targetRow, t: Date.now() };
        },

        createChat(playerId, text) {
            return { type: this.CHAT, id: playerId, text: String(text).slice(0, 140), t: Date.now() };
        },

        serialize(packet) {
            return JSON.stringify(packet);
        },

        deserialize(jsonStr) {
            try {
                const data = JSON.parse(jsonStr);
                return { valid: true, data };
            } catch (e) {
                return { valid: false, error: e.message };
            }
        }
    };

    const CharCreation = {
        ORIGINS,
        HAIR_STYLES,
        HAIR_COLORS,
        SHIRT_COLORS,
        PANTS_COLORS,
        SKIN_TONES,
        CharacterProfile,
        WorldSyncPacket,
        createProfile(opts) {
            return new CharacterProfile(opts);
        },
        applyOrigin(profile, hero, bag) {
            if (profile && typeof profile.applyToPlayer === "function") {
                profile.applyToPlayer(hero, null, bag);
            }
        }
    };

    global.ORIGINS = ORIGINS;
    global.CharCreation = CharCreation;
    global.CharacterProfile = CharacterProfile;
    global.WorldSyncPacket = WorldSyncPacket;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { ORIGINS, CharCreation, CharacterProfile, WorldSyncPacket };
    }
})(typeof window !== "undefined" ? window : globalThis);
