// Level data for world 22, Leg 3, the first two stretches of the Mirror Flats (levels-8-flats.js has the walls, the third stretch, the hold and the leg).
// The shorthand is levels-8-kit.js's. The leg starts with the seed and the line; its first lantern grants the lasso. Stretch 1 is the shore: kites and
// Smudges (curtains the line walls off), single shards in the open to learn the throw-back, turrets and a crate. Stretch 2 is the open flat: the
// first Flocks come alone, in quiet air, so a loop is the plain answer, then shard clusters round crates, and a few dives.
import { air, smudge, flock, shard, turret, crate, lantern, LEFT, RIGHT } from './levels-8-kit.js';

export const LANTERN_1 = 6000; // grants the lasso
export const LANTERN_2 = 13600;

export const STRETCH_1 = [
  air(600, 'g', 'swoop', 600, 'aimed'), turret(800, 480), air(900, 'g', 'swoop', 1300, 'aimed'), turret(1100, 1440),
  air(1200, 'g', 'cross', LEFT, 'aimed'), air(1400, 'u', 'swoop', 700, 'aimed'), shard(1700, 960), air(1900, 'c', 'swoop', 1500, 'aimed'),
  air(2100, 'g', 'cross', RIGHT, 'fan'), air(2200, 'g', 'swoop', 480, 'aimed'), crate(2400, 960, 2),
  smudge(2600, 800), air(2800, 'd', 'cross', LEFT, 'aimed'), shard(3000, 600), shard(3000, 1320),
  air(3200, 'g', 'swoop', 1280, 'fan'), turret(3400, 520), turret(3400, 1400), air(3600, 'g', 'cross', RIGHT, 'aimed'),
  smudge(3800, 1200), air(4000, 'u', 'swoop', 900, 'aimed'), shard(4300, 960), air(4400, 'g', 'swoop', 560, 'aimed'),
  air(4600, 'd', 'dive', 1000, 'aimed'), crate(4800, 1100, 2, 'bomb'), shard(5000, 480), air(5100, 'g', 'cross', LEFT, 'aimed'),
  air(5300, 'u', 'swoop', 1300, 'aimed'), smudge(5500, 960), air(5600, 'c', 'swoop', 700, 'aimed'),
  lantern(LANTERN_1, 'lasso'),
];

export const STRETCH_2 = [
  flock(7700, 960), // the first Flock, alone: nothing else comes up for a while on either side of it
  flock(9400, 600), shard(10700, 700), crate(10800, 960, 2), shard(10900, 1220), shard(11000, 960),
  air(11300, 'g', 'swoop', 640, 'aimed'), flock(11500, 1300), air(11700, 'd', 'dive', 800, 'aimed'),
  turret(11900, 700), turret(11900, 1220), air(12100, 'u', 'cross', LEFT, 'fan'), crate(12300, 960, 2, 'life'),
  shard(12350, 560), shard(12350, 1360), air(12500, 'd', 'dive', 1120, 'aimed'), air(12700, 'g', 'swoop', 1250, 'aimed'),
  flock(12800, 700), crate(13100, 960, 2, 'bomb'), air(13200, 'a', 'swoop', 960, 'homing'),
  lantern(LANTERN_2),
];
