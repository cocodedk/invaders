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
// R68 (the pointer is the ship, RUN_V 10) changed the movement of every world, so every table below was
// re-taken then, and each level now plays out differently on purpose: the autopilot flies a hand, and a ship
// that crosses the field in a tick is hit by what lay in its way. Nothing else moved: worlds-idle.test.js pins the
// same 29 levels flown by a ship that stands still, taken before R68 and unchanged by it.
const BEFORE_WORLD_13 = {
  'w1-2': {fold: 476924862, end: '2203:156000:7e589c00967c9941', pickup: 3, power: 3, kill: 72, shipHit: 0, fire: 234},
  'w1-4': {fold: -1787418587, end: '2149:294200:63057e9c0520dba0', pickup: 7, power: 9, kill: 124, shipHit: 0, fire: 199},
  'w2-3': {fold: -632416878, end: '2268:221000:58964d5c8f3accb4', pickup: 2, power: 1, kill: 81, shipHit: 0, fire: 241},
  'w3-3': {fold: 1454527202, end: '2321:166550:deea4dc0fa420168', pickup: 4, power: 5, kill: 84, shipHit: 0, fire: 247},
  'w4-4': {fold: 1044449200, end: '3600:67300:e493b6c432e60b9e', pickup: 2, power: 2, kill: 73, shipHit: 1, fire: 667},
  'w5-5': {fold: 1006919979, end: '2816:74460:6d18109125f8b558', pickup: 9, power: 8, kill: 17, shipHit: 0, fire: 276},
  'w6-3': {fold: 241047465, end: '2350:228200:db96fe21691db521', pickup: 4, power: 6, kill: 81, shipHit: 0, fire: 266},
  'w7-2': {fold: 1125135289, end: '1964:190700:2e5c1a5ba6c0ddd4', pickup: 6, power: 8, kill: 72, shipHit: 0, fire: 263},
  'w8-4': {fold: -312471265, end: '2669:225100:a84ea0c360ed6dfc', pickup: 7, power: 8, kill: 91, shipHit: 0, fire: 329},
  'w9-2': {fold: -1598316446, end: '2828:209000:2c42edee35d94127', pickup: 7, power: 11, kill: 78, shipHit: 0, fire: 295},
  'w10-3': {fold: 1796784390, end: '1466:195200:ffa8594efccc2ace', pickup: 1, power: 2, kill: 75, shipHit: 0, fire: 168},
  'w11-3': {fold: 1145027709, end: '3600:110800:61662278dd5e3df5', pickup: 0, power: 0, kill: 96, shipHit: 0, fire: 637},
  'w12-2': {fold: 1206880513, end: '2166:184100:a977861b9336debd', pickup: 2, power: 2, kill: 75, shipHit: 0, fire: 222},
  'w12-5': {fold: -85827900, end: '3057:80400:26454ee6e8c1f568', pickup: 7, power: 6, kill: 9, shipHit: 0, fire: 349},
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
  'w13-1': {fold: -643376000, end: '1057:126800:517e2ab8949d2ea7', pickup: 2, power: 2, kill: 51, shipHit: 0, fire: 110},
  'w13-3': {fold: 3256570, end: '1473:212400:3b3ea41dba6668de', pickup: 5, power: 4, kill: 75, shipHit: 0, fire: 166},
  'w13-5': {fold: -1767193392, end: '2021:58700:aa8de4f0c97db097', pickup: 5, power: 5, kill: 8, shipHit: 0, fire: 254},
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
  'w14-1': {fold: 481874914, end: '1267:145600:0152b54f5a992e87', pickup: 4, power: 3, kill: 65, shipHit: 0, fire: 146},
  'w14-3': {fold: 135736925, end: '1642:265900:9f3bcae6f5256004', pickup: 10, power: 9, kill: 113, shipHit: 0, fire: 131},
  'w14-5': {fold: 1507372740, end: '2473:60800:c727fa37bc598e08', pickup: 6, power: 6, kill: 10, shipHit: 0, fire: 380},
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
  'w15-1': {fold: -844942499, end: '1385:145540:6f87ff9e4a689ccd', pickup: 4, power: 3, kill: 65, shipHit: 0, fire: 102},
  'w15-3': {fold: -412778182, end: '2281:246560:d4e6552e528249a8', pickup: 11, power: 9, kill: 105, shipHit: 0, fire: 252},
  'w15-5': {fold: -1223591307, end: '3055:59050:23282cf7624b9441', pickup: 9, power: 12, kill: 15, shipHit: 0, fire: 223},
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
  'w16-1': {fold: 1093586164, end: '1562:148200:da566172c8c2fcf8', pickup: 7, power: 7, kill: 65, shipHit: 0, fire: 151},
  'w16-3': {fold: -1555026518, end: '2376:261300:d52de3c99d55d219', pickup: 6, power: 9, kill: 106, shipHit: 0, fire: 338},
  'w16-5': {fold: 417321727, end: '2201:60500:cd935dc52a5421ca', pickup: 7, power: 6, kill: 9, shipHit: 0, fire: 251},
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
  'w17-1': {fold: 208736772, end: '1141:202400:d05d6f60938603b0', pickup: 7, power: 4, kill: 83, shipHit: 0, fire: 184},
  'w17-3': {fold: 20321159, end: '1338:229300:11fb34a5a84d8274', pickup: 7, power: 5, kill: 92, shipHit: 0, fire: 183},
  'w17-5': {fold: 25175401, end: '2488:61280:7ca834f7cf77ad93', pickup: 5, power: 4, kill: 7, shipHit: 0, fire: 246},
};

for (const [id, expected] of Object.entries(BEFORE_WORLD_18)) {
  test(`${id} plays out exactly as it did before world 18`, () => {
    assert.deepEqual(fingerprint(id), expected);
  });
}

test('the replay version is 10 (R68), and the six powers stay the six', () => {
  assert.equal(makeRun('w1-1', 1, [], { score: 0, stars: 0 }).v, 10);
  assert.deepEqual(POWERS, ['spread', 'laser', 'rapid', 'shield', 'homing', 'slow']);
});
