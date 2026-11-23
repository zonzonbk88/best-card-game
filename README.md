# Emberfall Duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/zonzonbk88/best-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/zonzonbk88/best-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

An original card duel for the desktop browser, built for make.fun's
*best card game* bounty. You face **Warden Vex** across a felt table: play
wards and charms with aether, trade blows, and reduce the Warden to 0 life
before it does the same to you.

## The one rule that matters: Kindle

Cards belong to four elements — **Ember ◆, Tide ●, Grove ▲, Storm ★** — told
apart by colour and shape. Play a card right after a card of the *same
element* on the same turn and the second card is **Kindled**: wards arrive
+1/+1 and every number on a charm grows by 1. Ordering a hand by element is
the difference between a fair trade and a rout.

- **Bulwark** wards must be attacked before anything behind them.
- **Swift** wards can attack the turn they arrive.
- Warden Vex plays readable lines: it chains Kindles when it can, takes
  winning trades, and hides behind its Bulwarks — counter it the same way.

## Play it

The game is plain static files under `game/` with no build step:

```
node serve.ts        # then open http://localhost:8080
```

or serve `game/` with any static HTTP server. Mouse to play; `1–7` select a
hand card, `Space`/`E` ends the turn, `M` mutes the synthesised sound effects.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output folder and writes `dossier.json` with the vendored library.
- `game/index.html` — the page.
- `game/src/cards.js` — the card catalogue (all 20 original cards).
- `game/src/engine.js` — the rules and Warden Vex's planner; no DOM in here.
- `game/src/render.js` — every pixel: table, cards, title/victory/defeat.
- `game/src/main.js` — boot, the frame loop, clicks and keys, combat effects.
- `game/src/input.js`, `game/src/audio.js` — pointer/keys; WebAudio sounds.
- `game/src/shots.js` — the deterministic scenes behind the screenshots
  (`?shot=title|play|win|loss&seed=N`), each a real duel played forward
  through the engine.
- `screenshots/` — four JPEGs rendered from the game's own code in a browser.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

MIT licensed — see `LICENSE`.
