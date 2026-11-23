import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprint } from './fingerprint-kit.js';
import { flyCourse } from './course-clear-kit.js';
import { levelById } from '../../src/core/levels.js';
import { stateHash } from '../../src/core/state-hash.js';

// World 22's Leg 2 (the Pencil Wood) adds to the course core (the line power, its wall, the new obstacle and Hush) behind its own
// level's data: none of it may touch Leg 1 (`w22-1`). These are Leg 1 as it played on commit 0281459, the last before any of that
// core changed, pinned two ways and held to the same rule as the fingerprints in worlds-unchanged.test.js:
//   - the autopilot's fingerprint for up to 60 s (the same kit as those, taken on the course: its pilot is mortal, and the run is
//     cut at the 60 s, about half way along the leg), and
//   - the clear kit's flight (the invulnerable, steered ship that clears the leg): when it clears, its tick, its score and the state hash.
// They are data measured from play and have no script, as the tables in worlds-unchanged.test.js have none: to re-take them,
// import fingerprint (fingerprint-kit.js) and flyCourse (course-clear-kit.js), run fingerprint('w22-1') and
// flyCourse(levelById('w22-1')), and write down what comes out (the tick, the score and stateHash(world) of its world). Re-take
// them only on purpose: if a change to the course core moves them, it leaked into Leg 1.
const LEG_1_FINGERPRINT = {fold: -695369883, end: '3600:720:e983fa37c099a174', pickup: 1, power: 0, kill: 13, shipHit: 6, fire: 394};
const LEG_1_CLEAR = {state: 'cleared', tick: 7111, score: 68650, hash: '7111:68650:318ea875f474b548'};

test('w22-1 plays out exactly as it did before Leg 2, flown by the autopilot', () => {
  assert.deepEqual(fingerprint('w22-1'), LEG_1_FINGERPRINT);
});

test('w22-1 clears exactly as it did before Leg 2, flown by the clear kit: the same tick, score and state', () => {
  const { world } = flyCourse(levelById('w22-1'));
  assert.deepEqual({ state: world.state, tick: world.tick, score: world.score, hash: stateHash(world) }, LEG_1_CLEAR);
});
