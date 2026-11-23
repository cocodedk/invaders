import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitShip } from '../../src/core/ship.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { hurtGround } from '../../src/core/course-ground.js';
import { SEED_DMG } from '../../src/core/course-seed.js';
import { WIDTH } from '../../src/core/kinds.js';
import { RESPAWN_Y } from '../../src/core/course-check.js';
import { TICK, FIRE, step, drain, ofType, bulletOnShip } from './world-kit.js';
import { flight, checkpoint, until, FAST, HOLD_PERIOD, WAIT, gate, kite, hold, stopOf, legLength, gates, standing, legStanding, alive, breakAll } from './course-kit.js';

// The end hold (world 22), seen from the level's end: the clear, and a death inside it.

const BEYOND = 200; // px a hold lies past the screen a checkpoint saw when it was reached
const X = 700; // where the checkpoint stands

test('a course clears on the tick dist reaches its length with no hold standing, and not before', () => {
  const LENGTH = 300;
  const plain = flight([], { speed: FAST, length: LENGTH });
  assert.ok(until(plain, () => plain.state === 'cleared'));
  assert.ok(plain.course.dist >= LENGTH && plain.course.dist - FAST * TICK < LENGTH);
});

test('a leg clears END_RUN px of scroll after its hold breaks, and never while it stands', () => {
  const e = hold();
  const length = legLength(e);
  const world = legStanding([e]);
  step(world, WAIT);
  assert.equal(world.state, 'play');
  breakAll(world);
  step(world);
  assert.equal(world.state, 'play', 'the break is no clear: the scroll runs on');
  assert.ok(until(world, () => world.state === 'cleared'));
  assert.ok(world.course.dist >= length && world.course.dist - FAST * TICK < length, 'the scroll went on to the length');
  assert.equal(ofType(world.events, 'cleared').length, 1);
});

test('a length that is the hold\'s stop itself (no leg\'s data has one) clears on the tick the hold breaks, and never while it stands', () => {
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

// A leg's hold is its last entry (legStanding: the length is the stop plus END_RUN). Once that hold has broken the leg clears at its length, so
// a death after the break (R23: the clear wins) neither starts a beat nor keeps one: nothing rewinds, the scroll runs on with the ship down.
const lastLife = (world) => Object.assign(world.ship, { lives: 1, invuln: 0 });
const IN_BEAT = 3; // ticks into a beat, and ticks the scroll runs on, before a test does its next thing

// The leg from here on, the ship down: no beat, the scroll never stands still or goes back, and the leg clears at its length, once, with the ship still down.
function clearsDown(world) {
  const { length } = world.level.course;
  assert.equal(world.ship.alive, false);
  assert.equal(world.course.respawn, null, 'no beat');
  let last = world.course.dist;
  for (let i = 0; i < 3000 && world.state === 'play'; i++) {
    step(world);
    assert.ok(world.course.dist > last, 'the scroll runs on');
    last = world.course.dist;
  }
  assert.equal(world.state, 'cleared');
  assert.ok(last >= length && last - FAST * TICK < length, 'at the length');
  assert.deepEqual([ofType(world.events, 'respawn').length, ofType(world.events, 'cleared').length, world.ship.alive], [0, 1, false]);
}

// The ship loses its last life on the tick a seed bursts on the last gate (or, with `seed` false, with that gate standing on).
function dieInHold(seed) {
  const e = hold();
  const world = legStanding([e]);
  const [a, b] = gates(world);
  hurtGround(world, a, a.hp);
  lastLife(world);
  if (seed) {
    b.hp = SEED_DMG;
    world.course.seeds.push({ x: b.x, at: b.at, t: TICK / 2 });
  }
  bulletOnShip(world);
  drain(world);
  step(world);
  return world;
}

test('the last life lost on the tick the last gate breaks: no beat, the scroll runs on and the leg clears at its length', () => {
  const world = dieInHold(true);
  assert.deepEqual([world.ship.alive, world.state, ofType(world.events, 'holdBreak').length], [false, 'play', 1]);
  clearsDown(world);
});

test('the same death with a gate standing is no clear: the beat runs and the leg rebuilds from its checkpoint', () => {
  const world = dieInHold(false);
  assert.deepEqual([world.ship.alive, world.state, world.course.respawn !== null], [false, 'play', true]);
  assert.ok(until(world, () => world.ship.alive));
  assert.deepEqual([ofType(world.events, 'respawn').length, world.course.dist, world.course.held], [1, world.course.check.dist, null]);
});

test('the last gate breaking while the beat runs (a seed in the air) ends it: nothing rewinds and the leg clears', () => {
  const world = dieInHold(false);
  step(world, IN_BEAT);
  assert.notEqual(world.course.respawn, null, 'the beat runs');
  assert.ok(world.course.held, 'the scroll stands');
  const [b] = gates(world);
  hurtGround(world, b, b.hp);
  step(world);
  assert.equal(ofType(world.events, 'holdBreak').length, 1);
  clearsDown(world);
});

// [how the ship loses its last life in the run-out, what is done to the world for it]
const RUN_OUT_DEATHS = [
  ['a bullet', bulletOnShip],
  ['the rock closing in', (world) => { // across the ship's row, a few ticks of scroll ahead
    const row = world.course.dist + SPAWN_Y - world.ship.y + IN_BEAT * FAST * TICK;
    world.level.course.walls = [[row, 0, WIDTH], [row + 1, world.ship.x + 1, WIDTH]];
  }],
];
for (const [how, kill] of RUN_OUT_DEATHS) {
  test(`the last life lost in the run-out to ${how} rewinds nothing: the leg clears at its length`, () => {
    const world = legStanding([hold()]);
    breakAll(world);
    step(world, IN_BEAT);
    assert.ok(world.course.dist > stopOf(world.level.course.spawns[0]), 'the scroll runs on');
    lastLife(world);
    kill(world);
    assert.ok(until(world, () => !world.ship.alive, IN_BEAT * 3));
    assert.ok(world.course.dist < world.level.course.length, 'it died in the run-out');
    clearsDown(world);
  });
}

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
