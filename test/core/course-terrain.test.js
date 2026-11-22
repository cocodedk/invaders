import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { WIDTH, HEIGHT } from '../../src/core/kinds.js';
import { SHIP_R, INVULN, LIVES } from '../../src/core/ship.js';
import { SPAWN_Y, GROUND_MARGIN } from '../../src/core/course-kinds.js';
import { bandAt } from '../../src/core/course-terrain.js';
import { TICK, IDLE, at, step, drain, ofType } from './world-kit.js';
import { flight, courseLevel } from './course-kit.js';

// Test-local data: the scroll's speed, and how far it has gone when a test starts. rowAt(y) is the `at` of screen row
// y on the tick after that (walls and pillars are placed by screen row, the way the ship is).
const SPEED = 100;
const DIST = 2000;
const rowAt = (y) => DIST + SPEED * TICK + SPAWN_Y - y;
const pillar = (y, o = {}) => ({ kind: 'pillar', at: rowAt(y), x: 900, w: 100, h: 200, ...o });
const CORRIDOR = [[0, 300, 1600]]; // one keyframe: the same band all the way
// A gorge between rows 700 and 500 that pinches to [800, 1100] at row 600, open to the full width round it.
const GORGE = [[rowAt(1100), 0, WIDTH], [rowAt(700), 0, WIDTH], [rowAt(600), 800, 1100], [rowAt(500), 0, WIDTH], [rowAt(100), 0, WIDTH]];

// A quiet course world over `walls` and `spawns`, past its intro, the scroll at DIST.
function terrain(walls, spawns = []) {
  const world = flight(spawns, { walls, speed: SPEED });
  world.course.dist = DIST;
  return world;
}

test('bandAt: linear between the keyframes, flat before the first and after the last, wide open with no walls', () => {
  const walls = [[100, 200, 1700], [300, 600, 1500], [500, 600, 1200]];
  assert.deepEqual(bandAt({ walls }, 200), { left: 400, right: 1600 }, 'halfway along the first stretch');
  assert.deepEqual(bandAt({ walls }, 400), { left: 600, right: 1350 }, 'and the second');
  assert.deepEqual(bandAt({ walls }, 300), { left: 600, right: 1500 }, 'on a keyframe');
  assert.deepEqual(bandAt({ walls }, -900), { left: 200, right: 1700 }, 'before the first it holds the first');
  assert.deepEqual(bandAt({ walls }, 9000), { left: 600, right: 1200 }, 'after the last it holds the last');
  const open = { left: 0, right: WIDTH };
  assert.deepEqual(bandAt({ walls: [] }, 50), open);
  assert.deepEqual(bandAt({}, 50), open, 'a course that lists no walls has none');
  const step2 = bandAt({ walls: [[100, 0, WIDTH], [100, 500, 900], [200, 500, 900]] }, 100);
  assert.ok(Number.isFinite(step2.left) && Number.isFinite(step2.right), 'two keyframes at one at make a sheer edge, not a NaN');
});

test('a ship inside the band is untouched, wherever it moves in it', () => {
  const world = terrain(CORRIDOR);
  for (const [x, y] of [[400, 700], [1500, 200], [900, 1000]]) step(world, 3, at(x, y));
  assert.equal(world.hits, 0);
  assert.equal(world.ship.lives, LIVES);
});

test('the ship touches the rock by its radius: SHIP_R from either edge is clear, a pixel nearer is a hit', () => {
  const [, left, right] = CORRIDOR[0];
  const cases = [[left + SHIP_R, 0], [left + SHIP_R - 1, 1], [right - SHIP_R, 0], [right - SHIP_R + 1, 1]];
  for (const [x, hits] of cases) {
    const world = terrain(CORRIDOR);
    step(world, 2, at(x, 700));
    assert.equal(world.hits, hits, `ship centre at x = ${x}`);
  }
});

test('a ship that leaves the band loses a life, and the hit says it was a wall', () => {
  const world = terrain(CORRIDOR);
  step(world, 1, at(100, 700));
  assert.equal(world.ship.lives, LIVES - 1);
  assert.equal(world.ship.invuln, INVULN);
  assert.equal(ofType(drain(world), 'shipHit')[0].source, 'wall');
});

test('one move that crosses a pinch in the walls is a hit, though both its ends are inside the band', () => {
  const world = terrain(GORGE);
  step(world, 1, at(300, 1000));
  assert.equal(world.hits, 0, 'the start is in the open');
  step(world, 1, at(300, 200));
  assert.ok(bandAt(world.level.course, rowAt(200)).left <= 300 - SHIP_R, 'and so is the end');
  assert.equal(world.hits, 1, 'the straight path went through the rock at row 600');
  assert.equal(ofType(drain(world), 'shipHit')[0].source, 'wall');
});

test('a pillar crossed in one move is a hit; the same move beside it is not', () => {
  const crossing = terrain([], [pillar(500)]);
  step(crossing, 1, at(960, 1000));
  const [p] = crossing.course.ground;
  assert.deepEqual({ w: p.w, h: p.h }, { w: 100, h: 200 }, 'the pillar carries its size');
  step(crossing, 1, at(900, 200));
  assert.equal(crossing.hits, 1);
  assert.equal(ofType(drain(crossing), 'shipHit')[0].source, 'pillar');
  const beside = terrain([], [pillar(500)]);
  step(beside, 1, at(960, 1000));
  step(beside, 1, at(500, 200));
  assert.equal(beside.hits, 0);
});

test("a pillar's box is centred on its x and y, so a ship at rest in its upper left corner is hit", () => {
  const world = terrain([], [pillar(500)]);
  step(world, 1, at(500, 300));
  const [p] = world.course.ground;
  assert.equal(world.hits, 0);
  step(world, 1, at(p.x - p.w / 2 + 10, p.y - p.h / 2 + 10));
  assert.equal(world.hits, 1);
});

test('only a pillar has a size: a stone has none', () => {
  const world = terrain([], [{ kind: 'stone', at: rowAt(500), x: 900 }]);
  step(world);
  assert.equal('w' in world.course.ground[0] || 'h' in world.course.ground[0], false);
});

test('a course whose data lists no walls has none to hit', () => {
  const world = createWorld(courseLevel({ speed: SPEED, length: 6000, starts: [], spawns: [] }));
  while (world.state === 'intro') stepWorld(world, TICK, IDLE);
  step(world, 3, at(40, 700));
  assert.equal(world.hits, 0);
});

test('a shield lets the ship skim the rock, and the first tick it runs out inside is a hit', () => {
  const world = terrain(CORRIDOR);
  world.ship.power = { kind: 'shield', left: Infinity };
  step(world, 30, at(100, 700));
  assert.equal(world.hits, 0);
  assert.equal(ofType(drain(world), 'shipHit').length, 0);
  world.ship.power = null;
  step(world, 1, at(100, 700));
  assert.equal(world.hits, 1);
});

test('blinking ends inside the rock: no hit while it lasts, a hit on the first tick it is over (a pointer left in a wall)', () => {
  const world = terrain(CORRIDOR);
  step(world, 1, at(100, 700));
  assert.equal(world.hits, 1);
  let ticks = 0;
  while (world.hits === 1) {
    const blinking = world.ship.invuln - TICK > 0; // what stepShip leaves of it this tick
    step(world, 1, at(100, 700));
    assert.equal(world.hits, blinking ? 1 : 2, blinking ? 'protected while it blinks' : 'hit as it ends');
    assert.ok(++ticks < 10 * INVULN / TICK, 'the blinking ends');
  }
  assert.ok(ticks > INVULN / TICK / 2, 'it did blink for a while');
  assert.equal(world.ship.lives, LIVES - 2);
  assert.ok(world.ship.alive);
});

test('a tall pillar stays until its top edge has sunk past the margin below the screen, not its centre', () => {
  const h = 1200;
  const world = terrain([], [pillar(HEIGHT + GROUND_MARGIN + 100, { h, x: 200 })]); // far from the ship, which it would ram
  step(world);
  const [p] = world.course.ground;
  assert.ok(p.y > HEIGHT + GROUND_MARGIN, 'its centre is past the line a stone is dropped at');
  const line = HEIGHT + GROUND_MARGIN;
  let top = p.y - h / 2;
  for (let i = 0; world.course.ground.length && i < 2000; i++) {
    top = p.y - h / 2;
    assert.ok(top <= line, 'it is on the list only while its top is within the margin');
    step(world);
  }
  assert.equal(world.course.ground.length, 0, 'and it is dropped after');
  assert.ok(top + SPEED * TICK > line, 'on the first tick its top was past the line');
});
