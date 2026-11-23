import { WIDTH as W, MID_X } from './kinds.js';
import { hpFor } from './course-kinds.js';

// The shorthand of world 22's level data (levels-8.js, levels-8-wood.js), one entry a call. `course(seed, data)` is a level spec like `lv` in
// levels-2.js, and `data` is { speed, length, starts, walls, spawns }: the scroll's speed in px/s and length in px, the abilities the leg
// begins with, the wall keyframes ([at, left, right]) and the entries, in order of `at` (what each kind takes is in course-air.js,
// course-ground.js, course-hold.js and course-check.js). `at` is a row of the course in px of scroll: an entry comes up above the screen
// when the scroll reaches it, and a second of scroll is `speed` px.

export const course = (seed, data) => ({ seed, bunkers: false, course: data });

// An air craft takes its role letter (g grunt, d diver, u gunner, a armored, c carrier: a carrier fires nothing and always drops a power-up),
// its path, the x it starts at and the pattern it fires; a crate holds 'bomb', 'life' or, with none, the usual random drop; a lantern is a
// checkpoint, and grants an ability or nothing.
export const air = (at, role, path, x, pattern) => ({ kind: 'air', at, role, path, x, pattern });
// The Smudge (Leg 2): a gunner that drifts down, hangs at x and fires a curtain across the band (course-air.js hang, patterns.js curtain).
export const smudge = (at, x) => air(at, 'u', 'hang', x, 'curtain');
// A turret's hp, and a gate's, come from course-kinds.js hpFor: the seconds of steady fire BREAK_SECS names, in shots.
export const turret = (at, x) => ({ kind: 'turret', at, x, hp: hpFor('turret') });
export const crate = (at, x, hp, drop = null) => ({ kind: 'crate', at, x, hp, drop });
export const stone = (at, x) => ({ kind: 'stone', at, x });
export const pillar = (at, x, w, h) => ({ kind: 'pillar', at, x, w, h });
// A thorn piece (Leg 2): a box like a pillar, with the hp GROUND_HP.thorn gives it; the pieces that share an `at` are one hedge.
export const thorn = (at, x, w, h) => ({ kind: 'thorn', at, x, w, h });
// A hedge (Leg 2): the thorn pieces that share the row `at`, h tall, tiling each run [from, to] of the band in equal pieces about `w` wide (at least one a run).
// A run that ends on a wall's edge stands flush against it, and the gap between two runs, or between a run and the wall, is the way round it.
export const hedge = (at, h, w, ...runs) => runs.flatMap(([from, to]) => {
  const n = Math.max(1, Math.round((to - from) / w));
  const each = (to - from) / n;
  return Array.from({ length: n }, (_, i) => thorn(at, from + each * (i + 0.5), each, h));
});
export const lantern = (at, grants = null) => ({ kind: 'checkpoint', at, x: MID_X, grants });
export const LEFT = -60; // where a crossing starts: beyond the edge it comes from
export const RIGHT = W + 60;
