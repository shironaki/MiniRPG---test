/**
 * v2 world — weather and calendar seasons.
 *
 * Seasons cycle every 28 in-game days:
 *   Days 1..28   : 🌱 Spring (Весна)
 *   Days 29..56  : ☀️ Summer (Лето)
 *   Days 57..84  : 🍂 Autumn (Осень)
 *   Days 85..112 : ❄️ Winter (Зима)
 * Cycle wraps after day 112 (Year 2 begins).
 *
 * Weather is determined deterministically per day with seasonal probabilities:
 *   - sunny (Ясно): warm golden day
 *   - cloudy (Облачно): soft diffuse daylight
 *   - rain (Дождь): watering rain (auto-waters all farm plots at dawn!)
 *   - storm (Гроза): thunder & lightning, high bite rate for rare fish
 *   - fog (Туман): misty haze over rivers and forest
 *   - snow (Снег): winter snowflakes (winter only)
 */

const SEASONS = ["spring", "summer", "autumn", "winter"];

const SEASON_DATA = {
    spring: { id: "spring", name: "Весна", emoji: "🌱", color: "#3d7a3a", desc: "Пора свежей зелени и цветения садов" },
    summer: { id: "summer", name: "Лето",  emoji: "☀️", color: "#2d7a28", desc: "Жаркие солнечные дни и обильный урожай" },
    autumn: { id: "autumn", name: "Осень", emoji: "🍂", color: "#b36829", desc: "Золотой листопад, тыквы и сбор плодов" },
    winter: { id: "winter", name: "Зима",  emoji: "❄️", color: "#6a8d9d", desc: "Морозные ветра и тишина у очага" }
};

const WEATHER_TYPES = {
    sunny:  { id: "sunny",  name: "Ясно",     emoji: "☀️", isRain: false, isSnow: false },
    cloudy: { id: "cloudy", name: "Облачно",  emoji: "⛅", isRain: false, isSnow: false },
    rain:   { id: "rain",   name: "Дождь",    emoji: "🌧️", isRain: true,  isSnow: false },
    storm:  { id: "storm",  name: "Гроза",    emoji: "⛈️", isRain: true,  isSnow: false },
    fog:    { id: "fog",    name: "Туман",    emoji: "🌫️", isRain: false, isSnow: false },
    snow:   { id: "snow",   name: "Снегопад", emoji: "❄️", isRain: false, isSnow: true }
};

const DAYS_PER_SEASON = 28;
const DAYS_PER_YEAR = DAYS_PER_SEASON * 4;

class WeatherSystem {
    constructor(opts = {}) {
        this.rng = opts.rng || Math.random;
        this._cache = new Map();
    }

    // Get season info for a specific day count (1-indexed).
    getSeason(day) {
        const d = Math.max(1, day | 0) - 1;
        const seasonIndex = Math.floor((d % DAYS_PER_YEAR) / DAYS_PER_SEASON);
        const seasonKey = SEASONS[seasonIndex] || "spring";
        const dayInSeason = (d % DAYS_PER_SEASON) + 1;
        const year = Math.floor(d / DAYS_PER_YEAR) + 1;
        const data = SEASON_DATA[seasonKey];
        return {
            id: seasonKey,
            name: data.name,
            emoji: data.emoji,
            color: data.color,
            desc: data.desc,
            dayInSeason,
            year
        };
    }

    // Compute weather for a given day (deterministic hash so it stays stable).
    getWeather(day) {
        const d = Math.max(1, day | 0);
        if (this._cache.has(d)) return this._cache.get(d);

        const season = this.getSeason(d);
        // Deterministic pseudo-random float 0..1 for day
        const seed = Math.sin(d * 12.9898 + 78.233) * 43758.5453;
        const roll = seed - Math.floor(seed);

        let weatherKey = "sunny";
        if (season.id === "spring") {
            if (roll < 0.55) weatherKey = "sunny";
            else if (roll < 0.75) weatherKey = "rain";
            else if (roll < 0.90) weatherKey = "cloudy";
            else weatherKey = "fog";
        } else if (season.id === "summer") {
            if (roll < 0.70) weatherKey = "sunny";
            else if (roll < 0.85) weatherKey = "cloudy";
            else if (roll < 0.95) weatherKey = "storm";
            else weatherKey = "rain";
        } else if (season.id === "autumn") {
            if (roll < 0.35) weatherKey = "sunny";
            else if (roll < 0.65) weatherKey = "rain";
            else if (roll < 0.85) weatherKey = "storm";
            else weatherKey = "fog";
        } else if (season.id === "winter") {
            if (roll < 0.45) weatherKey = "snow";
            else if (roll < 0.80) weatherKey = "cloudy";
            else if (roll < 0.95) weatherKey = "sunny";
            else weatherKey = "fog";
        }

        const info = WEATHER_TYPES[weatherKey] || WEATHER_TYPES.sunny;
        this._cache.set(d, info);
        return info;
    }

    // Whether it's raining or storming (waters crops automatically).
    isRaining(day) {
        return this.getWeather(day).isRain;
    }

    // Weather forecast for tomorrow (used on the Notice Board).
    getTomorrowForecast(day) {
        const nextDay = (day | 0) + 1;
        const weather = this.getWeather(nextDay);
        const season = this.getSeason(nextDay);
        return {
            day: nextDay,
            tomorrowDay: nextDay,
            season,
            weather
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        SEASONS,
        SEASON_DATA,
        WEATHER_TYPES,
        DAYS_PER_SEASON,
        DAYS_PER_YEAR,
        WeatherSystem
    };
}
