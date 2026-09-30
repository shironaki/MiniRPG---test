# ⚔️ Mini RPG 9.0 — The Lost Kingdom

A dependency-free, single-file-per-system browser RPG written in vanilla
JavaScript. Explore a dungeon, fight enemies, disarm traps, collect three runes
to unlock the treasury, defeat the Guardian and claim the treasure.

> 🚧 **Две версии в одном репозитории:**
> **v1** — кликовая игра в корне (`/`), стабильна.
> **v2** — 2D-версия со свободным перемещением в `/v2/`, активная разработка
> (живые NPC, дружба, день/ночь, сбор ресурсов, ферма).

## 📌 Новому разработчику — читать в этом порядке

| Документ | Зачем |
|----------|-------|
| **[`AGENTS.md`](AGENTS.md)** | **Обязательно.** Жёсткие правила: лицензия, замороженная ветка `main`, замороженные `main.js`, порядок веток. Читается людьми и ИИ-агентами перед любой работой |
| [`docs/HANDOVER.md`](docs/HANDOVER.md) | Полная передача проекта: что сделано, как запустить, как проверять, дорожная карта, грабли |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Карта кода: что в каком файле и как связано |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | История всех работ по коммитам |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Процесс: ветки, коммиты, чек-лист перед PR |
| [`docs/OWNER-SETUP.md`](docs/OWNER-SETUP.md) | Для владельца: защита ветки `main` и прав доступа на GitHub, как проверять чужую работу |
| [`docs/WORKER-BRIEF.md`](docs/WORKER-BRIEF.md) | Готовые тексты: что передать новому разработчику и стартовый промпт для его ИИ-агента |

Кратко о главном: **основа — готовая игра v1 в корне (`index.html`,
`style.css`, `js/**`, `assets/**`) и `LICENSE` — не трогается**, вся новая
разработка идёт внутри папки `/v2`. Ветка `main` — стабильный релиз: работаем
в отдельных ветках и вливаем через PR. Нарушения ловит
[`guard.yml`](.github/workflows/guard.yml).

## Play locally

No build step required. Either open `index.html` directly, or run the bundled
static server (recommended, avoids `file://` restrictions):

```bash
npm run serve        # http://localhost:8080
# or choose a port:
PORT=3000 npm run serve
```

## Project layout

```
index.html          # markup + screen containers, loads the js/ scripts in order
style.css           # all styling
js/
  item.js           # Item class + ITEMS catalogue
  player.js         # Player: stats, combat, inventory, leveling
  inventory.js      # Inventory view/model wrapper
  enemy.js          # Enemy class + createEnemy() factory (level scaling)
  chest.js          # loot chests
  trap.js           # disarmable traps (trapSkill progression)
  room.js           # Room + random event generation
  shop.js           # buying / selling
  npc.js            # village elder dialogue + quest rewards
  quest.js          # goblin-hunt quest state machine
  world.js          # rooms, spatial coords, connections graph, zones, exploration & relics
  audio.js          # synthesized SFX + haptics (mute toggle, fully guarded)
  battle.js         # turn-based battle loop
  save.js           # localStorage persistence
  game.js           # top-level game orchestration + UI sync
  main.js           # DOM wiring / event handlers (browser entry point)
scripts/serve.js    # tiny static server for local play / preview
tests/              # zero-dependency unit tests (Node vm harness)
```

## Testing

Gameplay logic is covered by **unit tests** and the UI wiring by **integration
tests**, both loading the real `js/` sources in a Node `vm` sandbox with minimal
browser shims — no build tooling, no node_modules, no headless browser.

```bash
npm test        # runs tests/game.test.js + tests/integration.test.js
```

- `tests/game.test.js` — logic units + a deterministic Monte-Carlo **balance
  suite** that runs the real `Battle` loop and asserts the intended difficulty
  curve (early enemies winnable, boss a real gate, geared hero prevails).
- `tests/integration.test.js` — boots the full game (`audio.js` + `main.js`) and
  checks map rendering, click-to-move, room badges and the end-screen summary.

CI (`.github/workflows/ci.yml`) syntax-checks every script and runs the suite on
every push and pull request.

## Controls

### v1 (кликовая версия, `/`)
- **World map:** arrow keys / WASD, on-screen buttons, or swipe (touch).
- **Combat:** Attack, Potion, Defend, Flee.
- Progress auto-saves to `localStorage`; use **Продолжить приключение** to resume.

### v2 (2D-версия, `/v2/`)
- **WASD / стрелки** — ходьба, **E** — контекстное действие (поговорить, войти,
  рубить/собирать, работать на грядке), **I** — рюкзак, **Esc** — закрыть меню.
- На телефоне — виртуальный джойстик, кнопки действий и фуллскрин.
- Живут суточные часы: жители ходят по расписанию, ночью светятся окна,
  политые с вечера грядки подрастают на рассвете.

## Лицензия и права

Проект распространяется по лицензии **MIT** — см. [`LICENSE`](LICENSE).
Правообладатель: **shironaki**. Строка `Copyright (c) 2026 shironaki` изменению
не подлежит; любые вклады (включая сделанные с помощью ИИ-агентов) вносятся на
условиях этой лицензии.
