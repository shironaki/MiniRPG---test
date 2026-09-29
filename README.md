# ⚔️ Mini RPG 9.0 — The Lost Kingdom

A dependency-free, single-file-per-system browser RPG written in vanilla
JavaScript. Explore a dungeon, fight enemies, disarm traps, collect three runes
to unlock the treasury, defeat the Guardian and claim the treasure.

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
  world.js          # rooms, connections graph, exploration & relics
  battle.js         # turn-based battle loop
  save.js           # localStorage persistence
  game.js           # top-level game orchestration + UI sync
  main.js           # DOM wiring / event handlers (browser entry point)
scripts/serve.js    # tiny static server for local play / preview
tests/              # zero-dependency unit tests (Node vm harness)
```

## Testing

Pure gameplay logic is covered by unit tests that load the real `js/` sources in
a Node `vm` sandbox with minimal browser shims — no build tooling, no
node_modules.

```bash
npm test
```

CI (`.github/workflows/ci.yml`) syntax-checks every script and runs the suite on
every push and pull request.

## Controls

- **World map:** arrow keys / WASD, on-screen buttons, or swipe (touch).
- **Combat:** Attack, Potion, Defend, Flee.
- Progress auto-saves to `localStorage`; use **Продолжить приключение** to resume.
