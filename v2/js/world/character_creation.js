/**
 * v2 world — Character Customization, Emergent Destiny Paths & Multiplayer Data Contract.
 * 
 * Inspired by Albion Online's Destiny Board and Stardew Valley:
 * 1. Players begin without pre-selected classes as a humble "Новичок долины" (Valley Novice).
 * 2. Classes and Archetypes are emergent, discovered naturally through what the player does
 *    (farming, mining, foraging, fishing, combat, magic, crafting).
 * 3. Character Customization (Name, Pronoun/Gender, Hairstyle, Palette, Outfits).
 * 4. Serializable Action/State Packets for Co-op / Multiplayer readiness.
 * 
 * Pure logic, unit-testable without DOM.
 */
(function (global) {
    "use strict";

    // Emergent Destiny Classes (Unlocked naturally through gameplay masteries)
    const DESTINY_CLASSES = {
        novice: {
            id: "novice",
            name: "Новичок долины",
            emoji: "🌱",
            desc: "Первые шаги в долине. Путь открыт во всех направлениях.",
            reqs: {},
            title: "Новичок",
            bonusText: "Сбалансированные начальные силы."
        },
        farmer: {
            id: "farmer",
            name: "Земледелец",
            emoji: "🌾",
            desc: "Мастер вспашки, ухода за ростками и сбора щедрых урожаев.",
            reqs: { farming: 3 },
            title: "Агроном",
            bonusText: "+1 к сбору урожая, ускоренный рост культур."
        },
        miner: {
            id: "miner",
            name: "Рудознатец",
            emoji: "⛏️",
            desc: "Знаток недр, способный отыскать богатейшие рудные жилы и самоцветы.",
            reqs: { mining: 3 },
            title: "Геолог",
            bonusText: "Шанс добычи двойной руды и редких самоцветов."
        },
        forager: {
            id: "forager",
            name: "Следопыт",
            emoji: "🌲",
            desc: "Хозяин лесных троп, искусный дровосек и знаток целебных трав.",
            reqs: { foraging: 3 },
            title: "Лесничий",
            bonusText: "+1 к выходу древесины, частые находки диких ягод."
        },
        fisher: {
            id: "fisher",
            name: "Мореход",
            emoji: "🎣",
            desc: "Повелитель рек и океанских глубин. Чувствует любую поклёвку.",
            reqs: { fishing: 3 },
            title: "Мастер глубин",
            bonusText: "Быстрая подсечка, шанс выловить сундук сокровищ."
        },
        warrior: {
            id: "warrior",
            name: "Ратник",
            emoji: "⚔️",
            desc: "Закалённый боец, мастер клинка и несокрушимый защитник жителей.",
            reqs: { combat: 3 },
            title: "Берсерк",
            bonusText: "+2 к атаке в бою, устойчивость к урону."
        },
        mage: {
            id: "mage",
            name: "Чародей",
            emoji: "🔮",
            desc: "Искатель тайных знаний, мастер стихийных эликсиров и алхимии.",
            reqs: { magic: 3 },
            title: "Алхимик",
            bonusText: "+25 к запасу маны/энергии, усиление зелий."
        },
        smith: {
            id: "smith",
            name: "Кузнечный мастер",
            emoji: "🔨",
            desc: "Великий ремесленник, соединяющий мощь горна и силу металла.",
            reqs: { mining: 4, foraging: 3 },
            title: "Кузнец-творец",
            bonusText: "Сниженная стоимость ковки, улучшенная прочность."
        },
        druid: {
            id: "druid",
            name: "Друид долины",
            emoji: "🌿",
            desc: "Хранитель гармонии природы, повелевающий погодой и цветением.",
            reqs: { farming: 4, magic: 3 },
            title: "Друид",
            bonusText: "Аура ускорения роста всех растений вокруг усадьбы."
        },
        paladin: {
            id: "paladin",
            name: "Паладин Света",
            emoji: "🛡️",
            desc: "Рыцарь, соединяющий воинское искусство и святую магию исцеления.",
            reqs: { combat: 4, magic: 3 },
            title: "Паладин",
            bonusText: "Регенерация здоровья в бою и святой щит."
        },
        ruler: {
            id: "ruler",
            name: "Владыка долины",
            emoji: "👑",
            desc: "Мудрый правитель и созидатель, возродивший все земли долины.",
            reqs: { farming: 5, mining: 5, foraging: 5, fishing: 5, combat: 5, magic: 5 },
            title: "Царь долины",
            bonusText: "Абсолютное почтение всех жителей, удвоенный доход."
        }
    };

    // Backward-compatible origin aliases
    const ORIGINS = {
        farmer: DESTINY_CLASSES.farmer,
        warrior: DESTINY_CLASSES.warrior,
        mage: DESTINY_CLASSES.mage,
        smith: DESTINY_CLASSES.smith,
        wanderer: DESTINY_CLASSES.novice,
        novice: DESTINY_CLASSES.novice
    };

    const HAIR_STYLES = [
        { id: "short", name: "Короткая" },
        { id: "crop", name: "Под горшок" },
        { id: "long", name: "Длинные косы" },
        { id: "curly", name: "Кудри" },
        { id: "braid", name: "Славянская коса" }
    ];

    const HAIR_COLORS = [
        { id: "brown", color: "#5c3317", name: "Каштановый" },
        { id: "blonde", color: "#e8c374", name: "Пшеничный" },
        { id: "dark", color: "#221c16", name: "Тёмный" },
        { id: "ginger", color: "#c85a2b", name: "Рыжий" },
        { id: "silver", color: "#dcdfe6", name: "Седой" }
    ];

    const SHIRT_COLORS = [
        { id: "blue", color: "#2e5c8a", name: "Васильковая" },
        { id: "red", color: "#a83232", name: "Кумачовая" },
        { id: "green", color: "#3a7d44", name: "Изумрудная" },
        { id: "linen", color: "#e3dac9", name: "Льняная" },
        { id: "purple", color: "#6a3b7b", name: "Пурпурная" }
    ];

    const PANTS_COLORS = [
        { id: "navy", color: "#2c3e50", name: "Тёмно-синие" },
        { id: "brown", color: "#5d4037", name: "Коричневые" },
        { id: "charcoal", color: "#37474f", name: "Серые" },
        { id: "earth", color: "#4e3629", name: "Суконные" }
    ];

    const SKIN_TONES = [
        { id: "fair", color: "#ffdcb4", name: "Светлый" },
        { id: "warm", color: "#f2c69d", name: "Тёплый" },
        { id: "tan", color: "#d8a070", name: "Загорелый" },
        { id: "deep", color: "#a56840", name: "Смуглый" }
    ];

    class CharacterProfile {
        constructor(init = {}) {
            this.name = String(init.name || "Любомир").trim().slice(0, 16) || "Любомир";
            this.gender = init.gender || "masculine";
            this.origin = init.origin || "novice";
            this.hairStyle = init.hairStyle || "short";
            this.hairColor = init.hairColor || "#5c3317";
            this.skinTone = init.skinTone || "#ffdcb4";
            this.shirtColor = init.shirtColor || "#2e5c8a";
            this.pantsColor = init.pantsColor || "#2c3e50";
        }

        get originDef() {
            return DESTINY_CLASSES[this.origin] || DESTINY_CLASSES.novice;
        }

        getActiveTitle(skills) {
            if (!skills || typeof skills.getLevel !== "function") {
                return this.originDef.title || "Новичок";
            }
            // Check highest unlocked destiny class
            const unlocked = this.getUnlockedClasses(skills);
            return unlocked.length ? unlocked[unlocked.length - 1].title : "Новичок долины";
        }

        getUnlockedClasses(skills) {
            if (!skills) return [DESTINY_CLASSES.novice];
            const result = [];
            for (const key of Object.keys(DESTINY_CLASSES)) {
                const cls = DESTINY_CLASSES[key];
                let met = true;
                for (const sk of Object.keys(cls.reqs || {})) {
                    if (skills.getLevel(sk) < cls.reqs[sk]) {
                        met = false;
                        break;
                    }
                }
                if (met) result.push(cls);
            }
            return result.length ? result : [DESTINY_CLASSES.novice];
        }

        applyToPlayer(player, tools, resources) {
            if (!player) return;
            player.name = this.name;
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
        DESTINY_CLASSES,
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

    global.DESTINY_CLASSES = DESTINY_CLASSES;
    global.ORIGINS = ORIGINS;
    global.CharCreation = CharCreation;
    global.CharacterProfile = CharacterProfile;
    global.WorldSyncPacket = WorldSyncPacket;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { DESTINY_CLASSES, ORIGINS, CharCreation, CharacterProfile, WorldSyncPacket };
    }
})(typeof window !== "undefined" ? window : globalThis);
