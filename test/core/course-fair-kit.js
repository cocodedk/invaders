import { WIDTH, HEIGHT, PATTERNS } from '../../src/core/kinds.js';
import { ROLE } from '../../src/core/levels-2.js';
import { PATH_NAMES } from '../../src/core/course-air.js';
import { startCheck, RESPAWN_Y } from '../../src/core/course-check.js';
import { GATE_DY_MAX, stopAt } from '../../src/core/course-hold.js';
import { GROUND_R } from '../../src/core/course-ground.js';
import { bandAt } from '../../src/core/course-terrain.js';
import { SPAWN_Y, BAND_MIN, RESPAWN_SAFE, WALL_SLOPE_MAX, END_RUN } from '../../src/core/course-kinds.js';

// The data rules of a course (world 22), as one pure check. unfair(level) walks the level's `course` and returns what breaks them,
// each as 'rule: what', so [] is a fair course. A level's data (a leg of the journey) runs it; the tests prove it on a course made
// to satisfy every rule and on that course with one rule broken at a time (course-fair.test.js).
//   sorted   the spawns are in order of `at`
//   role, path, pattern, cross   an air craft (an air entry, a hold's flight) has a role letter, a path and a pattern that exist;
//            a crossing starts beyond a side edge
//   hp       a turret, a crate and a gate have hp above 0
//   pillar   it has a width and a height, and its height is at most -2 * SPAWN_Y, so it comes up whole above the screen (R19)
//   walls    the keyframes are in order of `at`; slope: no edge moves faster than WALL_SLOPE_MAX px a px of scroll (R21)
//   band     at every row the widest gap the walls and the pillars leave is at least BAND_MIN
//   buried   no turret, crate, stone, checkpoint or pillar stands in rock (a ground object counts from its edge, GROUND_R)
//   quiet    nothing comes up in the stretch of the start and of every checkpoint: from the row the ship is put on to the top of the
//            screen the checkpoint was reached on, and RESPAWN_SAFE s of scroll more; open: the walls leave the whole width open
//            along it (R20)
//   length   the course is at least as long as every hold's stop, and exactly that plus END_RUN when the last entry is a hold: the leg ends on it,
//            runs on END_RUN px of scroll past its stop once the gates have fallen, and clears there
//   period, target, gate, reach   a hold's period is above 0, it has a gate, its gates are in [0, GATE_DY_MAX] (on the screen when the scroll stops, and
//            clear of the HUD's panels: a gate's top edge at the stop is at HUD_BOTTOM or below) and in the band

const need = (ok, rule, what) => (ok ? [] : [`${rule}: ${what}`]);
const rowsOf = (lo, hi) => { // the integer rows from lo up to hi, and hi itself
  const rows = [];
  for (let at = lo; at < hi; at++) rows.push(at);
  return [...rows, hi];
};
const pillars = ({ spawns }) => spawns.filter((e) => e.kind === 'pillar');
const inside = (course, at, x, r) => { // does the disc at x on row `at` lie within the band?
  const { left, right } = bandAt(course, at);
  return x - r >= left && x + r <= right;
};
const wide = (course, at) => bandAt(course, at).left <= 0 && bandAt(course, at).right >= WIDTH; // is the band open to the whole width?

const sorted = ({ spawns }) =>
  spawns.flatMap((e, i) => need(i === 0 || e.at >= spawns[i - 1].at, 'sorted', `#${i} (at ${e.at}) comes before #${i - 1}`));

const crafts = ({ spawns }) => spawns.flatMap((e, i) => {
  if (e.kind === 'air') return [[e, `air #${i}`]];
  return e.kind === 'hold' ? e.flights.map((f, j) => [f, `hold #${i} flight ${j}`]) : [];
});
const craft = (course) => crafts(course).flatMap(([c, name]) => [
  ...need(Object.hasOwn(ROLE, c.role), 'role', `${name} is '${c.role}'`),
  ...need(PATH_NAMES.includes(c.path), 'path', `${name} is '${c.path}'`),
  ...need(PATTERNS.includes(c.pattern), 'pattern', `${name} is '${c.pattern}'`),
  ...need(c.path !== 'cross' || c.x < 0 || c.x > WIDTH, 'cross', `${name} starts at x ${c.x}, on the screen`),
]);

const targets = ({ spawns }) => spawns.flatMap((e, i) => {
  if (e.kind === 'turret' || e.kind === 'crate') return [[e, `${e.kind} #${i}`]];
  return e.kind === 'hold' ? e.targets.map((t, j) => [t, `hold #${i} gate ${j}`]) : [];
});
const hp = (course) => targets(course).flatMap(([t, name]) => need(t.hp > 0, 'hp', `${name} has hp ${t.hp}`));

const pillar = (course) => pillars(course).flatMap((p) =>
  need(p.w > 0 && p.h > 0 && p.h <= -2 * SPAWN_Y, 'pillar', `at ${p.at}: w ${p.w}, h ${p.h}, h at most ${-2 * SPAWN_Y}`));

function walls({ walls: keys = [] }) {
  return keys.flatMap(([at, left, right], i) => {
    if (i === 0) return [];
    const [at0, left0, right0] = keys[i - 1];
    if (at <= at0) return [`walls: keyframe ${i} (at ${at}) is not past keyframe ${i - 1} (at ${at0})`];
    const slope = Math.max(Math.abs(left - left0), Math.abs(right - right0)) / (at - at0);
    return need(slope <= WALL_SLOPE_MAX, 'slope', `the walls move ${slope.toFixed(2)} px a px between ${at0} and ${at}`);
  });
}

// The widest gap at row `at`: the band less the pillars across it (a pillar's box covers its `at` +- h / 2).
function widestGap(course, blocks, at) {
  const { left, right } = bandAt(course, at);
  let widest = 0;
  let from = left;
  for (const b of blocks) {
    if (at < b.top || at > b.bottom) continue;
    widest = Math.max(widest, b.left - from);
    from = Math.max(from, b.right);
  }
  return Math.max(widest, right - from);
}
function band(course) {
  const blocks = pillars(course)
    .map((p) => ({ left: p.x - p.w / 2, right: p.x + p.w / 2, top: p.at - p.h / 2, bottom: p.at + p.h / 2 }))
    .sort((a, b) => a.left - b.left);
  const row = rowsOf(SPAWN_Y - HEIGHT, course.length).find((at) => widestGap(course, blocks, at) < BAND_MIN);
  return need(row === undefined, 'band', `under ${BAND_MIN} px open at ${row}`);
}

const GROUND_KINDS = ['turret', 'crate', 'stone', 'checkpoint']; // the ground objects with a place of their own (a gate is checked with its hold)
function buried(course) {
  const ground = course.spawns
    .filter((e) => GROUND_KINDS.includes(e.kind))
    .flatMap((e) => need(inside(course, e.at, e.x, GROUND_R), 'buried', `${e.kind} at ${e.at} stands in rock`));
  const piers = pillars(course).filter((p) => p.w > 0 && p.h > 0).flatMap((p) => {
    const row = rowsOf(Math.ceil(p.at - p.h / 2), Math.floor(p.at + p.h / 2)).find((at) => !inside(course, at, p.x, p.w / 2));
    return need(row === undefined, 'buried', `pillar at ${p.at} stands in rock at ${row}`);
  });
  return [...ground, ...piers];
}

// A checkpoint is reached when its row `at` comes down to RESPAWN_Y, which is the record's dist: at + onLine. A respawn puts the ship on
// that row, so the stretch runs from there (the row itself is the checkpoint's) up to the top of the screen at that dist, and RESPAWN_SAFE s
// of scroll more. The start is checkpoint 0 (course-check.js startCheck, dist 0), so the same code gives its stretch.
function quiet(level) {
  const { speed, spawns } = level.course;
  const onLine = RESPAWN_Y - SPAWN_Y;
  const reached = spawns.filter((e) => e.kind === 'checkpoint').map((e) => [`the checkpoint at ${e.at}`, e.at + onLine]);
  const records = [['the start', startCheck(level).dist], ...reached];
  return records.flatMap(([name, dist]) => {
    const [lo, hi] = [dist - onLine, dist + speed * RESPAWN_SAFE];
    const noisy = spawns.filter((e) => e.at > lo && e.at <= hi).map((e) => `quiet: ${e.kind} at ${e.at} comes up in the stretch of ${name}, (${lo}, ${hi}]`);
    const shut = rowsOf(lo, hi).find((at) => !wide(level.course, at));
    return [...noisy, ...need(shut === undefined, 'open', `the walls leave less than the width open at ${shut}, in the stretch of ${name}`)];
  });
}

function ending({ length, spawns }) {
  return spawns.flatMap((e, i) => {
    if (e.kind !== 'hold') return [];
    const stop = stopAt(e);
    return [
      ...need(length >= stop, 'length', `${length} clears before hold #${i} stops the scroll at ${stop}`),
      ...need(i < spawns.length - 1 || length === stop + END_RUN, 'length', `the leg ends on hold #${i}, so its length is its stop ${stop} plus the run-out ${END_RUN}, not ${length}`),
    ];
  });
}

function holds(course) {
  return course.spawns.flatMap((e, i) => (e.kind !== 'hold' ? [] : [
    ...need(e.period > 0, 'period', `hold #${i} has period ${e.period}`),
    ...need(e.targets.length > 0, 'target', `hold #${i} has no gate`), // no gate to break: it never stops the scroll, and the land's end (landEnd) has no highest target
    ...e.targets.flatMap((t, j) => [
      ...need(t.dy >= 0 && t.dy <= GATE_DY_MAX, 'gate', `hold #${i} gate ${j} has dy ${t.dy}, outside [0, ${GATE_DY_MAX}]`),
      ...need(inside(course, e.at + t.dy, t.x, GROUND_R), 'reach', `hold #${i} gate ${j} at x ${t.x} is not inside the band`),
    ]),
  ]));
}

export function unfair(level) {
  const c = level.course;
  return [...sorted(c), ...craft(c), ...hp(c), ...pillar(c), ...walls(c), ...band(c), ...buried(c), ...quiet(level), ...ending(c), ...holds(c)];
}
