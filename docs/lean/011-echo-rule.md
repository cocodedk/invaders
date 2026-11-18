---
parent: "[[01-world-20]]"
---

# World 20, part 1: the echo rule (core)

Part 1 of 7 of `docs/lean/01-world-20.md` (World 20, "Midnight Press"). This part is `src/core` and `test/core` only.

## Goal

Add the rule of world 20, the echo (twist `echo`): the ship has a carbon copy that flies the ship's own path late and fires when the ship fired. Only the rule is built here. World 20 gets its `WORLDS` entry and its levels in part 7, so the tests of this part fly a test level that carries `world: 20`, `twist: 'echo'` and `free: true`, the way `test/core/bonk-kit.js` does for world 19. Worlds 1-19 play exactly as before.

## Behaviour

- The ship has a carbon copy. It flies the ship's own path `ECHO_DELAY` seconds late: at every tick it stands where the ship stood `ECHO_DELAY` ago, and it fires a base shot on every tick the ship fired then.
- There is no copy for the first `ECHO_DELAY` seconds of a level.
- The copy's shots are ship shots: they hurt, kill and score exactly as the ship's do.
- Nothing hits the copy, and it collects nothing.
- While the ship is down, the copy flies on until the recorded path runs out, then waits for it.
- The state is plain data in `world.twist` (arrays only), no rng is drawn, and it is part of the state hash, so a replay of a world 20 run is exact. Nothing of it runs outside world 20.
- `ECHO_DELAY` is a whole number of ticks (a multiple of `TICK`), so "where the ship stood `ECHO_DELAY` ago" is one exact tick. It and every other tuning value is a named, exported constant, defined once.

## Registrations

- None. The rule is keyed on the level's twist (`level.twist === 'echo'`), which `createTwist` and `applyTwist` (`src/core/twists.js`) accept without the name being listed anywhere.
- `echo` does not join `TWISTS` (`src/core/kinds.js`) here: `test/core/kinds.test.js:19` pins that list, `test/core/levels.test.js:27` compares it to `WORLDS`, and `test/core/twists.test.js`, `bonk.test.js` and `breath.test.js` fly every listed twist. It joins in part 7, with the `WORLDS` entry.
- No existing assertion changes in this part.

## Acceptance tests

`node:test`, in `test/core/`, reading the constants and never repeating their values:

1. In a world 20 level there is no copy before `ECHO_DELAY` has passed. After it, at every tick the copy stands where the ship stood `ECHO_DELAY` earlier, and a copy shot leaves on every tick the ship fired then.
2. A copy's shot that kills an alien scores what the ship's shot scores for it.
3. A bullet that crosses the copy flies on, and the ship's lives do not change.
4. A recorded world 20 run re-simulates to the same state hash, and two worlds that differ only in the copy's state hash differently.
5. In a level of any other world the echo state stays empty.

The existing suite stays green (`npm test`) with no existing assertion changed, the pinned fingerprints of worlds 1-19 (`test/core/worlds-unchanged.test.js`, `worlds-idle.test.js`) among it, and every code file stays under 200 lines.

## Out of scope

- The `WORLDS` entry, the `TWISTS` entry, the levels, the difficulty, pars and ratings of world 20 (part 7).
- The boss (part 2) and everything drawn or heard (parts 3-6), the carbon copy's drawing included.
- A new kind of power-up.
- Any change to how worlds 1-19 play.
