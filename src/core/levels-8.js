// Level data for world 22 (Wanderlight): a world of one level, which is a course (course.js) in place of waves or a boss.
// `course(seed, data)` is a level spec like `lv` in levels-2.js, and `data` is { speed, length, starts, walls, spawns }: the scroll's
// speed in px/s and length in px, the abilities the leg begins with, the wall keyframes ([at, left, right]) and the entries, in order of
// `at` (what each kind takes is in course-air.js, course-ground.js, course-hold.js and course-check.js). `at` is a row of the course in
// px of scroll: an entry comes up above the screen when the scroll reaches it, and a second of scroll is `speed` px. A leg's data must
// break none of the rules of test/core/course-fair-kit.js, which levels-8.test.js runs on every leg.
import { WIDTH as W, MID_X } from './kinds.js';
import { hpFor, END_RUN } from './course-kinds.js';
import { stopAt, GATE_DY_MAX } from './course-hold.js';

export const course = (seed, data) => ({ seed, bunkers: false, course: data });

// The shorthand, one entry a call. An air craft takes its role letter (g grunt, d diver, u gunner, a armored, c carrier: a carrier fires
// nothing and always drops a power-up), its path, the x it starts at and the pattern it fires; a crate holds 'bomb', 'life' or, with
// none, the usual random drop; a lantern is a checkpoint, and grants an ability or nothing.
const air = (at, role, path, x, pattern) => ({ kind: 'air', at, role, path, x, pattern });
// A turret's hp, and a gate's below, come from course-kinds.js hpFor: the seconds of steady fire BREAK_SECS names, in shots.
const turret = (at, x) => ({ kind: 'turret', at, x, hp: hpFor('turret') });
const crate = (at, x, hp, drop = null) => ({ kind: 'crate', at, x, hp, drop });
const stone = (at, x) => ({ kind: 'stone', at, x });
const pillar = (at, x, w, h) => ({ kind: 'pillar', at, x, w, h });
const lantern = (at, grants = null) => ({ kind: 'checkpoint', at, x: MID_X, grants });
const LEFT = -60; // where a crossing starts: beyond the edge it comes from
const RIGHT = W + 60;

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

export const JOURNEY = [[course(220519, LEG_1)]];
