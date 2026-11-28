// Level data for world 22 (Wanderlight): its levels are courses (course.js) in place of waves or a boss, one a leg of the journey: Leg 1 here, Dawn
// Valley, and Leg 2 in levels-8-wood.js. The shorthand both use is in levels-8-kit.js, where `course(seed, data)` and the shape of a leg's `data` are
// described. A leg's data must break none of the rules of test/core/course-fair-kit.js, which levels-8.test.js and levels-8-wood.test.js run on it.
import { WIDTH as W } from './kinds.js';
import { hpFor, END_RUN } from './course-kinds.js';
import { stopAt, GATE_DY_MAX } from './course-hold.js';
import { course, air, turret, crate, stone, pillar, lantern, LEFT, RIGHT } from './levels-8-kit.js';
import { WOOD } from './levels-8-wood.js';
import { FLATS } from './levels-8-flats.js';

// Leg 1, Dawn Valley: about two minutes of scroll in three stretches, split by two lanterns (checkpoints), ending on the Grey Gate.
// Each lantern leaves its quiet stretch behind it: nothing comes up for a while, and the walls stand open to the whole width.
const LANTERN_1 = 5200;
const LANTERN_2 = 12200;
const GATE_HP = hpFor('gate'); // the hold's gates all stand as long under steady fire
const CAP = GATE_DY_MAX; // the highest gate of the dolmen, its middle eye: as high up as a gate may stand, its top edge just below the HUD at the stop
const GATE_AT = 20620; // where the hold's anchor comes up; the scroll stops 380 px on (course-hold.js stopAt), and goes on END_RUN px more once the gate has fallen

const WALLS = [
  [0, 0, W], [1900, 0, W], [3200, 260, 1660], [3900, 260, 1660], [4900, 0, W], // open land, then a gentle narrowing, then open
  [8900, 0, W], [9700, 480, 1440], [11200, 480, 1440], [12100, 0, W], // the gorge: 960 px of river
  [14300, 0, W], [15300, 240, 1680], // the banks close in for stretch 3 and stay
];

// Stretch 1, grey: air craft only, swooping and crossing (grunts, with one gunner, a carrier and two divers). The stones stand shut along
// the banks, and the walls teach the band: wide, then a gentle narrowing. The stones can be shot as they pass (every ground object can, the
// owner's rule), but nothing here asks it: the seed, the ground weapon, comes at the lantern.
const STRETCH_1 = [
  air(500, 'g', 'swoop', 576, 'aimed'), stone(700, 160), stone(700, 1760),
  air(900, 'g', 'swoop', 1344, 'aimed'),
  air(1250, 'g', 'cross', LEFT, 'aimed'), stone(1400, 160), stone(1400, 1760),
  air(1600, 'c', 'swoop', 1500, 'aimed'),
  air(1900, 'g', 'cross', RIGHT, 'fan'), air(2000, 'g', 'swoop', 480, 'aimed'),
  stone(2150, 160), stone(2150, 1760),
  air(2400, 'g', 'swoop', 1440, 'fan'), air(2650, 'g', 'swoop', 640, 'aimed'),
  stone(2800, 220), stone(2800, 1700), // the band is 180 to 1740 here, and a stone counts from its edge
  air(2900, 'd', 'cross', LEFT, 'aimed'), air(3200, 'g', 'swoop', 1280, 'fan'),
  stone(3400, 380), stone(3400, 1540),
  air(3500, 'g', 'cross', RIGHT, 'aimed'), air(3800, 'u', 'swoop', 700, 'aimed'),
  stone(4000, 380), stone(4000, 1540),
  air(4200, 'g', 'swoop', 1260, 'fan'), air(4400, 'd', 'cross', LEFT, 'aimed'), air(4700, 'g', 'swoop', 560, 'aimed'),
  lantern(LANTERN_1, 'seed'),
];

// Stretch 2, the ground wakes: turrets fire, crates hold pickups, pillars stand in the river (the shots wear one down, as they do a turret: hp
// is course-ground.js GROUND_HP), the walls pinch into a gorge, and a bridge carries a pair of turrets side by side (a seed between them hurts both).
const STRETCH_2 = [
  turret(6700, 700), air(6900, 'g', 'swoop', 1344, 'aimed'),
  crate(7200, 1130, 2), air(7400, 'u', 'cross', LEFT, 'fan'),
  turret(7700, 1100), crate(8000, 560, 2, 'bomb'),
  pillar(8200, 900, 140, 150), air(8300, 'd', 'dive', 1100, 'aimed'), air(8600, 'g', 'swoop', 480, 'aimed'),
  pillar(8800, 1250, 140, 150), turret(9000, 620), air(9300, 'u', 'swoop', 1300, 'homing'),
  air(9900, 'g', 'swoop', 1200, 'aimed'), pillar(10100, 960, 140, 150), air(10300, 'u', 'swoop', 700, 'aimed'),
  turret(10600, 860), turret(10600, 1060), air(10800, 'g', 'cross', RIGHT, 'fan'), // the bridge: twin turrets, a seed between them hurts both
  crate(11000, 960, 2, 'life'), air(11300, 'd', 'dive', 800, 'aimed'), air(11600, 'u', 'swoop', 1200, 'ring'),
  lantern(LANTERN_2),
];

// Stretch 3, the Grey Gate: faster craft and dives, turrets on both banks, a last bomb before the hold. Then the hold itself: the dolmen,
// a capstone of three eyes on two uprights, and four flights of craft that come round again every `period` s while it stands.
const STRETCH_3 = [
  air(13800, 'g', 'dive', 640, 'aimed'), air(13900, 'g', 'dive', 1280, 'aimed'), air(14200, 'u', 'cross', LEFT, 'fan'),
  turret(14500, 360), turret(14500, 1560), air(14800, 'a', 'swoop', 960, 'homing'), air(15000, 'd', 'dive', 1100, 'aimed'),
  crate(15200, 960, 2), air(15400, 'u', 'cross', RIGHT, 'ring'), air(15500, 'g', 'swoop', 480, 'aimed'),
  turret(15800, 520), turret(15800, 1400), air(16000, 'c', 'swoop', 1200, 'aimed'),
  air(16200, 'a', 'dive', 800, 'aimed'), air(16400, 'u', 'cross', LEFT, 'homing'),
  turret(16800, 360), turret(16800, 1560), air(16900, 'd', 'dive', 960, 'aimed'),
  air(17100, 'g', 'dive', 700, 'aimed'), air(17200, 'g', 'dive', 1220, 'aimed'),
  crate(17400, 960, 2, 'bomb'), air(17600, 'u', 'cross', RIGHT, 'fan'), air(17700, 'u', 'cross', LEFT, 'ring'),
  turret(18000, 480), turret(18000, 1440), air(18300, 'a', 'swoop', 640, 'homing'), air(18400, 'a', 'swoop', 1280, 'homing'),
  air(18700, 'd', 'dive', 900, 'aimed'), air(18800, 'd', 'dive', 1020, 'aimed'), crate(19000, 700, 2),
  air(19200, 'u', 'cross', LEFT, 'ring'), turret(19600, 360), turret(19600, 1560),
  air(20000, 'g', 'dive', 600, 'aimed'), air(20100, 'g', 'dive', 1320, 'aimed'), air(20300, 'c', 'swoop', 960, 'aimed'),
  {
    kind: 'hold', at: GATE_AT, period: 5,
    targets: [
      { x: 800, dy: CAP - 20, hp: GATE_HP }, { x: 960, dy: CAP, hp: GATE_HP }, { x: 1120, dy: CAP - 20, hp: GATE_HP }, // the capstone's eyes
      { x: 560, dy: CAP - 160, hp: GATE_HP }, { x: 1360, dy: CAP - 160, hp: GATE_HP }, // the uprights
    ],
    flights: [
      { t: 1, role: 'g', path: 'swoop', x: 500, pattern: 'aimed' }, { t: 2, role: 'g', path: 'swoop', x: 1420, pattern: 'fan' },
      { t: 3, role: 'u', path: 'cross', x: RIGHT, pattern: 'ring' }, { t: 4, role: 'd', path: 'dive', x: 960, pattern: 'aimed' },
    ],
  },
];

const LEG_1 = {
  speed: 200,
  length: stopAt(STRETCH_3.at(-1)) + END_RUN, // the hold is the last entry: the scroll stops at it, and once it has fallen runs on END_RUN px into the blank land and clears
  starts: [],
  walls: WALLS,
  spawns: [...STRETCH_1, ...STRETCH_2, ...STRETCH_3],
};

export const JOURNEY = [[course(220519, LEG_1), WOOD, FLATS]];
