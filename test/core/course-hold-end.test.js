import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitShip } from '../../src/core/ship.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { hurtGround } from '../../src/core/course-ground.js';
import { SEED_DMG } from '../../src/core/course-seed.js';
import { EPS } from '../../src/core/kinds.js';
import { RESPAWN_DELAY, RESPAWN_Y } from '../../src/core/course-check.js';
import { TICK, FIRE, step, drain, ofType, bulletOnShip } from './world-kit.js';
import { flight, checkpoint, until, FAST, HOLD_PERIOD, WAIT, gate, kite, hold, stopOf, gates, standing, alive, breakAll } from './course-kit.js';

// The end hold (world 22), seen from the level's end: the clear, and a death inside it.

const PAST = 5 * FAST * TICK; // px of scroll a level has beyond its hold
const BEYOND = 200; // px a hold lies past the screen a checkpoint saw when it was reached
const X = 700; // where the checkpoint stands
const BEAT_TICKS = Math.ceil((RESPAWN_DELAY - EPS) / TICK) + 1; // ticks that more than run a death's beat down

test('a course clears on the tick dist reaches its length with no hold standing, and not before', () => {
  const LENGTH = 300;
  const plain = flight([], { speed: FAST, length: LENGTH });
  assert.ok(until(plain, () => plain.state === 'cleared'));
  assert.ok(plain.course.dist >= LENGTH && plain.course.dist - FAST * TICK < LENGTH);
  const e = hold();
  const length = stopOf(e) + PAST;
  const world = standing([e], { length });
  step(world, WAIT);
  breakAll(world);
  assert.ok(until(world, () => world.state === 'cleared'));
  assert.ok(world.course.dist >= length && world.course.dist - FAST * TICK < length, 'the scroll went on to the length');
  assert.equal(ofType(world.events, 'cleared').length, 1);
});

test('a hold at the very end clears on the tick it breaks, and never while it stands', () => {
  const e = hold();
  const world = standing([e], { length: stopOf(e) });
  assert.ok(world.course.dist >= stopOf(e));
  step(world, WAIT);
  assert.equal(world.state, 'play');
  breakAll(world);
  drain(world);
  step(world);
  assert.equal(world.state, 'cleared');
  assert.deepEqual(drain(world).map((v) => v.type).filter((t) => t === 'holdBreak' || t === 'cleared'), ['holdBreak', 'cleared']);
});

// The ship loses its last life on the tick a seed bursts on the last gate (or, with `seed` false, with that gate standing on).
function dieInHold(seed) {
  const e = hold();
  const world = standing([e], { length: stopOf(e) });
  const [a, b] = gates(world);
  hurtGround(world, a, a.hp);
  Object.assign(world.ship, { lives: 1, invuln: 0 });
  if (seed) {
    b.hp = SEED_DMG;
    world.course.seeds.push({ x: b.x, at: b.at, t: TICK / 2 });
  }
  bulletOnShip(world);
  drain(world);
  step(world);
  return world;
}

test('the last life lost on the tick the last gate breaks still clears, with no respawn after', () => {
  const world = dieInHold(true);
  assert.equal(world.ship.alive, false);
  assert.equal(world.state, 'cleared');
  step(world, BEAT_TICKS);
  assert.deepEqual([world.state, world.ship.alive, ofType(world.events, 'respawn')], ['cleared', false, []]);
  const rebuilt = dieInHold(false);
  assert.equal(rebuilt.state, 'play', 'with a gate standing the same death is no clear');
  assert.ok(until(rebuilt, () => rebuilt.ship.alive));
  assert.equal(ofType(rebuilt.events, 'respawn').length, 1);
});

test('a death in a real hold rebuilds it whole: gates at full hp, the clock at 0, the same flights again', () => {
  const targets = [gate(500), gate(900), gate(1300)];
  const e = hold({ at: RESPAWN_Y - SPAWN_Y + BEYOND, targets, flights: [kite(0), kite(0.5, { x: 1400 })] });
  const world = flight([checkpoint(0, X), e], { speed: FAST });
  assert.ok(until(world, () => world.course.lit > 0 && world.course.held));
  const shape = () => ({
    held: { ...world.course.held }, gates: gates(world).map((g) => [g.at, g.x, g.hp, g.holdId]),
    craft: world.aliens.map((a) => [a.role, a.path, a.x0, a.pattern]),
  });
  const first = shape();
  assert.ok(first.craft.length > 0);
  const [a, b] = gates(world);
  hurtGround(world, a, a.hp);
  hurtGround(world, b, SEED_DMG);
  assert.ok(until(world, () => world.course.held.t >= HOLD_PERIOD));
  assert.ok(alive(world) > first.craft.length, 'the flights came round again');
  drain(world);
  world.ship.lives = 1;
  hitShip(world, 'test');
  assert.ok(until(world, () => world.ship.alive));
  const { course } = world;
  assert.deepEqual([course.held, course.dist, course.next], [null, course.check.dist, course.check.next]);
  assert.deepEqual([gates(world).length, world.aliens.length, ofType(world.events, 'holdBreak').length], [0, 0, 0]);
  assert.ok(until(world, () => course.held));
  assert.deepEqual(shape(), first);
});

test('a snapshot taken during a hold steps on to the same world', () => {
  const world = standing([hold({ flights: [kite(0), kite(0.5, { x: 1400 })] })]);
  step(world, 2 * WAIT);
  const copy = structuredClone(world);
  step(world, 4 * WAIT, FIRE);
  step(copy, 4 * WAIT, FIRE);
  assert.ok(alive(world) > 0);
  assert.deepEqual(copy, world);
});
