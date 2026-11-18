---
parent: "[[017-world-20-opens]]"
---

# World 20, part 7.1: the five levels and the difficulty row, not yet listed

Part 1 of 3 of `docs/lean/017-world-20-opens.md` (World 20, "Midnight Press"). This part is `src/core` and `test/core` only. It builds on parts 1-6 of `docs/lean/01-world-20.md`, which are in the repository. It adds world 20's level data and its difficulty row without listing the world: `WORLDS`, `LEVELS`, `TWISTS`, `BOSSES` and `BOSS_DEFS` are untouched, so every table the suite compares stays as it is and `npm test` stays green. The world is listed in part 7.3 (`0173-world-20-opens`).

## Goal

World 20's five levels exist as data in a new `src/core/levels-6.js`, and world 20 has its own row in `src/core/difficulty.js`, both proven on their own, ready to be joined to `LEVELS` in part 7.3.

## Behaviour

- A new `src/core/levels-6.js` exports world 20's five level specs in the shorthand of `levels-2.js`, the way `levels-5.js` exports world 19's (`REGATTA`): four wave levels and a boss level (a spec without waves), in the order `w20-1` to `w20-5`. No bunkers.
- The four wave levels follow the data rules `test/core/levels.test.js` enforces on listed levels: 3 to 5 waves a level, at most 40 aliens a wave, a carrier on every wave level, every wave valid against `kinds.js` (formation, pattern, one role a row, positive speed), at least four different formations across the world, and integer seeds that differ from each other and from every seed in `LEVELS`.
- `levels.js` does not import the file yet: `LEVELS` keeps its 95 levels and `WORLDS` its 19 worlds.
- World 20 has its own row in `difficulty.js` (it never falls back to the main curve, which would leave the scale): every value from 0 to 1 and no easier than world 19's, level for level.
- The repository's standing rules hold (CLAUDE.md): no magic values, every code file under 200 lines, `src/core` stays pure.

## Registrations

No existing assertion moves. `test/core/difficulty.test.js` and `test/core/levels.test.js` hold as they are (a row for a world that is not listed changes no listed level). The pinned fingerprints of worlds 1-19 (`test/core/worlds-unchanged.test.js`, `worlds-idle.test.js`) do not move. If any existing assertion fails, the builder stops and reports it; it is not changed.

## Acceptance tests

`node:test`, in `test/core/`, reading the constants and never repeating their values:

1. `levels-6.js` holds five specs for world 20, four with waves and the last without, and the level data rules above hold for them.
2. World 20 has its own row in `difficulty.js`; every value is from 0 to 1 and no easier than world 19's, level for level.
3. `WORLDS` and `LEVELS` are unchanged, and the whole suite is green (`npm test`) with no existing assertion moved; every code file is under 200 lines.

## Out of scope

- The `WORLDS` entry, `TWISTS`, `BOSSES`, `BOSS_DEFS`, joining the levels to `LEVELS`, pars and ratings (part 7.3).
- `BOSS_ART`, the trailer typography row and the film tint (part 7.2).
- Any change to how worlds 1-19 play, any new drawing or sound, a new kind of power-up.
