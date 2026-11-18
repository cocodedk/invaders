---
parent: "[[01-world-20]]"
---

# World 20, part 4: the cast and the Night Editor, drawn

Part 4 of 7 of `docs/lean/01-world-20.md` (World 20, "Midnight Press"). This part is `src/ui` and `test/ui` only: what the enemy side of world 20 looks like. It builds on part 2 (`012-editor-boss-data`, the boss's parts and phases in `src/core/bosses-data-7.js`) and part 3 (`013-press-backdrop`, the look data `src/ui/looks/w20.js` and its palette).

## Goal

Draw world 20's five aliens and its boss.

## Behaviour

- Design reference: world 19, Rubber Regatta, as it is in the game (`src/ui/aliens/w19*.js`, `src/ui/bosses/duck*.js`). World 20 has the same parts in the same places: a cast of five aliens (grunt, diver, gunner, armored, carrier) and the boss.
- The cast are inky type creatures, in the hall's cream paper, ink black and one vermilion spot colour.
- The boss is `editor`, the Night Editor: a colossal ink octopus in a green eyeshade with a red pencil in every arm. Its picture follows the parts and phases part 2 gave it; the art reads the definition from `src/core/bosses-data-7.js`, since `bossDef('editor')` finds nothing until part 7.
- The Pi limits hold: no per-frame `shadowBlur`, glow from cached sprites.

## Registrations

- The cast joins the alien art list in slot 20 (`ART` in `src/ui/aliens/bake.js`, which is not exported and which no test counts). Nothing reads slot 20 until a look with `world: 20` is drawn, so no existing assertion moves.
- The boss art does not join `BOSS_ART` (`src/ui/bosses/bake.js`) here: `test/ui/bosses.test.js:15` pins its size at 19, and the boss is not in `BOSS_DEFS` yet. It joins in part 7. The tests of this part paint the boss from its own module.
- No existing assertion changes in this part. If one fails, the builder stops and reports it.

## Acceptance tests

`node:test`, in `test/ui/`, as `test/ui/aliens-bath.test.js` and `test/ui/duck-parts.test.js` do for world 19, with the look as `{ world: 20, ...w20 }`:

1. World 20 has its own art for each of the five roles, in slot 20 of the alien art (`art(look)` returns it), none of it another world's.
2. `editor` has its own boss art, and it draws every part in every phase of the definition under a stand-in canvas.
3. No file of this part uses `shadowBlur` per frame.

The existing suite stays green (`npm test`) with no existing assertion changed. Every code file stays under 200 lines.

## Out of scope

- Listing the boss art in `BOSS_ART` (part 7) and the look in `LOOKS` (part 6).
- The boss's rules (part 2), the backdrop (part 3), the player's side and the music (part 5).
- The `WORLDS` entry, the lobby, poster and trailer rows (part 7).
- Any change to the art of worlds 1-19.
