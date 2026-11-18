---
parent: "[[01-world-20]]"
---

# World 20, part 2: the Night Editor's definition (core)

Part 2 of 7 of `docs/lean/01-world-20.md` (World 20, "Midnight Press"). This part is `src/core` and `test/core` only.

## Goal

Write the definition of world 20's boss, `editor`, the Night Editor: its parts, phases and attacks, as data in a new `src/core/bosses-data-7.js`. The definition is exported from that file and listed nowhere yet. The boss becomes fightable in part 7, when it joins `BOSS_DEFS` and `BOSSES` together with its level, its art and the `WORLDS` entry; the suite's own boss tests fight it there.

## Behaviour

- `editor`, the Night Editor: a colossal ink octopus in a green eyeshade with a red pencil in every arm (the picture is part 4; this part gives it the parts and phases that picture needs).
- Like the other side-world bosses it never charges.
- Its phases and patterns are the builder's, in a new `src/core/bosses-data-7.js`, built from the existing bullet patterns (`PATTERNS`), in the shape `src/core/bosses-data-6.js` gives the duck.
- Every tuning value is a named, exported constant, defined once.

## Registrations

- None. The definition does not join `BOSS_DEFS` (`src/core/bosses-data.js`) and `editor` does not join `BOSSES` (`src/core/kinds.js`) here, because the suite ties them to their partners: `test/core/boss-data.test.js:14` requires the kinds of `BOSS_DEFS` to equal `BOSSES`; `test/core/levels.test.js:28` compares `BOSSES` to `WORLDS`; `test/core/boss-kit.js` fights every entry of `BOSSES` on its level `w<n>-5`; `test/ui/bosses.test.js:16` requires art for every entry of `BOSS_DEFS`.
- No existing assertion changes in this part.

## Acceptance tests

`node:test`, in `test/core/`, importing the definition from `src/core/bosses-data-7.js`, reading the constants and never repeating their values:

1. The definition has kind `editor` and meets every rule `test/core/boss-data.test.js` holds each entry of `BOSS_DEFS` to (hit points, size, staying below the HUD, phases, a carrier in every phase, attack timing, parts, a signature no other boss has).
2. Its patterns are all existing bullet patterns (`PATTERNS`).
3. It never charges.

The existing suite stays green (`npm test`) with no existing assertion changed, and every code file stays under 200 lines.

## Out of scope

- Listing the boss in `BOSS_DEFS` or `BOSSES`, the boss level `w20-5`, and fighting it (part 7).
- The boss's drawing (part 4) and sound.
- A new bullet pattern.
- Any change to how worlds 1-19 play.
