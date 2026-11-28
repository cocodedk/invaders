// Level data for world 22, Leg 3: the Mirror Flats (the design is docs/superpowers/specs/2026-11-28-world-22-leg-3-design.md). A salt flat at noon, about
// two minutes of scroll at 230 px/s in three stretches split by two lanterns, ending on the Glass Ring. The first two stretches are in levels-8-flats-open.js;
// this has the walls, stretch 3 (the pools: Flocks with Smudges and kites, curtains, shard rows), the hold and the leg. The flat is wide open, so the walls
// only close in at the pools. The last Flock comes up early enough to be gone when the hold starts (course-fair-flats.js).
import { WIDTH as W } from './kinds.js';
import { hpFor, END_RUN } from './course-kinds.js';
import { stopAt, GATE_DY_MAX } from './course-hold.js';
import { course, LAND_FLATS, air, smudge, flock, shard, turret, crate, lantern, LEFT, RIGHT } from './levels-8-kit.js';
import { LANTERN_1, LANTERN_2, STRETCH_1, STRETCH_2 } from './levels-8-flats-open.js';

const GATE_HP = hpFor('gate');
const CAP = GATE_DY_MAX;
const GATE_AT = 26000; // the anchor of the Glass Ring: the scroll stops 380 px on (course-hold.js stopAt)

const WALLS = [
  [0, 0, W], [3000, 0, W], [3800, 200, 1720], [5000, 200, 1720], [5600, 0, W], // the shore narrows a little, then opens at the lantern
  [LANTERN_2, 0, W], [15800, 0, W], [16400, 240, 1680], [18000, 240, 1680], [18800, 400, 1520], [20000, 400, 1520], // the pools: the banks close in
  [20800, 240, 1680], [23000, 240, 1680], [23600, 0, W], // and open again before the Ring
];

const STRETCH_3 = [
  turret(15200, 560), turret(15200, 1360), shard(15500, 960), air(15700, 'g', 'dive', 640, 'aimed'), air(15800, 'g', 'dive', 1280, 'aimed'),
  flock(16000, 960), smudge(16400, 560), air(16600, 'u', 'cross', LEFT, 'fan'), shard(16800, 700), shard(16800, 1220),
  air(17000, 'd', 'dive', 900, 'aimed'), flock(17200, 1300), air(17400, 'g', 'swoop', 600, 'aimed'), crate(17600, 960, 2, 'bomb'),
  smudge(17800, 1200), air(18000, 'a', 'swoop', 1000, 'homing'), shard(18200, 500), shard(18200, 960), shard(18200, 1420),
  turret(18400, 640), turret(18400, 1280), flock(18600, 700), air(18800, 'g', 'cross', RIGHT, 'aimed'), air(19000, 'u', 'swoop', 1300, 'ring'),
  air(19200, 'd', 'dive', 1100, 'aimed'), crate(19400, 960, 2), smudge(19600, 760), smudge(19875, 1160), shard(20100, 960),
  flock(20300, 1200), air(20500, 'a', 'swoop', 700, 'homing'), air(20700, 'd', 'dive', 800, 'aimed'), air(20800, 'd', 'dive', 1120, 'aimed'),
  turret(21000, 700), turret(21000, 1240), shard(21200, 600), shard(21200, 1320), air(21400, 'u', 'cross', LEFT, 'ring'),
  flock(21600, 960), air(21800, 'g', 'swoop', 640, 'aimed'), crate(22000, 960, 2, 'life'), smudge(22200, 900),
  air(22400, 'a', 'swoop', 1280, 'homing'), air(22600, 'd', 'dive', 1000, 'aimed'), shard(22800, 960),
  turret(23000, 560), turret(23000, 1360), air(23200, 'c', 'swoop', 960, 'aimed'), air(23400, 'g', 'dive', 640, 'aimed'), air(23500, 'g', 'dive', 1280, 'aimed'),
  crate(23800, 960, 2, 'bomb'), air(24000, 'u', 'cross', RIGHT, 'fan'), shard(24200, 700), shard(24200, 1220), air(24400, 'd', 'dive', 800, 'aimed'),
  air(24700, 'g', 'swoop', 1300, 'aimed'), turret(24900, 520), turret(24900, 1400), air(25100, 'a', 'swoop', 960, 'homing'),
  {
    // The Glass Ring: gates in a ring wide enough that one loop of a full line takes at most two of them (course-fair-flats.js ring); Smudges and kites
    // come round again every `period` s while it stands, and no Flock.
    kind: 'hold', at: GATE_AT, period: 9,
    targets: [
      { x: 960, dy: CAP, hp: GATE_HP }, { x: 570, dy: CAP - 70, hp: GATE_HP }, { x: 1350, dy: CAP - 70, hp: GATE_HP },
      { x: 180, dy: CAP - 140, hp: GATE_HP }, { x: 1740, dy: CAP - 140, hp: GATE_HP }, // a loop of a full line takes two of the five at most
    ],
    flights: [
      { t: 1, role: 'g', path: 'swoop', x: 500, pattern: 'fan' }, { t: 2.5, role: 'u', path: 'hang', x: 800, pattern: 'curtain' },
      { t: 4, role: 'd', path: 'dive', x: 1300, pattern: 'aimed' }, { t: 5.5, role: 'u', path: 'cross', x: RIGHT, pattern: 'homing' },
      { t: 7, role: 'u', path: 'hang', x: 1200, pattern: 'curtain' },
    ],
  },
];

const LEG_3 = {
  speed: 230,
  length: stopAt(STRETCH_3.at(-1)) + END_RUN, // the hold is the last entry: the scroll stops at it, and once it has fallen runs on END_RUN px more and clears
  starts: ['seed', 'line'],
  land: LAND_FLATS, // the look of its ground (view only)
  walls: WALLS,
  spawns: [...STRETCH_1, ...STRETCH_2, ...STRETCH_3],
};

export const FLATS = course(281128, LEG_3);
