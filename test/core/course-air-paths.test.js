import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathPos, DIVE_LOCK, DIVE_REACH, DIVE_VX, CROSS_VX, CROSS_VY } from '../../src/core/course-air.js';
import { SPAWN_Y, CROSS_Y } from '../../src/core/course-kinds.js';
import { MID_X, WIDTH } from '../../src/core/kinds.js';
import { TICK, step } from './world-kit.js';
import { air, launched, col, OFF_LEFT, OFF_RIGHT, onScreen } from './course-kit.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('a swoop and a crossing head for the far side from where they start, and fall as they go', () => {
  for (const [path, y0] of [['swoop', SPAWN_Y], ['cross', CROSS_Y]]) {
    const fromLeft = pathPos(path, 1, col(0.25));
    const fromRight = pathPos(path, 1, col(0.75));
    assert.ok(fromLeft.x > col(0.25) && fromRight.x < col(0.75), path + ' bends toward the far side');
    assert.ok(fromLeft.y > y0 && fromRight.y > y0, path + ' falls');
    assert.deepEqual(pathPos(path, 0, col(0.4)), { x: col(0.4), y: y0 }, path + ' starts where it spawns');
  }
});

test('a dive falls straight until DIVE_LOCK, then keeps a steady heading toward the x it locked on', () => {
  const far = MID_X + 2 * DIVE_VX * DIVE_REACH; // more than the sideways pace can cover in DIVE_REACH
  const before = pathPos('dive', DIVE_LOCK / 2, MID_X, far);
  assert.equal(before.x, MID_X, 'before the lock it falls straight');
  assert.equal(pathPos('dive', DIVE_LOCK, MID_X, far).x, MID_X, 'and the lock is where it turns');
  const later = pathPos('dive', DIVE_LOCK + 1, MID_X, far);
  const further = pathPos('dive', DIVE_LOCK + 2, MID_X, far);
  assert.ok(later.x > MID_X && further.x > later.x, 'toward the locked x');
  assert.ok(pathPos('dive', DIVE_LOCK + 1, MID_X, 2 * MID_X - far).x < MID_X, 'to either side');
  assert.ok(near(further.x - later.x, later.x - MID_X), 'at a steady pace');
  assert.ok(later.y > before.y, 'falling all the while');
});

test('a dive reaches a locked x within its sideways pace exactly DIVE_REACH after the lock, and caps its pace beyond it', () => {
  const closeBy = MID_X + (DIVE_VX * DIVE_REACH) / 2;
  assert.ok(near(pathPos('dive', DIVE_LOCK + DIVE_REACH, MID_X, closeBy).x, closeBy), 'it is on the locked x');
  assert.ok(near(pathPos('dive', DIVE_LOCK + 2 * DIVE_REACH, MID_X, closeBy).x, MID_X + 2 * (closeBy - MID_X)), 'and keeps going past it');
  const leftBy = MID_X - (DIVE_VX * DIVE_REACH) / 2;
  assert.ok(near(pathPos('dive', DIVE_LOCK + DIVE_REACH, MID_X, leftBy).x, leftBy), 'on either side');
  const farOff = MID_X + 2 * DIVE_VX * DIVE_REACH;
  assert.ok(near(pathPos('dive', DIVE_LOCK + DIVE_REACH, MID_X, farOff).x, MID_X + DIVE_VX * DIVE_REACH), 'a farther x is only approached at DIVE_VX');
});

test('a dive locks on the ship x at DIVE_LOCK and then ignores the ship', () => {
  const world = launched([air({ path: 'dive', x: MID_X })]);
  const a = world.aliens[0];
  world.ship.x = col(0.15);
  while (a.t + TICK < DIVE_LOCK) step(world);
  assert.equal(a.aim, null, 'not yet locked');
  assert.equal(a.x, a.x0, 'and falling straight');
  step(world);
  assert.ok(a.t >= DIVE_LOCK && a.aim === col(0.15), 'locked on the x the ship stood at');
  world.ship.x = col(0.9);
  step(world, 5);
  assert.equal(a.aim, col(0.15), 'the ship moving on changes nothing');
  assert.ok(a.x < a.x0, 'it keeps its heading, toward where the ship was');
});

test('a crossing enters from the side its x lies beyond, at CROSS_Y, and drifts down as it crosses', () => {
  for (const [x, dir] of [[OFF_LEFT, 1], [OFF_RIGHT, -1]]) {
    const world = launched([air({ path: 'cross', x })]);
    const a = world.aliens[0];
    assert.deepEqual([a.x, a.y], [x, CROSS_Y], 'it spawns beyond the edge, at its own height');
    while (!onScreen(a)) step(world);
    const edge = dir > 0 ? 0 : WIDTH;
    assert.ok(Math.abs(a.x - edge) <= CROSS_VX * TICK, 'its first visible tick is at the edge it came from');
    assert.ok(a.y >= CROSS_Y && near(a.y, CROSS_Y + CROSS_VY * a.t), 'at CROSS_Y plus a slight drift, not up by the top edge');
    const x1 = a.x;
    step(world);
    assert.ok(Math.sign(a.x - x1) === dir, 'and it moves on across');
  }
});
