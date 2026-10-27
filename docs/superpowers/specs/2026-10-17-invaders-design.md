# Invaders — design

Working title. The final name is chosen with its CNAME at publish time, as Barrage's was.

## Goal

A single-player cinematic arcade shooter for the Pi games menu (HDMI kiosk) and any desktop browser,
as beautiful as Barrage (`../artillery`): 18 cinematic worlds × 5 levels = 90 levels, free 2D
flight, formations, bosses, power-ups — plus one feature no shooter has: your own movie trailer
(§ The surprise).

## Stated by the user

- A classic arcade shooter, new project in `../`, many levels and variations, as beautiful as Barrage.
- 1 player only. Free 2D movement. Any level playable at any time (no unlocking).
- Variations: themed worlds, formation patterns, boss fights, power-ups. Worlds drawn from action
  and sci-fi film genres — think out of the box.
- Approved the 8 worlds and the level rules; asked to be surprised with something nobody has done.
- Barrage runs okay on the Pi.
- The round's score weighs how fast it went (faster scores higher), pays for every bomb still held
  when none was fired and for every life still held; bombs and lives count up with no cap of 3; a
  button zeroes every level's scores; a level cleared without a power-up earns a medal, and medals
  climb a ladder of ranks from the bottom up (R66).
- Fly toward the aliens and drag the enemy's bullets that follow the ship into them, to hit them with
  their own fire; try it in a new world of one level, and see whether the side guns work when the
  ship flies level with the aliens. The user knows it changes the game's mechanics (R67).
- World 18's side guns turn the tide, so make them a power-up: they drop like the other powers and
  catching them costs the medal; a bomb or a life no longer opens them (R67).
- Free flight is liberating: make it the rule for every world from 18 on (R67).
- Finish world 18 with all its levels (R67).

Assumptions (not stated, chosen here): English only; keyboard + mouse, no gamepad; installed on the
Pi like Barrage; worlds evoke film genres under original names — no film titles, characters, logos or
quoted lines, so the repo can be public.

## Rules

- Logical frame 1920 × 1080, y down, letterboxed to fit. The ship flies anywhere in the player zone
  y ∈ [620, 1040], x ∈ [40, 1880]; max speed 720 px/s with a short ease (no ice-skating).
- **Lives:** 3 at the start of each level, with no cap above that (R66). A hit costs one and gives 1.5 s of blinking invulnerability. At 0 lives the
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
    (R54, R56; worlds 9–17 follow their own difficulty, R57–R65).
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
  - **Pearls and trident, world 15's own powers (R63).** The user asked for some special superpowers.
    Pearls: three pearls circle the ship 78 px out, a turn every 1.2 s. They wipe the enemy bullets
    they touch (not beams) and deal 1 damage to the aliens they touch, each alien at most once every
    0.25 s. Trident: the shot pierces every alien and boss part in its path, hurting each once, but
    stops at bunkers. Both last 10 s, with the ring and the reserve of R53. They drop only in world
    15, whose drops pick from the six plus `pearls` and `trident`. Every other world draws exactly as
    before, pinned by fingerprints now running through world 14.
  - **Mirror, world 16's own power (R64).** A glass twin of the ship flies at its mirror image across
    the field's centre line (x 1920 − the ship's, the same y), for 10 s with the ring and the reserve
    of R53. Each time the ship fires, the twin fires one straight shot from its own muzzle. It cannot
    be hit, collects nothing and does nothing else. It drops only in world 16, whose drops pick from
    the six plus `mirror`; every other world draws exactly as before, pinned by fingerprints now
    running through world 15.
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
- **Smart bombs:** separate stock, start each level with 1, no cap (R66; it was 3). Clears all enemy bullets and
  deals 3 damage to everything on screen (bosses: 8 % of max hp). Bomb pickups are 20 % of all drops
  (carriers' and, since R54, the others') instead of a power-up.
- **Extra life:** a pickup like the bomb, not a power: +1 life, with no cap (R66), and it makes no
  event of its own beyond the pickup. A drop is one 5 % of the time, at any count of lives (before
  R66, at 3 lives that 5 % was a power instead). It counts as a pickup for the flat 500.
- **Scoring:** grunt 100, diver 150, gunner 200, armored 300, carrier 250, boss 10 000. Combo: each
  kill within 1.5 s of the last raises the multiplier by 1 (max ×8); 1.5 s without a kill resets it.
  Clear bonus 2 000 + 3 000 if no hits. Every pickup collected is worth a flat 500 (no multiplier);
  when the level clears, every pickup still falling is collected at once and streaks into the ship:
  its 500 counts toward the clear's score, its power or bomb does not (R51). An armored alien that
  reassembles from its wreck (worlds 7 and 16) pays again when it dies again, as the user ruled.
  - **The round's tally (R66).** At the clear every point the round made (kills, pickups, the boss)
    gets the clear and flawless bonuses, 2 000 for each bomb still held if not one was fired, and
    3 000 for each life still held, and the sum is multiplied by the round's speed and rounded to 10.
    The speed is `1 + clamp((par − t) / (par / 2), 0, 1)`: ×2 at half the par or faster, ×1 at par
    or slower, a straight line between, where `t` is the seconds of play (the intro left out). Each
    level's par is twice what the never-hit autopilot takes to clear it from the level's own seed,
    rounded up to 5 s (`src/core/pars.js`, written by `scripts/pars.mjs`; a test checks it is
    current), because a formula of waves and hp missed the measured clears by up to 4×. So ×2 needs
    the bot's own pace; the user accepted that. Every scoring rule lives in `scoring.js` alone.
  - **Medals and ranks (R66).** A level cleared without catching a power-up earns its medal (bombs
    and lives do not count; a power swept up at the clear is not caught). The medal pays nothing;
    once earned it is kept. The pilot's rank climbs with the medals held, from the bottom: Rookie 0,
    Cadet 1, Pilot 3, Flight Lead 6, Ace 10, Squadron Ace 18, Wing Leader 30, Air Marshal 50 and
    Legend at every level's medal, 90 with world 18's five levels (`src/core/ranks.js`). The replay version is 9: a version 8 run is not replayed.
- **Stars:** ★ cleared · ★★ cleared losing ≤ 1 life · ★★★ cleared with no hits. Best score, best
  stars and the medal per level are saved in `localStorage`; Level Select's Reset scores (after a
  confirm) zeroes all three for every level and keeps the Cinema's runs (R66).
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
  - **World 15, the deep sea (R63).** The user asked for one more world of my own with some
    special superpowers. It is the deep sea under a sunken kingdom, with two powers that drop in
    world 15 alone, beside the six. Pearls: three pearls circle the ship 78 px out, a turn every
    1.2 s. A pearl wipes any enemy bullet it touches (not a beam), and it deals 1 damage to an
    alien it touches; that alien is then spared by the pearls for 0.25 s. Trident: the ship's
    shot becomes a trident that passes through every alien and boss part in its path, hurting
    each once, but still stops at bunkers. Both last 10 s, like the other powers, and wait in the
    reserve the same way. The twist is world 8's gravity well, unchanged in the core, drawn as a
    maelstrom with its own sprite, effects and sound. `d` is 0.72, 0.74, 0.77, 0.79, 0.82, a notch
    above world 14 because the powers help. Its boss, the Lantern Leviathan, never charges. The
    well lies just under it at rest and swallows what its maw fires, so its eyes take aim, and the
    maw only fires the laser, a beam the well does not bend. On the headless run (40 seeds) its
    levels 1–5 clear 39, 31, 31, 21 and 23 times at reaction lag 10, and 32, 15, 27, 11 and 8 at
    lag 15, against world 6's 39, 30, 34, 21, 17 and 34, 19, 27, 14, 4: within noise. World 14,
    re-run on the new rules, clears exactly as before.
  - **World 16, the glass cathedral (R64).** The user asked for another world. It is a half-ruined
    cathedral of stained glass at dawn, with one power that drops in world 16 alone, the mirror
    twin above. The twist is world 7's reassemble, unchanged in the core, drawn as a gargoyle whose
    shards hang in the air and fly back together, with its own sprite, effects and sound. `d` is
    0.74, 0.77, 0.79, 0.82, 0.84, a notch above world 15. A gargoyle that stands up again is costly
    at this `d`, so every level carries a row of them, but only one or two. Its boss, the Vesper
    Moth, never charges; with no well to drink its bolts and the twin doubling the ship's gun, it
    fires faster than the Leviathan. On the headless run (40 seeds) its levels 1–5 clear 39, 26,
    30, 23 and 26 times at reaction lag 10, and 30, 19, 22, 15 and 5 at lag 15, against world 6's
    39, 30, 34, 21, 17 and 34, 19, 27, 14, 4: within noise. World 15, re-run on the new rules,
    clears exactly as before.
  - **World 17, from ash to air (R65).** The user asked for a world where cigarettes, tobacco and
    addiction must be defeated and health is won, at difficulty 10/10, "yet send help once in a
    while". It is a city choked by smoke, giant cigarettes standing among its towers like chimneys;
    the aliens are the habit itself (cigarettes, butts, pipes, cigars and plain packs, no brand, no
    logo, nobody smoking). The city heals as it is won, drawing only: the smog thins and the sky
    turns blue by level and by waves cleared, and the boss's fall leaves a clear morning. The help
    is the twist, `breath`, new and the only one that helps: 14 s into play and every 24 s after,
    in waves and the boss fight alike, a front of fresh air rises from the bottom of the field to
    the HUD's edge in 0.8 s and wipes every enemy bullet it passes over (a swept test, so none slips
    by; a wiped bullet is settled and never a near miss, R37). Beams pass through it, and nothing
    else is touched. No power is world 17's own. `d` is 0.86, 0.89, 0.92, 0.96, 1.0, so
    `armorBonus` applies, and the world is tuned with the breath included to world 7's, the
    hardest in the game, and no harder. Its boss, the Craving, never charges. Like the titan it
    kills in its hover phase, with homing shots and a laser from its maw, and it rests at 380, the
    lowest of the bosses, so its shots start near the ship as the titan's do from its cannons. On
    the headless run (40 seeds) levels 1–4 clear 26, 22, 23 and 15 times at reaction lag 10 and
    19, 7, 8 and 5 at lag 15, against world 7's 30, 29, 18, 15 and 20, 4, 7, 3: within noise. On
    120 seeds the Craving falls 11 and 9 times, the titan 12 and 6. The breath helps the slower
    hand most: without it the Craving falls 11 and 6 times, so it is worth nothing at lag 10 and
    half again at lag 15. World 16, re-run on the new rules, clears exactly as before.
  - **World 18, Anvil Sky: free flight (R67).** The user asked to fly at the aliens and hit them with
    their own bullets, tried first in a world of one level. It is a dogfight inside a thunderstorm at
    dusk, five levels like any world (four wave levels and the Squall Ray). Its levels carry `free`
    (every world from 18 on, `FREE_FROM`, flies free; worlds 1-17 keep the bottom strip and play exactly
    as before, pinned by fingerprints of world 17, and the replay version stays 9), which changes these
    rules (the collisions in `free.js`):
    - The ship flies anywhere under the HUD: the zone is y ∈ [150, 1040] instead of [620, 1040], so the ship's nose stays under the HUD panels
      (`ship.js zoneOf`). The pointer maps onto that zone too.
    - Any alien the ship touches rams it (a life lost, the alien gone, no score), not only a diver,
      because the ship can now fly into the formation.
    - Most waves fire homing bullets, which turn toward the ship at 60°/s. A homing bullet notes its
      heading the first tick it flies; once the chase has turned it 45° off that course it is
      dragged, for good, and a dragged bullet is spent on the first live alien it crosses, or else
      the first live boss part, and hurts it 1 (a part by its own rule: weak 100 %, armour 25 %): a
      kill scores and drops like any other, with a `backfire` event. A bullet still on its first
      course passes through its own side, so a formation never shoots itself while the ship waits
      below it.
    - The boss's body rams: a ship that touches a live part loses a life and the boss takes nothing. A
      blinking ship passes; a shielded one grazes it unharmed and silent. So a free-flight boss's
      boxes lie inside its art on every side (a ship may brush a sliver of art unharmed, never die
      to empty sky): the Squall Ray's swept wing is boxed by the strip under its trailing edge at
      the tip (270 x 82), not its bounding box, and its art test checks every point of that box is
      wing. Worlds 1-17 never meet a boss's box (the ship stays below y 620), so theirs are unchanged.
    The side guns are world 18's own power, `sideguns`, one of seven in its drop list (`POWERS_18`):
    a catch opens world 13's side guns for 6 s (another catch sets them back to 6 s) and costs the
    level's medal like any power, but it leaves the running power and the reserve alone, so the guns
    fire beside it. A bomb or a life caught there opens nothing, so the level's twist is `free`, which
    adds no rule of its own. On w18-1, where carriers come in two of the four waves, over 200 autopilot
    runs a run drops about 11 pickups and the side guns about once, none in a third of the runs. The
    wave levels mix in a fan, an aimed or a ring wave now and then, so the ship must dodge as well as
    lure; carriers come in every level; no bunkers; `d` 0.86 to 1.0 (`OWN[18]`), the top of the scale. The autopilot still
    fights from the bottom, which clears every level. A scripted flight that weaves around w18-1's
    formation lands about 22 backfires a run in about 70 kills; one that strafes along the bottom drags
    almost every bullet but lands almost none, because nothing is below it.
    The Squall Ray, a colossal manta of thundercloud, is built to be fought from every side: iron
    plates on its spine and wings (armour), the storm heart glowing through its back behind the maw
    (weak), the maw between its horn-fins at the bottom (weak), and a Tesla coil at each wing tip
    (weak), below and past the wing, level with a ship that climbs beside it, where the side guns reach
    it. The coils take aim, the wings fan, the spine rains lightning, the maw fires homing shots from
    the first phase on (the ones the ship drags back into it) and the laser in the last, and the heart
    throws shock rings from the second phase, so flying in close is paid for. It sways, hovers and
    circles, never charges, rests at 280 and weighs 250 hp, a little above the moth's 234. In Level Select world 18
    is its own card in the foot row beside Back and Reset scores (the side row is full at nine), marked
    as the free-flight world, with its five reels.
    The user asked for world 18 to be the hardest world. Measured with the lagged autopilot over six
    reaction lags (8 to 18 ticks) x 20 seeds, since a boss level's seeds share their opening: world 18
    clears 40/40/31/20/5 %, 27 % in all and 12 % at the slow lags, against world 7's 31 % and 16 %
    (the hardest before) and world 17's 36 % and 21 %. The ray clears 5 %, level with the titan (w7-5),
    which the user has beaten and called the limit, so it goes no further. Its levers: d up to 1.0,
    gunner rows and a fan wave in levels 2-4, homing fire from a coil as well as the maw from the hover
    on, shorter intervals in its later phases, and its last phase from 40 % of its hp.
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
| 15 | Lantern Deep | deep sea under a sunken kingdom | a drowned kingdom's spires, kelp forests, a whale's skeleton and a reef, all lit by its own creatures | world 8's gravity well, drawn as a maelstrom; and two powers of its own, pearls and trident (new, ruling R63) | The Lantern Leviathan |
| 16 | Glass Cathedral | stained-glass cathedral at dawn | a half-ruined nave open to a dawn sky: tall jewel-coloured windows, a great rose window, columns and flying buttresses, shafts of coloured light | world 7's reassemble, drawn as gargoyles whose shards hang in the air and mend; and its own power, the mirror twin (new, ruling R64) | The Vesper Moth |
| 17 | Ash to Air | a smog-choked city that heals | a city under brown smog, giant cigarettes smoking among the towers like chimneys, ash falling; level by level the smog lifts, the sky turns blue and parks, trees and kites come back | the breath: every 24 s a front of fresh air sweeps up the field and wipes the enemy bullets it passes (new, ruling R65) | The Craving |
| 18 | Anvil Sky | a dogfight inside a thunderstorm, the first free-flight world (R67) | dusk inside a storm: towering anvil clouds lit from within by lightning, rain curtains, a low orange sun under the cloud deck | free flight and dragged bullets; the side guns are a power there (R67) | the Squall Ray: a colossal manta of thundercloud, iron plates on its spine and wings, a storm heart glowing through its back, a Tesla coil at each wing tip |

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
a row, the side worlds under them, "also showing"; the star total and the pilot's rank over them, a
medal mark on each reel that holds one, Back and Reset scores under them) · Play · Pause ·
Trailer → Results (score with its tally: time against par and the multiplier, the bombs and lives
bonuses, the medal; stars, best, "Promoted to" a new rank; Next / Retry / Select) · Blooper → Failed (Retry / Select) ·
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
  ship: { x, y, vx, vy, lives, invuln, power: null | { kind, left }, reserve: null | { kind, left }, bombs, cooldown, alive,
          bombsUsed, powersUsed },   // the round's bombs fired and powers caught (R66)
  aliens: [alien], shots: [shot], bullets: [bullet], pickups: [pickup],
  bunkers: [{ x, y, w, h, mask }],
  boss: null | { kind, x, y, hp, maxHp, phase, parts: [{ id, dx, dy, w, h, hp, max, weak, armor, … }],
                 clock, enter, dying, blast, cd, mcd, warns },   // warns: attacks in their telegraph
  wave, score, combo: { mult, timer }, hits,
  tally,                      // null, then at the clear { time, par, speed, base, bonus, bombBonus, lifeBonus, total, medal }
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
