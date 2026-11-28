import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprint } from './fingerprint-kit.js';
import { flyCourse } from './course-clear-kit.js';
import { levelById } from '../../src/core/levels.js';
import { stateHash } from '../../src/core/state-hash.js';

// World 22's Leg 3 (the Mirror Flats: the lasso, the Flock, mirror shards) adds to the course core behind its own level's data
// and the 'lasso' ability: none of it may touch Leg 2 (`w22-2`). These are Leg 2 as it played on commit 640ffcb, the last before
// any of that core changed, pinned two ways, as in leg-1-unchanged.test.js:
//   - the autopilot's fingerprint for up to 60 s (its pilot is mortal), and
//   - the clear kit's flight: when it clears, its tick, its score and the state hash.
// They are data measured from play and have no script: to re-take them, import fingerprint (fingerprint-kit.js) and flyCourse
// (course-clear-kit.js), run fingerprint('w22-2') and flyCourse(levelById('w22-2')), and write down what comes out (the state, the
// tick, the score and stateHash(world)). Re-take them only on purpose: if a change to the course core moves them, it leaked into Leg 2.
const LEG_2_FINGERPRINT = {fold: 1882936240, end: '3600:6400:f433567d3b410155', pickup: 3, power: 4, kill: 20, shipHit: 5, fire: 422};
const LEG_2_CLEAR = {state: 'cleared', tick: 7992, score: 90270, hash: '7992:90270:12a3b77fb3933423'};

test('w22-2 plays out exactly as it did before Leg 3, flown by the autopilot', () => {
  assert.deepEqual(fingerprint('w22-2'), LEG_2_FINGERPRINT);
});

test('w22-2 clears exactly as it did before Leg 3, flown by the clear kit: the same tick, score and state', () => {
  const { world } = flyCourse(levelById('w22-2'));
  assert.deepEqual({ state: world.state, tick: world.tick, score: world.score, hash: stateHash(world) }, LEG_2_CLEAR);
});
