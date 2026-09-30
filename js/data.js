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

    // ---- Enemies (base stats at level 1; scaling applied in createEnemy) ----
    enemies: {
        goblin:       { name: "Гоблин",          health: 52,  attack: 11, defense: 3,  experience: 32,  gold: 28,  emoji: "👹" },
        wolf:         { name: "Волк",            health: 68,  attack: 14, defense: 4,  experience: 44,  gold: 38,  emoji: "🐺" },
        skeleton:     { name: "Скелет",          health: 84,  attack: 17, defense: 6,  experience: 60,  gold: 50,  emoji: "💀" },
        tideWraith:   { name: "Дух прилива",     health: 120, attack: 19, defense: 7,  experience: 110, gold: 80,  emoji: "🌊" },
        flameWarden:  { name: "Страж пламени",   health: 130, attack: 21, defense: 8,  experience: 125, gold: 90,  emoji: "🔥" },
        boneColossus: { name: "Костяной колосс", health: 145, attack: 22, defense: 9,  experience: 140, gold: 100, emoji: "☠️" },
        boss:         { name: "Страж сокровища", health: 190, attack: 24, defense: 10, experience: 220, gold: 250, emoji: "👑" }
    },

    // ---- Items (shop stock and loot) ----
    items: {
        sword:  { name: "Железный меч",   type: "weapon", price: 80,  description: "Надёжное оружие ближнего боя.", attackBonus: 10, defenseBonus: 0,  healAmount: 0,  emoji: "⚔️" },
        bow:    { name: "Деревянный лук",  type: "weapon", price: 75,  description: "Лёгкое оружие для метких ударов.", attackBonus: 8, defenseBonus: 0,  healAmount: 0,  emoji: "🏹" },
        shield: { name: "Железный щит",   type: "shield", price: 60,  description: "Снижает урон от атак.", attackBonus: 0, defenseBonus: 7,  healAmount: 0,  emoji: "🛡️" },
        armor:  { name: "Кожаная броня",  type: "armor",  price: 120, description: "Прочная и лёгкая защита.", attackBonus: 0, defenseBonus: 10, healAmount: 0,  emoji: "🧥" },
        potion: { name: "Зелье здоровья", type: "potion", price: 20,  description: "Восстанавливает 35 HP.", attackBonus: 0, defenseBonus: 0,  healAmount: 35, emoji: "🧪" }
    },

    // ---- Per-zone theming: accent colour drives UI tint per location ----
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
            goblin: "assets/sprites/goblin.png"
        },
        allies: {
            warrior: "assets/sprites/warrior.png",
            healer: "assets/sprites/healer.png"
        }
    }
};

// Node/CommonJS export for the test harness; harmless in the browser.
if (typeof module !== "undefined" && module.exports) module.exports = { GAME_DATA };
