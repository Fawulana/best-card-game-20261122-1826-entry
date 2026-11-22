# Ember Court — Make the best card game

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Fawulana/best-card-game-20261122-1826-entry/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Fawulana/best-card-game-20261122-1826-entry/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

An original turn-based card duel for [best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826) on make.fun, by Fawulana.

## The game

You sit across the green felt from **Duchess Vex**, rival of the Ember Court, each with 30 life. Every turn you gain mana (growing to 8) and draw two cards from your 36-card deck, then play what you can afford:

- **Ember 🔥 (red)** — deals damage
- **Tide 💧 (blue)** — heals life
- **Thorn 🌿 (green)** — gains shield that soaks damage
- **Gale ✦ (gold)** — draws cards and frees mana

Playing two cards of one suit in a turn triggers **Resonance +2**. First to 0 life loses the duel; win and the next duel starts against a harder Duchess Vex. The AI reads the table — she takes lethal when she sees it, heals when hurt, shields when you threaten her — and plays one card at a time so you can watch her decisions and answer them.

Mouse and keyboard both play: click a card (or press **1–5**), **Enter** ends the turn, **M** toggles sound. All sound is synthesized with WebAudio — no audio files. Cards slide, flip and snap into place; the win lands with a fanfare.

## How to run it

No build step, no network. Serve `game/` with any static server and open `game/index.html` in desktop Chrome, for example:

```sh
cd game && python3 -m http.server 8080
```

Screenshot scenes are staged with `?shot=title|play|win|loss&seed=N` — each replays the real rules from a fixed seed, so the same seed always gives the same frame.

## Layout

- `main.ts` — the entry program (Node 22, stdlib only): copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `game/index.html`, `game/css/style.css` — table, cards and HUD
- `game/src/deck.js` — the twelve card designs and the four suits
- `game/src/game.js` — duel state, turns, card resolution, winning
- `game/src/ai.js` — Duchess Vex's decisions and the screenshot autopilot
- `game/src/render.js` — everything drawn from game state
- `game/src/audio.js` — synthesized WebAudio sound effects
- `game/src/shots.js` — the `?shot=` scenes, played forward from real rules
- `game/src/main.js` — input, timing and the AI's visible turn
- `game/src/rng.js` — seeded random numbers
- `screenshots/` — four real renders of the game (title, mid-game, win, loss)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
