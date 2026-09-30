/**
 * Central content database (data-driven core).
 *
 * All static game content — enemy stat lines, item definitions, per-zone
 * theming and the sprite/asset manifest — lives here so that balancing and
 * art can change without touching game logic. Loaded before every other
 * script, so `GAME_DATA` is a global available everywhere.
 *
 * Sprite paths are resolved lazily by the renderer; a missing file simply
 * falls back to the emoji, so the manifest can grow one asset at a time.
 */
const GAME_DATA = {

    // ---- Enemies (base stats at level 1; scaling applied in createEnemy).
    // `inflict`/`inflictChance` let a foe apply a status effect on a hit. ----
    enemies: {
        goblin:       { name: "Гоблин",          health: 52,  attack: 11, defense: 3,  experience: 32,  gold: 28,  emoji: "👹", element: "physical" },
        wolf:         { name: "Волк",            health: 68,  attack: 14, defense: 4,  experience: 44,  gold: 38,  emoji: "🐺", element: "nature",   inflict: "poison", inflictChance: 0.30 },
        skeleton:     { name: "Скелет",          health: 84,  attack: 17, defense: 6,  experience: 60,  gold: 50,  emoji: "💀", element: "physical" },
        tideWraith:   { name: "Дух прилива",     health: 120, attack: 19, defense: 7,  experience: 110, gold: 80,  emoji: "🌊", element: "water",    inflict: "poison", inflictChance: 0.40 },
        flameWarden:  { name: "Страж пламени",   health: 130, attack: 21, defense: 8,  experience: 125, gold: 90,  emoji: "🔥", element: "fire",     inflict: "burn", inflictChance: 0.45 },
        boneColossus: { name: "Костяной колосс", health: 145, attack: 22, defense: 9,  experience: 140, gold: 100, emoji: "☠️", element: "physical", inflict: "burn", inflictChance: 0.35 },
        boss:         { name: "Страж сокровища", health: 190, attack: 24, defense: 10, experience: 220, gold: 250, emoji: "👑", element: "arcane",   inflict: "burn", inflictChance: 0.30 }
    },

    // ---- Status effects. `damage` is per-turn (bypasses defense); stun skips
    // the target's turn. Duration is set when the effect is applied. ----
    statuses: {
        poison: { name: "Яд",         emoji: "🟢", damage: 6 },
        burn:   { name: "Горение",    emoji: "🔥", damage: 9 },
        stun:   { name: "Оглушение",  emoji: "💫" },
        chill:  { name: "Холод",      emoji: "❄️", damage: 4, slow: true }
    },

    // ---- Elemental affinities. `elementChart[A] === B` means A is strong
    // against B (×1.5 damage); the reverse is resisted (×0.6). physical and
    // arcane sit outside the fire/water/nature triangle. ----
    elements: {
        physical: { name: "Физический", emoji: "⚔️" },
        fire:     { name: "Огонь",      emoji: "🔥" },
        water:    { name: "Вода",       emoji: "🌊" },
        nature:   { name: "Природа",    emoji: "🌿" },
        arcane:   { name: "Магия",      emoji: "🔮" }
    },
    elementChart: { fire: "nature", nature: "water", water: "fire", arcane: "physical" },

    // ---- Active skills, unlocked by level, costing energy (⚡). ----
    skills: {
        powerStrike: { name: "Мощный удар",       emoji: "💥", cost: 12, level: 1, type: "attack", element: "physical", mult: 1.8, desc: "Сильный физический удар (×1.8 урона)." },
        secondWind:  { name: "Второе дыхание",    emoji: "💚", cost: 16, level: 2, type: "heal",   heal: 30,  desc: "Восстановить 30 HP." },
        poisonStab:  { name: "Ядовитый клинок",   emoji: "🗡️", cost: 14, level: 2, type: "attack", element: "nature",  mult: 0.8, status: "poison", duration: 3, desc: "Урон природой + яд на 3 хода." },
        shieldBash:  { name: "Оглушающий удар",   emoji: "🌀", cost: 15, level: 3, type: "attack", element: "physical", mult: 1.0, status: "stun", duration: 1, chance: 0.6, desc: "Урон + шанс оглушить врага." },
        frostLance:  { name: "Ледяное копьё",     emoji: "❄️", cost: 16, level: 3, type: "attack", element: "water",   mult: 1.3, status: "chill", duration: 2, desc: "Урон водой + холод на 2 хода." },
        flameSlash:  { name: "Огненный разрез",   emoji: "🔥", cost: 18, level: 4, type: "attack", element: "fire",    mult: 1.2, status: "burn", duration: 3, desc: "Урон огнём + горение на 3 хода." },
        arcaneBolt:  { name: "Чародейский снаряд", emoji: "🔮", cost: 20, level: 5, type: "attack", element: "arcane",  mult: 1.5, desc: "Мощный магический снаряд (×1.5)." }
    },

    // ---- Items (shop stock and loot) ----
    items: {
        sword:  { name: "Железный меч",   type: "weapon", price: 80,  description: "Надёжное оружие ближнего боя.", attackBonus: 10, defenseBonus: 0,  healAmount: 0,  emoji: "⚔️" },
        bow:    { name: "Деревянный лук",  type: "weapon", price: 75,  description: "Лёгкое оружие для метких ударов.", attackBonus: 8, defenseBonus: 0,  healAmount: 0,  emoji: "🏹" },
        shield: { name: "Железный щит",   type: "shield", price: 60,  description: "Снижает урон от атак.", attackBonus: 0, defenseBonus: 7,  healAmount: 0,  emoji: "🛡️" },
        armor:  { name: "Кожаная броня",  type: "armor",  price: 120, description: "Прочная и лёгкая защита.", attackBonus: 0, defenseBonus: 10, healAmount: 0,  emoji: "🧥" },
        potion: { name: "Зелье здоровья", type: "potion", price: 20,  description: "Восстанавливает 35 HP.", attackBonus: 0, defenseBonus: 0,  healAmount: 35, emoji: "🧪" }
    },

    // ---- Branching side quests & companion personal quests.
    // `offer` gates WHO the quest is shown to (karma / ally role / affinity);
    // `objective` is what to do; `reward` is what you get. ----
    sideQuests: [
        {
            id: "cullWolves", giver: "Староста", title: "🐺 Волчья угроза",
            desc: "Волки донимают торговцев на тропах. Истреби троих.",
            offer: {},
            objective: { type: "kill", enemy: "Волк", count: 3 },
            reward: { gold: 120, xp: 70, karma: 5 }
        },
        {
            id: "mercyRun", giver: "Староста", title: "🕊️ Путь милосердия",
            desc: "Твоё доброе имя открыло особую просьбу: упокой 2 скелетов у святилища.",
            offer: { minKarma: 10 },
            objective: { type: "kill", enemy: "Скелет", count: 2 },
            reward: { gold: 90, xp: 60, karma: 10 }
        },
        {
            id: "darkBargain", giver: "Староста", title: "💀 Тёмная сделка",
            desc: "Тёмный путь ведёт к наживе: одолей 3 любых врага без лишних вопросов.",
            offer: { maxKarma: -10 },
            objective: { type: "kill", enemy: "any", count: 3 },
            reward: { gold: 220, xp: 50, karma: -5 }
        },
        {
            id: "gromOath", giver: "ally", allyRole: "warrior", title: "🛡️ Клятва Грома",
            desc: "Гром доверяет тебе достаточно, чтобы драться спина к спине. Победите 4 врага вместе.",
            offer: { requiresAllyRole: "warrior", minAffinity: 40 },
            objective: { type: "kill", enemy: "any", count: 4 },
            reward: { gold: 100, xp: 80, affinity: 25 }
        },
        {
            id: "liaHerbs", giver: "ally", allyRole: "healer", title: "🌿 Травы Лии",
            desc: "Лия ищет редкие компоненты в старых тайниках. Открой для неё 2 сундука.",
            offer: { requiresAllyRole: "healer", minAffinity: 40 },
            objective: { type: "chest", count: 2 },
            reward: { gold: 60, xp: 50, affinity: 25 }
        },
        {
            id: "kaiTrail", giver: "ally", allyRole: "scout", title: "🏹 Тропа Кая",
            desc: "Кай хочет проверить твою хватку в бою. Одержи 3 победы под его наблюдением.",
            offer: { requiresAllyRole: "scout", minAffinity: 40 },
            objective: { type: "kill", enemy: "any", count: 3 },
            reward: { gold: 80, xp: 70, affinity: 25 }
        }
    ],

    // ---- Crafting: essence materials drop from foes and fuel forge upgrades. ----
    materials: {
        essence: { name: "Эссенция ковки", type: "material", price: 0, emoji: "🔩", description: "Материал для улучшения снаряжения в кузнице." }
    },
    essenceDropChance: 0.28,

    // ---- Perks: passive upgrades bought with perk points earned on level-up.
    // `maxHealth`/`maxEnergy` apply instantly on purchase; `attack`/`defense`
    // fold into updateStats(); crit/gold are read by combat helpers. ----
    perks: [
        { id: "power",          name: "Сила",          emoji: "⚔️", maxRank: 5, attack: 3,     desc: "+3 к атаке за ранг." },
        { id: "guard",          name: "Стойкость",     emoji: "🛡️", maxRank: 5, defense: 2,    desc: "+2 к защите за ранг." },
        { id: "toughness",      name: "Живучесть",     emoji: "❤️", maxRank: 5, maxHealth: 15, desc: "+15 к макс. HP за ранг." },
        { id: "vigor",          name: "Энергичность",  emoji: "⚡", maxRank: 4, maxEnergy: 5,  desc: "+5 к макс. энергии за ранг." },
        { id: "criticalEye",    name: "Меткий глаз",   emoji: "🎯", maxRank: 3, crit: 0.05,    desc: "+5% к шансу крита за ранг." },
        { id: "treasureHunter", name: "Кладоискатель", emoji: "💰", maxRank: 3, gold: 0.15,    desc: "+15% золота с врагов за ранг." }
    ],

    // ---- Branching dialogue trees (see js/dialogue.js). Choices with an
    // `effect` change karma / gold / xp through the Game. `once` hides a choice
    // after it is picked so rewards can't be farmed. ----
    dialogues: {
        elder: {
            start: "root",
            nodes: {
                root: {
                    speaker: "🧑 Староста",
                    text: "Подземелье под нами древнее самой деревни. О чём ты хочешь узнать?",
                    choices: [
                        { label: "Расскажи о трёх рунах.", next: "runes" },
                        { label: "Что было здесь раньше?", next: "history" },
                        { label: "Как поступить с пленным гоблином?", next: "prisoner" },
                        { label: "Мне пора идти.", effect: { end: true } }
                    ]
                },
                runes: {
                    speaker: "🧑 Староста",
                    text: "Три руны — прилива, пламени и праха — держат печать сокровищницы. Собери их, и Страж пробудится.",
                    choices: [
                        { label: "Понял. А ещё?", next: "root" },
                        { label: "Спасибо, этого достаточно.", effect: { end: true } }
                    ]
                },
                history: {
                    speaker: "🧑 Староста",
                    text: "Когда-то тут ковали оружие для целого края. Жадность разбудила то, что спало под кузней… и всё поглотила тьма.",
                    choices: [
                        { label: "Возьми монету на храм. (−15 золота)", once: true, effect: { gold: -15, karma: 8 }, next: "grateful" },
                        { label: "Вернуться к началу.", next: "root" }
                    ]
                },
                grateful: {
                    speaker: "🧑 Староста",
                    text: "Ты добр к нам, странник. Деревня этого не забудет.",
                    choices: [{ label: "Продолжить.", next: "root" }]
                },
                prisoner: {
                    speaker: "🧑 Староста",
                    text: "Мы поймали одного у ворот. Одни хотят суда, другие — выкупа. Решать тебе.",
                    choices: [
                        { label: "Проявить милосердие — отпустить.", once: true, effect: { karma: 15, xp: 20 }, next: "mercy" },
                        { label: "Забрать его золото и прогнать.", once: true, effect: { karma: -12, gold: 40 }, next: "greed" },
                        { label: "Я подумаю об этом.", next: "root" }
                    ]
                },
                mercy: {
                    speaker: "🧑 Староста",
                    text: "Милосердие — редкая сила. Возможно, однажды он вспомнит о ней.",
                    choices: [{ label: "Продолжить.", next: "root" }]
                },
                greed: {
                    speaker: "🧑 Староста",
                    text: "Что ж… золото есть золото. Но взгляды жителей стали холоднее.",
                    choices: [{ label: "Продолжить.", next: "root" }]
                }
            }
        }
    },

    zones: {
        start:         { accent: "#b5892f", biome: "camp" },
        camp:          { accent: "#a9772f", biome: "camp" },
        ruins:         { accent: "#8a8577", biome: "ruins" },
        ancientHall:   { accent: "#8a7bd8", biome: "arcane" },
        archive:       { accent: "#2f8fb0", biome: "water" },
        shrine:        { accent: "#d06a2a", biome: "fire" },
        catacomb:      { accent: "#9aa0a6", biome: "bone" },
        darkForest:    { accent: "#3f9f52", biome: "forest" },
        marsh:         { accent: "#4f8f86", biome: "water" },
        abandonedWing: { accent: "#7d6f8a", biome: "ruins" },
        forge:         { accent: "#c0542a", biome: "fire" },
        treasury:      { accent: "#d4af37", biome: "gold" }
    },

    // ---- Sprite / art manifest (grows as assets are added; a missing entry
    // simply falls back to the emoji in the renderer) ----
    sprites: {
        hero: "assets/sprites/hero.png",
        battleBg: "assets/bg/battle.png",
        enemies: {
            goblin: "assets/sprites/goblin.png",
            wolf: "assets/sprites/wolf.png",
            skeleton: "assets/sprites/skeleton.png",
            tideWraith: "assets/sprites/tideWraith.png",
            flameWarden: "assets/sprites/flameWarden.png",
            boneColossus: "assets/sprites/boneColossus.png",
            boss: "assets/sprites/boss.png"
        },
        allies: {
            warrior: "assets/sprites/warrior.png",
            healer: "assets/sprites/healer.png",
            scout: "assets/sprites/scout.png"
        }
    }
};

// Node/CommonJS export for the test harness; harmless in the browser.
if (typeof module !== "undefined" && module.exports) module.exports = { GAME_DATA };
