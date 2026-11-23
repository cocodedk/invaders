# World 22, the journey — Leg 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** World 22 (Wanderlight) with one level, `w22-1` (Leg 1, Dawn Valley): a top-down scrolling **course** with air craft, ground targets, walls, pillars, two checkpoints, a respawn, the ground weapon (seeds) and an end hold, flyable first in plain shapes, then in its full art, music and story.

**Architecture:** A course is a third level kind (`level.course`) beside `waves` and `boss`. All new state lives under `world.course` (plain data, cloneable, hashed only when present), stepped by `stepCourse(world, dt, input)` from `stepPlay`. Air craft are ordinary aliens (mode `'path'`) so shots, rams, scoring and drops come for free. Ground objects derive their screen y from distance (`y = SPAWN_Y + dist - at`), so holds freeze them for free and nothing drifts. The view gets a `look.ground` branch (as world 17's `look.heal`) that draws the course ground instead of sky and layers.

**Tech Stack:** Plain ES modules, canvas 2D, WebAudio, `node:test`. No dependencies.

**Spec:** `docs/superpowers/specs/2026-11-22-world-22-journey-design.md` (and the main spec for everything it doesn't say).

**Branch:** `world-22-journey` (made 2026-11-22, the design doc is its first commit).

## Before building (evening of 2026-11-22)

- [ ] Run `~/.claude-shared/skills/jev-decisions/scripts/plan-gate.sh` on each task below as its own slice (copy the task's section to a file). A task scoring under 0.8 simplicity gets cut and re-run. `UNSURE` → judge it yourself and say so.
- [ ] Execution: subagent-driven, a Sonnet-class worker per task, a fresh reviewer per task; integrate and verify each yourself (the owner's roles rule).

## Order: every commit is green

The repo's pre-commit hook runs the whole suite (`.githooks/pre-commit`), and `--no-verify` is never used. Adding world 22
to `WORLDS`/`LEVELS` breaks the lobby, posters and every per-world table at once, so world 22 joins the game in one
commit, after its core works. **Build order: 0, 2a, 2b, 2c, 3, 3b, 4, 5, 6, 7, 9a, 1, 8, 10, 11, 12.** Each is one green commit.

**New core events:** the task that first emits one (`groundKill`, `seedBurst`, `cut`, `chip`, `checkpoint`, `ability`, `respawn`, `holdBreak`) adds it to `SILENT` in `src/ui/sounds.js` and in `test/fx/react-all.test.js` (`'world 22: sounds and effects come in Task 12'`), and any new field to `test/event-sample.js`, so the event-coverage tests stay green; Task 12 gives each a real sound and effect.
Tasks 2a-7 build and test the course core on a test-only level from `test/core/course-kit.js` (Task 2a), which `createWorld` accepts as it accepts the tests' other own levels (`DEFAULT_PAR` covers its par). Nothing in `LEVELS` changes until Task 1.

## Global Constraints

- Everything in `CLAUDE.md` "Global constraints": no deps/bundler/network; every code file < 200 lines; `src/core` and `src/fx` never touch window/document/canvas/Math.random/Date.now; arrays only for anything iterated at runtime; World 1920x1080, y down, `TICK = 1/60`; inputs `dx, dy, fire, bomb, target`; 60 fps on a Pi 4 (no per-frame shadowBlur, ≤ 600 particles, ≤ 400 enemy bullets); English; Conventional Commits.
- Every tuning value is a named, exported constant defined once; tests read the constant, never repeat its number.
- Worlds 1-21 play and look exactly as before: `RUN_V` stays 11; no new rng draw, hash field or autopilot change when `world.course` is absent.
- Free flight and the pointer (R67, R68) unchanged; never ease or cap the pointer.
- The player's shots never share the enemy fire's hue.
- Original names only. Music: punchy beat, a major-third scale, not gloomy.

## Review Focus

1. **A death during a hold** → the respawn rebuilds from the last checkpoint and the hold comes back whole (targets at full hp, flight timer at 0). Test in Task 5.
2. **The last life lost on the same tick the last hold target breaks** → the clear wins; no respawn after a clear. Test in Task 6.
3. **Pointer resting inside a wall at respawn** → no hit while blinking; a hit once blinking ends with the ship still in rock. Test in Task 4.
4. **Bomb with ground targets on screen** → they take the bomb's damage; a laser beam never hurts them. Test in Task 3.
5. **Snapshot mid-run (trailer, structuredClone)** → stepping the clone from the same inputs gives the same hash as the original. Test in Task 7.

---

## Course data (reference for Tasks 1-8)

A course level carries `course: { speed, length, starts: [], walls: [[at, left, right], ...], spawns: [entry, ...] }`,
spawns sorted by `at` (px of scroll). Entry kinds, plain objects:

| kind | fields | made into |
|---|---|---|
| `air` | `at, role ('g'\|'d'\|'u'\|'a'\|'c'), path ('swoop'\|'cross'\|'dive'), x, pattern` | an alien on a path (2b) |
| `turret` | `at, x, hp` | a ground target that fires (2c) |
| `crate` | `at, x, hp, drop ('bomb'\|'life'\|null)` | a ground target with a pickup (2c) |
| `stone` | `at, x` | ground decor |
| `pillar` | `at, x, w, h` | terrain that rams (4) |
| `checkpoint` | `at, x, grants ('seed'\|null)` | a checkpoint (5) |
| `hold` | `at, targets: [{x, dy, hp}], flights: [{t, role, path, x, pattern}], period` | the end hold (6) |

### Task 0: Pin worlds 19-21 before any core change

**Files:** Modify `test/core/worlds-unchanged.test.js`.

- [ ] Add a `BEFORE_WORLD_22` table with the fingerprints (`fingerprint(id)` from `fingerprint-kit.js`) of `w19-1`, `w20-1`, `w21-1`, `w21-3`, `w21-5`, computed on the current HEAD (before Task 1), following the file's existing `BEFORE_WORLD_18` block.
- [ ] `npm test` passes. Commit `test: pin worlds 19-21 before world 22`.

### Task 1: World 22 joins the game (after Task 9a)

**Files:** Create `src/core/levels-8.js`; modify `src/core/levels.js`, `src/core/kinds.js`, `src/core/difficulty.js`, `src/core/ratings.js`, and the rows the tests require for every world: `src/fx/film.js TINTS`, `src/ui/trailer/cards.js VOICES`, `src/ui/screens/posters.js TAGLINES` and `AT`; update the tests that count 21 worlds or 105 levels.

**Interfaces — Produces:** `TWISTS` gains `'journey'` (`BOSSES` doesn't grow), `NAMES` gains `'Wanderlight'`. `levels-8.js` exports `JOURNEY = [[course(seed, data)]]` with `course(seed, data) => ({seed, course: data})`. `level()` makes a spec with `course` into `{...base, course}`, with no `waves` and no `boss`; `reelName` gives `'Leg N'` for it. `OWN[22] = [0.85]`; `RATINGS` gains a hand-set `7.0`. Leg 1 starts as `KIT_COURSE` stretched to two checkpoints and a hold (Task 8 writes the real one). Its look, aliens and pickup skins fall back to world 1's until Task 10.

- [ ] Failing tests: world 22 is `{id:22, name:'Wanderlight', twist:'journey', boss:undefined, free:true}`; `LEVELS.length === 106`; `levelById('w22-1')` has `course`, no `waves` or `boss`, and `reelName` `'Leg 1'`; the wave and boss rules skip course levels; `difficulty(22, 1)` in [0, 1]; its seed is unique.
- [ ] Implement; `npm test` green; open the lobby and start Leg 1 once. Commit `feat(world-22): world 22 joins the game with its first leg`.

### Task 2a: The scroll and the ground

**Files:** Create `src/core/course.js`, `test/core/course-kit.js`; modify `src/core/world.js` and `src/core/world-step.js` (one line each); test `test/core/course.test.js`.

**Interfaces — Produces:**
- `courseLevel(data)` in `course-kit.js`: a test level `{id:'test-course', world:22, index:1, seed:1, d:0.5, twist:'journey', free:true, bunkers:false, course:data}`.
- `createCourse(level)` → `{dist:0, next:0, ground:[]}`.
- `stepCourse(world, dt)`: `dist += speed * dt`; each spawn entry with `at <= dist` becomes a ground object `{id, kind, at, x, y, hp}` in `course.ground` (other kinds are added by their own tasks); each ground object's `y = SPAWN_Y + dist - at`; objects below `HEIGHT + GROUND_MARGIN` are dropped. `SPAWN_Y = -80`.
- `createWorld` sets `world.course` when the level has `course`; `stepPlay` calls `stepCourse` after `collide` when `world.course` is set.

- [ ] Failing tests: dist grows by `speed * TICK` each play tick and not during the intro; an entry appears on the first tick `dist >= at` at `y = SPAWN_Y + dist - at`; an object past the bottom is dropped; `worlds-unchanged` passes.
- [ ] Implement; `npm test` green; commit `feat(world-22): the course scrolls and lays out its ground`.

### Task 2b: Air craft fly their paths and fire

**Files:** Create `src/core/course-air.js`; modify `src/core/aliens.js` (export `fire` if it isn't); test `test/core/course-air.test.js`.

**Interfaces — Consumes:** `stepCourse` (2a). **Produces:** `spawnAir(world, entry)`, which `stepCourse` calls for an `air` entry instead of making a ground object: pushes `{id: world.nextId++, role, x, y: SPAWN_Y, hp, maxHp, mode:'path', path, t:0, x0, pattern}` to `world.aliens` (hp from `ROLES`). `stepAir(world, dt)` (called by `stepCourse`): advances `t`, sets x, y from `pathPos(path, t, x0, ship)` (pure; `swoop` curves down and out, `cross` enters from one side and crosses, `dive` falls toward the ship's x as it stood at `DIVE_LOCK` s and keeps that heading), and silently retires (hp 0, no score) one that leaves past `AIR_MARGIN`. In play it fires through aliens.js `fire(world, dt, pattern, (a) => a.mode === 'path' && a.pattern === pattern)`, once per distinct pattern among live path aliens. Shots, rams, scoring and drops are the aliens' own.

- [ ] Failing tests: each path moves and leaves, then the alien is gone with no score; a gunner on a path fires its pattern; a shot kills an air craft and scores by role; an air craft rams a free ship.
- [ ] Implement; tests pass; commit `feat(world-22): air craft fly their paths`.

### Task 2c: Turrets fire, crates drop, ground targets break

**Files:** Create `src/core/course-ground.js`; modify `src/ui/sounds.js` and `test/fx/react-all.test.js` (`groundKill` silent until Task 12), `test/event-sample.js` if a field is new; test `test/core/course-ground.test.js`.

**Interfaces — Produces:** `TURRET_COOL`, `GROUND_SCORE = {turret, crate}`. `stepGround(world, dt)` (called by `stepCourse`): a turret on screen fires one `'aimed'` bullet (Task 3b makes it `'heavy'`) every `TURRET_COOL` s, no rng. `hurtGround(world, g, dmg)`: hp down; at 0 it scores `GROUND_SCORE[g.kind] * combo`, emits `'groundKill' {kind, x, y}`, and a crate drops `makePickup(drop, x, y)`, or `dropPickup(world, g)` when `drop` is null. Stones, pillars and checkpoints can't be hurt.

- [ ] Failing tests: a turret on screen fires every `TURRET_COOL`; one off screen doesn't; a ship shot passes through a turret leaving it whole; `hurtGround` kills a turret and scores; a crate drops its pickup; a stone ignores `hurtGround`.
- [ ] Implement; `npm test` green; commit `feat(world-22): turrets fire and crates drop`.

### Task 3: Seeds (the ground weapon), abilities and bombs on the ground

**Files:** Create `src/core/course-seed.js`; modify `src/core/damage.js` (export `BOMB_DAMAGE`); test `test/core/course-seed.test.js`.

**Interfaces — Produces:** `createCourse` gains `abilities: [...level.course.starts], marks: [], seeds: [], seedCool: 0`. Constants `SEED_COOLDOWN`, `SEED_FALL`, `SEED_REACH`, `SEED_R`, `SEED_DMG`. `stepSeeds(world, dt, input)` (called by `stepCourse`, which now takes `input` from `stepPlay`): when `'seed'` is in `course.abilities`, `input.fire`, the ship alive, state play and `seedCool <= 0`, push `{x: ship.x, at: dist + SPAWN_Y - (ship.y - SEED_REACH), t: SEED_FALL}`; a seed at `t <= 0` bursts: `hurtGround` on every hurtable ground object within `SEED_R` (+ its size), pushes `{x, at, r: SEED_R}` to `course.marks`, emits `'seedBurst'`. A `'bomb'` event this tick (`world.events`) hurts every on-screen hurtable ground object by `BOMB_DAMAGE`.

- [ ] Failing tests: no seed without the ability; with it, holding fire drops one seed per `SEED_COOLDOWN`; a seed bursts after `SEED_FALL` at `SEED_REACH` ahead and hurts a turret there; a mark is added; a bomb hurts ground objects on screen; a laser beam (`stepBeam`) never hurts ground objects; reaching a checkpoint with `grants:'seed'` adds the ability (wired in Task 5 — here test `course.abilities` directly).
- [ ] Implement; tests pass; commit `feat(world-22): seeds, the ground weapon`.

### Task 3b: Shots break incoming fire

**Files:** Create `src/core/course-cut.js`; modify `src/core/patterns.js` (a `'heavy'` pattern: one aimed bullet, `r: HEAVY_R`, speed x `HEAVY_SPEED`; used by world 22 only), `src/core/world-step.js` (`if (world.course) cutBullets(world, dt, slow)` before `collide`); test `test/core/course-cut.test.js`.

**Interfaces — Produces:** `BULLET_HP = {aimed:1, fan:1, ring:1, spiral:1, rain:1, homing:2, heavy:3}` (a pattern missing from it, such as `laser`, can't be shot), `CUT_DMG = 1` (every gun shot), `BEAM_CUT_DPS`, `CUT_SCORE`. `cutBullets(world, dt, slow)`: each live ship shot, swept over its move this tick, is spent on the first bullet it touches (reach `b.r + s.r`) if that comes before any air craft on its path; `b.hp ??= BULLET_HP[b.pattern]`; `b.hp -= CUT_DMG`; at 0 `b.life = 0`, `world.score += CUT_SCORE`, emit `'cut' {x, y, pattern}`, otherwise emit `'chip' {x, y, pattern, hp}`. While the laser power's beam is on, every shootable bullet in its column above the ship collects `BEAM_CUT_DPS * dt` in `b.burn` and loses whole points of hp. Turrets (Task 2) fire `'heavy'`.

- [ ] Failing tests: an aimed bullet breaks on one shot and the shot is spent; a homing bullet needs two; a heavy shot three, with `'chip'` twice then `'cut'`; an enemy laser is untouched; the beam breaks a heavy shot after about `BULLET_HP.heavy / BEAM_CUT_DPS` s; a shot whose path meets a bullet before an air craft hits only the bullet; `worlds-unchanged` passes.
- [ ] Implement; tests pass; commit `feat(world-22): shots break incoming fire`.

### Task 4: Walls and pillars ram

**Files:** Create `src/core/course-terrain.js`; test `test/core/course-terrain.test.js`.

**Interfaces — Produces:** `bandAt(course, at)` → `{left, right}`, linear between the `walls` keyframes (also used by Tasks 7 and 10). `WALL_SAMPLES` (points along the ship's move). `terrainHits(world)` (called by `stepCourse`): the ship's move from `fromOf(ship)` to `(x, y)` sampled `WALL_SAMPLES` times; outside `bandAt(course, dist + SPAWN_Y - y)` by `SHIP_R` → `hitShip(world, 'wall')`; any pillar with `segBoxDist2(...) <= SHIP_R²` → `hitShip(world, 'pillar')`. Shield and blinking protect through `hitShip` as everywhere.

- [ ] Failing tests: `bandAt` interpolates between keyframes; a ship inside the band is untouched; one whose move crosses the wall in one tick is hit; a pillar crossed in one move hits; a shielded ship skims; a blinking ship inside a wall is not hit, and is hit on the first tick the blinking ends still inside (Review Focus 3).
- [ ] Implement; tests pass; commit `feat(world-22): walls and pillars`.

### Task 5: Checkpoints, death and respawn

**Files:** Create `src/core/course-check.js`; test `test/core/course-check.test.js`.

**Interfaces — Produces:** `RESPAWN_DELAY`, `RESPAWN_Y` (900). `createCourse` gains `respawn: null` and `check` (checkpoint 0: `{dist:0, next:0, score:0, bombs:1, lives:LIVES, abilities:[...starts], marks:0, x:MID_X}`). `stepCourse` doesn't scroll while `respawn` is pending. A checkpoint ground object is reached when its `y >= RESPAWN_Y`: emit `'checkpoint' {index, x, grants}`, add `grants` to `abilities` (emit `'ability' {kind}`), set `course.check = {dist, next, score, bombs, lives, abilities:[...], marks: marks.length, x}`. A hit with lives left is ordinary (`hitShip`: a life, blinking, play goes on). A death is the last life lost (`ship.alive === false` after `hitShip`) with no respawn pending: `course.respawn = RESPAWN_DELAY`. When `respawn` reaches 0: clear aliens, bullets, shots, pickups, ground, seeds; restore dist/next/score/bombs/abilities/marks length from `check`; `held = null`; power, reserve and combo reset; `ship.lives = Math.max(LIVES, check.lives)`; ship alive at `(check.x, RESPAWN_Y)` with `invuln = INVULN`; emit `'respawn'`. `settle()` in `world-step.js` never fails a course level (`else if (!world.course && ship.lives <= 0)`).

- [ ] Failing tests: reaching checkpoint 1 records it and grants `'seed'`; a hit with lives left costs a life and play goes on (dist keeps growing, nothing rebuilds); losing the last life starts the delay, then rebuilds (score/bombs/marks back, dist back, the spawns after it come again, lives `Math.max(LIVES, check.lives)`); a death during the hold rebuilds the hold whole (Review Focus 1); a course level never reaches `'failed'`; stepping is deterministic (two runs, same hashes).
- [ ] Implement (verify `stepShip` neither moves-to-fire nor collides while `alive === false`; guard if it does); tests pass; commit `feat(world-22): checkpoints and respawn`.

### Task 6: The hold, and the course's clear

**Files:** Create `src/core/course-hold.js`; modify `src/core/world-step.js` (`won`); test `test/core/course-hold.test.js`.

**Interfaces — Produces:** `HOLD_FLIGHTS_MAX`, `HOLD_Y` (300). `createCourse` gains `held: null`; `stepCourse` doesn't scroll while `held`. A hold entry spawns its targets as ground objects `kind:'gate'` (`holdId`, at `at + dy`); when `dist` reaches `at + HOLD_Y - SPAWN_Y`, `held = {holdId, t:0}` and dist stops; `held.t` counts; each flight spawns when `held.t` passes `flight.t + k*period` while fewer than `HOLD_FLIGHTS_MAX` air craft live; when no gate of that hold lives, emit `'holdBreak'`, `held = null`. `won(world)`: `if (world.course) return dist >= length && !held && respawn === null`.

- [ ] Failing tests: dist stops at the hold; flights repeat; breaking every gate resumes the scroll; the level clears at `length`; a death on the tick the last gate breaks still clears (Review Focus 2).
- [ ] Implement; tests pass; commit `feat(world-22): the end hold and the clear`.

### Task 7: Hash, clone, par, fairness and a clear test

**Files:** Modify `src/core/state-hash.js` (a `courseParts(world)` helper, `[]` when absent), `src/core/pars.js` (`parOf`: course → `ceilTo5(length/speed + holds*HOLD_PAR)`), `scripts/pars.mjs` and `scripts/ratings.mjs` (skip course levels/worlds; keep world 22's hand-set rating `7.0` in `RATINGS`); `test/core/pars.test.js` (course levels exempt from the table); create `test/core/course-fair.test.js`, `test/core/course-clear.test.js`.

- [ ] `courseParts`: dist, next, held t, respawn, abilities length, marks length, each ground object (kind, x, y, hp), seeds (x, at, t). Test: stepping a `structuredClone` from the same inputs matches the original's hash (Review Focus 5); worlds 1-21 hashes unchanged.
- [ ] Fairness test over the kit's course (and, from Task 8, over `w22-1`'s data): band never narrower than `BAND_MIN` at any `at` (step 1 px); no ground target or pillar inside a wall; every checkpoint and the start: no entry with `at` in `(cp.at, cp.at + RESPAWN_Y - SPAWN_Y + speed*RESPAWN_SAFE]` and the band spans the full free zone there; every gate target inside the band.
- [ ] Clear test (the kit's course now; `w22-1` from Task 8): an invulnerable ship (`invuln` kept high each tick), fire held, steering `target` at the nearest hurtable ground object ahead inside the band, else band centre, at `RESPAWN_Y`; the level reaches `cleared` within `parOf(level) * 3` seconds.
- [ ] Commit `test(world-22): fairness, a clear, hashing and par`.

### Task 8: Leg 1's real course (the story's three stretches)

**Files:** Modify `src/core/levels-8.js`.

- [ ] Write Leg 1 per the spec's story: stretch 1 grey (air swoops/crosses, `stone` decor, a gentle narrowing), checkpoint 1 `grants:'seed'`; stretch 2 (turrets, crates with pickups, pillars in the river, a gorge, a bridge with two turrets), checkpoint 2; stretch 3 (faster air, dives, turrets both sides), then the hold (the gate: 4-6 targets, higher hp, flights looping). About two minutes of scroll. `OWN[22]` tuned with it.
- [ ] Task 7's tests pass on the real data. Commit `feat(world-22): Leg 1, Dawn Valley`.

### Task 9a: Screens cope with a bossless, one-leg course world (before world 22 joins)

**Files:** `src/ui/screens/lobby-card.js` (no "Featuring" line when `!world.boss`), `src/ui/screens/posters.js` (`posterLevel(world)`: the boss level, else the world's last level; `w.boss?.x ?? W / 2`), `src/ui/screens/lobby.js` + `lobby-nav.js` (`step` takes per-world reel counts and clamps the reel; as 97f562d had it), `src/ui/flow.js:28` (`waves?.length`), `src/ui/hud.js` (a course panel: `LEG n` and lanterns lit / total instead of WAVE), `src/ui/scenes.js` (`pickBackdrop` already takes wave levels only: leave it). Tests: `lobby-nav.test.js`, `posters.test.js`, a new `test/ui/course-screens.test.js`.

- [ ] Failing tests, on synthetic objects (no world 22 yet): `step` with reel counts `[5, 5, 1]` never lands on a missing reel; `posterLevel` of a world without a boss level returns its last level; `cardOf` for a bossless world has no "Featuring" line and doesn't throw; the HUD draws a course world (`world.course` set) without reading `level.waves`; flow's failed card reads a level without `waves`.
- [ ] Implement; `npm test` green; commit `fix(ui): screens cope with a bossless one-level world`.

### Task 10: A plain, flyable view

**Files:** Create `src/ui/looks/w22.js` (register in `looks/index.js`; sky/3 layers present for tests, `ground: true`, its own `music.mood` with a placeholder `'road'` style in `sound-styles-2.js`, since every look needs a unique style; update the tests that count 21 looks or styles), `src/ui/course-view.js` (plain ground: parchment fill, walls as filled bands from `bandAt`, pillars, stones, turrets, crates, gates, checkpoints, seeds and their sights, marks as tinted circles), `src/ui/aliens/w22.js` (five simple kite painters, registered in `bake.js ART`), `pickup-skins.js FRAMES[22]`; modify `src/ui/view.js` (a `look.ground` branch: draw the course ground instead of sky + layers, scrolled by `world.course.dist`, never wall-clock).

- [ ] Failing tests: look tests pass for world 22; the view draws a course frame without throwing (dom-kit); `course-view` reads marks from `world.course.marks` only.
- [ ] Implement; `npm test` green; play it at `python3 -m http.server 8000` (serve no-store, see `memory/browser-checks.md`). **Stop here and let the owner fly the plain Leg 1.** Commit `feat(world-22): a plain, flyable Leg 1`.

### Task 11: The mockup's look in the game

The owner (2026-11-22, evening): "I like the simplicity of the artifact. let's keep it simple like that. The journey is
more important to me right now than the glitter." The art bar for world 22 is the mockup
(`https://claude.ai/artifact/U6svQwRCu16DFD8DrW52Lj`), not the lavish worlds: no sample-still round, no polish pass.

- [ ] `src/ui/course-ground.js`: pencil-on-parchment ground (contour lines, river, sketched trees, as the mockup draws them), baked in strips with a sketch and a painted canvas each; a mark stamps the painted strip through a soft circle once, and a strip entering the screen (or every strip after a respawn or snapshot) is rebuilt from `course.marks`. Nothing repainted per frame.
- [ ] Sprites as simple as the mockup's: grey diamond kites with a tail (the five roles told apart by size, shape and a mark), standing stones with one eye (shut when dormant), grey cages, the gate as a big stone ring, a brass lantern with a cached glow, the paper glider with its gold and turquoise ribbon (`ship-view.js` branch on `WANDER_WORLD = 22`), warm white shots (`lasers-view.js`), violet enemy fire. Painter tests: world 22's painters differ from worlds 20 and 21.
- [ ] Commit `feat(world-22): the simple look of the sketch`.

### Task 12: Story captions, music and sounds

- [ ] Captions in the world's voice: `A LIGHT WAKES.` at the start, `YOUR COLOUR.` on `'ability'`, the last trailer card `THE ROAD GOES ON.`; past the gate, blank parchment and one pencil line leading on.
- [ ] Music: the `'road'` style made real, kept simple: a plucked lead, a warm pad, claps and a punchy beat in a major-third scale; a lantern chime on `'checkpoint'`, a paper flutter on kite kills, a pop on `'seedBurst'`, a crack on `'chip'` and `'cut'`; every world 22 event moved from `SILENT` to a real sound and effect; loudness matched (`memory/music-loudness.md`).
- [ ] Copy: `index.html`, `og.html`, README, `CLAUDE.md` (22 worlds; world 22 grows a leg at a time), the main spec (R74 and the world row). Commit `feat(world-22): its story, music and sounds`.
