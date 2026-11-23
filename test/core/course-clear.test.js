import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTRO, TICK } from '../../src/core/kinds.js';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { parOf } from '../../src/core/pars.js';
import { END_RUN } from '../../src/core/course-kinds.js';
import { flyCourse, steer, CLEAR_PARS } from './course-clear-kit.js';
import { courseLevel, FAIR_COURSE } from './course-kit.js';
import { unfair } from './course-fair-kit.js';

// A course can be cleared (world 22): the steered, invulnerable flight of course-clear-kit.js on the fair course, and on a
// course with a gate the weapon cannot reach, which it does not clear. A leg's own data (Task 8) runs the same flight.

const level = courseLevel(FAIR_COURSE);

test('the fair course clears within its pars, its hold standing until its gates are broken', () => {
  const { world, types, held } = flyCourse(level);
  assert.equal(world.state, 'cleared');
  assert.ok(world.t - INTRO <= CLEAR_PARS * parOf(level), `cleared at ${world.t.toFixed(1)} s`);
  assert.ok(held, 'the scroll stopped at the hold');
  for (const type of ['checkpoint', 'ability', 'seedBurst', 'groundKill', 'holdBreak', 'cleared']) assert.ok(types.has(type), type);
  assert.ok(world.course.ground.every((g) => g.kind !== 'gate' || g.hp === 0), 'every gate is broken');
});

test('a gate that neither a seed nor a shot can reach stalls the scroll: the flight does not clear', () => {
  const data = structuredClone(FAIR_COURSE);
  data.spawns.at(-1).targets[0].x = 100; // in the wall: the pilot does not go for it, and a seed or a shot from the band is too far
  assert.deepEqual(unfair(courseLevel(data)).map((v) => v.split(':')[0]), ['reach']);
  const { world } = flyCourse(courseLevel(data));
  assert.equal(world.state, 'play');
  assert.notEqual(world.course.held, null, 'the hold stands on');
});

test('once the gates have fallen the scroll goes on END_RUN px into the blank land, and the leg clears there, not as the hold breaks', () => {
  const world = createWorld(level);
  let broke = null; // the scroll's place on the tick the hold broke
  for (let i = 0; i < (CLEAR_PARS * parOf(level)) / TICK && world.state !== 'cleared'; i++) {
    world.ship.invuln = Infinity;
    stepWorld(world, TICK, steer(world));
    if (broke === null && world.events.some((e) => e.type === 'holdBreak')) broke = world.course.dist;
    world.events.length = 0;
  }
  const tick = level.course.speed * TICK; // a tick of scroll: where the scroll stops and clears is within one of the line
  assert.equal(world.state, 'cleared');
  assert.notEqual(broke, null, 'the hold broke');
  assert.equal(world.course.held, null, 'no hold stands at the clear');
  assert.ok(Math.abs(world.course.dist - broke - END_RUN) <= 2 * tick, `the scroll went on ${world.course.dist - broke} px, END_RUN is ${END_RUN}`);
});
