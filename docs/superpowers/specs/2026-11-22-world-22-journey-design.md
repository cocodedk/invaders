# World 22, the journey (design)

Status: draft for the owner's approval, 2026-11-22. It becomes ruling **R74** when it lands in the main spec
(`docs/superpowers/specs/2026-10-17-invaders-design.md`), which stays the authority for everything not said here.
The world and its story are in the last two sections.

## Intent

The owner asked (2026-11-22) for a world that changes the game "from defending to traversing a plane": the
craft travels over the land, shoots ground targets and incoming craft, different obstacles show up, every
death starts it again from the last checkpoint, and the player gains new abilities as levels are accomplished.
It must not stop at five levels: it is "a journey to self discovery", and "finishing it is not the goal, the
journey is the goal". The theme was left to the build ("use your fantasy and surprise me"), and the owner
asked for the first level first, with more added later, one at a time.

Decided by the owner in this conversation:

- **Abilities, Normal play (their pick "a"):** any level is playable at any time, as in every world. A level
  starts with the abilities of every level before it and earns its own partway through, at a checkpoint.
- **Hardcore (their addition):** an option to "start over" and play the journey for real. Levels unlock only
  as they are cleared, and the whole journey is **one run**: lives carry over from level to level instead of
  resetting to 3, and at 0 lives the run goes back to level 1 with no abilities (their pick "1").
- **Length:** open-ended. The world grows a level at a time and never needs an ending.
- **Hits (their pick "B", 2026-11-22):** a hit works as in every other world: it costs a life, the ship blinks,
  and play goes on from where it is. Only when the last life is gone does the leg go back to the last
  checkpoint, with the lives refilled. In Normal a leg can never be lost; only Hardcore makes failing cost.

## Goals

- A third kind of level beside wave levels and boss levels: a **course**, a stretch of land that scrolls
  under the ship with ground targets, air craft and obstacles placed along it, and checkpoints.
- World 22's first level, **Leg 1**, built and flyable, with its one ability, in the simple look of the mockup.
- A frame that makes adding Leg 2 mostly data, art and one new ability.

## Non-goals (for this build)

- **Hardcore.** It is decided (above) and recorded so that it gets built as decided, but it needs at least two
  legs to mean anything, so it comes with Leg 2. Note for then: a Hardcore leg starts with lives carried over,
  so its saved run must record them, or its replay diverges.
- Legs after the first, and their abilities. The theme section sketches a direction; nothing there is
  committed.
- A boss. World 22 has none for now, as world 18 had none while it was a one-level preview.
- Teaching the autopilot to fly a course (see Measuring).

## Anti-goals (a failure even if it works)

- **Gloomy.** A "journey to self discovery" read as melancholy would miss. The owner found a slow, sad loop
  "gloomy" (world 20). The mood is wonder and momentum, and the music has a punchy beat in a major key.
- **Unfair.** A wall the ship cannot get past, a respawn into danger, or a shot fired from off screen. A death
  must always feel like the player's own.
- **Farmable.** Dying must never pay: whatever was earned since the checkpoint is lost on a death.
- **Preachy.** The self-discovery shows through the land and the ship, never through lectures or slogans.
- **Breaking worlds 1-21.** They play and look exactly as before: their pinned fingerprints hold and the
  replay version stays 11.

## Constraints

Everything in `CLAUDE.md`'s global constraints holds: pure `src/core`, deterministic, arrays only, named
tuning constants defined once, files under 200 lines, 60 fps on a Pi 4 with no per-frame `shadowBlur`, original
names. Also:

- **Free flight and the pointer (R67, R68) hold unchanged.** World 22 is a free world (`FREE_ZONE`), the ship
  stands where the pointer points the same tick, and every collision sweeps the ship's path. Never ease or cap
  the pointer.
- **The input stays** `dx, dy, fire, bomb, target`. Leg 1's ability needs no new button. An ability that needs
  one later means a codec change and a decision of its own.
- **The player's shots never share the enemy fire's hue** (the owner took red for incoming fire, 2026-11-19).
- **Bosses from world 21 on are alive** (`life.js`). This binds world 22's first boss, whenever there is one.

## Approaches considered

1. **World 22 inside the world grid, with a growing list of levels (chosen).** World 22 is a 22nd world with its
   own poster card, and its levels are courses with ids `w22-1`, `w22-2`, …, added one at a time. This is
   exactly how world 18 shipped as a one-level preview (97f562d) before it got five levels. The lobby, results,
   trailer, blooper, cinema, scores, medals and storage all work by level id, so they come for free. The cost:
   the tests that expect five levels a world, or a level that is waves or a boss, learn a third kind, and the
   par and the card's rating can't come from the autopilot (see Measuring).
2. **A separate Journey mode with its own entry on the title screen and its own list of stages outside
   `LEVELS`.** It is cleaner for an endless journey and for Hardcore, but every screen that looks a level up by
   id (results, trailer, cinema, storage, replay) would need an adapter or a copy. That is more moving parts for
   nothing the owner asked for.
3. **Five legs now, like every other world.** Rejected: the owner said "not only 5 levels" and "build the first
   level and then we add".

## How it works

### The course (core)

The simulation stays in **screen space**, with no camera. A course level has `course` data instead of `waves`
or `boss`, and the world carries a `course` state:

- **Distance.** A counter `dist` goes up by the course's scroll speed every tick, unless a hold has stopped it.
  The speed is one named constant per course, in its data. Everything on the ground drifts down the screen at
  that speed, so a thing placed at course position `at` enters at the top of the screen when `dist` reaches
  `at`.
- **Spawns.** The course is one array of entries sorted by `at`. Each tick spawns, in array order, the
  entries whose `at` has come up. The kinds are:
  - **Air craft:** aliens of the world's five roles that fly a path (a swoop down and out, a crossing from
    one side, a dive at the ship) and fire from the existing bullet-pattern library. They reuse the aliens' hit
    points, scoring, drops and sprites, and they ram as aliens do in free flight.
  - **Ground targets:** objects on the ground that drift with it. The **turret** kind fires slow aimed shots
    while on screen. The **crate** kind fires nothing and holds a pickup. They are low, so the ship flies over
    them and they never ram. Only the ground weapon and bombs hurt them; the gun fires over them.
  - **Obstacles:** tall terrain that rams (a hit, see Death). **Walls** narrow and widen the flyable band (its
    left and right edges given as keyframes by distance). **Pillars** are columns standing inside the band. They
    can't be destroyed.
  - **Checkpoints** (below).
  - **Holds:** the scroll stops at a hold until every target in its group is destroyed. Because `dist` stands
    still, a hold brings its own air craft: a list of flights timed in seconds since the stop, repeated until
    the hold breaks (capped at `HOLD_FLIGHTS_MAX` air craft alive). A respawn before a hold rebuilds it whole,
    timer included. Leg 1 ends on a hold.
- **The end.** A course is cleared when `dist` reaches its length with no hold standing. The clear, the tally
  and the medal follow the existing rules. The par is computed, not measured (see Measuring).
- **What the ground weapon has done is core state.** Every burst is kept in `course.marks` as plain data
  in course coordinates (x, at, r). The view draws the ground's change from that array, so a respawn, a
  snapshot or a trailer clip shows exactly what the run had done by then.

### Checkpoints and death

- A **checkpoint** stands on the ground at a fixed course position. When it drifts down to the respawn line
  (`RESPAWN_Y`, near the bottom of the free zone) it is reached (`checkpoint` event, a chime). The checkpoint
  is a small record: `dist` at that moment, score, bombs, lives, the abilities held and the length of
  `course.marks`. It is never a stored copy of the world.
- **A checkpoint stands in a quiet stretch.** This is a data rule. No spawn lies between it and the top of the
  screen at the moment it is reached, nor in the next `RESPAWN_SAFE` seconds of scroll, and the walls stand
  open to the full width of the free zone along that whole stretch. A respawn therefore rebuilds the screen
  the player saw when they reached the checkpoint, with nothing on it but open land, so the ship is safe
  wherever the pointer stands.
- **A hit works as in every world:** an enemy bullet, a ram by an air craft, a wall or a pillar costs a life
  and gives the usual 1.5 s of blinking, and play goes on from where it is. All of them go through the one
  existing `hitShip`, so the shield and the blinking protect against terrain exactly as they do against
  everything else. A shielded ship may skim a wall for as long as its shield lasts. If the shield or the
  blinking runs out while the ship is inside a wall, that is another hit.
- **A death is losing the last life.** After a short beat (`RESPAWN_DELAY`), the leg rebuilds from the
  checkpoint. Everything on screen goes. The spawns after the checkpoint's `dist` come back as they were.
  Score, bombs and `course.marks` return to the checkpoint's values. The power-up and the combo are lost.
  Lives refill to the checkpoint's count, and never fewer than the start's 3 (`LIVES`). The ship is placed at
  the checkpoint's x on `RESPAWN_Y`, blinking for the usual 1.5 s. There is no special rule for the pointer
  (R68): a mouse player's ship goes where the pointer points on the next tick, as it always does. The level's
  start counts as checkpoint 0 and obeys the quiet stretch rule.
- **A course never fails in Normal.** `settle()` never fails a course level; there is no Blooper for one. Every
  hit still counts in `world.hits`, so the stars and the tally show how cleanly it was flown. (Hardcore,
  later, is where failing costs: lives carry over and 0 lives sends the run back to Leg 1.)
- The respawn is part of the simulation, driven only by the run's inputs, so replays, trailers and the blooper
  stay exact. A trailer clip may show a death and the checkpoint it returns to.

### Abilities

- A level's data names the abilities it starts with, and the checkpoint that grants its own. The abilities
  held are plain world state (`course.abilities`, an array) and part of the checkpoint record.
- Normal play never grants an ability by itself and never reads storage for one, so a level plays the same
  whoever plays it.
- A gained ability shows a short caption in the world's voice that names it and says what it does: teaching,
  not preaching.

### Leg 1's ability: the ground weapon

From the first checkpoint on, every volley the gun fires also drops a **seed**, on its own cooldown
(`SEED_COOLDOWN`). The seed lands after `SEED_FALL` seconds at a small sight drawn a fixed distance ahead of the
ship (`SEED_REACH`), and bursts in a ring (`SEED_R`). The burst hurts the ground targets in the ring and adds a
mark to `course.marks`. It needs no new button, since the fire button drops it, and it works with the instant
pointer. It makes positioning the skill: put the sight on the target and keep flying.

### Shooting down incoming fire

The owner asked (2026-11-22): "my projectile must destroy the incoming projectile with one or more hits depending
on what weapon I am shooting with and what type of incoming I am blasting." In world 22:

- **Every enemy bullet has hit points by its type** (`BULLET_HP`): the small ones (aimed, fan, ring, spiral, rain)
  take 1, a homing bullet takes 2, and the **heavy shot** takes 3. The heavy shot is a big, slow bullet, a new
  pattern in the library that only world 22 uses; the standing stones fire it, so Leg 1 has all three. An enemy
  laser beam can't be shot.
- **Every weapon deals its own damage to bullets** (`CUT_DMG`). A gun shot deals 1: the base gun, rapid, each spread
  pellet, homing shots and the side guns. The laser power's beam wears down every bullet in its column at
  `BEAM_CUT_DPS`, so it chews through heavy shots. A bomb clears every bullet, as it does now. Seeds never touch
  bullets, since they fall to the ground.
- **A shot is spent on the first thing its path touches,** a bullet or an air craft. Breaking incoming fire costs
  damage you could have dealt to the Hush, and that trade is the point.
- **Feedback:** a bullet that is hit but not broken flashes and cracks (`'chip'`). A broken one bursts (`'cut'`) and
  pays `CUT_SCORE` points, outside the combo.
- It is scoped to world 22 (`world.course`), so worlds 1-21 are unchanged.

### Leg 1

About two minutes in three stretches, split by two checkpoints, ending on a hold:

1. **No ground weapon yet.** Air craft swoop and cross, and the walls teach the band: wide, then a gentle
   narrowing. Ground targets stand dormant and fire nothing, a promise of what comes later. Checkpoint 1 grants
   the ground weapon.
2. **The ground wakes.** Turrets fire. Crates hold pickups. Pillars stand in the band, and the walls pinch into a
   gorge. A bridge carries a pair of turrets. Checkpoint 2.
3. **The end hold.** Faster air craft and dives, turrets on both sides. Then the hold: the scroll stops, and its
   targets (higher hp) must be broken by the ground weapon while its own air craft swarm. When the hold breaks,
   the leg is cleared.

Spawn positions, counts, speeds and hit points are the builder's, tuned by playing it. The owner's standing word
is not to make things easy; the first stretch is still the gentlest of the leg.

### Measuring (the autopilot can't fly a course)

- **Fairness is a test, not a feeling.** A pure check walks the whole course data and proves four things: the
  band left between the walls and pillars is never narrower than `BAND_MIN`; no ground target or pillar stands
  inside a wall; every checkpoint (and the start) stands in its quiet stretch; and every target of a hold lies
  inside the band, within reach of the seed's sight.
- **Leg 1 can be cleared.** A test flies the course with a trivial steering rule and the fire button held:
  steer toward the nearest ground target ahead inside the band, otherwise hold the band's centre. The test keeps
  the ship invulnerable. It proves that the course ends, that every hold can be broken by seeds, and that nothing
  stalls. Whether a person can dodge it all is settled by playing it. No course bot and no recorded path are
  kept.
- **Par** for a course is its scroll time (length / speed) plus `HOLD_PAR` per hold, computed from the data by
  `parOf` rather than taken from the autopilot table. This is intended. On a course the time part of the tally
  rewards breaking holds quickly and costs you the time a death replays; it rarely reaches the x2 that a fast
  wave clear can.
- **The card's difficulty score** cannot use the lagged autopilot's failure rate. Until a bot flies courses,
  world 22's rating is the d half alone, or set by hand from play; the builder picks one and says which.
- The title screen's autopilot battle and "Watch, then try" never pick world 22.
- **Pi budget:** the ground is baked into strips. A new mark is stamped into the visible strip once, when it
  bursts, and a strip entering the screen (or every strip, after a respawn or a snapshot) is rebuilt from
  `course.marks`. Nothing is repainted every frame.

## Calls I made (the owner may overrule any)

- **Hardcore waits for Leg 2**, since one leg can't be a journey. It will be built as decided.
- A 22nd world in the grid, not a separate mode, the way world 18 began with one level.
- Top-down, scrolling upward, so the gun still fires up.
- On a death (the last life lost), score, bombs and the ground's marks go back to the checkpoint, the power-up
  and the combo are lost, and the lives refill to the checkpoint's count, at least 3.
- Only the ground weapon and bombs hurt ground targets. The gun flies over them.
- Shooting down incoming fire: small bullets take 1 hit, homing 2, the new heavy shot 3. A gun shot deals 1 and is
  spent, the laser beam wears bullets down over time, and enemy lasers can't be shot. World 22 only.
- Walls and pillars hit through `hitShip` like everything else, so a shield or the blinking lets the ship skim
  them.
- A respawn puts the ship at the checkpoint, and the pointer takes it from there. Checkpoints stand in quiet
  stretches with the walls wide open, so this is always safe.
- Leg 1's winnability is proven by a simple steered test with an invulnerable ship, not by a course bot.
  Dodging is tuned by playing.
- The par and the card's rating are computed or set by hand, not measured by the autopilot.
- No boss and no maker's mark for now.

## Left to the builder

The data shorthand for courses, the path shapes of the air craft, every tuning number (as named constants), how
the course code splits into files under 200 lines, how the look module draws ground instead of a sky, the
captions' typography, and the lobby card's wording.

## The world

**Wanderlight**, a road movie of the sky: one small light crossing a sleeping land, finding out who it is by what
it wakes.

- **The land paints itself in.** The ground starts as a pencil sketch on warm parchment: contour lines, river
  hatching, little drawn trees. Wherever the pilot frees colour, watercolour floods into the sketch and stays:
  dawn greens, river teal, poppy fields, ochre roofs. The ground weapon's marks are these floods, and a
  checkpoint reached and a hold broken flood wider still. Looking back, a run leaves a painting of where you
  have been.
- **The pilot** flies a small paper-and-brass glider that carries a lantern flame and trails a long ribbon. Its
  shots are warm white with a gold core, never red.
- **The Hush** are the enemy: grey, faceless and quiet. Kites of grey paper with folded wings are the grunts,
  long dart-kites that stoop are the divers, fan-kites that spit are the gunners, slate-plated box kites are the
  armored, and lantern-carrying kites are the carriers, which drop the pickups. On the ground, the turrets are
  standing stones whose one closed eye opens to fire, and the crates are grey cages with colour trapped inside.
- **The ground weapon is Bloom.** Its seeds burst into colour. Leg 1's caption when it is gained reads
  **"YOUR COLOUR."** The self-discovery lives in the abilities, each one something the pilot finds it could
  always do.
- **The checkpoints are lanterns**, brass on stone posts. A lit one throws a warm glow (a cached sprite) and rings
  a chime in the world's scale.
- **Leg 1 is Dawn Valley**, a river valley at sunrise. Its first stretch is all grey. The ground wakes in the
  second, and a stone bridge carries the twin turrets. The end hold is **the Grey Gate**, a dolmen as tall as a
  house, and when it falls, colour floods the valley beyond.
- **The trailer's last card** for a cleared leg reads like a road movie's last line: **"THE ROAD GOES ON."**
- **Look:** top-down, under soft cloud shadows that drift faster than the ground (the near layer), with pollen
  and dawn motes in the air.
- **Music:** bright and driving, with a road-trip feel: a plucked lead over warm pads, hand claps and a punchy
  beat, a major-third scale, and the world's own sounds (a lantern chime, a paper flutter). It is matched to the
  other loops' loudness (`memory/music-loudness.md`).
- **Art bar:** the simple mockup (`https://claude.ai/artifact/U6svQwRCu16DFD8DrW52Lj`). The owner, 2026-11-22: "I like the simplicity
  of the artifact. let's keep it simple like that. The journey is more important to me right now than the glitter."
  Effort goes into the journey (more legs, more abilities), not polish.
- **Theme calls (overrule any):** the names Wanderlight, the Hush, Bloom, Dawn Valley and the Grey Gate, and
  lanterns as the checkpoints.

## The story

The owner asked (2026-11-22) to work the story out now and build the first level from it.

**The premise.** A small light wakes in a paper glider above a land that is only a pencil sketch, grey and
silent. It doesn't know what it is, or who drew the land. Grey things, the Hush, drift over the sketch and keep it
quiet and unfinished. Wherever the light frees colour, the land fills in and stays filled. Every leg hands the
light something it finds it can do.

**The thread (revealed slowly, never spelled out).** Along the way the light finds the traces of whoever drew this
land: a pencil the size of a tower fallen in a wood, a compass rose painted across a moor, a cup ring that became a
lake, a sky left half finished. Leg by leg the player can see that the sketch lines ahead are drawn in the same
hand as the ribbon trailing behind the glider. The light is the one who drew this land, and forgot. The Hush are
the grey of forgetting: they don't destroy, they only make things quiet. Nothing ever says this in words. The land,
the traces and the ribbon show it, and a player who never notices still has a good flight.

**Why it never ends.** The map is still being drawn. Past the end of every leg the land runs out into blank
parchment with a few faint construction lines and one pencil line leading on, and the trailer's last card reads
**"THE ROAD GOES ON."** Finishing is not the goal; the journey is.

**How it is told.** Three lines of text a leg at most, in the trailer cards' voice: one when the leg opens, the
ability's caption at its checkpoint, and the last card. Everything else is pictures: the land, the traces, the
colour coming back.

**Leg 1, Dawn Valley: "Your colour."**

- **Opening** (the quiet start): the glider lifts off a sketched hillside at first light and its lantern flame
  catches. The card reads **"A LIGHT WAKES."**
- **Stretch 1, grey.** Everything is pencil on parchment. Hush kites swoop and cross. Standing stones line the
  river with their one eye shut. The walls teach the band.
- **Lantern 1.** It lights at the light's passing, and colour runs from it in a ring. Caption: **"YOUR
  COLOUR."** From now on the gun drops seeds that bloom.
- **Stretch 2, the ground wakes.** The stones open their eyes and fire. Every one bloomed paints the valley
  around it: grass, poppies, river teal. Grey cages hold trapped colour (the pickups). Rock pillars stand in the
  river, the walls pinch into a gorge, and a stone bridge carries twin stones. The first trace lies on the valley
  floor: a pencil line that someone drew and erased, still faintly showing. Lantern 2.
- **Stretch 3, the Grey Gate.** Faster kites and dives, stones on both banks, and then the hold: a dolmen as tall
  as a house, its capstone ringed with closed eyes. The scroll stops; Hush kites swarm out of the gate while the
  seeds break its stones. When it falls, colour floods the whole valley behind the player.
- **The end.** Beyond the gate the valley runs out into blank parchment, faint construction lines and one pencil
  line leading on. Last card: **"THE ROAD GOES ON."**

**The legs ahead** (a direction for the conversations that add each one; nothing here is committed): each leg is
one place, one new obstacle, one new kind of Hush, one ability the light finds in itself, and one trace.

| Leg | Place | Ability ("Your …") | Trace |
|---|---|---|---|
| 2 | The Pencil Wood, a forest at noon | Your line: the ribbon hardens into a drawn line that stops shots | a fallen pencil the size of a tower |
| 3 | The Mirror Flats, salt that mirrors the sky | Your reflection: the Hush seen only in the mirror | the light's reflection is not a glider |
| 4 | The Kite Highlands, wind and kite flocks | Your breath: ride and turn the gusts | a compass rose painted across the moor |
| 5 | The Harbour of Bells, at dusk | Your voice: a bell that stuns | a map table drawn in the same hand |
| 6 | The Firefly Night | Your light: the lantern lights the unfinished dark | the sketch ahead is being drawn as you watch |
