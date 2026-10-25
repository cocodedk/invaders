# Invaders — design

Working title. The final name is chosen with its CNAME at publish time, as Barrage's was.

## Goal

A single-player cinematic arcade shooter for the Pi games menu (HDMI kiosk) and any desktop browser,
as beautiful as Barrage (`../artillery`): 14 cinematic worlds × 5 levels = 70 levels, free 2D
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
  - carrier — glows, 1 hp, always drops a pickup: a power-up, a bomb or an extra life. Every other
    formation alien drops one too, 3 % of the time in world 1, climbing to 12 % at the end of world 8
    (R54, R56; worlds 9–14 follow their own difficulty, R57–R62).
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
- **Power-ups:** spread, laser, rapid, shield, homing, slow. 10 s each, slow 6 s. Fall at 160 px/s,
  collected by touch. Each world reskins them (Neon Rain's laser is a pink neon beam, Ronin Moon's
  spread is a fan of throwing stars).
  - **Wingmen, world 13's own power (R61).** The user asked for a superpower that gives the player
    sidekicks for as long as the other powers last. Two escort fighters fly level with the ship, 80 px
    to either side, and each fires a copy of the ship's straight shot whenever the ship fires, for 10 s,
    with the ring and the reserve of R53. They cannot be hit and do nothing else. They drop only in
    world 13, whose drops pick from the six powers plus `wingmen`; every other world draws from the
    six exactly as before, so its play and its replays are unchanged (pinned by fingerprints of 14
    levels across worlds 1–12) and `RUN_V` stays 8.
  - **One runs at a time, one waits (R53).** A new power starts with its full time and the running one,
    with the time it had left, waits in a one-slot reserve; when the running one ends the reserve takes
    over and goes on from there. The reserve does not tick while it waits, and a newer pickup that
    displaces another power overwrites it. Nothing carries between levels. The HUD shows the running
    power as a ring with its time draining, and the reserve as a smaller ring in its own tint with the
    seconds it has left.
  - **More drops, heavier fire (R54).** Power-ups used to come from carriers alone, about one a run. Now
    any other formation alien that dies drops a pickup with chance `KILL_DROP` = 3 % (one draw on the
    world's rng per kill, then the same split as a carrier's: 20 % a bomb, 5 % a life, the rest a power).
    Boss minions and the saucer are as they were: a carrier among them always drops, the others never.
    To keep the game no easier the enemy shoots more: `scaled(d).fireMult` is `(0.6 + d) × FIRE_UP` with
    `FIRE_UP` = 1.5, so 0.9 at d = 0 and 2.4 at d = 1 (the boss's attacks and gunner minions use the
    same multiplier); the 400 enemy-bullet cap is unchanged. Tuned on the headless balance run (the
    autopilot with a human-like reaction lag, 40 levels, 20 to 50 seeds): about 2.1 pickups caught a run
    where there was about 1.0, and the clear rate and hits a run within a point or two of before, at reaction
    lags of 10 and 15 ticks.
  - **A carrier in every boss phase (R55).** A boss used to send its carrier only in its last phase, and
    the bosses of worlds 4 and 5 never did, because a carrier waited on a part the player had always shot
    away by then: a fight dropped nothing for its first 70 % of hp or more. Now every phase sends one
    carrier every 4 to 5 s (the first comes half that long into the phase), about 2 to 4 pickups a
    phase, and a carrier comes whatever is left of the part it is listed on, since it flies in from the
    side of the screen. On the headless boss run (the autopilot at reaction lag 10), a player who catches
    every pickup beats the Endoskeleton titan 52 % of the time, up from 14 % (50 seeds). The autopilot,
    which chases every pickup into the boss's fire, beats the titan about as often as before (12 %), but
    the four late bosses together 33 % of the time, up from 8 % (20 seeds each): catching one under fire
    is a risk the player chooses. The stand-and-fire bot of the boss tests ignores pickups, so its 40 to
    60 s bar still measures the boss's hp alone.
  - **More drops in the late worlds (R56).** The late worlds shoot hardest, and a wave level's carriers
    often sit in its last wave, so Event Horizon's level 3 dropped about one power-up before its
    carriers came. The chance that any other formation alien drops a pickup now climbs with the square
    of the level's difficulty: `killDrop(d)` = `KILL_DROP` + `LATE_DROP` × d² = 3 % + 9 % × d², so
    3.3 % at world 2 level 3, 4.7 % at world 4 level 3, 9 % at world 7 level 3 and 11 % at world 8
    level 3. Boss minions still never roll. On the headless run (the autopilot at reaction lag 10,
    20 seeds), Event Horizon's level 3 drops 10.4 pickups a run where it dropped 4.5, and is cleared
    15 times in 20 where it was 12; its level 4 13 where it was 3. World 2 is unchanged, and worlds 4
    to 6 got a little easier at the slower lag of 15 ticks.
  - **Homing:** the gun fires single shots at 1000 px/s (the base shot flies at 1400) that steer up to
    180°/s toward the nearest live alien ahead of them, and fly straight when there is none. Never the
    boss, the saucer or a wreck.
  - **Slow:** enemies, their bullets and the boss run at 0.5× for 6 s. It does not stack with Code
    Rain's bullet time (never 0.25×), and the frame takes bullet time's tint while it runs.
- **Smart bombs:** separate stock, start each level with 1, max 3. Clears all enemy bullets and
  deals 3 damage to everything on screen (bosses: 8 % of max hp). Bomb pickups are 20 % of all drops
  (carriers' and, since R54, the others') instead of a power-up.
- **Extra life:** a pickup like the bomb, not a power: +1 life, never above 3, and it makes no event
  of its own beyond the pickup. A drop is one 5 % of the time, and only while the ship has fewer
  than 3 lives (at full lives that 5 % is a power instead). It counts as a pickup for the flat 500.
- **Scoring:** grunt 100, diver 150, gunner 200, armored 300, carrier 250, boss 10 000. Combo: each
  kill within 1.5 s of the last raises the multiplier by 1 (max ×8); 1.5 s without a kill resets it.
  Clear bonus 2 000 + 3 000 if no hits. Every pickup collected is worth a flat 500 (no multiplier);
  when the level clears, every pickup still falling is collected at once and streaks into the ship:
  its 500 counts toward the clear's score, its power or bomb does not (R51).
- **Stars:** ★ cleared · ★★ cleared losing ≤ 1 life · ★★★ cleared with no hits. Best score and best
  stars per level are saved in `localStorage`.
- **Difficulty** is a property of the level, not of progress: bullet speed, fire rate, formation
  speed and alien hp scale with `(world, level)` so world 8 is hard even when played first. The fire
  rate multiplier is `(0.6 + d) × 1.5` (0.9 at world 1 level 1, 2.4 at world 8 level 5; R54).
  - **World 9, a breather beside the run (R57).** The user asked for another stage after beating the
    titan, and chose a mid-game side world over a ninth, harder one. So `d` stays
    `((world − 1) × 5 + level − 1) / 39` for worlds 1–8, which play exactly as before, and world 9 sets
    its own: 0.40, 0.43, 0.45, 0.48, 0.50 for its levels 1–5 (world 4 level 3 is 0.44, world 5 level 1
    is 0.51). Its twist is Twin Suns' `gusts`, the storm's wind, rather than a new rule, and its boss
    never charges, so the bottom of the screen stays the player's. On the headless run (the autopilot,
    20 seeds) its levels 1–5 clear 19, 17, 18, 16 and 14 times at reaction lag 10, against world 4's
    20, 18, 20, 16 and 20, and 17, 11, 10, 13 and 10 times at lag 15, against world 4's 20, 15, 18, 11
    and 16 (world 5's boss: 2): a little harder than world 4, easier than world 5.
  - **World 10, a Halloween night beside the run (R58).** The user asked for another world, in a
    vampire and Halloween theme with the harbour's detail, as a second breather. World 10 sets its own
    `d` as world 9 does: 0.30, 0.32, 0.34, 0.36, 0.38, a step below world 9, so worlds 1–9 and their
    replays are unchanged. Its twist is Neon Rain's `darkness`, with no new rule, but moonlit: its look
    dims the scene by 38 % rather than 66 %, so the night's detail stays in view while its own lights
    burn brightest (the lanterns' faces, the ghosts' eyes, the castle's windows, the Count's eyes and
    heart). Its boss, the Crimson Count, never charges, and his bat swarm in the last phase is drawing
    plus the usual diver minions. The darkness is only drawn, so the autopilot cannot feel it, and the
    levels were set on the easy side. On the headless run (20 seeds) its levels 1–5
    clear 19, 17, 18, 17 and 19 times at reaction lag 10, and 17, 15, 15, 12 and 20 times at lag 15,
    against world 9's 19, 17, 18, 16, 14 and 17, 11, 10, 13, 10 and world 4's 20, 18, 20, 16, 20 and
    20, 15, 18, 11, 16: about world 4, and easier than world 9.
  - **World 11, a polar night beside the run (R59).** The user asked for another world that looks
    magnificent, picked a kingdom of ice under the aurora, and asked for about world 5's difficulty,
    so the side worlds now span easy to medium. World 11 sets its own `d`: 0.51, 0.53, 0.56, 0.58,
    0.60 (world 5's run from 0.513 to 0.615; at most 0.6 keeps `armorBonus` off). Its twist is Ronin
    Moon's `shuriken`, with no new rule, but drawn as ice shards that shatter, with a glassy sound, when
    a shot cuts one. Its boss, the Crystal Wyrm, never charges; its shard blizzard in the last phase is
    drawing plus the usual diver minions. On the headless run, in % at reaction lag 10, its levels 1–5
    clear 100, 65, 75, 68 and 77 (40 seeds, the boss 60), against world 5's 99, 62, 69, 48 and 35 (100
    seeds); at lag 15, 90, 30, 38, 30 and 20, against 80, 28, 38, 22 and 9. The behemoth clears 87 and
    45: the wyrm sits between the two bosses, and its waves at about world 5's.
  - **World 12, a library at the edge of the universe (R60).** The user asked for a world of my own,
    "the world of your fantasies", harder than average, with no questions asked. It is an archive
    where every star is a book: shelf towers rising into an indigo nebula, constellations that gild
    themselves star to star, and guards of paper, ink and bronze. World 12 sets its own `d` to world
    6's run: 0.64, 0.66, 0.69, 0.71, 0.74, so `armorBonus` applies, as it does there. Its twist is Code
    Rain's `glitch`, with no new rule, but its own look and sound: a blinking alien dissolves into
    pages and re-forms, with a harp note in the world's scale; the glitch bands are a gold-ink smear,
    and bullet time is a sepia-gold hush with a held string chord. Its boss, the Grand Grimoire, never
    charges; its storm of pages in the last phase is drawing, plus the usual diver minions. On the
    headless run (40 seeds) its levels 1–5 clear 38, 35, 30, 25 and 19 times at reaction lag 10, and
    37, 16, 27, 11 and 3 at lag 15. World 6 clears 39, 30, 34, 21, 17 and 34, 19, 27, 14, 4: its waves
    and its boss match world 6 within noise.
  - **World 13, an air battle at golden hour (R61).** The user asked for another world of my own,
    with twists: a sidekick power, and a twist of my devising, with sideways fire as the example.
    It is an armada of airships over a sea of clouds, with world 13's own power (Wingmen, above) and
    a new twist, `broadside`. Catching any pickup in world 13 (a power, a bomb or a life) opens the
    ship's side guns for 6 s, and another catch resets the time. While they are open, every volley
    also fires one shot straight left and one straight right, level with the ship, at the gliders
    swooping in from the sides. Under the laser, which fires no volleys, the side guns fire at the
    base rate beside the beam. Its levels lead with divers so the side guns have work. `d` is 0.66,
    0.68, 0.71, 0.73, 0.76, a notch above world 12 because the two rules help the player, so
    `armorBonus` applies. Its boss, the Thunder Galleon, never charges. On the headless run (40
    seeds) its levels 1–5 clear 39, 33, 34, 26 and 13 times at reaction lag 10, and 34, 16, 24, 10
    and 9 at lag 15, against world 6's 39, 30, 34, 21, 17 and 34, 19, 27, 14, 4: within noise. World
    6 itself, re-run on the new rules, clears exactly as before.
  - **World 14, a fireworks night at the fair (R62).** The user asked for another world of my own
    with a new twist. It is a night fair in a fireworks festival, and its twist, `fireworks`, is new.
    About one alien in five made in world 14 (a wave's or a boss minion) is a shell, marked by a
    lit fuse. When a shell dies, however it dies, it bursts 0.12 s later where it fell. The burst
    deals 1 damage to every alien within 160 px and to every boss part whose box is that close,
    each part through its own armor rule. A shell the burst kills goes off in turn, so a cluster
    pops in a chain, and a wave is not clear while a fuse is still lit. Only shells burst: if every
    kill did, one shot would clear a wave of one-hit grunts. The burst never hurts the ship, the
    bunkers or bullets, and chained kills score as ordinary kills. `d` is 0.70, 0.72, 0.75, 0.77,
    0.80, a notch above world 13 to pay for the bursts. Its boss, the Grand Carousel, never charges.
    Its minions can be shells, so one that bursts beside it hurts it. On the headless run (40 seeds)
    its levels 1–5 clear 38, 30, 32, 26 and 21 times at reaction lag 10, and 30, 17, 24, 18 and 7
    at lag 15, against world 6's 39, 30, 34, 21, 17 and 34, 19, 27, 14, 4: within noise. World 13,
    re-run on the new rules, clears exactly as before.
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
| 9 | Tidal Siege | kaiju harbour monster movie | night harbour in a storm, cranes, a sea beast's teal glow | the storm's gusts push all bullets sideways (Twin Suns' wind, ruling R57) | Abyssal behemoth |
| 10 | Hollow Night | gothic vampire Halloween | a castle on a crag under a harvest moon, dead trees, a graveyard of jack-o'-lanterns | darkness, moonlit: the night's own lights burn brightest; lightning lights the whole screen (Neon Rain's, ruling R58) | Crimson Count |
| 11 | Aurora Kingdom | polar fantasy under the northern lights | an ice kingdom under the aurora, glacier mountains, a frozen fleet, ice floes on black water | enemy shots are slow, large ice shards; the ship's shots shatter them (Ronin Moon's, ruling R59) | Crystal Wyrm |
| 12 | Starlit Archive | celestial library fantasy | a library at the edge of the universe: shelf towers in an indigo nebula, floating islands of books, constellations drawn in gold | aliens blink between slots in a whirl of pages; near misses drop into a sepia-gold bullet time (Code Rain's, ruling R60) | Grand Grimoire |
| 13 | Sunset Armada | airship battle at golden hour | a sea of clouds under a huge low sun, floating islands with waterfalls, brass-and-canvas airships | catching any pickup opens the side guns for 6 s: every volley also fires left and right (new, ruling R61); and its own power, Wingmen | Thunder Galleon |
| 14 | Ember Carnival | fireworks night at the fair | a lakeside fair at night: a Ferris wheel, big tops, a roller coaster on the far shore, fireworks over the water | about one alien in five is a shell whose death bursts like a firework, hurting everything within 160 px and setting off other shells in a chain (new, ruling R62) | The Grand Carousel |

## Look and effects

- Sky painter + procedural parallax silhouettes per world (Barrage's `sky-paint`/`parallax` reused);
  ambient particles: rain, sand, petals, spores, glyphs, embers, lensed stars.
- Ship: sleek glowing fighter, engine trail, banks when moving sideways, shield bubble, blink when
  invulnerable. Aliens: vector-drawn per world, pre-rendered at load into offscreen canvases
  (2 animation frames + a white hit-flash frame each).
- Explosions: flash, shockwave ring, debris, sparks, smoke; screen shake scaled by size; score
  pop-ups; combo meter that pulses at ×4 and burns at ×8.
- HUD: score, combo, lives, bombs, power-up timer ring with the reserve beside it, boss health bar; readable from across a
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
a poster per world, each with 5 level reels showing stars and best score; the main run's eight in
a row, the side worlds under them, "also showing") · Play · Pause ·
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
  ship: { x, y, vx, vy, lives, invuln, power: null | { kind, left }, reserve: null | { kind, left }, bombs, cooldown, alive },
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
stars rule; power-up duration, the reserve and replacement; bomb clears bullets and damages all; bunker carving;
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
