import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { SPAWN_Y, GROUND_MARGIN } from '../../src/core/course.js';
import { HEIGHT } from '../../src/core/kinds.js';
import { level, wave, step, TICK, IDLE } from './world-kit.js';
import { courseLevel } from './course-kit.js';

// Test-local data: a scroll speed, and entries placed off a tick boundary (one tick scrolls SPEED * TICK px).
const SPEED = 100;
const data = (spawns) => ({ speed: SPEED, length: 6000, starts: [], walls: [], spawns });
const stone = (at, x = 700) => ({ kind: 'stone', at, x });
const turret = (at, x = 900) => ({ kind: 'turret', at, x, hp: 3 });

// A course world with its intro over and no play tick taken yet.
function fresh(spawns) {
  const world = createWorld(courseLevel(data(spawns)));
  while (world.state === 'intro') stepWorld(world, TICK, IDLE);
  return world;
}

test('the course starts at dist 0 with nothing on the ground, and a wave level has no course at all', () => {
  const world = createWorld(courseLevel(data([stone(50)])));
  assert.deepEqual(world.course, { dist: 0, next: 0, ground: [] });
  assert.equal('course' in createWorld(level([wave()])), false);
});

test('dist stands still through the intro and grows by speed * TICK on every play tick', () => {
  const world = createWorld(courseLevel(data([stone(50)])));
  while (world.state === 'intro') {
    assert.equal(world.course.dist, 0);
    stepWorld(world, TICK, IDLE);
  }
  assert.equal(world.course.dist, 0, 'the tick that ends the intro is still an intro tick');
  for (let i = 0; i < 5; i++) {
    const before = world.course.dist;
    step(world);
    assert.ok(Math.abs(world.course.dist - before - SPEED * TICK) < 1e-9);
  }
});

test('an entry spawns on the first tick dist reaches its at, at y = SPAWN_Y + dist - at', () => {
  const at = 200.5;
  const world = fresh([stone(at, 640)]);
  while (world.course.ground.length === 0) {
    assert.ok(world.course.dist < at, 'nothing has spawned before its at');
    step(world);
  }
  const { dist, ground } = world.course;
  assert.ok(dist >= at && dist - SPEED * TICK < at, 'on the first tick dist >= at');
  assert.equal(world.course.next, 1);
  assert.equal(ground.length, 1);
  const g = ground[0];
  assert.deepEqual({ kind: g.kind, at: g.at, x: g.x, hp: g.hp }, { kind: 'stone', at, x: 640, hp: null });
  assert.equal(g.y, SPAWN_Y + dist - at);
  assert.ok(g.y >= SPAWN_Y && g.y < SPAWN_Y + SPEED * TICK, 'it enters just above the top edge');
  step(world, 3);
  assert.equal(world.course.ground[0].y, SPAWN_Y + world.course.dist - at, 'and drifts down with the scroll');
});

test('two entries that come up on one tick both spawn, in array order, with their own ids; hp is kept', () => {
  const world = fresh([stone(150.2), turret(150.4)]);
  while (world.course.ground.length === 0) step(world);
  const [a, b] = world.course.ground;
  assert.deepEqual([a.kind, b.kind], ['stone', 'turret']);
  assert.equal(b.hp, 3);
  assert.notEqual(a.id, b.id);
  assert.equal(world.course.next, 2);
});

test('an object that sinks past HEIGHT + GROUND_MARGIN is dropped on the first tick it is past it', () => {
  const at = 50.5;
  const world = fresh([stone(at)]);
  while (world.course.ground.length === 0) step(world);
  let y = world.course.ground[0].y;
  while (world.course.ground.length > 0) {
    assert.ok(y <= HEIGHT + GROUND_MARGIN, 'still on the course while within the margin');
    step(world);
    y = SPAWN_Y + world.course.dist - at;
  }
  assert.ok(y > HEIGHT + GROUND_MARGIN, 'gone only once past it');
  assert.equal(world.course.next, 1, 'and it does not come back');
  step(world, 10);
  assert.equal(world.course.ground.length, 0);
});

test('stepping a snapshot from the same inputs gives the same course state', () => {
  const world = fresh([stone(150.5), turret(300.5), stone(450.5, 1200)]);
  step(world, 120);
  const copy = structuredClone(world);
  step(world, 200);
  step(copy, 200);
  assert.deepEqual(copy.course, world.course);
  assert.ok(world.course.next > 1);
});
