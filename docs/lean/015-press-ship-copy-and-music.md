---
parent: "[[01-world-20]]"
---

# World 20, part 5: the ship, its shots, the power-up skins, the carbon copy and the music

Part 5 of 7 of `docs/lean/01-world-20.md` (World 20, "Midnight Press"). This part is `src/ui` and `test/ui` only: the player's side of world 20 and its sound. It builds on part 1 (`011-echo-rule`, the copy's state in `world.twist`) and part 3 (`013-press-backdrop`, the look data `src/ui/looks/w20.js` and its palette).

## Goal

Give world 20 its own ship, shot skin, power-up skins and music mood, and draw the carbon copy of the echo rule.

## Behaviour

- Decision (the person, 2026-11-18): asked whether world 20 should reuse an existing ship, shots, power-up skins and music or get its own, the answer was "if possible innovate". So it gets its own.
- Design reference: world 19, Rubber Regatta, as it is in the game (`src/ui/ship-bath.js`, `src/ui/shots-bath.js`, `src/ui/pickup-bath.js`, `src/ui/music-bath.js`).
- Its own ship, its own shot skin and its own power-up skins, in the hall's paper, ink and vermilion: the ship is a folded paper dart with an inked nib, and its shots are ink strokes. The renderer picks them for a look with `world: 20`, the way `ship-view.js` and `lasers-view.js` pick world 19's by `BATH_WORLD`.
- The carbon copy is the same ship drawn as a faint blue carbon tracing, and its shots are blue. It is drawn where the echo state of part 1 says the copy stands, and not at all while there is no copy. If the state of part 1 does not tell a copy's shot from the ship's, telling them apart is in scope here (the one change to `src/core` this part may make), and every acceptance test of part 1 keeps holding.
- The power-up kinds are the six standard ones; only their skins are new.
- Its own music mood, made the way world 19's is: a night-press mood (a slow mechanical pulse, like a press turning over) on a scale no other world uses. Every scale in `SCALES` (`src/ui/sound-data.js`) is taken, so this is a new entry there, and the mood is a twentieth style beside world 19's (`src/ui/sound-styles-2.js`). The look data (`looks/w20.js`) gets its `music` entry.
- The Pi limits hold: no per-frame `shadowBlur`, glow from cached sprites.

## Registrations

- The pickup rim joins `FRAMES` as entry 20 (`src/ui/pickup-skins.js`). The tests that count `FRAMES` ask for at least a number (`test/ui/art-carnival.test.js:122`, `test/ui/art-deep-pickup.test.js:44`), so no existing assertion moves.
- The style joins `STYLES` and the scale joins `SCALES` (`src/ui/sound-data.js`). One existing assertion moves: `test/ui/sounds.test.js:65` pins the number of styles at 19 and goes to 20 (its message with it).
- Existing tests hold every style and every scale to rules, and world 20's meet them unchanged: no style shares another's mood, no scale equals another's, and the loops over `STYLES` in `test/ui/music.test.js:156`, `sounds.test.js:133`, `sounds-bath.test.js:43`, `sounds-breath.test.js:36`, `music-anvil.test.js:173` and `music-bath.test.js:162`.
- The look does not join `LOOKS` here (part 6).
- If any other existing assertion fails, the builder stops and reports it; it is not changed.

## Acceptance tests

`node:test`, in `test/ui/`, as `test/ui/bath-shots.test.js` and `test/ui/music-bath.test.js` do for world 19, with the look as `{ world: 20, ...w20 }`:

1. World 20's ship, plain shot and pickup rim are its own: drawn for a world 20 look, none of them another world's, and no other world draws them.
2. With a copy in the echo state the carbon copy is drawn at the copy's place, as the ship's shape, and a copy's shot is drawn blue; with no copy nothing is drawn for it.
3. World 20's music mood is its own (`kitFor` of the look's music gives its style), and its scale is one no other world uses.
4. No file of this part uses `shadowBlur` per frame.

The existing suite stays green (`npm test`) with only `test/ui/sounds.test.js:65` moved. Every code file stays under 200 lines.

## Out of scope

- A new kind of power-up (the skins are in scope, the kinds are the six standard ones).
- The echo rule itself (part 1), the backdrop (part 3), the aliens and the boss (part 4).
- Listing the look in `LOOKS` (part 6); the `WORLDS` entry, the lobby, poster and trailer rows (part 7).
- Any change to the ship, shots, pickups or music of worlds 1-19.
