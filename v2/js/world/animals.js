/**
 * v2 world — farm animals and ranching system.
 *
 * Supports raising chickens 🐔, cows 🐮 and sheep 🐑 in coops and pastures.
 * Daily care (feeding, petting, harvesting products) builds friendship hearts
 * and unlocks higher quality yields.
 */

const ANIMAL_TYPES = {
    chicken: {
        type: "chicken",
        name: "Курочка",
        emoji: "🐔",
        cost: 120,
        building: "coop",
        sound: "Ко-ко-ко! 🐔",
        feed: ["hay", "wheat", "seeds"],
        product: "egg",
        largeProduct: "egg_large",
        harvestVerb: "Собрать яйца"
    },
    cow: {
        type: "cow",
        name: "Коровка",
        emoji: "🐮",
        cost: 350,
        building: "barn",
        sound: "Му-у-у! 🐮",
        feed: ["hay", "wheat"],
        product: "milk",
        largeProduct: "milk_large",
        harvestVerb: "Подоить"
    },
    sheep: {
        type: "sheep",
        name: "Овечка",
        emoji: "🐑",
        cost: 260,
        building: "barn",
        sound: "Бе-е-е! 🐑",
        feed: ["hay", "wheat"],
        product: "wool",
        largeProduct: "wool",
        harvestVerb: "Стричь шерсть"
    }
};

class FarmAnimal {
    constructor(spec = {}) {
        this.id = spec.id || `animal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.type = spec.type || "chicken";
        this.name = spec.name || (ANIMAL_TYPES[this.type] ? ANIMAL_TYPES[this.type].name : "Питомец");
        this.friendship = spec.friendship || 0; // 0..1000 (100 per heart)
        this.fed = !!spec.fed;
        this.petted = !!spec.petted;
        this.hasProduct = spec.hasProduct !== undefined ? !!spec.hasProduct : true;
        this.ageDays = spec.ageDays || 1;
        this.building = spec.building || (ANIMAL_TYPES[this.type] ? ANIMAL_TYPES[this.type].building : "coop");
    }

    get meta() {
        return ANIMAL_TYPES[this.type] || ANIMAL_TYPES.chicken;
    }

    get hearts() {
        return Math.min(10, Math.floor(this.friendship / 100));
    }

    pet() {
        if (this.petted) {
            return { ok: false, msg: `${this.name} довольно урчит. Вы уже гладили её сегодня.` };
        }
        this.petted = true;
        this.friendship = Math.min(1000, this.friendship + 25);
        return {
            ok: true,
            msg: `Вы ласково погладили ${this.name}. ❤️ +25 дружбы (${this.hearts}/10 ❤️)`,
            sound: this.meta.sound
        };
    }

    feed(bag) {
        if (this.fed) {
            return { ok: false, msg: `${this.name} сыта и довольно жуёт.` };
        }
        let usedFeed = null;
        for (const f of this.meta.feed) {
            if (bag.count(f) > 0) {
                usedFeed = f;
                bag.remove(f, 1);
                break;
            }
        }
        if (!usedFeed) {
            return { ok: false, msg: `Нет подходящего корма (${this.meta.feed.join(", ")}).` };
        }
        this.fed = true;
        this.friendship = Math.min(1000, this.friendship + 15);
        return {
            ok: true,
            feed: usedFeed,
            msg: `Вы покормили ${this.name} (${usedFeed}). Животное довольно! 🌾`,
            sound: this.meta.sound
        };
    }

    harvest(bag, day = 1) {
        if (!this.hasProduct) {
            return { ok: false, msg: `Сегодня у ${this.name} пока нет готовой продукции.` };
        }
        const isLarge = this.friendship >= 400 && Math.random() < (this.friendship / 1200);
        const resKey = isLarge && this.meta.largeProduct ? this.meta.largeProduct : this.meta.product;
        this.hasProduct = false;
        bag.add(resKey, 1);
        this.friendship = Math.min(1000, this.friendship + 20);

        return {
            ok: true,
            res: resKey,
            amount: 1,
            msg: `${this.meta.harvestVerb} у ${this.name}: получено ${resKey}! 🧺`,
            sound: this.meta.sound
        };
    }

    onNewDay(day, isWinter = false) {
        this.ageDays += 1;
        if (this.fed) {
            this.friendship = Math.min(1000, this.friendship + 10);
            this.hasProduct = true;
        } else {
            this.friendship = Math.max(0, this.friendship - 25);
            this.hasProduct = false;
        }
        this.fed = false;
        this.petted = false;
    }
}

class RanchSystem {
    constructor(savedAnimals = []) {
        this.animals = [];
        if (Array.isArray(savedAnimals) && savedAnimals.length) {
            this.animals = savedAnimals.map(a => (a instanceof FarmAnimal ? a : new FarmAnimal(a)));
        } else {
            // Default starting friendly animals for the village ranch
            this.animals = [
                new FarmAnimal({ id: "hen_ryaba", type: "chicken", name: "Ряба", friendship: 250, fed: false, hasProduct: true }),
                new FarmAnimal({ id: "hen_belyanka", type: "chicken", name: "Белянка", friendship: 180, fed: false, hasProduct: true }),
                new FarmAnimal({ id: "cow_burenka", type: "cow", name: "Бурёнка", friendship: 320, fed: false, hasProduct: true }),
                new FarmAnimal({ id: "sheep_kudryash", type: "sheep", name: "Кудряш", friendship: 210, fed: false, hasProduct: true })
            ];
        }
    }

    get list() {
        return this.animals;
    }

    getById(id) {
        return this.animals.find(a => a.id === id) || null;
    }

    addAnimal(type, name, bag, goldCallback) {
        const meta = ANIMAL_TYPES[type];
        if (!meta) return { ok: false, msg: "Неизвестный вид животного." };
        if (typeof goldCallback === "function") {
            const paid = goldCallback(meta.cost);
            if (!paid) return { ok: false, msg: `Недостаточно золота. Требуется ${meta.cost} 💰.` };
        }
        const animal = new FarmAnimal({ type, name: name || meta.name, fed: true });
        this.animals.push(animal);
        return { ok: true, animal, msg: `Вы приобрели ${animal.name}! Добро пожаловать на ферму. 🎉` };
    }

    feedAll(bag) {
        let fedCount = 0;
        for (const a of this.animals) {
            if (!a.fed) {
                const res = a.feed(bag);
                if (res.ok) fedCount++;
            }
        }
        return { ok: fedCount > 0, count: fedCount, msg: `Покормлено животных: ${fedCount}.` };
    }

    petAll() {
        let pettedCount = 0;
        for (const a of this.animals) {
            if (!a.petted) {
                const res = a.pet();
                if (res.ok) pettedCount++;
            }
        }
        return { ok: pettedCount > 0, count: pettedCount, msg: `Поглажено животных: ${pettedCount}. ❤️` };
    }

    harvestAll(bag, day = 1) {
        let collected = [];
        for (const a of this.animals) {
            if (a.hasProduct) {
                const res = a.harvest(bag, day);
                if (res.ok) collected.push({ name: a.name, res: res.res });
            }
        }
        return { ok: collected.length > 0, items: collected, count: collected.length };
    }

    onNewDay(day, isWinter = false) {
        for (const a of this.animals) {
            a.onNewDay(day, isWinter);
        }
    }

    onDawn(day, isWinter = false) {
        this.onNewDay(day, isWinter);
    }

    serialize() {
        return this.animals.map(a => ({
            id: a.id,
            type: a.type,
            name: a.name,
            friendship: a.friendship,
            fed: a.fed,
            petted: a.petted,
            hasProduct: a.hasProduct,
            ageDays: a.ageDays,
            building: a.building
        }));
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { ANIMAL_TYPES, FarmAnimal, RanchSystem };
}
