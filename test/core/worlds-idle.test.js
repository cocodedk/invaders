import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { stateHash } from '../../src/core/state-hash.js';
import { TICK } from '../../src/core/kinds.js';
import { finished } from '../../src/core/util.js';

// What worlds-unchanged.test.js cannot say after R68: it flies the autopilot, so any change to movement moves
// all its pins, and a leak of some other rule into a world hides among them. These are the same 29 levels
// flown by nothing: an invulnerable ship that stands where it starts, fires all the time and presses the bomb
// on every 400th tick, for up to 60 s. The ship does not move, so nothing here depends on how it moves (R68,
// the pointer is the ship, changed that for every world); these were taken on commit 4a698d2, the last before
// R68, and did not change with it. R70 (the base gun fires every 9 ticks instead of 11, RUN_V 11) re-took
// them all, as the ship here never stops firing. A rule change that moves any of them is either a leak or meant to be.
// A pin is the state hash every 10 s folded into one number, the hash at the last whole 100 ticks, and the tick
// the run ended on. A level it clears is cut off on the tick of the clear: what the clear adds waits on the
// pars (R66), which a change to the autopilot or the rules moves, and that is none of this test's business.
const IDLE = {
  'w1-2': { fold: 1305534394, end: '2800:48850:31d81299278caecb', tick: 2864 },
  'w1-4': { fold: -1562559723, end: '3600:51600:2871d66b284277ef', tick: 3600 },
  'w2-3': { fold: -350806464, end: '3600:34350:dcb6bf90736bd21d', tick: 3600 },
  'w3-3': { fold: -765057238, end: '3600:37450:6e7613c00e751e9b', tick: 3600 },
  'w4-4': { fold: 419454290, end: '3600:37700:db38f68279ff56b8', tick: 3600 },
  'w5-5': { fold: -65284672, end: '1700:12500:bfe5526e7be269d5', tick: 1757 },
  'w6-3': { fold: -766194627, end: '3600:30100:ee025d1da1629645', tick: 3600 },
  'w7-2': { fold: 960955394, end: '3600:19600:1f36a72dc393bd12', tick: 3600 },
  'w8-4': { fold: -1636835494, end: '3600:16900:b98ee9f7722b607d', tick: 3600 },
  'w9-2': { fold: -1570007487, end: '3600:25150:e7d800fef6ec681e', tick: 3600 },
  'w10-3': { fold: -1664168481, end: '3600:32000:4cc9b6f6a1a8a98f', tick: 3600 },
  'w11-3': { fold: -628103652, end: '3600:119850:8baa920a97354db3', tick: 3600 },
  'w12-2': { fold: -468607644, end: '3600:23200:b5a2c378cac22dd4', tick: 3600 },
  'w12-5': { fold: 1246579838, end: '3600:5250:52ebe9bc3e29f44d', tick: 3600 },
  'w13-1': { fold: -119978253, end: '3600:20200:68142daf322ec5f3', tick: 3600 },
  'w13-3': { fold: 965809265, end: '3600:47450:b63c291cdbc0c678', tick: 3600 },
  'w13-5': { fold: -1066273864, end: '3300:15750:3c45c2289d91dd78', tick: 3335 },
  'w14-1': { fold: 1540752264, end: '3600:37100:ff5c188014fefeb6', tick: 3600 },
  'w14-3': { fold: -1904401730, end: '2200:108200:504c69d724117d35', tick: 2246 },
  'w14-5': { fold: -71500293, end: '3300:15750:5be1a526d9348caf', tick: 3342 },
  'w15-1': { fold: 993067137, end: '3500:36100:95da516f33f99fc9', tick: 3600 },
  'w15-3': { fold: -731348283, end: '3600:34050:75f7b53221714807', tick: 3600 },
  'w15-5': { fold: -876849523, end: '3600:7000:26d3c2b638cf0152', tick: 3600 },
  'w16-1': { fold: 33246799, end: '3600:26400:1cdcd3b137c66e56', tick: 3600 },
  'w16-3': { fold: 585330628, end: '3600:74850:3cead3adddf8d067', tick: 3600 },
  'w16-5': { fold: -409020658, end: '3600:15750:a480e3786f17dac9', tick: 3600 },
  'w17-1': { fold: -1899611434, end: '3600:74200:8a10103a5c710345', tick: 3600 },
  'w17-3': { fold: -1870000481, end: '3600:90300:f3eada4330fab3e2', tick: 3600 },
  'w17-5': { fold: 679899992, end: '3500:15000:c5a51f7264d768ea', tick: 3510 },
};

function idleFingerprint(id) {
  const world = createWorld(levelById(id));
  world.ship.invuln = Infinity;
  let fold = 0;
  let end = '';
  while (!finished(world) && world.tick < 3600) {
    stepWorld(world, TICK, { dx: 0, dy: 0, fire: true, bomb: world.tick % 400 === 399, target: null });
    world.events.length = 0;
    if (world.state === 'cleared') break;
    if (world.tick % 100 === 0) end = stateHash(world);
    if (world.tick % 600 === 0) for (const ch of stateHash(world)) fold = (Math.imul(fold, 31) + ch.charCodeAt(0)) | 0;
  }
  return { fold, end, tick: world.tick };
}

for (const [id, expected] of Object.entries(IDLE)) {
  test(`${id} with a ship that stands still plays out exactly as pinned (R70)`, () => {
    assert.deepEqual(idleFingerprint(id), expected);
  });
}
