import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../../src/core/kinds.js';
import { FREE_ZONE } from '../../src/core/ship.js';
import { SPAWN_Y, WALL_SLOPE_MAX, RESPAWN_SAFE } from '../../src/core/course-kinds.js';
import { SEED_REACH } from '../../src/core/course-seed.js';
import { HOLD_Y, stopAt } from '../../src/core/course-hold.js';
import { unfair } from './course-fair-kit.js';
import { courseLevel, air, col, FAIR_COURSE, FAIR_SPEED, FAIR_CP_AT, FAIR_QUIET_END } from './course-kit.js';

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
  ['hp', 'a turret with no hp', (d) => { first(d, 'turret').hp = 0; }],
  ['hp', 'a crate with negative hp', (d) => { first(d, 'crate').hp = -1; }],
  ['hp', 'a gate with no hp', (d) => { holdOf(d).targets[1].hp = 0; }],
  ['pillar', 'a pillar with no width', (d) => { first(d, 'pillar').w = 0; }],
  ['pillar', 'a pillar with no height', (d) => { first(d, 'pillar').h = 0; }],
  ['pillar', 'a pillar that would show its foot as it comes up', (d) => { first(d, 'pillar').h = -2 * SPAWN_Y + 1; }],
  ['walls', 'two keyframes at the same place', (d) => { d.walls[3][0] = d.walls[2][0]; }],
  ['slope', 'both edges moving about 4 px a px', (d) => { d.walls[2][0] = d.walls[1][0] + 400; }],
  ['slope', 'only the right edge too steep', (d) => { d.walls[6][2] = 1300; }],
  ['band', 'a pillar that leaves 150 px and 250 px on either side', (d) => { first(d, 'pillar').w = 700; }],
  ['buried', 'a turret in the left wall', (d) => { first(d, 'turret').x = 100; }],
  ['buried', 'a crate in the right wall', (d) => { first(d, 'crate').x = WIDTH - 100; }],
  ['buried', 'a pillar with its left face in the wall', (d) => { first(d, 'pillar').x = 420; }],
  ['quiet', 'an entry just after the checkpoint', (d) => put(d, air({ at: FAIR_CP_AT + 50 }))],
  ['quiet', 'an entry on the last px of the checkpoint\'s stretch', (d) => put(d, air({ at: FAIR_QUIET_END }))],
  ['quiet', 'an entry in the start\'s stretch', (d) => put(d, air({ at: 0 }))],
  ['open', 'the walls closing in at the end of the checkpoint\'s stretch', (d) => { d.walls[5][1] = 100; }],
  ['open', 'the start not open to the width', (d) => { d.walls[0][2] = WIDTH - 100; }],
  ['length', 'a leg that ends on its hold but runs past its stop', (d) => { d.length += 100; }],
  ['length', 'a leg that clears before its hold stops the scroll', (d) => { d.length -= 100; }],
  ['period', 'a hold with no period', (d) => { holdOf(d).period = 0; }],
  ['gate', 'a gate above its hold\'s anchor', (d) => { holdOf(d).targets[0].dy = -1; }],
  ['gate', 'a gate further down the course than the hold reaches', (d) => { holdOf(d).targets[1].dy = HOLD_Y + 1; }],
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
  const past = (d) => { // a hold with more course after it ends at the course's length, which is past its stop
    put(d, { kind: 'stone', at: holdOf(d).at + 50, x: WIDTH / 2 });
    d.length += 500;
  };
  assert.deepEqual(unfair(courseLevel(changed(past))), []);
});

test('a gate anywhere in [0, HOLD_Y] of its hold is within the seeds\' sight when the scroll stops', () => {
  const e = holdOf(FAIR_COURSE);
  for (const dy of [0, HOLD_Y]) {
    const y = SPAWN_Y + stopAt(e) - (e.at + dy); // where its gate stands on the screen
    assert.ok(y >= 0 && y + SEED_REACH <= FREE_ZONE.y1, `dy ${dy}: a ship at ${y + SEED_REACH} puts a seed on it`);
  }
});
