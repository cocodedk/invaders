import { createWorld, stepWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { autopilot } from '../../src/core/autopilot.js';
import { stateHash } from '../../src/core/state-hash.js';
import { TICK } from '../../src/core/kinds.js';
import { finished } from '../../src/core/util.js';

// A fingerprint of one level flown by the autopilot (mortal ship, the level's own seed) for up to
// `ticks` ticks: the state hash every 10 s (it covers the tick, score, rng state, positions, pickups
// and powers) folded into one number, the hash at the end, and how many events of each of a few
// kinds came out. worlds-unchanged.test.js pins these for worlds 1-12 as they were before world 13
// (commit 1ddc0b8) and for three levels of world 13 as they were before world 14 (commit cd58e7f), so
// any change to a rule that is not the world's own shows up there.
const KINDS = ['pickup', 'power', 'kill', 'shipHit', 'fire'];

export function fingerprint(id, ticks = 3600) {
  const world = createWorld(levelById(id));
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0]));
  let fold = 0;
  while (!finished(world) && world.tick < ticks) {
    stepWorld(world, TICK, autopilot(world));
    for (const e of world.events.splice(0)) if (e.type in counts) counts[e.type]++;
    if (world.tick % 600 === 0) {
      for (const ch of stateHash(world)) fold = (Math.imul(fold, 31) + ch.charCodeAt(0)) | 0;
    }
  }
  return { fold, end: stateHash(world), ...counts };
}
