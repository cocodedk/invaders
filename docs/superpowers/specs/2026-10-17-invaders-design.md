# Invaders — design

Working title. The final name is chosen with its CNAME at publish time, as Barrage's was.

## Goal

A single-player cinematic arcade shooter for the Pi games menu (HDMI kiosk) and any desktop browser,
as beautiful as Barrage (`../artillery`): 8 cinematic worlds × 5 levels = 40 levels, free 2D
flight, formations, bosses, power-ups — plus one feature no shooter has: your own movie trailer
(§ The surprise).

## Stated by the user

- A classic arcade shooter, new project in `../`, many levels and variations, as beautiful as Barrage.
- 1 player only. Free 2D movement. Any level playable at any time (no unlocking).
- Variations: themed worlds, formation patterns, boss fights, power-ups. Worlds drawn from action
  and sci-fi film genres — think out of the box.
- Approved the 8 worlds and the level rules; asked to be surprised with something nobody has done.
- Barrage runs okay on the Pi.

Assumptions (not stated, chosen here): English only; keyboard + mouse, no gamepad; installed on the
Pi like Barrage; worlds evoke film genres under original names — no film titles, characters, logos or
quoted lines, so the repo can be public.

## Rules

- Logical frame 1920 × 1080, y down, letterboxed to fit. The ship flies anywhere in the player zone
  y ∈ [620, 1040], x ∈ [40, 1880]; max speed 720 px/s with a short ease (no ice-skating).
- **Lives:** 3 per level. A hit costs one and gives 1.5 s of blinking invulnerability. At 0 lives the
  level is failed → Retry or Level Select.
- **Wave levels** (levels 1–4 of each world): 3–5 formations arrive in sequence; the level is cleared
  when the last one is destroyed.
- **Alien roles** (every world draws its own sprite for each):
  - grunt — holds formation, fires rarely, 1 hp;
  - diver — leaves formation to swoop at the ship, then returns, 1 hp;
  - gunner — fires the world's bullet pattern, 2 hp;
  - armored — 3 hp, sparks and cracks per hit;
  - carrier — glows, 1 hp, always drops a power-up.
- **Formations** (pure functions `slotPosition(kind, t, slot)`): `grid` (classic march: step
  sideways, drop at the edge, speed up as it thins), `sway`, `dive` (swooping dives from the sides),
  `spiral` (enters along a spiral, then holds), `split` (a column that splits into two arcs),
  `escort` (armored ring around carriers), `rain` (falls in columns), `orbit` (circles a point).
- **Enemy bullet patterns** (shared library, data-driven): `aimed`, `fan`, `ring`, `spiral`,
  `laser` (0.8 s warning line, then a beam), `rain`, `homing` (slow, turns ≤ 60°/s, 4 s life).
  Every bullet has a bright core and a dark rim so it reads on any background.
- **Bunkers:** some waves place 3–4 destructible bunkers above the player zone, eroded by both
  sides' shots via a per-bunker pixel mask (Barrage's carve technique). Styled per world.
- **Boss levels** (level 5 of each world): one multi-part boss with a health bar, weak points
  (only they take full damage; armour plates take 25 %), 2–3 phases switched at hp thresholds,
  every attack telegraphed ≥ 0.6 s. Ends in a long destruction chain (staggered blasts, debris,
  white-out flash).
- **Power-ups:** spread, laser, rapid, shield. 10 s each; one at a time; a new one replaces the
  current. Fall at 160 px/s, collected by touch. Each world reskins them (Neon Rain's laser is a pink
  neon beam, Ronin Moon's spread is a fan of throwing stars).
- **Smart bombs:** separate stock, start each level with 1, max 3. Clears all enemy bullets and
  deals 3 damage to everything on screen (bosses: 8 % of max hp). Bomb pickups drop from carriers
  20 % of the time instead of a power-up.
- **Scoring:** grunt 100, diver 150, gunner 200, armored 300, carrier 250, boss 10 000. Combo: each
  kill within 1.5 s of the last raises the multiplier by 1 (max ×8); 1.5 s without a kill resets it.
  Clear bonus 2 000 + 3 000 if no hits.
- **Stars:** ★ cleared · ★★ cleared losing ≤ 1 life · ★★★ cleared with no hits. Best score and best
  stars per level are saved in `localStorage`.
- **Difficulty** is a property of the level, not of progress: bullet speed, fire rate, formation
  speed and alien hp scale with `(world, level)` so world 8 is hard even when played first.
- **Slow motion:** 0.3× for 0.8 s when the last alien of a wave dies, and on the boss's death.

## Worlds

Each world = palette + sky + 3 parallax layers + ambient particles + 5 alien sprites + boss +
bunker style + power-up skins + music mood + **one twist** (a small rule only that world has).

| # | World | Genre | Look | Twist | Boss |
|---|---|---|---|---|---|
| 1 | Arcade Origin | classic arcade | deep space, glowing CRT scanlines, crisp pixel aliens rendered with glow | classic bunkers in every wave; a bonus saucer crosses the top | Mothership |
| 2 | Neon Rain | rain-soaked cyberpunk city | night megacity, rain, holo-billboards, flying cars | darkness: aliens are lit only by their neon; lightning flashes light the whole screen | Corporate pyramid |
| 3 | Twin Suns | desert space opera | desert planet, two suns, imperial silhouettes | sandstorm gusts push all bullets sideways (Barrage's wind) | Star fortress with a trench to fly into |
| 4 | Ronin Moon | samurai ink-and-moon | ink-brush mountains, red moon, falling blossoms | enemy shots are slow, large shuriken; the ship's shots cut them | Shogun mecha |
| 5 | Hive | biomechanical horror | biomechanical caverns, mist, eggs | destroyed armored aliens leave acid that drips down for 2 s | Hive queen |
| 6 | Code Rain | digital-rain simulation | falling green glyphs, the frame glitches | aliens blink-teleport between formation slots; near misses trigger 0.5× bullet time (8 s cooldown) | Agent core |
| 7 | Iron Dawn | machine-war future | burning future war, chrome, red eyes | armored aliens reassemble once after 2 s unless their wreck is shot | Endoskeleton titan |
| 8 | Event Horizon | black-hole space epic | black hole with lensing, bent starlight | a gravity well bends every bullet, yours included | The Singularity |

## Look and effects

- Sky painter + procedural parallax silhouettes per world (Barrage's `sky-paint`/`parallax` reused);
  ambient particles: rain, sand, petals, spores, glyphs, embers, lensed stars.
- Ship: sleek glowing fighter, engine trail, banks when moving sideways, shield bubble, blink when
  invulnerable. Aliens: vector-drawn per world, pre-rendered at load into offscreen canvases
  (2 animation frames + a white hit-flash frame each).
- Explosions: flash, shockwave ring, debris, sparks, smoke; screen shake scaled by size; score
  pop-ups; combo meter that pulses at ×4 and burns at ×8.
- HUD: score, combo, lives, bombs, power-up timer ring, boss health bar; readable from across a
  room (Barrage's HUD sizes).
- Sound: WebAudio, no files — Barrage's synth approach. SFX (shot per power-up, hit, explosion,
  pickup, bomb, warning, boss roar) and a light synthesized music loop per world (drone + arpeggio
  in the world's scale). M mutes.
- Performance on the Pi 4: no per-frame `shadowBlur`; glow via pre-rendered sprites with
  `lighter`; caps: 600 particles, 400 enemy bullets. **Auto quality:** when the 1 s average frame
  time exceeds 20 ms, halve particle spawns and drop the far parallax glow; restore below 14 ms.
  `?debug` shows frame time and the quality level.

## The surprise — your run becomes a movie trailer

Skip this section to keep the surprise.

Because the core is deterministic (seeded rng + fixed 1/60 s tick), a whole run is just
`{ levelId, seed, inputs }`. The game records every run's inputs (run-length encoded) and uses them:

- **The trailer.** After a cleared level, the game cuts a ~20 s trailer of *your* run. A pure
  highlight picker scores moments from the event log — near misses (an enemy bullet passing within
  28 px), multi-kills (≥ 3 in 0.5 s), combo peaks, bombs, the last alien, the boss kill — and picks
  the best 4 non-overlapping 3–5 s windows, in order. They replay in the world's film look:
  letterbox bars, grain, vignette, colour grade, slow motion on the peak frame. Between clips come
  title cards in the world's voice, filled from your stats ("IN A CITY OF ENDLESS RAIN…",
  "47 INVADERS. 9 NEAR MISSES. ONE PILOT."). The last card is the world as a film title, your
  stars as critics' stars, and your score as "BOX OFFICE" — "RECORD" when it is a new best. Any key
  skips.
- **The blooper.** A failed level replays the fatal hit in slow motion with a clapperboard
  "CUT!" before the Retry screen.
- **Cinema.** A title-screen entry lists every level whose best run is saved and plays its trailer.
  Only the best run per level is kept (≈ 5 KB each).

Replays re-simulate from the start; the clip starts are captured as world snapshots during one
fast-forward pass, so playback never stalls. Effects use their own rng, so they may differ from the
original run — the game state never does.

## Screens

Title (a live autopilot battle in a random world behind the logo) · Level Select (a cinema lobby:
8 world posters, each with 5 level reels showing stars and best score) · Play · Pause ·
Trailer → Results (score, stars, best; Next / Retry / Select) · Blooper → Failed (Retry / Select) ·
Cinema · Watch, then try (below).

**Watch, then try:** on first launch (and from the title screen) an autopilot plays a short demo
level while captions explain moving, firing, power-ups, bombs and stars; then it hands over the
controls on the same level. The autopilot (pure, in core) moves under the nearest alien, dodges
bullets within a danger cone, and bombs when boxed in; it also drives the title backdrop.

**Controls:** arrows/WASD move · Space fires (hold for auto-fire) · B or Shift bombs · P/Esc
pauses · M mutes · Enter confirms. Mouse: the ship eases toward the pointer, left button fires,
right button bombs.

## Architecture

Same shape as Barrage: plain HTML/CSS/JS ES modules, no dependencies, no build step, no network at
runtime, relative URLs, every code file < 200 lines.

| Path | Contents | DOM? |
|---|---|---|
| `src/core/` | rng, ship, aliens, formations, bullet patterns, bunkers, power-ups, bombs, scoring, bosses (data + phase logic), twists, levels data, world, autopilot, replay (record/encode/re-sim), highlight picker. Pure, stepped by `dt`, randomness passed in. | no |
| `src/fx/` | particles, shockwaves, flashes, shake, pop-ups, slow-mo, film look state. Pure. | no |
| `src/ui/` | canvas drawing per world (sky, parallax, aliens, boss, bunkers), ship, bullets, HUD, screens, trailer/cinema player, input, audio, storage, quality scaler. | yes |
| `src/main.js` | boot, fixed-step loop, screen routing. | yes |
| `test/` | `node:test` mirroring `src/core` and `src/fx`. | no |

Reused from Barrage by copying and adapting (not a shared library): rng, particles, camera shake,
sky painter, parallax shapes, synth audio, storage, input, the fullscreen-safe screen system.

### Core contract

```js
world = {
  level,                      // { id: 'w3-2', world: 3, index: 2, seed, waves | boss, bunkers, twist }
  t, tick,                    // seconds and ticks since start
  rng, scale, intro, gap, march, nextId, // a { s } rng state, scaled difficulty, the wave's march state
  ship: { x, y, vx, vy, lives, invuln, power: null | { kind, left }, bombs, cooldown, alive },
  aliens: [alien], shots: [shot], bullets: [bullet], pickups: [pickup],
  bunkers: [{ x, y, w, h, mask }],
  boss: null | { kind, x, y, hp, maxHp, phase, parts: [{ id, dx, dy, w, h, hp, max, weak, armor, … }],
                 clock, enter, dying, blast, cd, mcd, warns },   // warns: attacks in their telegraph
  wave, score, combo: { mult, timer }, hits,
  state,                      // 'intro' | 'play' | 'cleared' | 'failed'
  events: [],                 // core pushes; main drains into fx, audio and the highlight log
  wind, slow, saucer, wrecks, well, twist, // the level's twist (twists.js)
}
alien  = { id, role, x, y, hp, maxHp, slot, mode /* 'enter'|'hold'|'dive'|'return' */, t,
           dive /* null | { fx, fy, ax, ay } */, minion /* true: launched by a boss */ }
bullet = { pattern, x, y, vx, vy, r, life }   // shot is the same shape, owned by the ship
```

Events: `fire | hit | kill | explode | bunker | pickup | power | bomb | shipHit | nearMiss |
waveClear | bossPhase | bossDeath | cleared | failed`, each with its fields (more were added since:
the code's file headers list them all).

API: `createWorld(level, seed = level.seed)`, `stepWorld(world, dt, input)` with
`input = { dx, dy /* -1..1 */, fire, bomb, target: null | { x, y } }`, `autopilot(world) -> input`,
`encodeInputs(list) / decodeInputs(str)`, `replay(level, seed, inputs, { snapshotsAt })`,
`pickHighlights(events, duration) -> [{ start, end, peak, kind }]`.

## Testing

`node --test` covers: rng determinism; ship bounds and easing; every formation stays on screen and
fills its slots; each bullet pattern's shape; hit detection and invulnerability; combo and scoring;
stars rule; power-up duration and replacement; bomb clears bullets and damages all; bunker carving;
boss weak-point damage and phase switches at hp thresholds; each world's twist; every level
validates; **determinism** — a run with random inputs replays to an identical state hash and
score; input encoding round-trips; the highlight picker returns non-overlapping windows in order;
the autopilot survives 60 s of level 1-1; `stepWorld` on the busiest level stays under 2 ms per
tick at the 95th percentile. Repo tests: 200-line limit, no external URLs, `src/core` and
`src/fx` use no `window`, `document`, `Math.random` or `Date.now`. Pixels are not tested.

## Out of scope

Two players, gamepad, online scores, video export of trailers, a level editor, other languages,
publishing (asked separately at the end).

## Install

Add `{ "id": "invaders", "title": "<final name>", "src": "../invaders", "out": ".", "thumb":
"og.png" }` to `../babak-games/games.json` and run `./deploy.sh invaders`. `og.png` is a 1200×630
shot of a level taken after the build.
