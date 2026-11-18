---
goal: The Ten-Crowned King (kind crowns), world 21's boss, as data in a new src/core/bosses-data-8.js, built from
  the existing kit, its bullet patterns and the regrowing part, not yet listed.
scope: 'Build and judge only the requirements below and the `shared` rules. `context` is background and adds no
  obligation: the sibling cards beside this one build the rest.'
context:
  feature: 'A twenty-first world, "Golden Isle", inspired by the war of an ancient Indian epic: the last battle,
    at dusk, before an island city of gold, with a rule of its own (the returning arrow), five levels and a ten-headed
    king as its boss. The game goes from 20 worlds and 100 levels to 21 worlds and 105 levels. Worlds 1-20 play
    and look exactly as before.'
  siblings:
  - '[[021-quiver-rule]] World 21''s rule, the returning arrow (twist quiver), in src/core alone, proven on a test
    level that carries world 21, twist quiver and free flight, the way test/core/bonk-kit.js does for world 19.'
  - '[[022-regrow-kit]] The boss kit learns one new behaviour, a part that grows back, as shared src/core code that
    no existing boss uses.'
  - '[[024-isle-backdrop]] The Golden Isle backdrop, world 21''s sky, three parallax layers and ambient particles,
    drawn and proven on their own.'
  - '[[025-isle-cast-and-boss-art]] World 21''s five aliens and the Ten-Crowned King''s art, drawn and proven on
    their own.'
  - '[[026-isle-ship-shots-music]] World 21''s own player side and sound: the ship, the shots, the returning arrow''s
    look and sound, the power-up skins and the music.'
  - '[[027-isle-look-registered]] World 21''s look joins LOOKS as its twenty-first entry, so every rule the suite
    holds each look to holds for it.'
  - '[[028-isle-levels-and-difficulty]] World 21''s five levels as data in a new src/core/levels-7.js and its own
    difficulty row, proven on their own and not yet listed.'
  - '[[029-isle-art-type-and-tint]] The per-world rows that can be listed before the world is: the boss art in BOSS_ART,
    the trailer TYPE row and the film tint.'
  - '[[0210-world-21-opens]] The world opens: World 21 is listed with its levels, rule and boss, its pars and ratings,
    its lobby and trailer rows, and the documents say so.'
parent: '[[02-world-21]]'
needs:
- '[[022-regrow-kit]]'
shared:
  decisions:
  - The person (2026-11-18) asked for a new world with a Ramayana theme, 'an epic world'; the runner and the advisor
    settled the design. The epic lives in the art, the boss and the music; the world has one rule, as every world
    does.
  - 'Original names (CLAUDE.md): the world is ''Golden Isle'', the boss ''The Ten-Crowned King'' (kind crowns),
    the rule ''the returning arrow'' (twist quiver, ruling R73). No character, place or weapon name from the epic
    appears in the game''s code, data or text; only the design spec says what inspired the world. The person may
    overrule any name.'
  - The person (2026-11-18) wants a maker's mark like world 19's plate and world 20's colophon, 'but more subtle
    and not like propaganda'. The runner chose its form and words (R12); the person may change the one constant.
  - 'World 20''s decisions carry over: world 21 gets its own ship, shots, power-up skins and music (''if possible
    innovate''); the per-world rows a test or the renderer requires for every world (the lobby tagline and poster
    time, the trailer voice, the trailer TYPE row, the film tint) are in scope, their words and typography the builder''s,
    in the voice of the other worlds; og.png stays out.'
  design: 'Design reference: world 20, Midnight Press, and world 19, Rubber Regatta, as they are in the game: world
    21 has the same parts in the same places (a sky, three parallax layers, ambient particles, a cast of five aliens,
    a boss, its own ship, shots, power-up skins and music). The bar for the art is the lavish worlds the person
    loved most (13 Sunset Armada, 15 Lantern Deep, 16 Glass Cathedral): painterly and rich in gold, every glow a
    cached sprite.'
  constraints:
  - id: C1
    rule: Only the demon king's host are enemies, targets or minions. No figure the tradition reveres (the hero,
      his brother, his queen, the monkey host and its champion, the vulture, any god) is drawn anywhere, as a foe
      or otherwise; the hero is present only as the player's chariot and its arrows.
  - id: C2
    rule: 'No enemy, minion or boss has the form of a revered being: no monkey, no elephant head, no eagle or vulture
      head, no many-hooded serpent. The boss''s weapons are swords, maces, bows, axes, spears and shields: no discus,
      no trident, no conch.'
  - id: C3
    rule: 'No sacred symbol, script, verse or name on any sprite, pickup, poster, card or text: no Om, no swastika,
      no forehead marks, no Indic script, nothing inscribed on the floating stones. The art borrows ornament (gold
      leaf, stepped temple towers, lotus petals, brass lamps, textile borders), never objects of worship.'
  - id: C4
    rule: The boss is regal and terrible, never comic, and no enemy is a joke.
  - id: C5
    rule: 'Worlds 1-20 play and look exactly as before: their pinned fingerprints (test/core/worlds-unchanged.test.js,
      test/core/worlds-idle.test.js) do not move.'
  - id: C6
    rule: Every tuning value is a named, exported constant, defined once; tests read it and never repeat it or what
      it works out to. Pars and ratings are regenerated by their scripts, never typed.
  - id: C7
    rule: No test asserts that a world 21 thing is absent from a registry ('not listed yet'), because such a check
      breaks in the part that lists it. A test proves an unlisted piece on a test level or by importing it directly.
  - id: C8
    rule: 'The repository''s standing rules (CLAUDE.md) hold: every code file under 200 lines; src/core and src/fx
      pure; no per-frame shadowBlur; at most 600 particles and 400 enemy bullets.'
  - id: C9
    rule: An existing assertion moves only where a requirement names it, and only as far as said. Any other existing
      assertion that fails stops the builder, who reports it; it is not changed.
  out_of_scope:
  - A new kind of power-up (the skins are in scope; the kinds are the six standard ones).
  - Any change to the trailer, the screens, the lobby's layout or the storage keys beyond world 21's own per-world
    rows.
  - Any change to how worlds 1-20 play or look.
  - og.png and og.html, deployment, the Pi menu.
parts:
- id: king-boss-data
  requirements:
  - id: R9
    must: 'A colossal ten-headed king seen front-on: ten crowned heads (the great one at the centre), twenty arms
      fanned behind him gripping weapons (C2), a gilded breastplate over his heart, on a flying throne. Like the
      other side-world bosses it never charges, and it rests so that every part stays below the HUD. Its phases,
      attacks and minions (masked soldiers, golden deer, a carrier chariot) are the builder''s, from the existing
      bullet patterns.'
    accept: The definition has ten head parts, never charges, and every part sits below HUD_BOTTOM at its rest position.
  - id: R10
    must: 'The epic''s beat: the heads are weak and regrow (R6) in every phase but the last; the breastplate is
      armour, so it cracks only when every head is down at once (the kit''s rule that plates crack when no weak
      point is left); the last phase opens the heart, and there no head grows back.'
    accept: 'Fought on a test level: a cut head grows back in the first phase; with all ten heads down at once the
      breastplate takes damage; in the last phase the heart is weak and a cut head stays down.'
---
Cut from [[02-world-21]] by the loop: its part `king-boss-data`.
