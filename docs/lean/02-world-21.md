---
goal: >-
  A twenty-first world, "Golden Isle", inspired by the war of an ancient Indian epic: the last battle, at dusk,
  before an island city of gold, with a rule of its own (the returning arrow), five levels and a ten-headed king
  as its boss. The game goes from 20 worlds and 100 levels to 21 worlds and 105 levels. Worlds 1-20 play and
  look exactly as before.
shared:
  decisions:
    - "2026-11-19, the runner on the person's standing word ('dont make it easy', memory/balance-harness.md, 2026-10-27; the game must never become too easy): R23's first bar, that the king clear at least half the probe's seeds, forced a 2.5x slower boss far easier than world 20's. The bar is now the range of worlds 18-20's bosses across all six lags, with no wave level at zero."
    - "The person (2026-11-18) asked for a new world with a Ramayana theme, 'an epic world'; the runner and the advisor settled the design. The epic lives in the art, the boss and the music; the world has one rule, as every world does."
    - "Original names (CLAUDE.md): the world is 'Golden Isle', the boss 'The Ten-Crowned King' (kind crowns), the rule 'the returning arrow' (twist quiver, ruling R73). No character, place or weapon name from the epic appears in the game's code, data or text; only the design spec says what inspired the world. The person may overrule any name."
    - "The owner (2026-11-19), on world 21 as it opened: 'the background of Ramayana must contain more symbols of Ramayana. almost packed with personalities and Lanka must look better'; then, told C1 was the runner's rule: 'continue with the new cast'. C1 is amended for the backdrop only (see C1)."
    - "The owner (2026-11-19), playing world 21: 'can you add some Tabla and Sitar sounds into the game and the arrows that I shoot must have green and blue and other hues than red. I mistake red for incoming projectile.' Then, on the first draft: 'more tabla and a bit louder', and 'good, finish it and merge'. The shots' and the music's musts are amended (see them): the arrows' tips burn green, turquoise, blue and violet, never red or orange; the lead is a sitar and the drum line a tabla, the loop about 2 dB over the others by the owner's choice."
    - "The owner (2026-11-19), on the king: 'make a plan to change the boss to become more elastic. it has a very rigid shape and is completely dead in its charactristics. and it must be the norm from now that the boss must be more alive'; on the plan, choosing small art-only motion (the hit boxes never move) with breathing and a wind-up: 'okay', then 'the older bosses are not important. on this one and the future ones'; on the build: 'great work'. The king bends from pivots, breathes, lags, recoils and winds up through src/ui/bosses/life.js; CLAUDE.md and the design spec make it the rule for every boss from world 21 on; worlds 1-20's bosses are unchanged. The runner cut the regrow pop from the plan, since the owner never asked for it."
    - "The person (2026-11-18) wants a maker's mark like world 19's plate and world 20's colophon, 'but more subtle and not like propaganda'. The runner chose its form and words (R12); the person may change the one constant."
    - "World 20's decisions carry over: world 21 gets its own ship, shots, power-up skins and music ('if possible innovate'); the per-world rows a test or the renderer requires for every world (the lobby tagline and poster time, the trailer voice, the trailer TYPE row, the film tint) are in scope, their words and typography the builder's, in the voice of the other worlds; og.png stays out."
  design: >-
    Design reference: world 20, Midnight Press, and world 19, Rubber Regatta, as they are in the game: world 21
    has the same parts in the same places (a sky, three parallax layers, ambient particles, a cast of five
    aliens, a boss, its own ship, shots, power-up skins and music). The bar for the art is the lavish worlds
    the person loved most (13 Sunset Armada, 15 Lantern Deep, 16 Glass Cathedral): painterly and rich in gold,
    every glow a cached sprite.
  constraints:
    - id: C1
      rule: "Only the demon king's host are enemies, targets or minions. No figure the tradition reveres (the hero, his brother, his queen, the monkey host and its champion, the vulture, any god) is drawn as a foe, a target, a minion or any sprite of play; the hero is present only as the player's chariot and its arrows. Amended 2026-11-19, for the backdrop only (the sky body and the three parallax layers), on the owner's words: 'the background of Ramayana must contain more symbols of Ramayana. almost packed with personalities and Lanka must look better'; told that the old rule (no revered figure drawn anywhere) was the runner's and not theirs, the owner answered the same day: 'continue with the new cast'. The backdrop may now paint the revered cast, dignified and heroic, never comic: the monkey host and its champion, the great vulture, the captive queen and the hero's brother, and the story's own objects (the great bow, the bridge of floating stones, the golden deer, the signet ring, the mace, the flying chariot, the ashoka grove, lotus, lamps). C2, C3 and C4 hold as written."
    - id: C2
      rule: "No enemy, minion or boss has the form of a revered being: no monkey, no elephant head, no eagle or vulture head, no many-hooded serpent. The boss's weapons are swords, maces, bows, axes, spears and shields: no discus, no trident, no conch."
    - id: C3
      rule: "No sacred symbol, script, verse or name on any sprite, pickup, poster, card or text: no Om, no swastika, no forehead marks, no Indic script, nothing inscribed on the floating stones. The art borrows ornament (gold leaf, stepped temple towers, lotus petals, brass lamps, textile borders), never objects of worship."
    - id: C4
      rule: "The boss is regal and terrible, never comic, and no enemy is a joke."
    - id: C5
      rule: "Worlds 1-20 play and look exactly as before: their pinned fingerprints (test/core/worlds-unchanged.test.js, test/core/worlds-idle.test.js) do not move."
    - id: C6
      rule: "Every tuning value is a named, exported constant, defined once; tests read it and never repeat it or what it works out to. Pars and ratings are regenerated by their scripts, never typed."
    - id: C7
      rule: "No test asserts that a world 21 thing is absent from a registry ('not listed yet'), because such a check breaks in the part that lists it. A test proves an unlisted piece on a test level or by importing it directly."
    - id: C8
      rule: "The repository's standing rules (CLAUDE.md) hold: every code file under 200 lines; src/core and src/fx pure; no per-frame shadowBlur; at most 600 particles and 400 enemy bullets."
    - id: C9
      rule: "An existing assertion moves only where a requirement names it, and only as far as said. Any other existing assertion that fails stops the builder, who reports it; it is not changed."
  out_of_scope:
    - "A new kind of power-up (the skins are in scope; the kinds are the six standard ones)."
    - "Any change to the trailer, the screens, the lobby's layout or the storage keys beyond world 21's own per-world rows."
    - "Any change to how worlds 1-20 play or look."
    - "og.png and og.html, deployment, the Pi menu."
parts:
  - id: quiver-rule
    purpose: "World 21's rule, the returning arrow (twist quiver), in src/core alone, proven on a test level that carries world 21, twist quiver and free flight, the way test/core/bonk-kit.js does for world 19."
    requirements:
      - id: R1
        must: "In a level whose twist is quiver, every ship shot that reaches the top of the field (HUD_BOTTOM) turns back once: from there it flies in a straight line at QUIVER_SPEED toward the point where the ship stood on the tick it turned (its quiver point)."
        accept: "A shot fired straight up, the ship then moved aside, turns on the tick it reaches HUD_BOTTOM, and its velocity points at the ship's position on that tick with speed QUIVER_SPEED."
      - id: R2
        must: "A returning arrow hurts, kills and scores exactly as it did on the way up."
        accept: "An alien killed by a returning arrow scores what a ship shot scores for it."
      - id: R3
        must: "A returning arrow never hurts the ship, collects nothing and turns no second time; it ends when it reaches its quiver point or leaves the field."
        accept: "A returning arrow that crosses the ship leaves its lives unchanged; one that reaches its quiver point is gone by the next tick; one that reaches HUD_BOTTOM again does not turn."
      - id: R4
        must: "Only shots turn: the laser beam and the smart bomb are untouched."
        accept: "With the laser power in a quiver level, the beam does what it does in any other world."
      - id: R5
        must: "The state is plain data (on the shot, or in world.twist as arrays), no rng is drawn, and it is part of the state hash. Nothing of it runs outside a quiver level."
        accept: "A recorded quiver run re-simulates to the same state hash; two worlds that differ only in a shot's turned state hash differently; in a level of any other twist no shot ever turns."
  - id: regrow-kit
    purpose: "The boss kit learns one new behaviour, a part that grows back, as shared src/core code that no existing boss uses."
    requirements:
      - id: R6
        must: "A boss part may name a regrow time. Such a part, once its hp reaches 0, grows back to its full hp that many seconds later, while the boss is alive, not dying, and in a phase its definition lets parts regrow in; the boss's hp rises by what grows back."
        accept: "On a test boss, a regrowing part cut down is back at full hp after its regrow time and the boss's hp has risen by as much; in a phase that does not let parts regrow it stays down; while the boss is dying nothing grows back."
      - id: R7
        must: "A phase once begun is never left, however far hp rises."
        accept: "A test boss in its second phase whose regrowth lifts its hp above the first phase's threshold stays in its second phase."
      - id: R8
        must: "The countdowns are plain data on the boss and part of the state hash; no rng is drawn. A boss without regrowing parts behaves exactly as before."
        accept: "Two worlds that differ only in a regrow countdown hash differently, and the fingerprints of worlds 1-20 are unchanged."
  - id: king-boss-data
    purpose: "The Ten-Crowned King (kind crowns), world 21's boss, as data in a new src/core/bosses-data-8.js, built from the existing kit, its bullet patterns and the regrowing part, not yet listed."
    needs: [regrow-kit]
    requirements:
      - id: R9
        must: "A colossal ten-headed king seen front-on: ten crowned heads (the great one at the centre), twenty arms fanned behind him gripping weapons (C2), a gilded breastplate over his heart, on a flying throne. Like the other side-world bosses it never charges, and it rests so that every part stays below the HUD. Its phases, attacks and minions (masked soldiers, golden deer, a carrier chariot) are the builder's, from the existing bullet patterns."
        accept: "The definition has ten head parts, never charges, and every part sits below HUD_BOTTOM at its rest position."
      - id: R10
        must: "The epic's beat: the heads are weak and regrow (R6) in every phase but the last; the breastplate is armour, so it cracks only when every head is down at once (the kit's rule that plates crack when no weak point is left); the last phase opens the heart, and there no head grows back."
        accept: "Fought on a test level: a cut head grows back in the first phase; with all ten heads down at once the breastplate takes damage; in the last phase the heart is weak and a cut head stays down."
  - id: isle-backdrop
    purpose: "The Golden Isle backdrop, world 21's sky, three parallax layers and ambient particles, drawn and proven on their own."
    requirements:
      - id: R11
        must: "Dusk over a warm sea before an island city of gold. The sky: towering monsoon clouds lit gold and crimson around a great low sun, celestial arrows streaking high like comets. The far layer: the city on its three-peaked mountain, gilded walls and stepped temple towers, part of it burning, smoke rising. The mid layer: a causeway of great floating stones crossing the sea toward it, lit by torches. The near layer: the swell of the sea with floating stones and drifting brass lamps. The ambient: embers and marigold petals."
        accept: "World 21's sky body, three layers and ambient entries draw under stand-in canvases."
      - id: R26
        must: "Existing assertions that move, only as far as said: four tests count the sky bodies as a sum over the files they know, and each gains world 21's sky-body file as one more term of that sum: test/ui/bath-look.test.js:70, test/ui/glass-env-look.test.js:51, test/ui/smog-look.test.js:72, test/ui/storm-look.test.js:47. Their rule (one painter a world, none overridden) holds."
        accept: "The suite is green with only those four sums moved for this part, each by world 21's file alone."
      - id: R12
        must: "A maker's mark, quiet as a painter's signature: a small palm-leaf page drifting on the near layer's water, low on the right where world 20 has its colophon, its ink only a little darker than the leaf, with no frame, rule or glow, its type smaller than world 20's colophon. It reads exactly 'cocode.dk · graph-loop · 2026', one named constant, stays inside the frame and clear of the HUD, and is legible at 1920x1080 to a player who looks for it."
        accept: "The mark's constant is exactly 'cocode.dk · graph-loop · 2026'; under a stand-in canvas the mark is drawn inside the frame below HUD_BOTTOM, with a font size smaller than world 20's colophon's and no shadow or glow."
  - id: isle-cast-and-boss-art
    purpose: "World 21's five aliens and the Ten-Crowned King's art, drawn and proven on their own."
    needs: [king-boss-data]
    requirements:
      - id: R13
        must: "The cast is the demon king's host, painted like a masked dance-drama in gold, vermilion, deep green and black: the grunt a masked foot soldier under a tiered crown, the diver a shimmering golden deer of illusion, the gunner a demon archer with a curved bow, the armored a towering mace-bearing giant in gilded plate, the carrier a small flying chariot of the host."
        accept: "World 21's five role painters draw and animate under stand-in canvases, as test/ui/art.test.js requires of every look."
      - id: R14
        must: "The boss art draws every part of the crowns definition where the part is: a fallen head as a stump and a regrown one whole again, the heart glowing through a cracked breastplate. It reads at a glance as a ten-headed, twenty-armed king: lavish, regal and terrible."
        accept: "The boss painter draws the definition with a head down and with every head up under a stand-in canvas, each part where the definition puts it."
  - id: isle-ship-shots-music
    purpose: "World 21's own player side and sound: the ship, the shots, the returning arrow's look and sound, the power-up skins and the music."
    needs: [quiver-rule]
    requirements:
      - id: R15
        must: "The ship is a golden sky chariot: a small canopy like a stepped temple tower on a hull of lotus petals, spoked wheels, pennants. Its shots are golden arrows tipped in cool colours (green, turquoise, blue, violet; nothing red or orange, so they are never taken for the host's fire: amended 2026-11-19 on the owner's words, see the decisions), drawn pointing the way they fly, so a returning arrow points at its quiver point. Its power-up skins dress the six standard kinds in the isle's gold and vermilion."
        accept: "World 21's ship, shot and pickup skins draw under stand-in canvases, and a shot flying down is drawn turned from one flying up."
      - id: R16
        must: "The turn of a returning arrow has its own fx (a golden arc flash where it turns, src/fx pure) and its own sound: a struck chime in world 21's scale, pitched by where across the field the arrow turns, so a row of turns plays a run. Other worlds' fx and sounds stay as they were."
        accept: "A turn emits the fx at the turn point; the chime's pitch follows the turn's x on world 21's scale; the sound tests of the other worlds hold."
      - id: R17
        must: "Its own music mood: calm struck tones (a drone and plucked strings) over a punchy beat of deep tuned drums (amended 2026-11-19 on the owner's words, see the decisions: the lead is a sitar and the drums a tabla, and the loop sits about 2 dB over the others), on a scale no other world uses (the double harmonic major is free), its loudness matched to the others as /home/cocodedk/0-projects/invaders/memory/music-loudness.md says. Its root and tempo may be another world's (all twelve roots are taken), except where an existing test keeps a root to one world. The style joins STYLES and the scale joins SCALES (src/ui/sound-data.js); one existing assertion moves: test/ui/sounds.test.js:65 pins the number of styles at 20 and goes to 21, its message with it."
        accept: "World 21's music gives its own style and a scale no other world's look uses; the suite is green with only test/ui/sounds.test.js:65 moved for this part."
  - id: isle-look-registered
    purpose: "World 21's look joins LOOKS as its twenty-first entry, so every rule the suite holds each look to holds for it."
    needs: [isle-backdrop, isle-cast-and-boss-art, isle-ship-shots-music]
    requirements:
      - id: R18
        must: "LOOKS has twenty-one entries; the last is world 21's, with world 21, and lookFor gives it to a level of world 21. The pins of the number of looks move from 20 to 21. Where a rule every look must meet fails for world 21, the fix is to world 21's own files, never to the test or another world."
        accept: "As test/ui/press-look.test.js does for world 20: LOOKS has 21 entries, lookFor gives a world 21 level its look, and its layers, roles and music resolve through the registries the game uses."
  - id: isle-levels-and-difficulty
    purpose: "World 21's five levels as data in a new src/core/levels-7.js and its own difficulty row, proven on their own and not yet listed."
    needs: [quiver-rule, king-boss-data]
    requirements:
      - id: R19
        must: "Five levels, w21-1 to w21-5: four wave levels that follow the data rules test/core/levels.test.js enforces (3-5 waves, at most 40 aliens a wave, a carrier on every wave level, four formations a world) and a boss level of crowns."
        accept: "The level data of levels-7.js meets the data rules for a world, and its seeds are integers distinct from each other and from every listed level."
      - id: R20
        must: "World 21 has its own row in src/core/difficulty.js, each level's difficulty no lower than world 20's at the same index."
        accept: "difficulty() gives each world 21 level its own value, none lower than world 20's at the same index."
  - id: isle-art-type-and-tint
    purpose: "The per-world rows that can be listed before the world is: the boss art in BOSS_ART, the trailer TYPE row and the film tint."
    needs: [isle-cast-and-boss-art]
    requirements:
      - id: R21
        must: "The boss art joins BOSS_ART under crowns; TYPE in src/ui/trailer/draw.js gets world 21's row; TINTS in src/fx/film.js gets a colour no other world has. The pin of the number of boss pictures moves from 20 to 21."
        accept: "BOSS_ART has crowns, TYPE has a row for world 21, and a world 21 level gets a film tint no world from 1 to 20 has."
  - id: world-21-opens
    purpose: "The world opens: World 21 is listed with its levels, rule and boss, its pars and ratings, its lobby and trailer rows, and the documents say so."
    needs: [isle-look-registered, isle-levels-and-difficulty, isle-art-type-and-tint]
    requirements:
      - id: R22
        must: "World 21 is the twenty-first entry of WORLDS: 'Golden Isle', twist quiver, boss crowns, free flight, no bunkers. quiver joins TWISTS, crowns joins BOSSES and its definition BOSS_DEFS, levels-7.js joins LEVELS. Pars and ratings are regenerated by scripts/pars.mjs and scripts/ratings.mjs. The lobby tagline and poster time and the trailer voice get world 21's rows. Tuning the crowns definition or world 21's level data so that the suite's boss and level tests pass is in scope; their own tests keep holding."
        accept: "WORLDS has 21 entries, the last as said; there are 105 levels and 21 boss levels; crowns is fought to its end on w21-5 and never charges; world 21 has its lobby card after world 20 with its tagline, poster time and trailer voice."
      - id: R23
        must: "Before pars are regenerated, the balance harness (/home/cocodedk/0-projects/invaders/memory/balance-harness.md) and the boss probe (/home/cocodedk/0-projects/invaders/memory/bossprobe.mjs) are run on the final tree across lags 8-18 x 20 seeds: world 21's wave levels together clear no more often than world 20's, and no world 21 level clears 0 of its runs; the king (w21-5) clears more than zero runs and lands within the range that w18-5, w19-5 and w20-5 span on the same probe. Tuning world 21's data to get there is in scope; CROWNS_REGROW stays at 18 s or more."
        accept: "The pull request lists the probe's results across lags 8-18 x 20 seeds for w18-5, w19-5, w20-5 and w21-5 and for world 20's and world 21's wave levels, and they meet the bar."
      - id: R24
        must: "The pinned counts and lists move as far as world 21 needs and no further: the pinned TWISTS and BOSSES lists, the pinned world ids and names, 100 levels to 105, 20 boss levels to 21, the unknown level id in test/core/levels.test.js, and the lobby-keys walks that end in the last lobby row (now five cards)."
        accept: "npm test is green with only those assertions moved."
      - id: R25
        must: "The design spec (docs/superpowers/specs/2026-10-17-invaders-design.md) gets the rule as R73 and world 21's row in its Worlds table, saying what inspired it; README.md, llms.txt and CLAUDE.md say 21 worlds and 105 levels."
        accept: "Each of those documents says 21 worlds and 105 levels, and the spec has R73 and world 21's row."
---

# World 21: Golden Isle

Notes for people; every obligation is in the front matter.

## The idea

The last battle of the epic's war, as an arcade set piece. The player's golden sky chariot crosses a dusk sea
along a causeway of floating stones toward an island city of gold, part of it burning, and fights the demon
king's host: masked soldiers, golden deer of illusion, archers, armoured giants. The boss is the king himself,
ten-headed and twenty-armed, whose heads grow back as the epic tells, until every head is down at once and the
heart lies bare.

## Why this rule

Three drafts, each from a set piece of the epic's war:

- **Fire spreading through the city** (a hit sets an alien alight and the fire leaps to its neighbours): dropped,
  a neighbour of world 14's firework chain, and a rule that plays itself.
- **Floating stones as cover** (each kill leaves a stone that blocks enemy bullets): dropped, a neighbour of world
  1's bunkers and world 17's breath, which wipe enemy bullets.
- **The returning arrow** (kept): the hero's arrows return to his quiver. A shot that reaches the top of the field
  flies back toward where the ship stood, so a miss rakes the formation again on a slant the player steers by
  moving after firing. Nothing else in the game turns the ship's shots; the bot plays it from the bottom; it is one
  core module hooked from twists.js, as echo.js is.

## Respect

The epic is sacred to many. C1-C4 keep revered figures out of play and sacred symbols out of the game: the player is
never a drawn figure, the enemies are only the demon king's host, and nothing sacred (script, verse, name, worship
mark) is written or drawn. Since 2026-11-19, on the owner's word (C1), the backdrop paints the story's revered cast and
objects, dignified and heroic, behind the fight: the monkey host on the causeway, its champion in the sky, the vulture,
the captive queen in her grove and the hero's brother on the near shore.

## For the runner

- Before isle-cast-and-boss-art is published, render a close crop of the boss and look at it: it must read as a
  ten-headed king at a glance (memory: art-ambition). Send it back for polish if not.
- The card is cut into one piece per part (ten), each its own pull request, each waiting for the last one's merge.
