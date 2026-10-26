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
// then these are re-pinned and RUN_V goes up. R66 (the round tallied at the clear, RUN_V 9) re-pinned
// every table below: each level plays out as before, tick for tick and event for event, and only the
// score at the clear, with the state hash that holds it, moved.
const BEFORE_WORLD_13 = {
  'w1-2': {fold: 170124421, end: '2276:146020:3052bf02c5a7c618', pickup: 1, power: 2, kill: 71, shipHit: 0, fire: 181},
  'w1-4': {fold: 582676515, end: '3600:125400:e226036267027aaf', pickup: 8, power: 10, kill: 121, shipHit: 0, fire: 472},
  'w2-3': {fold: -978363987, end: '2772:205200:7ce57871c83c9beb', pickup: 3, power: 2, kill: 81, shipHit: 0, fire: 299},
  'w3-3': {fold: -448304575, end: '1386:228800:2e452c9bf4ea18da', pickup: 4, power: 5, kill: 84, shipHit: 0, fire: 171},
  'w4-4': {fold: 849447188, end: '3600:76700:3877cc0f7680d04b', pickup: 1, power: 1, kill: 77, shipHit: 0, fire: 734},
  'w5-5': {fold: -654576886, end: '2254:69700:9a6d2106c9aeff21', pickup: 7, power: 5, kill: 12, shipHit: 0, fire: 210},
  'w6-3': {fold: 584244419, end: '1981:211100:d867afcc87871aa1', pickup: 4, power: 7, kill: 81, shipHit: 0, fire: 281},
  'w7-2': {fold: -913080146, end: '2167:201300:d9878462a5b9c855', pickup: 12, power: 10, kill: 74, shipHit: 0, fire: 204},
  'w8-4': {fold: -1315178108, end: '2915:175500:036208a11859592a', pickup: 7, power: 10, kill: 91, shipHit: 1, fire: 353},
  'w9-2': {fold: -1841819857, end: '1850:206700:3ed1bf191799279e', pickup: 4, power: 6, kill: 78, shipHit: 0, fire: 197},
  'w10-3': {fold: 1705773561, end: '2078:177600:1c8ccfd5100ba989', pickup: 4, power: 5, kill: 75, shipHit: 0, fire: 307},
  'w11-3': {fold: 912544421, end: '2247:365300:68549e9f8a77b376', pickup: 9, power: 9, kill: 129, shipHit: 0, fire: 253},
  'w12-2': {fold: 2071597704, end: '1514:184300:b0db801ed0fdf95a', pickup: 3, power: 3, kill: 75, shipHit: 0, fire: 137},
  'w12-5': {fold: -1237732016, end: '2927:81900:9699e1b576edb919', pickup: 7, power: 3, kill: 9, shipHit: 0, fire: 342},
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
  'w13-1': {fold: -970930790, end: '1264:118400:e85ca5c209ae2931', pickup: 4, power: 4, kill: 51, shipHit: 0, fire: 127},
  'w13-3': {fold: 784006376, end: '1806:198700:2197d4f5a59e03d1', pickup: 8, power: 2, kill: 75, shipHit: 0, fire: 211},
  'w13-5': {fold: 1753922709, end: '1979:56000:e2ba4eb9b04859dc', pickup: 5, power: 4, kill: 5, shipHit: 0, fire: 241},
};

for (const [id, expected] of Object.entries(BEFORE_WORLD_14)) {
  test(`${id} plays out exactly as it did before world 14`, () => {
    assert.deepEqual(fingerprint(id), expected);
  });
}

// World 15 adds two powers (the pearls and the trident) and the angler boss, none of which may touch any
// other world, world 14 included: the powers drop in world 15 alone (powersFor), the shot only changes
// under the trident, the pearls' cooldown field exists only on an alien a pearl has hit, and the state
// hash adds nothing. These are two wave levels of world 14 and its boss level, taken on commit 5a73adc,
// the last before world 15, and held to the same rule as the fingerprints above.
const BEFORE_WORLD_15 = {
  'w14-1': {fold: 1160065178, end: '1015:144300:cc89a06a9dc60d23', pickup: 1, power: 0, kill: 65, shipHit: 0, fire: 131},
  'w14-3': {fold: -1414366089, end: '2147:215890:279474f7567ec157', pickup: 11, power: 11, kill: 113, shipHit: 0, fire: 290},
  'w14-5': {fold: -1318605307, end: '1885:56500:aa3ca34ff3a9bc94', pickup: 5, power: 3, kill: 5, shipHit: 0, fire: 269},
};

for (const [id, expected] of Object.entries(BEFORE_WORLD_15)) {
  test(`${id} plays out exactly as it did before world 15`, () => {
    assert.deepEqual(fingerprint(id), expected);
  });
}

// World 16 adds one power (the mirror twin) and the moth boss, and reuses world 7's reassemble twist:
// none of it may touch any other world, world 15 included. The power drops in world 16 alone
// (powersFor), the twin's shot exists only under the power, and the state hash adds nothing. These are
// two wave levels of world 15 and its boss level, taken on commit f7a807a, the last before world 16,
// and held to the same rule as the fingerprints above.
const BEFORE_WORLD_16 = {
  'w15-1': {fold: 637999455, end: '1223:154000:f8a52f7616779230', pickup: 4, power: 3, kill: 65, shipHit: 0, fire: 97},
  'w15-3': {fold: -1626987956, end: '2755:192750:5407d70210691323', pickup: 13, power: 10, kill: 105, shipHit: 0, fire: 373},
  'w15-5': {fold: 1634849913, end: '2674:65500:e961abb14f3e181a', pickup: 7, power: 8, kill: 8, shipHit: 0, fire: 358},
};

for (const [id, expected] of Object.entries(BEFORE_WORLD_16)) {
  test(`${id} plays out exactly as it did before world 16`, () => {
    assert.deepEqual(fingerprint(id), expected);
  });
}

// World 17 adds one twist (the breath) and the Craving boss: none of it may touch any other world, world 16
// included. The breath's state is made for world 17 alone, the state hash adds nothing elsewhere and its
// rule draws no rng. These are two wave levels of world 16 and its boss level, taken on commit 034947a,
// the last before world 17, and held to the same rule as the fingerprints above.
const BEFORE_WORLD_17 = {
  'w16-1': {fold: 520718176, end: '1435:152560:a31d44e135c8a580', pickup: 5, power: 3, kill: 65, shipHit: 0, fire: 195},
  'w16-3': {fold: -1388976173, end: '1870:252300:70fc9a6bdd44be11', pickup: 4, power: 6, kill: 105, shipHit: 0, fire: 260},
  'w16-5': {fold: 727350091, end: '2200:57800:794b3e28def6554a', pickup: 6, power: 7, kill: 8, shipHit: 0, fire: 131},
};

for (const [id, expected] of Object.entries(BEFORE_WORLD_17)) {
  test(`${id} plays out exactly as it did before world 17`, () => {
    assert.deepEqual(fingerprint(id), expected);
  });
}

// World 18 adds free flight (R67: the zone under the HUD, rams by any alien, dragged homing bullets), all
// behind its levels' `free` flag: none of it may touch any other world, world 17 included. These are two
// wave levels of world 17 and its boss level, taken on commit e9193a5, the last before world 18, and held
// to the same rule as the fingerprints above.
const BEFORE_WORLD_18 = {
  'w17-1': {fold: 151523680, end: '1131:206300:b2d931f7bc46f053', pickup: 7, power: 6, kill: 83, shipHit: 0, fire: 144},
  'w17-3': {fold: -383897958, end: '2528:143170:fe4d9418212b272d', pickup: 6, power: 10, kill: 92, shipHit: 0, fire: 314},
  'w17-5': {fold: 1773280240, end: '2775:58010:e14e5ebe1f79ed6a', pickup: 7, power: 8, kill: 8, shipHit: 0, fire: 321},
};

for (const [id, expected] of Object.entries(BEFORE_WORLD_18)) {
  test(`${id} plays out exactly as it did before world 18`, () => {
    assert.deepEqual(fingerprint(id), expected);
  });
}

test('the replay version stays 9, and the six powers stay the six', () => {
  assert.equal(makeRun('w1-1', 1, [], { score: 0, stars: 0 }).v, 9);
  assert.deepEqual(POWERS, ['spread', 'laser', 'rapid', 'shield', 'homing', 'slow']);
});
