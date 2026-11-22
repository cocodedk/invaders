// Level data for world 22 (Wanderlight): a world of one level, which is a course (course.js) in place of waves or a boss.
// `course(seed, data)` is a level spec like `lv` in levels-2.js, and `data` is { speed, length, starts, walls, spawns }: the scroll's
// speed in px/s and length in px, the abilities the leg begins with, the wall keyframes ([at, left, right]) and the entries, in order of
// `at` (what each kind takes is in course-air.js, course-ground.js, course-hold.js and course-check.js). A leg's data must break none of
// the rules of test/core/course-fair-kit.js, which levels-8.test.js runs on every leg.

export const course = (seed, data) => ({ seed, bunkers: false, course: data });

// Leg 1, for now a placeholder that obeys every data rule: open land that narrows into a gorge with a pillar in it and opens again,
// a checkpoint that grants the ground weapon (seeds), a stretch of turrets, a crate and air craft, a second checkpoint, one more
// stretch, and the end hold of two gates. The real Leg 1 replaces it. Its entries stand where the quiet stretches allow: after a
// checkpoint nothing comes up for a while and the walls stay open to the whole width (course-fair-kit.js, `quiet`).
const LEG_1 = {
  speed: 200,
  length: 9080, // where the end hold stops the scroll (course-hold.js stopAt): the leg ends on it
  starts: [],
  walls: [
    [0, 0, 1920], [800, 0, 1920], [1400, 400, 1500], [2200, 400, 1500], [2800, 0, 1920],
    [4580, 0, 1920], [4980, 300, 1600], [5700, 300, 1600], [6300, 0, 1920],
    [7780, 0, 1920], [8200, 300, 1600],
  ],
  spawns: [
    { kind: 'air', at: 500, role: 'g', path: 'swoop', x: 576, pattern: 'aimed' },
    { kind: 'air', at: 700, role: 'g', path: 'cross', x: -50, pattern: 'fan' },
    { kind: 'turret', at: 1000, x: 500, hp: 3 },
    { kind: 'air', at: 1100, role: 'd', path: 'dive', x: 1152, pattern: 'aimed' },
    { kind: 'crate', at: 1200, x: 1400, hp: 2, drop: 'bomb' },
    { kind: 'stone', at: 1300, x: 1000 },
    { kind: 'pillar', at: 1800, x: 900, w: 140, h: 140 },
    { kind: 'air', at: 2000, role: 'u', path: 'swoop', x: 1344, pattern: 'ring' },
    { kind: 'checkpoint', at: 3200, x: 960, grants: 'seed' },
    { kind: 'turret', at: 4680, x: 700, hp: 3 },
    { kind: 'crate', at: 4780, x: 1200, hp: 2, drop: 'life' },
    { kind: 'air', at: 4880, role: 'a', path: 'dive', x: 960, pattern: 'aimed' },
    { kind: 'air', at: 4980, role: 'u', path: 'swoop', x: 768, pattern: 'homing' },
    { kind: 'pillar', at: 5400, x: 1000, w: 140, h: 140 },
    { kind: 'air', at: 5600, role: 'd', path: 'cross', x: 1970, pattern: 'fan' },
    { kind: 'checkpoint', at: 6400, x: 960, grants: null },
    { kind: 'turret', at: 7880, x: 900, hp: 3 },
    { kind: 'air', at: 8000, role: 'g', path: 'swoop', x: 1152, pattern: 'aimed' },
    { kind: 'air', at: 8200, role: 'u', path: 'swoop', x: 640, pattern: 'homing' },
    {
      kind: 'hold', at: 8700, period: 5,
      targets: [{ x: 600, dy: 0, hp: 6 }, { x: 1200, dy: 60, hp: 6 }],
      flights: [
        { t: 2, role: 'g', path: 'swoop', x: 500, pattern: 'aimed' },
        { t: 4, role: 'd', path: 'cross', x: 1970, pattern: 'fan' },
      ],
    },
  ],
};

export const JOURNEY = [[course(220519, LEG_1)]];
