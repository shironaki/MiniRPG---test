/**
 * v2 world — cooking system.
 *
 * Recipes turn raw ingredients (fish, harvested vegetables, berries, herbs)
 * into nourishing hot meals and drinks at the home stove/hearth. Cooked dishes
 * provide significant health/energy recovery, higher sell value, and make
 * the most prized gifts for townsfolk.
 *
 * Pure logic, unit-testable without DOM.
 */
const RECIPES = [
    {
        id: "dish_stew",
        name: "Овощная похлёбка",
        emoji: "🍲",
        desc: "Густой согревающий суп из моркови и пряных трав.",
        ingredients: { veg: 2, herb: 1 },
        heal: 40,
        energy: 20,
        gold: 30
    },
    {
        id: "dish_fish",
        name: "Жареная рыба",
        emoji: "🐟",
        desc: "Свежая рыба, запечённая на углях до хрустящей корочки.",
        // Supports perch, carp or crayfish as the fish ingredient
        ingredients: { fish_perch: 1, wood: 1 },
        altIngredients: [
            { fish_perch: 1, wood: 1 },
            { fish_carp: 1, wood: 1 },
            { crayfish: 2, wood: 1 }
        ],
        heal: 35,
        energy: 15,
        gold: 28
    },
    {
        id: "dish_pie",
        name: "Ягодный пирог",
        emoji: "🥧",
        desc: "Сладкий пирог со свежими лесными ягодами и морковной начинкой.",
        ingredients: { berry: 3, veg: 1 },
        heal: 50,
        energy: 30,
        gold: 40
    },
    {
        id: "dish_soup",
        name: "Рыбацкая уха",
        emoji: "🥘",
        desc: "Наваристая уха из отборной рыбы со свежими травами.",
        ingredients: { fish_pike: 1, herb: 1, veg: 1 },
        altIngredients: [
            { fish_pike: 1, herb: 1, veg: 1 },
            { fish_carp: 1, herb: 1, veg: 1 },
            { fish_perch: 2, herb: 1, veg: 1 }
        ],
        heal: 80,
        energy: 40,
        gold: 60
    },
    {
        id: "dish_tea",
        name: "Травяной отвар",
        emoji: "🍵",
        desc: "Целебный настой из лесных трав, восстанавливающий силы.",
        ingredients: { herb: 2 },
        heal: 15,
        energy: 35,
        gold: 22
    }
];

class CookingSystem {
    constructor(opts = {}) {
        this.recipes = opts.recipes || RECIPES;
    }

    _count(res, bag, storage) {
        let n = bag ? bag.count(res) : 0;
        if (storage) n += storage.count(res);
        return n;
    }

    _matchingIngredients(recipe, bag, storage) {
        const variants = recipe.altIngredients || [recipe.ingredients];
        for (const req of variants) {
            let matches = true;
            for (const [res, count] of Object.entries(req)) {
                if (this._count(res, bag, storage) < count) {
                    matches = false;
                    break;
                }
            }
            if (matches) return req;
        }
        return null;
    }

    canCook(recipeId, bag, storage) {
        const r = this.recipes.find(x => x.id === recipeId);
        if (!r) return false;
        return this._matchingIngredients(r, bag, storage) !== null;
    }

    /**
     * Prepare a dish by consuming ingredients from the bag (and fallback to storage).
     * Adds the cooked dish to the player's resource bag.
     */
    cook(recipeId, bag, storage) {
        const r = this.recipes.find(x => x.id === recipeId);
        if (!r) return { ok: false, msg: "Неизвестный рецепт." };

        const matched = this._matchingIngredients(r, bag, storage);
        if (!matched) return { ok: false, msg: "Не хватает ингредиентов." };

        // Consume ingredients
        for (const [res, needed] of Object.entries(matched)) {
            let left = needed;
            if (bag) {
                const fromBag = bag.remove(res, left);
                left -= fromBag;
            }
            if (left > 0 && storage) {
                storage.remove(res, left);
            }
        }

        // Add cooked dish
        if (bag) bag.add(r.id, 1);

        return {
            ok: true,
            dish: r,
            msg: `✨ Приготовлено: ${r.emoji} ${r.name}!`
        };
    }

    list(bag, storage) {
        return this.recipes.map(r => {
            const matched = this._matchingIngredients(r, bag, storage);
            return {
                ...r,
                canCook: matched !== null,
                activeIngredients: matched || r.ingredients
            };
        });
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { CookingSystem, RECIPES };
}
