---
parent: "[[01-world-20]]"
---

# World 20, part 6: the look joins the looks

Part 6 of 7 of `docs/lean/01-world-20.md` (World 20, "Midnight Press"). This part is `src/ui` and `test/ui` only. It builds on parts 3, 4 and 5: the look data (`src/ui/looks/w20.js`) with its backdrop, cast, pickup rim and music are in the repository, each proven on its own.

## Goal

List world 20's look as the twentieth entry of `LOOKS` (`src/ui/looks/index.js`), so that every rule the suite holds each world's look to is held for world 20 as well, and `lookFor` gives a world 20 level its look. The world itself opens in part 7.

## Behaviour

- `LOOKS` has twenty entries; the twentieth is world 20's look, with `world: 20`, as worlds 1-19 are listed.
- `lookFor` returns it for a level of world 20.
- Nothing else is listed here: `BOSS_ART` and the per-world rows are part 7.

## Registrations

- Existing assertions that move, and only as far as said:
  - the four pins of the number of looks go from 19 to 20: `test/ui/bath-look.test.js:39`, `test/ui/deep-look.test.js:44`, `test/ui/glass-look.test.js:32`, `test/ui/smog-look.test.js:35`;
  - `test/ui/sfx-boss-bath.test.js:108` compares every look but world 19's with digests taken before world 19; its filter becomes the worlds before 19, so world 20 is not held to a table it was never in. The table and the comparison at `:109-113` stay as they are.
- Existing rules that every look must meet, which world 20's meets unchanged (they do not move): `test/ui/sounds.test.js:64` (a style of its own) and `:66-70`; `test/ui/art.test.js:36-39` (five role painters and their motion), `:62-64` (the look names an existing bunker skin, though world 20 has no bunkers), `:78` (a pickup rim), `:84-87` (a tint of its own for every power, the bomb and the life), `:164` (no `star`); `test/ui/looks.test.js:23` (body, three layers, ambient and flourishes that paint); the rules other worlds' music tests hold every other look to (`test/ui/sounds-bath.test.js:26-32`, `sounds-anvil.test.js:25`, `sounds-breath.test.js:22`, `sounds-glass.test.js:23`, `sounds.test.js:109`: their scale, tempo and root stay theirs alone); and the loops over `LOOKS` in `test/ui/music.test.js`, `bullets-view.test.js`, `warm.test.js` and the `sfx-*.test.js` files.
- Where one of those rules fails for world 20, the fix is to world 20's own data or files from parts 3-5 (its look data, its style, its art), never to the test and never to another world.
- If any other existing assertion fails, the builder stops and reports it; it is not changed.

## Acceptance tests

`node:test`, in `test/ui/`, as `test/ui/bath-look.test.js` does for world 19:

1. `LOOKS` has 20 entries, the twentieth is world 20's look with `world: 20`, and `lookFor` gives it to a level of world 20.
2. Through the registries the game uses, that look's sky body, three layers and ambient entries exist and draw under stand-in canvases, its five roles have world 20's art, and its music gives world 20's style.

The existing suite stays green (`npm test`) with only the assertions named above moved. Every code file stays under 200 lines.

## Out of scope

- The `WORLDS` entry, the levels, `BOSS_ART`, the lobby, poster and trailer rows (part 7).
- Any new drawing or sound beyond what a failing rule above demands of world 20.
- Any change to the look, art or sound of worlds 1-19.
