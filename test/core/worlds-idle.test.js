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
// R68, and did not change with it. A rule change that moves any of them is either a leak or meant to be.
// A pin is the state hash every 10 s folded into one number, the hash at the last whole 100 ticks, and the tick
// the run ended on. A level it clears is cut off on the tick of the clear: what the clear adds waits on the
// pars (R66), which a change to the autopilot or the rules moves, and that is none of this test's business.
const IDLE = {
  'w1-2': { fold: 62611416, end: '1700:55650:fa59bb2112148072', tick: 1798 },
  'w1-4': { fold: -534540368, end: '3600:39250:aaa4e23575efeece', tick: 3600 },
  'w2-3': { fold: 1694322399, end: '3600:34050:88d1a28adc3e1505', tick: 3600 },
  'w3-3': { fold: 1229675395, end: '3600:37750:efc7c72be1e40e82', tick: 3600 },
  'w4-4': { fold: -1640248127, end: '3600:35800:95be06bbc8b54111', tick: 3600 },
  'w5-5': { fold: 39691432, end: '3000:18650:95baf0c7772054d3', tick: 3072 },
  'w6-3': { fold: 182205866, end: '3600:30100:7be078d61782dcfa', tick: 3600 },
  'w7-2': { fold: 453142747, end: '3600:20700:dd7454b6e746f0df', tick: 3600 },
  'w8-4': { fold: 1369021999, end: '3600:13200:a41e3382fdfedca6', tick: 3600 },
  'w9-2': { fold: -2051580686, end: '3600:25150:c20796de1553d971', tick: 3600 },
  'w10-3': { fold: 1446803009, end: '3600:32400:2863b4fc408c65e6', tick: 3600 },
  'w11-3': { fold: 1180888322, end: '3600:75950:1175dc9bac78df31', tick: 3600 },
  'w12-2': { fold: -1677711237, end: '3600:23200:c30538db4b09f3d4', tick: 3600 },
  'w12-5': { fold: -972466289, end: '3600:4750:ff99b89d52d65fcd', tick: 3600 },
  'w13-1': { fold: 2002073765, end: '3600:15550:5050236a75ea95db', tick: 3600 },
  'w13-3': { fold: -163530217, end: '3600:38200:1c25f0255555d86c', tick: 3600 },
  'w13-5': { fold: 1513941712, end: '3600:6500:fcb47b02c2f13d2e', tick: 3600 },
  'w14-1': { fold: -405651414, end: '1100:49100:285c7a1f4578a7f0', tick: 1158 },
  'w14-3': { fold: -2013459051, end: '3600:51750:0883c02be893ede0', tick: 3600 },
  'w14-5': { fold: 1244716803, end: '3600:6250:860541fa39bdfbb4', tick: 3600 },
  'w15-1': { fold: -93660596, end: '3600:23250:f1db3a78d501606a', tick: 3600 },
  'w15-3': { fold: -467012975, end: '3600:71550:d417691e5f17f08e', tick: 3600 },
  'w15-5': { fold: -163454713, end: '3600:7750:8928e0f58797e06f', tick: 3600 },
  'w16-1': { fold: 668100585, end: '3600:24000:84160591b31a536c', tick: 3600 },
  'w16-3': { fold: -277968054, end: '3600:41350:37ee6fec1245601f', tick: 3600 },
  'w16-5': { fold: -1272759346, end: '3600:6000:42b6b104aa27dd31', tick: 3600 },
  'w17-1': { fold: -1456300016, end: '1400:74400:16b9afe1f54d99fc', tick: 1476 },
  'w17-3': { fold: 561942002, end: '3600:66550:d538f29189483501', tick: 3600 },
  'w17-5': { fold: -100190431, end: '3600:4500:bbf331216422d746', tick: 3600 },
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
  test(`${id} with a ship that stands still plays out exactly as it did before R68`, () => {
    assert.deepEqual(idleFingerprint(id), expected);
  });
}
