import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprint } from './fingerprint-kit.js';
import { POWERS } from '../../src/core/kinds.js';
import { makeRun } from '../../src/core/replay.js';

// World 13 adds two rules (the wingmen power and the broadside twist) that must touch no other world:
// worlds 1-12 play, draw rng and replay exactly as before. These are the fingerprints of one level of
// each world (two for a few) flown by the autopilot for up to 60 s, taken on commit 1ddc0b8, the last
// before world 13: the same seed and inputs give the same states, the same rng state and the same
// events. If a rule change moves any of them, either it leaked out of its world or it is meant to, and
// then these are re-pinned and RUN_V goes up.
const BEFORE_WORLD_13 = {
  'w1-2': {fold: 170124421, end: '2276:63500:ddc35893a42d4f77', pickup: 1, power: 2, kill: 71, shipHit: 0, fire: 181},
  'w1-4': {fold: 582676515, end: '3600:125400:e226036267027aaf', pickup: 8, power: 10, kill: 121, shipHit: 0, fire: 472},
  'w2-3': {fold: -978363987, end: '2772:93600:af030ea80e46a01b', pickup: 3, power: 2, kill: 81, shipHit: 0, fire: 299},
  'w3-3': {fold: -448304575, end: '1386:105400:394b9479a088ece2', pickup: 4, power: 5, kill: 84, shipHit: 0, fire: 171},
  'w4-4': {fold: 849447188, end: '3600:76700:3877cc0f7680d04b', pickup: 1, power: 1, kill: 77, shipHit: 0, fire: 734},
  'w5-5': {fold: 1640005966, end: '2367:21800:daa7db2bcc8b6085', pickup: 6, power: 7, kill: 11, shipHit: 0, fire: 304},
  'w6-3': {fold: 584244419, end: '1981:96550:ad99bd9aa21f604e', pickup: 4, power: 7, kill: 81, shipHit: 0, fire: 281},
  'w7-2': {fold: -913080146, end: '2167:85650:27d553b1ef7ba317', pickup: 12, power: 10, kill: 74, shipHit: 0, fire: 204},
  'w8-4': {fold: -1315178108, end: '2915:77750:90dfa5ba7eb48092', pickup: 7, power: 10, kill: 91, shipHit: 1, fire: 353},
  'w9-2': {fold: -1841819857, end: '1850:94350:4615bcd764350520', pickup: 4, power: 6, kill: 78, shipHit: 0, fire: 197},
  'w10-3': {fold: 1705773561, end: '2078:79800:114624f793a575dd', pickup: 4, power: 5, kill: 75, shipHit: 0, fire: 307},
  'w11-3': {fold: 912544421, end: '2247:174150:e953adf8a88a87f4', pickup: 9, power: 9, kill: 129, shipHit: 0, fire: 253},
  'w12-2': {fold: 2071597704, end: '1514:83150:04fde4c9de6e214d', pickup: 3, power: 3, kill: 75, shipHit: 0, fire: 137},
  'w12-5': {fold: -63581201, end: '3292:24300:1f24624779d5d4e8', pickup: 10, power: 11, kill: 12, shipHit: 0, fire: 385},
};

for (const [id, expected] of Object.entries(BEFORE_WORLD_13)) {
  test(`${id} plays out exactly as it did before world 13`, () => {
    assert.deepEqual(fingerprint(id), expected);
  });
}

// World 14 adds one rule (the fireworks twist: shells, fuses, the burst) that must touch no other
// world, world 13 included: the aliens of every other world get no `shell` field and no extra rng
// draw, the twist state gets no fuses, and the state hash adds nothing. These are two wave levels of
// world 13 and its boss level, taken on commit cd58e7f, the last before world 14, and held to the same
// rule as the fingerprints above.
const BEFORE_WORLD_14 = {
  'w13-1': {fold: -970930790, end: '1264:50200:cec9c3fe96fa9e60', pickup: 4, power: 4, kill: 51, shipHit: 0, fire: 127},
  'w13-3': {fold: 1835565022, end: '1806:90350:8b224b6edf9de494', pickup: 8, power: 2, kill: 75, shipHit: 0, fire: 211},
  'w13-5': {fold: 1753922709, end: '1979:19000:db5dbbb1c74ef26f', pickup: 5, power: 4, kill: 5, shipHit: 0, fire: 241},
};

for (const [id, expected] of Object.entries(BEFORE_WORLD_14)) {
  test(`${id} plays out exactly as it did before world 14`, () => {
    assert.deepEqual(fingerprint(id), expected);
  });
}

test('the replay version stays 8, and the six powers stay the six', () => {
  assert.equal(makeRun('w1-1', 1, [], { score: 0, stars: 0 }).v, 8);
  assert.deepEqual(POWERS, ['spread', 'laser', 'rapid', 'shield', 'homing', 'slow']);
});
