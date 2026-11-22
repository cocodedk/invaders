import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MID_X } from '../../src/core/kinds.js';
import { LIVES, INVULN, createShip, hitShip } from '../../src/core/ship.js';
import { RESPAWN_Y } from '../../src/core/course-check.js';
import { step, drain, ofType } from './world-kit.js';
import { flight, checkpoint, until, FAST } from './course-kit.js';

// Checkpoints: how one is reached and what it records. Death and the respawn are course-respawn.test.js.

const X = 700; // where a checkpoint stands

// The world stepped until its first checkpoint event, with the ground object read before every tick: it was above the line
// (and nothing had been announced) until the tick it came down to it.
function reach(world) {
  for (let i = 0; i < 3000 && ofType(world.events, 'checkpoint').length === 0; i++) {
    assert.ok(world.course.ground.every((g) => g.y < RESPAWN_Y || g.reached), 'not announced before it is at the line');
    step(world);
  }
  return world.course.ground[0];
}

test('the level starts as checkpoint 0: a record of the start, with the level\'s own abilities, nothing lit', () => {
  const { course } = flight([], { starts: ['seed'] });
  assert.equal(course.respawn, null);
  assert.equal(course.lit, 0);
  assert.deepEqual(course.check, { dist: 0, next: 0, score: 0, bombs: createShip().bombs, lives: LIVES, abilities: ['seed'], marks: 0, x: MID_X });
  assert.notEqual(course.check.abilities, course.abilities, 'the record holds a copy');
});

test('a checkpoint is reached on the tick it comes down to RESPAWN_Y: announced, its ability granted, the moment recorded', () => {
  const world = flight([checkpoint(0, X, 'seed')], { speed: FAST });
  Object.assign(world.ship, { lives: LIVES + 2, bombs: 3 });
  world.score = 1230;
  world.course.marks.push({ x: 1, at: 1, r: 1 });
  const g = reach(world);
  const { course } = world;
  assert.ok(g.y >= RESPAWN_Y, 'it is at the line');
  const events = drain(world);
  assert.deepEqual(ofType(events, 'checkpoint').map(({ index, x, grants }) => ({ index, x, grants })), [{ index: 1, x: X, grants: 'seed' }]);
  assert.deepEqual(ofType(events, 'ability').map((e) => e.kind), ['seed']);
  assert.deepEqual(course.abilities, ['seed']);
  assert.equal(course.lit, 1);
  assert.deepEqual(course.check, {
    dist: course.dist, next: 1, score: 1230, bombs: 3, lives: LIVES + 2, abilities: ['seed'], marks: 1, x: X,
  });
  course.abilities.push('later');
  assert.deepEqual(course.check.abilities, ['seed'], 'a later grant does not change the record');
  step(world, 30);
  assert.deepEqual(drain(world).filter((e) => e.type === 'checkpoint' || e.type === 'ability'), [], 'reached once');
  assert.equal(course.lit, 1);
});

test('a checkpoint with no grant, or one whose ability is already held, adds nothing and announces no ability', () => {
  for (const [starts, grants] of [[['seed'], null], [[], null], [['seed'], 'seed']]) {
    const world = flight([checkpoint(0, X, grants)], { speed: FAST, starts });
    reach(world);
    assert.deepEqual(world.course.abilities, starts);
    assert.deepEqual(ofType(drain(world), 'ability'), []);
    assert.deepEqual(world.course.check.abilities, starts);
    assert.equal(world.course.check.x, X);
  }
});

test('each checkpoint is the new record, and lit counts them (the index says which)', () => {
  const world = flight([checkpoint(0, X, 'seed'), checkpoint(2000, 1200)], { speed: FAST });
  assert.ok(until(world, () => world.course.lit === 2));
  assert.deepEqual(ofType(world.events, 'checkpoint').map((e) => e.index), [1, 2]);
  assert.equal(world.course.check.x, 1200);
  assert.equal(world.course.check.next, 2);
  assert.deepEqual(world.course.check.abilities, ['seed'], 'the second grants nothing, the first stays held');
});

test('a hit with a life left is ordinary: a life, the blinking, and play goes on where it was', () => {
  const world = flight([{ kind: 'stone', at: 0, x: 900 }, checkpoint(0, X, 'seed')], { speed: FAST });
  step(world, 3);
  const [stone] = world.course.ground;
  const { dist, next } = world.course;
  assert.equal(hitShip(world, 'test'), true);
  step(world, 3);
  const { ship, course } = world;
  assert.equal(ship.lives, LIVES - 1);
  assert.ok(ship.alive && ship.invuln > 0 && ship.invuln < INVULN);
  assert.equal(course.respawn, null);
  assert.ok(course.dist > dist, 'the scroll goes on');
  assert.equal(course.next, next);
  assert.equal(course.ground[0], stone, 'nothing is rebuilt');
  assert.equal(world.state, 'play');
  assert.deepEqual(ofType(drain(world), 'respawn'), []);
});
