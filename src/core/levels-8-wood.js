// Level data for world 22, Leg 2: the Pencil Wood (the design is docs/superpowers/specs/2026-11-23-world-22-leg-2-design.md). The shorthand is
// levels-8-kit.js's. A forest at noon, about two minutes of scroll at 220 px/s in three stretches split by two lanterns, ending on the Grey Thicket.
// The leg starts with the seed and its first lantern grants the line; the Smudge (a hanging gunner whose curtain spans the band) comes before it
// only where the band leaves room beside the curtain, and the thorn hedges come in two kinds: those with a gap to weave through, and those that close
// the band, which are shot through (course-fair-wood.js: the weakest piece breaks before the hedge scrolls to the free zone, and no air craft is in
// view while it does, so the shots reach it). Each lantern is followed by its quiet stretch, and then by a closing hedge to learn on.
import { WIDTH as W } from './kinds.js';
import { hpFor, END_RUN } from './course-kinds.js';
import { stopAt, GATE_DY_MAX } from './course-hold.js';
import { course, LAND_WOOD, air, smudge, turret, crate, pillar, hedge, lantern, LEFT, RIGHT } from './levels-8-kit.js';

const LANTERN_1 = 6200; // grants the line
const LANTERN_2 = 14400;
const GATE_HP = hpFor('gate'); // the Thicket's gates all stand as long under steady fire
const CAP = GATE_DY_MAX; // the highest gate, the top of the ring: as high up as a gate may stand, its top edge just below the HUD at the stop
const GATE_AT = 25420; // the anchor of the Thicket: the scroll stops 380 px on (course-hold.js stopAt)

const WALLS = [
  [0, 0, W], [1400, 0, W], [2200, 320, 1600], [3500, 320, 1600], [4000, 380, 1540], [4900, 380, 1540], [5500, 460, 1460], [5700, 460, 1460], [6200, 0, W], // the edge of the wood: open, tree lines, then open at the lantern
  [7620, 0, W], [8200, 460, 1460], [8600, 460, 1460], [9300, 520, 1400], [10300, 520, 1400], [10900, 600, 1320], [11700, 600, 1320], // the deep wood: the band narrows (the narrows 720 px)
  [12500, 440, 1480], [13300, 440, 1480], [14400, 0, W], [15820, 0, W], // open again at the second lantern
  [16200, 380, 1540], [16700, 380, 1540], [17300, 500, 1420], [18700, 500, 1420], [19300, 620, 1340], [21200, 620, 1340], // the clearing, then the narrows again
  [21800, 440, 1480], [23200, 440, 1480], [24000, 320, 1600], // and the clearing of the Thicket
];

const STRETCH_1 = [
  air(500, 'g', 'swoop', 600, 'aimed'), turret(700, 480), air(800, 'g', 'swoop', 1300, 'aimed'), turret(1000, 1440),
  air(1100, 'g', 'cross', LEFT, 'aimed'), air(1300, 'u', 'swoop', 700, 'aimed'), air(1500, 'c', 'swoop', 1500, 'aimed'), crate(1600, 960, 2),
  air(1700, 'g', 'cross', RIGHT, 'fan'), air(1800, 'g', 'swoop', 480, 'aimed'), air(2100, 'd', 'cross', LEFT, 'aimed'), air(2300, 'g', 'swoop', 1280, 'fan'),
  turret(2500, 480), turret(2500, 1440), air(2700, 'g', 'swoop', 1000, 'aimed'), air(2900, 'g', 'cross', RIGHT, 'aimed'),
  air(3100, 'u', 'swoop', 640, 'aimed'),
  ...hedge(3300, 90, 150, [320, 600], [960, 1600]), // a way round in the middle
  air(3500, 'd', 'cross', LEFT, 'aimed'), air(3700, 'g', 'swoop', 1200, 'fan'),
  smudge(3900, 800), // the first Smudge: one curtain at a time, and room beside it
  turret(4100, 520), turret(4100, 1400),
  ...hedge(4300, 90, 150, [380, 1180]), // a way round on the right
  air(4500, 'g', 'cross', RIGHT, 'aimed'), air(4600, 'g', 'swoop', 560, 'aimed'), smudge(4700, 1200),
  air(4900, 'u', 'swoop', 900, 'aimed'), air(5100, 'd', 'dive', 1000, 'aimed'), crate(5300, 1100, 2, 'bomb'),
  air(5500, 'g', 'swoop', 700, 'fan'), air(5700, 'g', 'cross', LEFT, 'aimed'), air(5900, 'c', 'swoop', 1300, 'aimed'),
  lantern(LANTERN_1, 'line'),
];

const STRETCH_2 = [
  turret(7800, 700), turret(7800, 1220), crate(8000, 960, 2),
  ...hedge(8300, 100, 100, [460, 1460]), // the first hedge that closes the band: shoot through it
  air(8700, 'g', 'swoop', 1250, 'aimed'), air(8900, 'd', 'cross', LEFT, 'aimed'),
  smudge(9100, 760), smudge(9375, 1160), // the first pair
  air(9500, 'g', 'swoop', 600, 'fan'), air(9700, 'u', 'cross', RIGHT, 'homing'), turret(9900, 700), turret(9900, 1200),
  air(10100, 'a', 'swoop', 960, 'homing'), pillar(10300, 960, 140, 150),
  smudge(10500, 900), smudge(10775, 1030), // in the narrows: the line, or the gun, or luck
  air(11000, 'g', 'cross', LEFT, 'aimed'), air(11200, 'd', 'dive', 800, 'aimed'), crate(11400, 960, 2, 'life'),
  air(11700, 'u', 'swoop', 700, 'ring'), air(11900, 'g', 'cross', RIGHT, 'fan'), turret(12100, 640), turret(12100, 1280),
  air(12300, 'a', 'dive', 900, 'aimed'), air(12400, 'a', 'dive', 1020, 'aimed'), air(12600, 'g', 'swoop', 560, 'aimed'), air(12800, 'g', 'swoop', 1360, 'aimed'),
  crate(13100, 960, 2, 'bomb'), air(13300, 'd', 'cross', LEFT, 'aimed'), air(13500, 'u', 'swoop', 1200, 'homing'),
  turret(13700, 520), turret(13700, 1400), air(13900, 'g', 'dive', 700, 'aimed'), air(14000, 'g', 'dive', 1220, 'aimed'), air(14200, 'c', 'swoop', 960, 'aimed'),
  lantern(LANTERN_2),
];

const STRETCH_3 = [
  turret(16000, 560), turret(16000, 1360), crate(16200, 960, 2),
  ...hedge(16400, 100, 110, [380, 1540]), // the second hedge that closes the band
  air(16800, 'g', 'dive', 640, 'aimed'), air(16900, 'g', 'dive', 1280, 'aimed'), air(17100, 'u', 'cross', LEFT, 'fan'),
  turret(17300, 600), turret(17300, 1320), smudge(17500, 800), air(17700, 'd', 'dive', 1100, 'aimed'),
  ...hedge(18000, 90, 150, [500, 1060]), // a way round on the right (the band is 500 to 1420 here)
  air(18200, 'a', 'swoop', 640, 'homing'), air(18400, 'u', 'cross', RIGHT, 'ring'), smudge(18700, 1180), air(18900, 'd', 'dive', 900, 'aimed'),
  crate(19100, 960, 2, 'bomb'), air(19300, 'g', 'dive', 700, 'aimed'), air(19400, 'g', 'dive', 1220, 'aimed'),
  // a pair in the narrows: the second leaves 320 px on the left of its curtain, where the hedge at 21000 has its way round
  smudge(19800, 840), smudge(20075, 1180), air(20300, 'a', 'swoop', 1300, 'homing'),
  turret(20500, 700), turret(20500, 1240), air(20700, 'u', 'cross', LEFT, 'homing'),
  ...hedge(21000, 90, 150, [980, 1340]), // a way round on the left (the band is 620 to 1340 here)
  air(21200, 'd', 'dive', 800, 'aimed'), air(21300, 'd', 'dive', 1120, 'aimed'), air(21600, 'g', 'swoop', 600, 'fan'),
  crate(21900, 700, 2), air(22100, 'u', 'cross', RIGHT, 'ring'), air(22300, 'a', 'swoop', 1280, 'homing'),
  turret(22500, 560), turret(22500, 1360), air(22700, 'd', 'dive', 960, 'aimed'),
  air(23000, 'g', 'dive', 620, 'aimed'), air(23100, 'g', 'dive', 1300, 'aimed'), air(23400, 'u', 'cross', LEFT, 'ring'),
  crate(23600, 960, 2, 'bomb'), air(23800, 'g', 'swoop', 700, 'aimed'), air(24000, 'd', 'dive', 1200, 'aimed'),
  turret(24200, 480), turret(24200, 1440), air(24500, 'c', 'swoop', 960, 'aimed'), air(24700, 'g', 'dive', 640, 'aimed'), air(24800, 'g', 'dive', 1280, 'aimed'),
  {
    // The Grey Thicket: a ring of six thorn gates (three columns, the ring's top and bottom between them), and five flights that come round again every
    // `period` s while it stands. One flight is a Smudge, which hangs for a long time, so the period keeps two of it at most in the air with the kites
    // under HOLD_FLIGHTS_MAX (levels-8-wood.test.js flies it idle to prove it), and it hangs between the gate columns, so it soaks none of the shots meant for a gate.
    kind: 'hold', at: GATE_AT, period: 9,
    targets: [
      { x: 960, dy: CAP, hp: GATE_HP }, { x: 648, dy: CAP - 42, hp: GATE_HP }, { x: 1272, dy: CAP - 42, hp: GATE_HP },
      { x: 648, dy: 42, hp: GATE_HP }, { x: 1272, dy: 42, hp: GATE_HP }, { x: 960, dy: 0, hp: GATE_HP },
    ],
    flights: [
      { t: 1, role: 'g', path: 'swoop', x: 500, pattern: 'fan' }, { t: 2.5, role: 'u', path: 'hang', x: 800, pattern: 'curtain' },
      { t: 4, role: 'd', path: 'dive', x: 1300, pattern: 'aimed' }, { t: 5.5, role: 'u', path: 'cross', x: RIGHT, pattern: 'homing' },
      { t: 7, role: 'a', path: 'swoop', x: 1420, pattern: 'aimed' },
    ],
  },
];

const LEG_2 = {
  speed: 220,
  length: stopAt(STRETCH_3.at(-1)) + END_RUN, // the hold is the last entry: the scroll stops at it, and once it has fallen runs on END_RUN px more and clears
  starts: ['seed'],
  land: LAND_WOOD, // the look of its ground (view only)
  walls: WALLS,
  spawns: [...STRETCH_1, ...STRETCH_2, ...STRETCH_3],
};

export const WOOD = course(231123, LEG_2);
