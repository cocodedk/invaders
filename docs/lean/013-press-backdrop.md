---
parent: "[[01-world-20]]"
---

# World 20, part 3: the printing hall (look data, backdrop and colophon)

Part 3 of 7 of `docs/lean/01-world-20.md` (World 20, "Midnight Press"). This part is `src/ui` and `test/ui` only: the look of world 20 behind the fight.

## Goal

Write world 20's look data (`src/ui/looks/w20.js`) and its backdrop: the sky, three parallax layers, the ambient particles, and the colophon. The look is not listed in `LOOKS` yet (part 6 does that); the tests of this part use the look as the game will have it, `{ world: 20, ...w20 }`, under stand-in canvases, as `test/ui/bath-env.test.js` does for world 19.

## Behaviour

- World 20, "Midnight Press": a great printing hall at night. Cream paper, ink black and one vermilion spot colour; sheets hang drying on lines like sails, presses stand as tall as towers, type drifts in the air.
- Design reference: world 19, Rubber Regatta, as it is in the game (`src/ui/looks/w19.js` and its backdrop files). World 20 has the same parts in the same places: a sky, three parallax layers and ambient particles (the cast and the boss are part 4).
- The look data carries the palette of the hall (paper, ink, vermilion) that parts 4 and 5 paint in, in the shape of `looks/w19.js`.
- The colophon: a printed sheet in the near parallax layer, low on the right where world 19 has its brass plate (`src/ui/parallax-bath-plate.js` is the reference), reading exactly `built by graph skill fable-5.2 2026-11-18. cocode.dk`. It stays in the frame, clear of the HUD, and is readable at 1920x1080. The text is one named constant.
- The Pi limits hold: no per-frame `shadowBlur`, glow from cached sprites.

## Registrations

- The painters join the registries the renderer reads them from, under names no other world uses: the sky body in `BODIES` (`src/ui/sky-bodies.js`, from a new file as `sky-bodies-11.js` is for world 19), the three layer kinds in the parallax registry (`src/ui/parallax-shapes.js`), the ambient kinds in the ambient registry, and any flourish in the flourish registry (`src/ui/flourish.js`).
- Existing assertions that move, and only as far as said: four tests count the sky bodies as a sum over the files they know, and each gains world 20's file as one more term of that sum: `test/ui/bath-look.test.js:70`, `test/ui/glass-env-look.test.js:51`, `test/ui/smog-look.test.js:72`, `test/ui/storm-look.test.js:47`. Their rule (one painter a world, none overridden) is not loosened.
- The look does not join `LOOKS` (`src/ui/looks/index.js`) here: a twentieth look makes `test/ui/sounds.test.js:64` demand a twentieth sound style, `test/ui/art.test.js:78` a pickup rim for world 20 and `test/ui/art.test.js:36` its alien art, which are parts 4 and 5. It joins in part 6.
- If any other existing assertion fails, the builder stops and reports it; it is not changed.

## Acceptance tests

`node:test`, in `test/ui/`, reading the constants and never repeating their values:

1. The colophon's constant is exactly `built by graph skill fable-5.2 2026-11-18. cocode.dk`.
2. World 20's look names a sky body, three layers and ambient entries that all exist in their registries, none of them a key another world registers, and they draw under stand-in canvases.
3. The colophon is drawn in the near layer, low on the right, inside the frame and clear of the HUD.
4. No file of this part uses `shadowBlur` per frame.

The existing suite stays green (`npm test`) with only the four assertions named above moved. Every code file stays under 200 lines.

## Out of scope

- Listing the look in `LOOKS` (part 6).
- The aliens and the boss (part 4); the ship, shots, power-up skins, the carbon copy and the music (part 5).
- The `WORLDS` entry, the lobby, poster and trailer rows (part 7).
- `og.png` and `og.html`.
- Any change to the look of worlds 1-19.
