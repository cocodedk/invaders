# World 22, Leg 3: the Mirror Flats — design

Status: approved by the owner, 2026-11-28 ("yes"). Branch `world-22-leg-3`, cut from `world-22-leg-2` (pushed, no PR yet).
Parent designs: `docs/superpowers/specs/2026-11-22-world-22-journey-design.md` (R74) and `docs/superpowers/specs/2026-11-23-world-22-leg-2-design.md`.
Everything they say about courses, checkpoints, rule B, holds, the run-out, shooting, the line and the art bar holds here unless this file says
otherwise.

## Intent

The owner (2026-11-28), after flying Leg 2 ("feel good ... the game play is the most important", and he used the line): plan Leg 3 around the
**lasso**, the idea he saved on 2026-11-23 (vault note `world-22-line-options`, option C). His rules for it, word for word:

- "anything it manages to completely encircle and close a loop"
- "maybe a longe lasso would be good"
- "and the lasso must become glittering and sparkling"

Each leg is one place, one new obstacle, one new kind of Hush, one ability the light finds in itself and one trace. The parent design's
story table put Leg 3 at **the Mirror Flats** (salt that mirrors the sky) with "your reflection"; the lasso takes that ability's place and the
place stays (my call: the table is a direction, not a commitment).

## Goals

- A third leg of about two minutes, harder than Leg 2, flown with the seed and the line from the start.
- **Your lasso:** close your line into a loop and everything fully inside it is caught at once. Gameplay first: the leg is built so that
  looping is the best answer often enough to be learned and loved, never the only one.
- A long lasso: once granted, the line holds about three times Leg 2's ink and lasts longer, enough for a loop about 700 px across.
- The lasso glitters and sparkles while held, and a closing loop flashes and bursts into sparkles as it catches.
- A new kind of Hush that begs to be looped (the Flock) and a new obstacle that punishes shooting and rewards looping (mirror shards).
- Leg 3 in the level grid beside Legs 1 and 2, playable any time (Normal): 108 levels in all.

## Non-goals

- Hardcore (start over, lives carried across legs): later, its own design.
- New controls: no new button (it would change the replay format). The lasso is the line, closed.
- New music: Leg 3 plays the world's `road` loop.
- Lavish land art: the art bar is still the mockup; the owner put gameplay first (vault note `world-22-art-simple`, 2026-11-28). The glitter
  is the exception, because he asked for it.

## Anti-goals

- Slowing, easing or capping the pointer (R68; the owner called it "perfect"). A pointer can draw a loop in one tick; the ink budget is
  what bounds it.
- A loop that catches the whole screen: the ink caps the loop's size.
- Anything that stands in the band and rams but can't be shot (the owner's rule). Shards don't ram, and shots do break them.
- Leg 1 or Leg 2 changing. Both are pinned before any core change.

## Approaches (for closing the loop)

- **A. The line closes on itself (picked).** The line already records where the ship flew. A loop is the moment the newest stroke crosses
  an older stroke; the closed part is the loop. No new state, nothing new to hash, and a gap bitten out of the line by enemy fire stops a
  loop from closing, which is fair counterplay for free.
- B. A separate lasso trail beside the line. Duplicates the line's data and drawing; rejected.
- C. Closing by coming back near where the loop started (no crossing needed). More forgiving, but "near" is a new tuning knob and it can
  close loops the player didn't mean; the owner's words were "completely encircle and close a loop". Rejected.

## How it works

### Your lasso (core, world 22 only)

- The ability `'lasso'`. Leg 3 starts with `['seed', 'line']`; its first lantern grants `'lasso'` (the grant code already handles any
  ability). Before that lantern the line is Leg 2's line, unchanged.
- **A longer line:** while `'lasso'` is held the line holds `LASSO_INK` px of ink (pick: about 2,400 px) and each segment lasts
  `LASSO_LIFE` s (pick: about 4 s), instead of `LINE_INK` 700 and `LINE_LIFE` 3. The life must grow with the ink, or the start of a big
  loop fades before its end is drawn (2,000 px at 720 px/s is 2.8 s). Without the ability both stay exactly as in Leg 2.
- **Screen space:** the line hangs in the air in screen space and does not scroll with the land (as in Leg 2), so a loop catches what is
  inside it on the tick it closes: craft where they are, ground objects where the scroll has carried them by then.
- **Closing:** each time drawLine lays a segment, it checks that segment against the older ones. The first (oldest) older segment it
  touches closes a loop, if the segments between them are one unbroken chain (a bite from enemy fire breaks the chain: no loop) and the
  loop is real: at least `LOOP_MIN_SEGS` segments and `LOOP_MIN_AREA` px² (so retracing your own stroke or a wobble never fires). A
  pointer jump that lays many segments in one tick is checked segment by segment, in order.
- **Catching**, the tick the loop closes, everything fully inside it, in array order:
  - enemy shots, lasers included, are wiped (they pay nothing and are not dodges, like a shot stopped by the line);
  - air craft are caught outright, whatever their hp, as kills (score, combo, the usual drop chance);
  - ground objects that shots can hurt (stones, turrets, crates, pillars, thorns, shards, gates) are broken outright, as kills; lanterns
    never;
  - power-ups inside (including any the catch just dropped) go straight to the ship and are collected next tick.
  - "Inside": a round thing (a craft, a round ground object such as a gate or a shard, a shot, a pickup) counts by its centre; a laser by its
    head (x, y), like any shot; a box (pillar, thorn) needs all four corners inside.
  - A gate a loop breaks counts for its hold exactly as a shot-down gate does (the last one breaks the hold). Each catch steps the combo as
    a kill does, within the existing combo cap.
- **The ink is spent:** the loop and the stroke after the crossing are rubbed out; older ink before the loop stays. One loop catches once.
- **Recharge (the owner, 2026-11-28):** after a loop closes, no new loop can close for `LASSO_RECHARGE` s (about 1.5 s); the line still
  draws and still stops shots meanwhile. The glitter is the gauge: it dims while the lasso recharges and sparkles again when it is ready.
- Event `'lasso'` { x, y, poly (the loop's points, for the view), counts }. The catches keep their own `kill` / `groundKill` events.
- The line still stops shots while open, as in Leg 2 (with the lasso it is a longer, longer-lived wall, so Leg 3's fire is heavier to
  match).
- Pure core, arrays only, no rng: replays re-simulate exactly. A dead ship draws nothing and a respawn clears the line, so no loop spans a
  death.

### The new Hush: the Flock

- A dozen small motes (`FLOCK_N` 12) that wheel round a centre drifting down the band. Each mote is an ordinary air craft with 1 hp: one
  shot kills it, and it rams like any craft.
- **They scatter from your shots:** when a ship's shot comes within `SCATTER_R` of any mote, the whole flock bursts apart away from it
  for `SCATTER_SECS`, then regroups over `REGROUP_SECS`. So shooting a flock is slow and messy; one loop round the wheeled flock takes all
  twelve.
- They fire nothing (my call: the threat is the ram of a fast dense cloud; it keeps the 400-bullet cap safe).
- One drop for the whole flock, from the last mote to die (my call: twelve kills would otherwise rain power-ups). Motes that leave the
  screen are gone; if the last mote leaves, the flock drops nothing.
- Deterministic: position is a function of time and the spawn data plus one scatter record; no rng.
- Never in a hold's flights (a hold allows `HOLD_FLIGHTS_MAX` 6 craft; a flock is 12). Data rule: no flock alive when a hold starts.

### The new obstacle: mirror shards

- Silver splinters standing on the salt: round ground objects that **do not ram** (they punish shooting, not flying).
- **They throw shots back:** each ship shot that hits a shard and leaves it standing sends one enemy shot back from the hit point, aimed at
  where the ship is on that tick (no lead), at `SHARD_SPEED` (slower than an aimed shot, so it reads). The breaking hit throws nothing back. No return when the
  ship is nearer than `SHARD_MIN_RANGE` (no point-blank hit you can't dodge).
- About `BREAK_SECS.shard` of fire to break (pick: about 6 hits). The beam, a seed and the bomb break them with no return; a loop breaks
  them clean.
- The throw-back runs where the ship's shots already hit ground objects; a piercing shot throws back once for each shard it hits.
- Returned shots are ordinary small shots (hp 1): the gun can cut them, the line stops them, a loop wipes them.
- They come in clusters a loop can take (3-5 together), often guarding crates.

### Leg 3 in the course of the leg (direction for the data)

- **Opening:** the glider comes out of the Pencil Wood's last parchment onto a blinding white salt flat. Opening card **"THE SKY LIES
  DOWN."** (approved by the owner, 2026-11-28).
- **Stretch 1, the shore:** kites and Smudges (curtains you wall off with the line), single shards in the open to learn the throw-back,
  turrets, a crate.
- **Lantern 1:** grants the lasso. Caption **"YOUR CIRCLE."** (approved by the owner, 2026-11-28).
- **Stretch 2, the open flat:** the first Flocks, alone in quiet air, so a loop is the plain answer; shard clusters round crates; a few
  dives.
- **Lantern 2.**
- **Stretch 3, the pools:** Flocks with Smudges and kites, curtains, shard rows, lasers (they pass the line but a loop wipes them).
- **The hold: the Glass Ring**, a ring of gates (hold targets) spaced so one loop can take at most two of them: looping helps, it doesn't
  skip the fight (my call, keeping "anything" true). Smudges and kites in its flights, no Flocks. The flood, the run-out into blank
  parchment, and the last card **"THE ROAD GOES ON."**
- New data rules beside the course fairness rules: no flock within a screen of a hold; nothing else spawns within a gap of the first Flocks;
  a shard never stands on the only way through, nor within `RESPAWN_SAFE` of a lantern; the hold's gates no closer together than one loop
  can span twice.

### What the player sees and hears with the plain leg

The lasso has to read while the leg is played plain, so these come with it, not after the flight:

- **Glitter (the owner's ask):** once the lasso is held, the line glitters: small cached sparkle sprites twinkle along it (drawn
  additively, no per-frame `shadowBlur`, few enough for the Pi). They dim while the lasso recharges and sparkle back when it is ready.
- **A closing loop:** its shape flashes bright, then bursts into sparkles along its edge (fx, within the 600-particle cap), and every catch
  pops its score as usual.
- **Sounds:** a bright shimmering chime when a loop closes (D major, the road kit), rising with how much it caught; a glassy ping on a
  shard's throw-back; a soft flutter when a Flock scatters.
- Plain sprites for the motes and the shards, distinct from the kites and the Smudge.

### Leg 3 joins the game

- `JOURNEY` gains Leg 3 (`w22-3`), "Leg 3" on its reel, 108 levels in all; the count is swept through the repo (README, index.html meta
  and JSON-LD, CLAUDE.md, llms.txt, og.html, og.png re-rendered).
- `OWN[22]` gains Leg 3's value, 0.95 (my call: harder than Leg 2's 0.9; tuned after the flight). The tests that assume two legs are fixed.
- `w22-2` is pinned (a fingerprint and a clear-kit state hash, like `leg-1-unchanged`) before any core change. Neither leg may move.
- `src/ui/audio.js` is at 198 lines: its world 22 volumes move out before any new sound is added.

### Look (after the owner has flown the plain leg)

- The salt flat in the mockup's pencil style: white crust with polygon cracks, shallow pools that mirror the sky; seeds bring back pool
  blue and samphire; the band's edge low salt ridges.
- The trace: the light's reflection in one long pool is not a glider. What it is, is the owner's call, after the flight.
- Any trailer cards for Leg 3 are the owner's words, word for word.

## Measuring

- The balance harness (vault note `balance-harness`) cannot draw loops; Leg 3 is measured with the clear kit (invulnerable) for its
  fixtures and by the owner's flight for its feel. Picks (ink, life, flock and shard numbers, the fire) are tuned from that flight.
- Leg 1 and Leg 2 fixtures stay byte-identical; the full suite proves it.

## Data and checkpoints

- Leg 3 is one `course(seed, data)` level in the existing shorthand, with two new kit entries (`flock`, `shard`); two lanterns; about two
  minutes at a scroll of about 230 px/s.
- A respawn works as in Legs 1 and 2: the line is cleared (a death mid-loop loses that ink), the craft and ground re-spawn from the record,
  the abilities come back from the last lantern (so `'lasso'` survives a death after lantern 1). Flock state lives on its motes, which are
  ordinary aliens, so the hash and the snapshot already carry it.
- The hold's spacing rule is a data test: no three gates fit inside one loop of `LASSO_INK` (a circle of that perimeter).

## Left to the builder

- Where the shared line constants live (no import cycle), file splits under 200 lines, names of the internal helpers.
- The exact flock wheel and scatter curves, sprite details, sparkle counts within the Pi budget.
- The order of the build, with the Leg 2 pin and the audio split first.
