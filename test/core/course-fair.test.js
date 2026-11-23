import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FREE_ZONE } from '../../src/core/ship.js';
import { WIDTH, MID_X, HUD_BOTTOM } from '../../src/core/kinds.js';
import { SPAWN_Y, WALL_SLOPE_MAX, RESPAWN_SAFE, BAND_MIN } from '../../src/core/course-kinds.js';
import { GROUND_R } from '../../src/core/course-ground.js';
import { SEED_REACH } from '../../src/core/course-seed.js';
import { HOLD_Y, GATE_DY_MAX, stopAt } from '../../src/core/course-hold.js';
import { bandAt } from '../../src/core/course-terrain.js';
import { CURTAIN_W } from '../../src/core/patterns.js';
import { unfair } from './course-fair-kit.js';
import { curtains, CURTAIN } from './course-fair-wood.js';
import { courseLevel, air, col, checkpoint, hold, FAIR_COURSE, FAIR_SPEED, FAIR_CP_AT, FAIR_QUIET_END } from './course-kit.js';

// The data check (course-fair-kit.js unfair) on a course made to satisfy every rule, and on that course with one rule broken
// at a time. A leg's own data (Task 8) runs the same check.

const ruleOf = (violation) => violation.split(':')[0];
const rulesOf = (data) => [...new Set(unfair(courseLevel(data)).map(ruleOf))];
// A copy of the fair course with `mutate` done to it.
const changed = (mutate) => {
  const data = structuredClone(FAIR_COURSE);
  mutate(data);
  return data;
};
const first = (data, kind) => data.spawns.find((e) => e.kind === kind);
const holdOf = (data) => first(data, 'hold');
// Keyframe `i` of the walls: how far each edge moves into it, and the px an edge would have to move to be too steep for the run of scroll.
const moves = (d, i) => [Math.abs(d.walls[i][1] - d.walls[i - 1][1]), Math.abs(d.walls[i][2] - d.walls[i - 1][2])];
const tooFar = (d, i) => WALL_SLOPE_MAX * (d.walls[i][0] - d.walls[i - 1][0]) + 1;
// A Smudge (a craft that hangs and drops curtains) at the middle, and the gorge narrowed round the middle until a curtain leaves BAND_MIN less than
// it asks for on either side. It comes up in the gorge, between the stone and the pillar.
const smudge = (o = {}) => air({ role: 'u', path: 'hang', pattern: CURTAIN, x: col(0.5), ...o });
const tight = [col(0.5) - CURTAIN_W / 2 - BAND_MIN + 1, col(0.5) + CURTAIN_W / 2 + BAND_MIN - 1]; // the left and right edges
const narrowed = (d) => { for (const i of [2, 3]) [d.walls[i][1], d.walls[i][2]] = tight; };
const put = (data, e) => data.spawns.splice(data.spawns.findLastIndex((s) => s.at <= e.at) + 1, 0, e); // in order of `at`

test('the fair course breaks no rule, and holds every kind of entry', () => {
  assert.deepEqual(unfair(courseLevel(FAIR_COURSE)), []);
  assert.deepEqual([...new Set(FAIR_COURSE.spawns.map((e) => e.kind))].sort(), ['air', 'checkpoint', 'crate', 'hold', 'pillar', 'stone', 'turret']);
  assert.ok(FAIR_COURSE.spawns.some((e) => e.path === 'cross') && FAIR_COURSE.spawns.some((e) => e.path === 'dive'));
});

// [the rule it breaks, how, what is done to the fair course]
const BROKEN = [
  ['sorted', 'two entries swapped', (d) => d.spawns.splice(0, 2, d.spawns[1], d.spawns[0])],
  ['role', 'an air entry with no such role', (d) => { first(d, 'air').role = 'x'; }],
  ['path', 'an air entry with no such path', (d) => { first(d, 'air').path = 'spin'; }],
  ['pattern', 'an air entry with no such pattern', (d) => { first(d, 'air').pattern = 'zigzag'; }],
  ['role', 'a hold flight with no such role', (d) => { holdOf(d).flights[0].role = 'boss'; }],
  ['path', 'a hold flight with no such path', (d) => { holdOf(d).flights[0].path = 'spin'; }],
  ['pattern', 'a hold flight firing the turrets\' shot', (d) => { holdOf(d).flights[0].pattern = 'heavy'; }],
  ['cross', 'a crossing that starts on the screen', (d) => { d.spawns.find((e) => e.path === 'cross').x = col(0.5); }],
  ['cross', 'a hold flight that starts on the edge itself', (d) => { holdOf(d).flights[1].x = WIDTH; }],
  ['curtain', 'a Smudge before the line that leaves under BAND_MIN beside its curtain', (d) => { narrowed(d); put(d, smudge({ at: d.walls[2][0] + 100 })); }],
  ['curtain', 'a curtain fired by a craft that does not hang', (d) => { first(d, 'air').pattern = CURTAIN; }],
  ['hp', 'a turret with no hp', (d) => { first(d, 'turret').hp = 0; }],
  ['hp', 'a crate with negative hp', (d) => { first(d, 'crate').hp = -1; }],
  ['hp', 'a gate with no hp', (d) => { holdOf(d).targets[1].hp = 0; }],
  ['pillar', 'a pillar with no width', (d) => { first(d, 'pillar').w = 0; }],
  ['pillar', 'a pillar with no height', (d) => { first(d, 'pillar').h = 0; }],
  ['pillar', 'a pillar that would show its foot as it comes up', (d) => { first(d, 'pillar').h = -2 * SPAWN_Y + 1; }],
  ['walls', 'two keyframes at the same place', (d) => { d.walls[3][0] = d.walls[2][0]; }],
  ['slope', 'both edges too steep (the gorge coming sooner)', (d) => { d.walls[2][0] = d.walls[1][0] + Math.ceil(Math.min(...moves(d, 2)) / WALL_SLOPE_MAX) - 1; }],
  ['slope', 'only the left edge too steep', (d) => { d.walls[6][1] = d.walls[5][1] + tooFar(d, 6); }],
  ['slope', 'only the right edge too steep', (d) => { d.walls[6][2] = d.walls[5][2] - tooFar(d, 6); }],
  ['band', 'a pillar that leaves under BAND_MIN on either side', (d) => { // the wider side, in the gorge, just short of it
    const p = first(d, 'pillar');
    p.w = 2 * (Math.max(p.x - d.walls[2][1], d.walls[2][2] - p.x) - BAND_MIN) + 2;
  }],
  ['buried', 'a turret in the left wall', (d) => { first(d, 'turret').x = 100; }],
  ['buried', 'a crate in the right wall', (d) => { first(d, 'crate').x = WIDTH - 100; }],
  ['buried', 'a stone in the left wall', (d) => { first(d, 'stone').x = 100; }],
  ['buried', 'a stone whose edge is in the wall, though its centre is not', (d) => { first(d, 'stone').x = bandAt(d, first(d, 'stone').at).left + GROUND_R - 1; }],
  ['buried', 'a pillar with its left face in the wall', (d) => { first(d, 'pillar').x = 420; }],
  ['quiet', 'an entry just after the checkpoint', (d) => put(d, air({ at: FAIR_CP_AT + 50 }))],
  ['quiet', 'an entry on the last px of the checkpoint\'s stretch', (d) => put(d, air({ at: FAIR_QUIET_END }))],
  ['quiet', 'an entry in the start\'s stretch', (d) => put(d, air({ at: 0 }))],
  ['open', 'the walls closing in at the end of the checkpoint\'s stretch', (d) => { d.walls[5][1] = 100; }],
  ['open', 'the start not open to the width', (d) => { d.walls[0][2] = WIDTH - 100; }],
  ['length', 'a leg that ends on its hold but runs past its run-out', (d) => { d.length += 100; }],
  ['length', 'a leg that ends on its hold with no run-out (it clears the tick the hold breaks)', (d) => { d.length = stopAt(holdOf(d)); }],
  ['length', 'a leg that ends on its hold with a run-out one px short', (d) => { d.length -= 1; }],
  ['length', 'a leg that clears before its hold stops the scroll', (d) => { d.length -= 100; }],
  ['length', 'a leg that clears before a hold with course after it stops the scroll', (d) => {
    put(d, { kind: 'stone', at: holdOf(d).at + 50, x: WIDTH / 2 });
    d.length = stopAt(holdOf(d)) - 100;
  }],
  ['period', 'a hold with no period', (d) => { holdOf(d).period = 0; }],
  ['gate', 'a gate above its hold\'s anchor', (d) => { holdOf(d).targets[0].dy = -1; }],
  ['gate', 'a gate further down the course than the hold reaches', (d) => { holdOf(d).targets[1].dy = HOLD_Y + 1; }],
  ['gate', 'a gate whose top edge is behind the HUD when the scroll stops', (d) => { holdOf(d).targets[1].dy = GATE_DY_MAX + 1; }],
  ['target', 'a hold with no gate', (d) => { holdOf(d).targets = []; }],
  ['reach', 'a gate in the wall', (d) => { holdOf(d).targets[0].x = 100; }],
];

for (const [rule, what, mutate] of BROKEN) {
  test(`${rule} is reported alone for ${what}`, () => {
    assert.deepEqual(rulesOf(changed(mutate)), [rule]);
  });
}

test('the edges of the rules: what is allowed', () => {
  const steepest = (d) => { d.walls[2][2] = d.walls[1][2] - WALL_SLOPE_MAX * (d.walls[2][0] - d.walls[1][0]); d.walls[2][1] = 0; };
  assert.deepEqual(unfair(courseLevel(changed(steepest))).map(ruleOf).filter((r) => r === 'slope'), [], 'a slope of exactly the most is allowed');
  const edges = (d) => { // an entry at the checkpoint's own row, and one the px past the stretch
    put(d, air({ at: FAIR_CP_AT }));
    put(d, air({ at: FAIR_QUIET_END + 1 }));
    put(d, air({ at: FAIR_SPEED * RESPAWN_SAFE + 1 })); // past the start's stretch, and before the first entry
  };
  assert.deepEqual(unfair(courseLevel(changed(edges))), []);
  const limits = (d) => { // the most each of these may be: a pillar as tall as it may be, a gate on either end of its range, a gap of BAND_MIN
    const p = first(d, 'pillar');
    p.h = -2 * SPAWN_Y;
    holdOf(d).targets[0].dy = 0;
    holdOf(d).targets[1].dy = GATE_DY_MAX;
    p.w = 2 * (Math.max(p.x - d.walls[2][1], d.walls[2][2] - p.x) - BAND_MIN);
  };
  assert.deepEqual(unfair(courseLevel(changed(limits))), []);
  const past = (d) => { // a hold with more course after it ends at the course's length, which is past its stop
    put(d, { kind: 'stone', at: holdOf(d).at + 50, x: WIDTH / 2 });
    d.length += 500;
  };
  assert.deepEqual(unfair(courseLevel(changed(past))), []);
});

test('a gate anywhere in [0, GATE_DY_MAX] of its hold is within the seeds\' sight, and clear of the HUD, when the scroll stops', () => {
  const e = holdOf(FAIR_COURSE);
  for (const dy of [0, GATE_DY_MAX]) {
    const y = SPAWN_Y + stopAt(e) - (e.at + dy); // where its gate stands on the screen
    assert.ok(y - GROUND_R >= HUD_BOTTOM, `dy ${dy}: its top edge at ${y - GROUND_R} is behind the HUD`);
    assert.ok(y + SEED_REACH <= FREE_ZONE.y1, `dy ${dy}: a ship at ${y + SEED_REACH} puts a seed on it`);
  }
  assert.ok(GATE_DY_MAX < HOLD_Y, 'tighter than the screen alone asks');
  assert.equal(SPAWN_Y + stopAt(e) - (e.at + GATE_DY_MAX + 1) - GROUND_R < HUD_BOTTOM, true, 'and a px higher is behind it');
});

// The curtain rule on its own (course-fair-wood.js curtains), on a course whose walls leave a curtain too little room.
const tightLevel = (spawns, o = {}) => courseLevel({ speed: FAIR_SPEED, length: 9000, starts: [], walls: [[0, ...tight]], spawns, ...o });
const lantern = (at, grants) => checkpoint(at, MID_X, grants);

test('a Smudge is excused by the line only once it is held: from the start, or from a lantern that grants it before the Smudge comes up', () => {
  const alone = [smudge({ at: 1000 })];
  assert.equal(curtains(tightLevel(alone)).length, 1);
  assert.deepEqual(curtains(tightLevel(alone, { starts: ['line'] })), []);
  assert.equal(curtains(tightLevel([...alone, lantern(1500, 'line')])).length, 1, 'a lantern after it does not excuse it');
  assert.deepEqual(curtains(tightLevel([lantern(500, 'line'), ...alone])), []);
  assert.equal(curtains(tightLevel([lantern(500, 'seed'), ...alone])).length, 1, 'a lantern that grants something else does not');
});

test('a Smudge in a hold\'s flights is held to the curtain rule too, from the row the scroll stops at', () => {
  const flights = [{ t: 1, role: 'u', path: 'hang', x: col(0.5), pattern: CURTAIN }];
  assert.equal(curtains(tightLevel([hold({ flights })])).length, 1);
  assert.deepEqual(curtains(tightLevel([hold({ flights })], { starts: ['line'] })), []);
});

test('a Smudge with room for the curtain and BAND_MIN beside it breaks no rule, and BAND_MIN exactly is enough', () => {
  const roomy = (d) => put(d, smudge({ at: FAIR_QUIET_END + 150 }));
  assert.deepEqual(unfair(courseLevel(changed(roomy))), []);
  const edge = [[0, tight[0] - 1, tight[1] + 1]]; // exactly BAND_MIN either side of the curtain
  assert.deepEqual(curtains(tightLevel([smudge({ at: 1000 })], { walls: edge })), []);
});
