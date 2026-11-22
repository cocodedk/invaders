import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTRO } from '../../src/core/kinds.js';
import { parOf } from '../../src/core/pars.js';
import { flyCourse, CLEAR_PARS } from './course-clear-kit.js';
import { courseLevel, FAIR_COURSE } from './course-kit.js';
import { unfair } from './course-fair-kit.js';

// A course can be cleared (world 22): the steered, invulnerable flight of course-clear-kit.js on the fair course, and on a
// course with a gate the weapon cannot reach, which it does not clear. A leg's own data (Task 8) runs the same flight.

const level = courseLevel(FAIR_COURSE);

test('the fair course clears within its pars, its hold standing until the seeds break it', () => {
  const { world, types, held } = flyCourse(level);
  assert.equal(world.state, 'cleared');
  assert.ok(world.t - INTRO <= CLEAR_PARS * parOf(level), `cleared at ${world.t.toFixed(1)} s`);
  assert.ok(held, 'the scroll stopped at the hold');
  for (const type of ['checkpoint', 'ability', 'seedBurst', 'groundKill', 'holdBreak', 'cleared']) assert.ok(types.has(type), type);
  assert.ok(world.course.ground.every((g) => g.kind !== 'gate' || g.hp === 0), 'every gate is broken');
});

test('a gate no seed can reach stalls the scroll: the flight does not clear', () => {
  const data = structuredClone(FAIR_COURSE);
  data.spawns.at(-1).targets[0].x = 100; // in the wall: the pilot does not go for it, and a seed from the band is too far
  assert.deepEqual(unfair(courseLevel(data)).map((v) => v.split(':')[0]), ['reach']);
  const { world } = flyCourse(courseLevel(data));
  assert.equal(world.state, 'play');
  assert.notEqual(world.course.held, null, 'the hold stands on');
});
