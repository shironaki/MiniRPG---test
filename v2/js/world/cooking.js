/**
 * v2 world — cooking and culinary recipes system.
 *
 * Prepared at the home kitchen stove / hearth. Ingredients are pulled from the
 * player's resource bag (or storage chest). Cooked dishes restore health & energy
 * and can be gifted to villagers or sold at the village shop.
 */
const RECIPES = [
    {
        id: "dish_stew",
        name: "Овощная похлёбка",
        emoji: "🍲",
        desc: "Густая горячая похлёбка из свежей моркови и лесных трав.",
        ingredients: [
            { res: "veg", count: 2, name: "Морковь" },
            { res: "herb", count: 1, name: "Травы" }
        ],
        yield: { res: "dish_stew", count: 1 }
    },
    {
        id: "dish_fish",
        name: "Жареная рыба",
        emoji: "🐟",
        desc: "Сочная подрумяненная рыба с хрустящей корочкой на углях.",
        ingredients: [
            { res: "crayfish", count: 2, name: "Рыба или раки", alt: ["fish_perch", "fish_carp", "fish_pike", "fish_flounder", "fish_tuna"] },
            { res: "wood", count: 1, name: "Дрова" }
        ],
        yield: { res: "dish_fish", count: 1 }
    },
    {
        id: "dish_pie",
        name: "Ягодный пирог",
        emoji: "🥧",
        desc: "Ароматный сладкий пирог с начинкой из сочных лесных ягод.",
        ingredients: [
            { res: "berry", count: 3, name: "Ягоды" },
            { res: "seeds", count: 1, name: "Семена / Пшеница", alt: ["wheat", "seeds_wheat"] }
        ],
        yield: { res: "dish_pie", count: 1 }
    },
    {
        id: "dish_soup",
        name: "Рыбацкая уха",
        emoji: "🥘",
        desc: "Наваристая уха из речного улова со свежими овощами.",
        ingredients: [
            { res: "fish_carp", count: 1, name: "Рыба", alt: ["fish_pike", "fish_perch", "fish_flounder", "fish_tuna", "crayfish"] },
            { res: "veg", count: 1, name: "Морковь" },
            { res: "herb", count: 1, name: "Травы" }
        ],
        yield: { res: "dish_soup", count: 1 }
    },
    {
        id: "dish_tea",
        name: "Травяной отвар",
        emoji: "🍵",
        desc: "Освежающий настой из лесных трав и ягод, восстанавливающий силы.",
        ingredients: [
            { res: "herb", count: 2, name: "Травы" },
            { res: "berry", count: 1, name: "Ягоды" }
        ],
        yield: { res: "dish_tea", count: 1 }
    },
    {
        id: "dish_cider",
        name: "Яблочный сидр",
        emoji: "🧃",
        desc: "Игристый яблочный сидр из спелых садовых яблок, дающий прилив бодрости.",
        ingredients: [
            { res: "apple", count: 2, name: "Яблоки" },
            { res: "herb", count: 1, name: "Травы" }
        ],
        yield: { res: "dish_cider", count: 1 }
    },
    {
        id: "dish_jam",
        name: "Клубничное варенье",
        emoji: "🍓",
        desc: "Сладкое варенье из первой весенней клубники и лесных ягод.",
        ingredients: [
            { res: "strawberry", count: 2, name: "Клубника" },
            { res: "berry", count: 1, name: "Ягоды" }
        ],
        yield: { res: "dish_jam", count: 1 }
    },
    {
        id: "dish_pumpkin_soup",
        name: "Тыквенный крем-суп",
        emoji: "🎃",
        desc: "Нежный согревающий суп из осенней тыквы с травами.",
        ingredients: [
            { res: "pumpkin", count: 1, name: "Тыква" },
            { res: "veg", count: 1, name: "Морковь" },
            { res: "herb", count: 1, name: "Травы" }
        ],
        yield: { res: "dish_pumpkin_soup", count: 1 }
    },
    {
        id: "dish_pasta",
        name: "Морская паста",
        emoji: "🍝",
        desc: "Сытная домашняя паста из пшеницы с томатами и морепродуктами.",
        ingredients: [
            { res: "wheat", count: 1, name: "Пшеница", alt: ["seeds_wheat", "seeds"] },
            { res: "tomato", count: 1, name: "Томаты" },
            { res: "lobster", count: 1, name: "Морепродукты", alt: ["fish_tuna", "fish_flounder", "crayfish", "fish_perch"] }
        ],
        yield: { res: "dish_pasta", count: 1 }
    },
    {
        id: "dish_omelette",
        name: "Деревенский омлет",
        emoji: "🍳",
        desc: "Пышный горячий омлет из свежих яиц со щепоткой пряных трав.",
        ingredients: [
            { res: "egg", count: 2, name: "Яйца", alt: ["egg_large"] },
            { res: "herb", count: 1, name: "Травы" }
        ],
        yield: { res: "dish_omelette", count: 1 }
    },
    {
        id: "dish_pancake",
        name: "Блинчики с ягодами",
        emoji: "🥞",
        desc: "Румяные блинчики на молоке с яйцом, политые лесным ягодным сиропом.",
        ingredients: [
            { res: "egg", count: 1, name: "Яйцо", alt: ["egg_large"] },
            { res: "milk", count: 1, name: "Молоко", alt: ["milk_large"] },
            { res: "wheat", count: 1, name: "Пшеница", alt: ["seeds_wheat", "seeds"] },
            { res: "berry", count: 2, name: "Ягоды", alt: ["strawberry", "cherry"] }
        ],
        yield: { res: "dish_pancake", count: 1 }
    },
    {
        id: "dish_cheese",
        name: "Домашний сыр",
        emoji: "🧀",
        desc: "Выдержанный фермерский сыр из цельного парного молока.",
        ingredients: [
            { res: "milk", count: 2, name: "Молоко", alt: ["milk_large"] }
        ],
        yield: { res: "dish_cheese", count: 1 }
    },
    {
        id: "dish_steak",
        name: "Сытный стейк",
        emoji: "🥩",
        desc: "Сытное горячее блюдо из тушёных корнеплодов и трав на костре.",
        ingredients: [
            { res: "veg", count: 2, name: "Морковь / Овощи", alt: ["pumpkin", "corn", "tomato"] },
            { res: "herb", count: 1, name: "Травы" },
            { res: "wood", count: 1, name: "Дрова" }
        ],
        yield: { res: "dish_steak", count: 1 }
    },
    {
        id: "dish_gold_cider",
        name: "Золотой сидр",
        emoji: "🍎",
        desc: "Легендарный напиток из спелых яблок с добавлением частицы чистого золота.",
        ingredients: [
            { res: "apple", count: 2, name: "Яблоки" },
            { res: "bar_gold", count: 1, name: "Золотой слиток", alt: ["ore_gold"] }
        ],
        yield: { res: "dish_gold_cider", count: 1 }
    }
];

class CookingSystem {
    constructor(recipes = RECIPES) {
        this.recipes = recipes;
    }

    list(bag = null, storage = null) {
        return this.recipes.map(r => ({
            ...r,
            canCook: bag ? this.canCook(r.id, bag, storage) : false
        }));
    }

    listRecipes() {
        return this.recipes;
    }

    /**
     * Check if the player has all ingredients in bag or storage.
     */
    canCook(recipeId, bag, storage = null) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe || !bag) return false;

        for (const ing of recipe.ingredients) {
            let total = bag.count(ing.res) + (storage && typeof storage.count === "function" ? storage.count(ing.res) : 0);
            if (ing.alt) {
                for (const a of ing.alt) {
                    total += bag.count(a) + (storage && typeof storage.count === "function" ? storage.count(a) : 0);
                }
            }
            if (total < ing.count) return false;
        }
        return true;
    }

    /**
     * Cook a recipe: consumes ingredients from bag (and optionally storage) and grants the dish.
     */
    cook(recipeId, bag, storage = null) {
        if (!this.canCook(recipeId, bag, storage)) {
            return { ok: false, msg: "Не хватает ингредиентов." };
        }

        const recipe = this.recipes.find(r => r.id === recipeId);
        for (const ing of recipe.ingredients) {
            let needed = ing.count;
            // Take from bag first
            const takenBag = bag.remove(ing.res, needed);
            needed -= takenBag;

            // Take from storage if needed
            if (needed > 0 && storage && typeof storage.remove === "function") {
                const takenStorage = storage.remove(ing.res, needed);
                needed -= takenStorage;
            }

            // If still needed and has alternatives, take alternatives
            if (needed > 0 && ing.alt) {
                for (const altRes of ing.alt) {
                    if (needed <= 0) break;
                    const altTakenBag = bag.remove(altRes, needed);
                    needed -= altTakenBag;
                    if (needed > 0 && storage && typeof storage.remove === "function") {
                        const altTakenStorage = storage.remove(altRes, needed);
                        needed -= altTakenStorage;
                    }
                }
            }
        }

        bag.add(recipe.yield.res, recipe.yield.count);
        return {
            ok: true,
            recipe,
            dish: recipe.yield.res,
            count: recipe.yield.count,
            msg: `${recipe.emoji} Приготовлено: ${recipe.name} ×${recipe.yield.count}!`
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { CookingSystem, RECIPES };
}

