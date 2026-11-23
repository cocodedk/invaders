import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK, EPS } from '../../src/core/kinds.js';
import { LINE_STEP, LINE_INK, LINE_SEGS, LINE_LIFE, drawLine } from '../../src/core/course-line.js';
import { stateHash } from '../../src/core/state-hash.js';
import { hitShip } from '../../src/core/ship.js';
import { RESPAWN_DELAY } from '../../src/core/course-check.js';
import { stepWorld } from '../../src/core/world.js';
import { step, at } from './world-kit.js';
import { Y, lineWorld, put, hline } from './course-line-kit.js';

// Your line (world 22, Leg 2): the ship's path hangs in the air as segments of LINE_STEP px, at most LINE_SEGS of them, each
// gone after LINE_LIFE s (course-line.js). What it does to a bullet is course-line-stop.test.js.
const len = (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
const gap = (world) => Math.hypot(world.ship.x - world.course.pen.x, world.ship.y - world.course.pen.y);

test('without the ability the ship draws nothing', () => {
  const world = lineWorld([]);
  put(world, 400);
  drawLine(world, TICK);
  put(world, 900);
  drawLine(world, TICK);
  assert.deepEqual([world.course.line.length, world.course.pen], [0, null]);
});

test('a move of 100 px in one tick draws as many whole segments as it holds, each LINE_STEP long, and the pen stays under a step behind', () => {
  const world = lineWorld();
  put(world, 400);
  drawLine(world, TICK);
  assert.deepEqual([world.course.line.length, world.course.pen], [0, { x: 400, y: Y }], 'the pen starts where the ship is');
  put(world, 500);
  drawLine(world, TICK);
  const { line } = world.course;
  assert.equal(line.length, Math.floor(100 / LINE_STEP));
  for (const s of line) assert.ok(Math.abs(len(s) - LINE_STEP) < 1e-9);
  assert.deepEqual([line[0].x1, line[0].y1], [400, Y], 'it starts at the pen');
  line.slice(1).forEach((s, i) => assert.deepEqual([s.x1, s.y1], [line[i].x2, line[i].y2], 'each starts where the one before ended'));
  assert.ok(gap(world) < LINE_STEP);
  assert.ok(line.every((s) => s.t === 0), 'new ink is not aged by the tick it is drawn in');
});

test('a diagonal move draws along its own direction', () => {
  const world = lineWorld();
  put(world, 400, 400);
  drawLine(world, TICK);
  put(world, 700, 800);
  drawLine(world, TICK);
  const { line, pen } = world.course;
  assert.equal(line.length, Math.floor(500 / LINE_STEP));
  assert.ok(Math.abs((pen.y - 400) / (pen.x - 400) - 400 / 300) < 1e-9);
  assert.ok(gap(world) < LINE_STEP);
});

test('a flick of 2000 px leaves exactly LINE_SEGS segments, the last ending within a step of the ship', () => {
  const world = lineWorld();
  put(world, 0);
  drawLine(world, TICK);
  put(world, 2000);
  drawLine(world, TICK);
  const { line, pen } = world.course;
  assert.equal(line.length, LINE_SEGS);
  assert.ok(LINE_SEGS * LINE_STEP <= LINE_INK && (LINE_SEGS + 1) * LINE_STEP > LINE_INK);
  assert.deepEqual([line.at(-1).x2, line.at(-1).y2], [pen.x, pen.y]);
  assert.ok(gap(world) < LINE_STEP);
  assert.equal(line[0].x1, pen.x - LINE_SEGS * LINE_STEP, 'the newest ink stays, the oldest is rubbed out');
});

test('more ink than the budget rubs out the oldest of what was there before', () => {
  const world = lineWorld();
  hline(world, 100, LINE_SEGS);
  const first = world.course.line[0];
  hline(world, world.ship.x, 3);
  assert.equal(world.course.line.length, LINE_SEGS);
  assert.ok(!world.course.line.includes(first));
});

test('a segment is gone once it is LINE_LIFE old, not a tick before', () => {
  const world = lineWorld();
  hline(world, 300, 2);
  const ticks = Math.ceil((LINE_LIFE - EPS) / TICK);
  for (let i = 1; i < ticks; i++) {
    drawLine(world, TICK);
    assert.equal(world.course.line.length, 2, `tick ${i}`);
  }
  drawLine(world, TICK);
  assert.equal(world.course.line.length, 0);
});

test('a dead ship draws nothing and drops the pen, and the ink it left fades as ever', () => {
  const world = lineWorld();
  hline(world, 300, 3);
  world.ship.alive = false;
  put(world, 900);
  drawLine(world, TICK);
  assert.deepEqual([world.course.line.length, world.course.pen], [3, null]);
  drawLine(world, LINE_LIFE);
  assert.equal(world.course.line.length, 0);
});

test('a respawn clears the line, and the jump after it draws nothing: the pen starts where the ship lands', () => {
  const world = lineWorld();
  hline(world, 300, 5);
  Object.assign(world.ship, { lives: 1, invuln: 0 });
  assert.ok(hitShip(world, 'test'));
  for (let i = 0; i < Math.ceil(RESPAWN_DELAY / TICK) + 5 && !(world.ship.alive && world.course.respawn === null); i++) step(world);
  assert.ok(world.ship.alive, 'the leg was rebuilt');
  assert.deepEqual([world.course.line.length, world.course.pen], [0, null]);
  const x = world.ship.x;
  step(world, 1, at(x + 800, world.ship.y));
  assert.ok(Math.abs(world.ship.x - x) >= 800 - EPS, 'the ship jumped');
  assert.equal(world.course.line.length, 0);
  assert.deepEqual(world.course.pen, { x: world.ship.x, y: world.ship.y });
});

test('moving the ship through stepWorld draws, a pointer jump included', () => {
  const world = lineWorld();
  step(world, 1, at(300, Y));
  step(world, 1, at(300 + 5 * LINE_STEP, Y));
  assert.equal(world.course.line.length, 5);
});

test('the hash tells the line apart, and a snapshot of a world holding one steps on exactly as the original', () => {
  const world = lineWorld();
  hline(world, 300, 6);
  const base = stateHash(world);
  const edited = (edit) => {
    const copy = structuredClone(world);
    edit(copy.course);
    return stateHash(copy);
  };
  assert.equal(edited(() => {}), base, 'a copy hashes alike');
  for (const key of ['x1', 'y1', 'x2', 'y2', 't']) assert.notEqual(edited((c) => { c.line[2][key] += 1; }), base, key);
  assert.notEqual(edited((c) => { c.line.pop(); }), base, 'how many segments');
  assert.notEqual(edited((c) => { c.pen.x += 1; }), base, 'the pen');
  const copy = structuredClone(world);
  for (let i = 0; i < 60; i++) {
    const input = at(300 + ((i * 53) % 900), Y - ((i * 7) % 300));
    stepWorld(world, TICK, input);
    stepWorld(copy, TICK, input);
    assert.equal(stateHash(copy), stateHash(world), `tick ${i}`);
  }
  assert.deepEqual(copy, world);
});
