# World 22, Leg 2: the Pencil Wood — design

Status: approved by the owner, 2026-11-23 ("approved, THE WOOD REMEMBERS. build it"). Branch `world-22-leg-2`, cut from `world-22-journey` (PR #33, Leg 1, not merged yet).
Parent design: `docs/superpowers/specs/2026-11-22-world-22-journey-design.md` (R74). Everything it says about courses, checkpoints,
rule B, holds, the run-out, shooting and the art bar holds here unless this file says otherwise.

## Intent

The owner (2026-11-23): "plan the next level". Wanderlight grows a leg at a time; each leg is one place, one new obstacle, one new
kind of Hush, one ability the light finds in itself, and one trace (the parent design's story table). Leg 2 follows that table's
row: **the Pencil Wood, a forest at noon; "Your line"; the trace: a fallen pencil the size of a tower.** The owner picked how the
line works (A, below) and asked to keep the other two ways for later legs (vault note `world-22-line-options`).

## Goals

- A second leg of about two minutes, harder than Leg 1 ("don't make it easy"), flown with the seed from the start.
- **Your line (A, the owner's pick):** once granted, the glider's path hangs in the air as a pencil stroke for a few seconds; incoming
  fire breaks on it. The player draws a wall by flying up, swiping sideways and dropping back behind it.
- A new kind of Hush that makes the line matter, and a new obstacle that fits the owner's shooting rule.
- Leg 2 in the level grid beside Leg 1, playable any time (Normal), with its own look: the mockup's pencil style, now a wood.

## Non-goals

- **Hardcore** (start over, lives carried across legs): later, its own design.
- New controls: there is no spare button, and a new one would change the replay format. The line is automatic.
- New music: Leg 2 plays the world's `road` loop.
- Lavish art: the art bar is still the mockup (vault note `world-22-art-simple`).

## Anti-goals

- A flick of the instant pointer (R68) drawing a free screen-wide wall. The line has an ink budget.
- Slowing, easing or capping the pointer to tame the line (the owner called the pointer "perfect").
- Anything that stands in the band and rams but can't be shot (the owner: "if the craft hits the buildings then the bullets must also
  hit the buildings"). Landscape at the band's edge (rock, here the wood) is the one exception, as in Leg 1.
- Leg 1 changing. It is pinned before any core change.

## Approaches (for the line)

- **A. Draw a wall** — the path hangs in the air for a few seconds and stops shots. **Picked by the owner** for Leg 2.
- B. A trailing screen — the last second of ribbon is solid. Kept for a later leg.
- C. A lasso — a closed loop wipes out what it holds. Kept for a later leg (recommended, not picked for now).

## How it works

### Your line (core, world 22 only)

- The ability `'line'`. Leg 2 starts with `['seed']` and its first lantern grants `'line'`; a later leg starts with both.
- Each tick the ship is alive and holds the ability, its swept move (from `fromX, fromY` to `x, y`, the same path the collisions
  sweep) is added to `course.line` as a stroke segment with its own age. A move of zero length adds nothing. A respawn or a pointer
  jump after a respawn never draws (the respawn resets the from-point; the first tick after a respawn draws nothing).
- **Ink budget:** the line holds at most `LINE_INK` px of stroke; drawing more rubs out the oldest ink first. Each segment fades
  after `LINE_LIFE` s. So a flick across the screen leaves only its last `LINE_INK` px, nearest the ship. (Picks to tune by play:
  `LINE_INK` about 700 px, `LINE_LIFE` about 3 s.)
- **It hangs in the air:** strokes are in screen space and don't drift with the land.
- **It stops shots:** an enemy bullet whose move this tick crosses a stroke (within the bullet's radius) breaks, whatever its hp, and
  rubs out `LINE_BITE` px of ink times the bullet's hp around the hit (`BULLET_HP`: a small shot 1, homing 2, heavy 3), so a
  curtain wears through. Event `'lineStop'` {x, y}. A bullet stopped by the line pays nothing (my call: a wall-drawing farm
  would otherwise pay; the gun's cut still pays `CUT_SCORE` as in Leg 1). Enemy lasers pass (they can't be shot, as in Leg 1). The ship's own shots, the
  ship and air craft pass through the line.
- Plain data in `world.course`, in the state hash and the snapshot, re-simulated exactly in replays.

### The new Hush: the Smudge

- Grey charcoal smudges that drift slowly down out of the canopy and hang near the top of the band, firing **curtains**: a wide row
  of slow shots across the band, too wide to dodge in the narrows. The answer is the line (or killing it fast).
- An air craft like the kites (hp, score, drops, rams), with a new slow path (drift down, hang, leave) and a new curtain pattern;
  its own sprite. How it is keyed (a new path and pattern on an existing role, or its own kind) is the builder's call.
- **A curtain** (my call): a row of small, slow shots `CURTAIN_W` px wide, the gaps between them narrower than the ship's disc, so it
  can't be slipped through. They are small shots (`BULLET_HP` 1), so the gun can also shoot a hole in one, as in Leg 1; the line is
  the other answer. Data rules: before the line is granted (stretch 1), every curtain leaves at least `BAND_MIN` of the band free at
  its row, so it can be flown round; after it, `CURTAIN_W` is at most `LINE_INK`, so one stroke can cover one curtain.

### The new obstacle: thorn hedges

- The Hush's grey brambles grown across the band: a hedge is a row of short thorn pieces, each a small box that rams like a pillar
  and is shot down like one (low hp: about `BREAK_SECS.thorn` 0.4 s of fire a piece).
- Most hedges leave a gap to weave through. Some close the whole band and must be **shot through**. New data rule for those: the
  weakest piece breaks under the base gun before it scrolls from the top of the screen to the top of the free zone. The band rule
  (`BAND_MIN`) counts every standing hedge except these shoot-through ones.
- They fit the owner's rule: they ram, and the bullets break them.
- More data rules (my calls): a thorn piece is at least `2 * SHIP_R + THORN_SLACK` wide, so one broken piece lets the ship through;
  no air craft is on screen while a shoot-through hedge scrolls from the top of the screen to the free zone, so nothing else soaks up
  the shots meant for it.

### The wood (landscape)

- The band's edges are the wood itself: massed tree canopies, landscape like Leg 1's rock (they ram; shots fly over).
- **The trace:** the fallen pencil the size of a tower lies across the wood floor in stretch 2, its point snapped, its graphite
  line running on in the same hand as the ribbon. Art only, on the ground, flown over.

### Leg 2 in the course of the leg (direction for the data)

- **Opening:** the glider comes out of Leg 1's blank parchment into the edge of a sketched wood at noon. Opening card (owner's words,
  to approve).
- **Stretch 1, the wood's edge:** tree lines shape the band; kites; the first single Smudges with sparse curtains you can still
  dodge; hedges with wide gaps; a few turrets in clearings.
- **Lantern 1:** grants the line. Caption (to approve).
- **Stretch 2, the deep wood:** Smudges in pairs, curtains across the narrows (draw the line); shoot-through hedges; the fallen pencil
  across the floor; crates in the clearings. Lantern 2.
- **Stretch 3, the clearing:** dives and Smudges together, then the hold: **the Grey Thicket**, a ring of thorn gates (hold targets,
  like Leg 1's gates: they don't ram; "thorn" is their look) in a clearing,
  Smudges and kites in its flights. The scroll stops; when the last gate falls the flood comes, the run-out flies into blank
  parchment, and the last card is **"THE ROAD GOES ON."**
- All of it obeys the course fairness rules (`test/core/course-fair-kit.js`) plus the hedge rule.

### Leg 2 joins the game

- `JOURNEY` gains Leg 2 (`w22-2`), "Leg 2" on its reel, 107 levels in all. The world 22 card shows two reels.
- One-leg assumptions to fix and test: `posterLevel` (the poster stays on Leg 1 and its checked frame), `OWN[22]` (one value a leg),
  tests that take `LEVELS.at(-1)` as Leg 1, copy that says 106 levels, the land art keyed by leg, the opening caption keyed by leg.
- `w22-1` is pinned (a fingerprint and a clear-kit state hash) before any core change, and must not move.

### Look (after the owner has flown the plain leg)

- The mockup's pencil-on-parchment style, as a wood at noon: sketched canopies with short noon shadows, clearings, a path; seeds bring
  back green canopy and bluebells; the band's edge is dense canopy instead of tan rock.
- The line: graphite with a thin gold and turquoise edge (the ribbon hardened), fading as it ages; a bullet breaking on it leaves a
  smudge.
- The Smudge: a soft grey charcoal blot with one shut eye that opens to fire. Thorn hedges: grey bramble knots. The Grey Thicket:
  a ring of bramble gates round a dark clearing.
- Sounds: a pencil scratch on `'lineStop'`, a bramble snap on a thorn piece breaking.

### Measuring

- The test pilot (clear kit) stays invulnerable and proves the leg ends: every hold breaks, nothing stalls (my call; a pilot that
  draws lines would be the course bot the parent design turned down). Curtains are kept answerable by the data rules above, which
  `course-fair-kit.js` checks. Par is computed.
- `OWN[22]` gains a value for Leg 2 a little above Leg 1's 0.85 (a pick, about 0.9); the card's rating stays one per world (7.0). The
  owner's play tunes the leg.

## Story words (the owner's, to approve word for word)

- Opening card: **"THE WOOD REMEMBERS."** (approved; the alternative "SOMETHING FELL HERE." was not picked)
- Ability caption: **"YOUR LINE."** (approved)
- Last card: **"THE ROAD GOES ON."** (as Leg 1)

## Left to the builder

The tuning numbers (marked as picks), how the Smudge is keyed, the hedge layouts, the exact data of the three stretches, the
sprites' details within the art bar, and the slicing of the build.

## Stop point

Build the core, the data and a plain view first; stop so the owner can fly the plain Leg 2; then the look, the captions and sounds.
