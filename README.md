# VOIDHARVEST — Salvage Run

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ranz7fx/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ranz7fx/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

VOIDHARVEST is an original top-down arcade salvage game: pilot a skiff through an asteroid belt, crack rocks open with your bolts, tractor in the glowing cores, and survive waves of drones that get meaner every round. Clear a wave to draft one of three salvage upgrades — twin coils, heavy rounds, magnet arrays, ablative plating and more — and chase a combo multiplier that rewards bold flying.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network: `game/` is plain static files (vanilla canvas + WebAudio synth, zero dependencies).

## How to play

- **WASD / Arrow keys** — thrust
- **Mouse** — aim
- **Click / Space** — fire
- **1 / 2 / 3 or click a card** — pick a wave-clear upgrade
- **P** — pause, **M** — mute, **R** — restart after game over

Cores are score and combo fuel: grab them quickly to raise your multiplier. Your shield recharges; your hull does not — spend waves wisely.

## Layout

- `game/index.html` + `game/style.css` — page and canvas
- `game/src/main.js` — boot and the fixed-step loop
- `game/src/world.js` — every rule: waves, spawning, collisions, upgrades, scoring
- `game/src/render.js` — all drawing: ship, rocks, drones, HUD, title / upgrade / game-over screens
- `game/src/config.js` — tuning and the upgrade pool
- `game/src/random.js` — seeded RNG (screenshots replay deterministically)
- `game/src/audio.js` — synthesised WebAudio effects and ambient pad
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — the `?shot=` scenes behind the screenshots
- `main.ts` — hands `game/` and `screenshots/` in and writes `dossier.json`

---

<sub>Entered on [make.fun](https://make.fun/?ref=n0ysgvds&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
