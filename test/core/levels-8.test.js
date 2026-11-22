import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOURNEY } from '../../src/core/levels-8.js';
import { LEVELS, WORLDS, levelById, reelName } from '../../src/core/levels.js';
import { difficulty } from '../../src/core/difficulty.js';
import { INTRO } from '../../src/core/kinds.js';
import { RATINGS } from '../../src/core/ratings.js';
import { parOf } from '../../src/core/pars.js';
import { unfair } from './course-fair-kit.js';
import { flyCourse, CLEAR_PARS } from './course-clear-kit.js';

// World 22's level data and rows, proven on their own: the world has one level, a course (no waves, no boss), and its first leg obeys
// the data rules, can be cleared, and has the shape of the design's Leg 1 (two lanterns, the first granting the seed, and an end hold).
// The data is read from levels-8.js through LEVELS, never from a test kit.
const WORLD = WORLDS.length; // the course world is the last
const [[spec]] = JOURNEY;
const leg = levelById('w22-1');
const kinds = (kind) => leg.course.spawns.filter((e) => e.kind === kind);

test('levels-8.js holds the one leg of world 22: a course with no waves and no bunkers', () => {
  assert.equal(JOURNEY.length, 1);
  assert.equal(JOURNEY[0].length, 1);
  assert.ok(spec.course);
  assert.equal(spec.waves, undefined);
  assert.equal(spec.bunkers, false);
  assert.equal(leg, LEVELS.at(-1), 'the last level of the game');
});

test('the leg is world 22\'s level: a course with neither waves nor a boss, free flight, named Leg 1', () => {
  assert.equal(leg.world, WORLD);
  assert.equal(leg.index, 1);
  assert.equal(leg.twist, WORLDS[WORLD - 1].twist);
  assert.equal(leg.free, true);
  assert.ok(leg.course);
  assert.ok(!('waves' in leg) && !('boss' in leg));
  assert.equal(reelName(leg), 'Leg 1');
  assert.ok(parOf(leg) > 0, 'its par is computed from its data');
});

test('the leg\'s seed is an integer, distinct from every other level\'s', () => {
  assert.ok(Number.isInteger(leg.seed));
  assert.ok(LEVELS.filter((l) => l !== leg).every((l) => l.seed !== leg.seed));
});

test('the leg breaks no data rule', () => {
  assert.deepEqual(unfair(leg), []);
});

test('the leg has two lanterns, the first granting the seed, and ends on its hold', () => {
  const lanterns = kinds('checkpoint');
  assert.equal(lanterns.length, 2);
  assert.equal(lanterns[0].grants, 'seed');
  assert.equal(leg.course.spawns.at(-1).kind, 'hold');
  assert.ok(leg.course.spawns.some((e) => e.kind === 'air') && kinds('turret').length > 0 && kinds('crate').length > 0);
});

test('the leg can be cleared: a steered, unhittable flight reaches the end of its hold within its pars', () => {
  const { world, held } = flyCourse(leg);
  assert.equal(world.state, 'cleared');
  assert.ok(held, 'the scroll stopped at the hold');
  assert.ok(world.t - INTRO <= CLEAR_PARS * parOf(leg), `cleared at ${world.t.toFixed(1)} s`);
});

test('world 22 has its own difficulty, in [0, 1], and its hand-set score', () => {
  const d = difficulty(WORLD, 1);
  assert.ok(d >= 0 && d <= 1);
  assert.equal(leg.d, d);
  assert.equal(RATINGS[WORLD - 1], 7.0);
});
