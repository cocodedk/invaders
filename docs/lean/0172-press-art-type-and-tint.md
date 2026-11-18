---
parent: "[[017-world-20-opens]]"
---

# World 20, part 7.2: the boss art is registered, the trailer typography row and the film tint

Part 2 of 3 of `docs/lean/017-world-20-opens.md` (World 20, "Midnight Press"). This part is `src/ui` and `test/ui`, plus one row in `src/fx/film.js` with its test in `test/fx`. It adds the three per-world rows that no test compares with `WORLDS` by length, so they can be listed before the world is: the boss art, the trailer typography row and the film grade colour. The suite stays green; the world is listed in part 7.3 (`0173-world-20-opens`). It draws nothing new.

## Goal

When world 20 is listed in part 7.3, its boss already has registered art, its trailer cards already have their typography and its film look already has its own grade colour.

## Behaviour

- The art of part 4 (`src/ui/bosses/editor.js`) joins `BOSS_ART` (`src/ui/bosses/bake.js`) under the kind `editor`, as the other nineteen are listed.
- `TYPE` in `src/ui/trailer/draw.js` gets a twentieth row, world 20's trailer typography.
- `TINTS` in `src/fx/film.js` gets a twentieth colour, world 20's film grade, different from every other world's (`test/fx/film.test.js:19-22` will require that once the world is listed).
- Decision (the grill and the person, 2026-11-18): these per-world rows are in scope. The person said "use your imagination": the typography and the colour are the builder's, in the voice of the other worlds.
- Design reference: world 19's rows in those same files.
- The repository's standing rules hold (CLAUDE.md): every code file under 200 lines, `src/fx` stays pure.

## Registrations

Existing assertions that move, and only as far as said:

- `test/ui/bosses.test.js:15`: the number of boss pictures goes from 19 to 20.

Existing rules that hold without moving: `test/ui/bosses.test.js:16` and `:110` and `test/ui/warm.test.js:26` loop over `BOSS_DEFS`, which does not have the editor until part 7.3; `test/fx/film.test.js:19-22` loops over `WORLDS`.

If any other existing assertion fails, the builder stops and reports it; it is not changed.

## Open point for the person (found while splitting; the spec does not settle it)

`test/ui/editor-parts.test.js:36-40` (part 4) asserts that the editor's art is no entry of `BOSS_ART` (`assert.notEqual(art, mod, kind)` for every entry, and the same for its hull and part painters). It was true only while the art was not registered and fails the moment `editor` joins `BOSS_ART`. The spec's list of assertions that may move does not name it, and the spec says any other failing assertion stops the builder. Part 6 met the same case and the decision there was that each such loop skips world 20's own entry and still holds every other entry to the rule. Whether that decision applies here is the person's to say before this part is built.

## Acceptance tests

`node:test`, in `test/ui/` and `test/fx/`, reading the constants and never repeating their values:

1. `BOSS_ART` has an entry for `editor`, and it is the art of part 4.
2. `TYPE` has a row for world 20.
3. A level of world 20 gets its own film tint: a colour no world from 1 to 19 has.
4. The whole suite is green (`npm test`) with only the assertion named above moved, and every code file is under 200 lines.

## Out of scope

- The `WORLDS` entry, the levels, `TWISTS`, `BOSSES`, `BOSS_DEFS`, pars and ratings, the lobby tagline, the poster time and the trailer voice (part 7.3).
- Any change to the trailer, the screens, the lobby's layout or the storage keys, beyond world 20's own per-world rows.
- Any new drawing or sound (parts 3-5), any change to how worlds 1-19 play or look.

## Decisions

2026-11-18, the open point above, answered by the runner on the person's standing word ("use your imagination", "stop for me if it is very necessary"), as part 6 decided the same case: the loop at `test/ui/editor-parts.test.js:36-40` skips the `editor` entry of `BOSS_ART` and still holds every other entry to the rule (the art, its hull and its part painters are no other boss's). It is an assertion that moves, as far as said here and no further. Nothing else in that file changes.
