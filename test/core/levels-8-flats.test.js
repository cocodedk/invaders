import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOURNEY } from '../../src/core/levels-8.js';
import { LEVELS, WORLDS, levelById, reelName } from '../../src/core/levels.js';
import { difficulty } from '../../src/core/difficulty.js';
import { INTRO } from '../../src/core/kinds.js';
import { hpFor, END_RUN, RESPAWN_SAFE, SPAWN_Y, SHARD } from '../../src/core/course-kinds.js';
import { RESPAWN_Y } from '../../src/core/course-check.js';
import { stopAt, GATE_DY_MAX } from '../../src/core/course-hold.js';
import { LASSO_INK } from '../../src/core/course-lasso.js';
import { FLOCK_VY, FLOCK_R } from '../../src/core/course-flock.js';
import { LAND_FLATS } from '../../src/core/levels-8-kit.js';
import { parOf } from '../../src/core/pars.js';
import { unfair } from './course-fair-kit.js';
import { flocks, shards, ring, lone, LONE_GAP, FIRST_FLOCKS } from './course-fair-flats.js';
import { flyCourse, CLEAR_PARS } from './course-clear-kit.js';
import { FAIR_COURSE } from './course-kit.js';

// World 22's Leg 3 (the Mirror Flats), proven on its own as levels-8-wood.test.js proves Leg 2: its shape (starts with the seed and the line, two
// lanterns, the first granting the lasso, flocks and shards, an end hold), the data rules (the four of course-fair-flats.js included, each shown
// to catch what it names), and a clear. The data is read through LEVELS.
const WORLD = WORLDS.length;
const leg = levelById('w22-3');
const two = levelById('w22-2');
const kinds = (kind) => leg.course.spawns.filter((e) => e.kind === kind);
const flockEntries = (spawns) => spawns.filter((e) => e.kind === 'air' && e.path === 'flock');
const hold = () => leg.course.spawns.at(-1);
const withSpawns = (spawns) => ({ ...FAIR_COURSE, spawns });
const GATE = { x: 960, dy: 0, hp: 1 };
const LOOP_D = LASSO_INK / Math.PI; // the diameter of a circle of one full line

test('levels-8.js has three legs and the third is w22-3: a course named Leg 3, free flight, after Leg 2, with its own seed', () => {
  assert.equal(JOURNEY[0].length, 3);
  assert.equal(leg.world, WORLD);
  assert.equal(leg.index, 3);
  assert.equal(leg.course, JOURNEY[0][2].course);
  assert.equal(leg.free, true);
  assert.ok(!('waves' in leg) && !('boss' in leg));
  assert.equal(reelName(leg), 'Leg 3');
  assert.equal(LEVELS[LEVELS.indexOf(two) + 1], leg, 'it follows Leg 2');
  assert.ok(parOf(leg) > 0);
  assert.ok(LEVELS.filter((l) => l !== leg).every((l) => l.seed !== leg.seed), 'its seed is its own');
});

test('Leg 3 starts with the seed and the line, its first lantern grants the lasso and the second nothing, on the Mirror Flats, and it ends on its hold', () => {
  assert.deepEqual(leg.course.starts, ['seed', 'line']);
  assert.equal(leg.course.land, LAND_FLATS);
  assert.equal(kinds('checkpoint').length, 2);
  assert.equal(kinds('checkpoint')[0].grants, 'lasso');
  assert.equal(kinds('checkpoint')[1].grants, null);
  assert.equal(hold(), kinds('hold').at(-1));
  assert.equal(leg.course.length, stopAt(hold()) + END_RUN);
});

test('Leg 3 is about two minutes at a faster scroll than Leg 2, and its difficulty is above Leg 2\'s', () => {
  assert.ok(leg.course.speed > two.course.speed);
  const [secs, secs2] = [leg.course.length / leg.course.speed, two.course.length / two.course.speed];
  assert.ok(Math.abs(secs - secs2) <= 30, `${secs.toFixed(0)} s of scroll`);
  assert.ok(difficulty(WORLD, 3) > difficulty(WORLD, 2) && difficulty(WORLD, 3) <= 1);
  assert.equal(leg.d, difficulty(WORLD, 3));
});

test('Leg 3 breaks no data rule', () => {
  assert.deepEqual(unfair(leg), []);
});

test('Leg 3 has flocks and shards, the first flock after the lasso is granted, and its hold has no flock in its flights', () => {
  const [first] = flockEntries(leg.course.spawns);
  assert.ok(flockEntries(leg.course.spawns).length >= 4 && kinds(SHARD).length >= 6);
  assert.ok(first.at > kinds('checkpoint')[0].at, 'a flock needs the lasso');
  assert.ok(hold().flights.every((f) => f.path !== 'flock'));
  assert.ok(hold().flights.some((f) => f.path === 'hang') && hold().flights.some((f) => f.path !== 'hang'), 'Smudges and kites');
});

test('the Glass Ring is gates all as tough as BREAK_SECS says, within reach, and no loop of a full line takes three', () => {
  const { targets } = hold();
  assert.ok(targets.length >= 4 && targets.every((t) => t.hp === hpFor('gate') && t.dy >= 0 && t.dy <= GATE_DY_MAX));
  assert.deepEqual(ring(leg.course), []);
});

test('a hold whose gates three of fit inside a loop of LASSO_INK is caught by the ring rule, and gates a loop apart are not', () => {
  const lasso = (spawns) => ({ ...withSpawns(spawns), starts: ['lasso'] });
  const close = { kind: 'hold', at: 0, period: 5, flights: [], targets: [{ ...GATE, x: 800 }, { ...GATE, x: 960 }, { ...GATE, x: 1120 }] };
  assert.equal(ring(lasso([close])).length, 1);
  const half = LOOP_D / 2 + 1; // three in a row, each a little over a loop's radius from the next: the end two are over a diameter apart
  const apart = { ...close, targets: [-1, 0, 1].map((k) => ({ ...GATE, x: 960 + k * half })) };
  assert.deepEqual(ring(lasso([apart])), []);
  assert.equal(ring(lasso([{ ...close, targets: [{ ...GATE, x: 960 - LOOP_D / 2 }, { ...GATE, x: 960 + LOOP_D / 2 }, { ...GATE, x: 960, dy: 1 }] }])).length, 1, 'a loop of a diameter takes the two ends and a third near the middle');
});

test('a flock still on the screen when a hold starts is caught by the flock rule, and one that has left is not', () => {
  const stop = stopAt({ at: 10000 });
  const stay = (FLOCK_R * 2 + 1080 - SPAWN_Y) / FLOCK_VY; // s a flock takes to be gone, rounded up
  const make = (at) => withSpawns([{ kind: 'air', at, role: 'g', path: 'flock', x: 960, pattern: 'aimed' }, { kind: 'hold', at: 10000, period: 5, flights: [], targets: [GATE] }]);
  assert.equal(flocks(make(stop - 100)).length, 1);
  assert.deepEqual(flocks(make(stop - (FAIR_COURSE.speed * stay) - 100)), []);
  assert.equal(flocks(withSpawns([{ kind: 'hold', at: 10000, period: 5, targets: [GATE], flights: [{ t: 1, role: 'g', path: 'flock', x: 960, pattern: 'aimed' }] }])).length, 1);
});

test('a shard within RESPAWN_SAFE s of a lantern, before it or after, is caught by the shard rule', () => {
  const lantern = { kind: 'checkpoint', at: 5000, x: 960, grants: null };
  const near = FAIR_COURSE.speed * RESPAWN_SAFE;
  const mk = (at) => withSpawns([{ kind: SHARD, at, x: 960 }, lantern].sort((a, b) => a.at - b.at));
  assert.equal(shards(mk(5000 - near + 1)).length, 1);
  assert.equal(shards(mk(5000 + near - 1)).length, 1);
  assert.deepEqual(shards(mk(5000 - near)), []);
  assert.deepEqual(shards(mk(5000 + near)), []);
  assert.ok(RESPAWN_Y > 0);
});

test('the first Flocks come alone: a spawn within LONE_GAP of one is caught by the lone rule, a lantern or a later flock with neighbours is not', () => {
  assert.deepEqual(lone(leg.course), []);
  assert.deepEqual(lone(two.course), [], 'Legs without flocks have nothing to check');
  const spawns = leg.course.spawns;
  const firsts = flockEntries(spawns).slice(0, FIRST_FLOCKS);
  const moved = (e) => spawns.map((s) => (s === e ? { ...s, at: firsts[0].at + LONE_GAP - 1 } : s));
  const other = spawns.find((s) => s.kind === 'air' && s.path !== 'flock');
  assert.match(lone({ ...leg.course, spawns: moved(other) })[0], /^lone: /);
  const lamp = { kind: 'checkpoint', at: firsts[0].at + 1, x: 960, grants: null };
  assert.deepEqual(lone({ ...leg.course, spawns: [...spawns, lamp] }), []);
  const third = flockEntries(spawns)[FIRST_FLOCKS];
  const near = { kind: 'air', at: third.at + 1, role: 'g', path: 'swoop', x: 960, pattern: 'aimed' };
  assert.deepEqual(lone({ ...leg.course, spawns: [...spawns, near] }), []);
});

test('Leg 3 can be cleared: a steered, unhittable flight reaches the end of its hold within its pars', () => {
  const { world, held } = flyCourse(leg);
  assert.equal(world.state, 'cleared');
  assert.ok(held, 'the scroll stopped at the hold');
  assert.ok(world.t - INTRO <= CLEAR_PARS * parOf(leg), `cleared at ${world.t.toFixed(1)} s`);
});

// A swallowed entry once slipped through; re-take this number from `levelById('w22-3').course.spawns.length` when the course data is changed on purpose.
test('Leg 3 keeps every spawn it was authored with', () => {
  assert.equal(leg.course.spawns.length, 112);
});
