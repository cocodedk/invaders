import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EPS, MID_X } from '../../src/core/kinds.js';
import { LIVES, INVULN, hitShip } from '../../src/core/ship.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { hurtGround } from '../../src/core/course-ground.js';
import { RESPAWN_DELAY, RESPAWN_Y } from '../../src/core/course-check.js';
import { stateHash } from '../../src/core/state-hash.js';
import { TICK, FIRE, input, step, drain, ofType, bulletAt, shotAt, pickupAt } from './world-kit.js';
import { air, flight, checkpoint, until, FAST } from './course-kit.js';

// Death and the respawn: the last life lost sends the leg back to its checkpoint after RESPAWN_DELAY.

const X = 700; // where the checkpoint stands
const LATER = RESPAWN_Y - SPAWN_Y + 220; // an entry's `at` past the checkpoint at 0, beyond the screen it saw when it was reached
const DELAY_TICKS = Math.ceil((RESPAWN_DELAY - EPS) / TICK); // ticks the beat runs, the tick of the death not counted
const turret = (at) => ({ kind: 'turret', at, x: 900, hp: 3 });
const ground = (world, kind) => world.course.ground.find((g) => g.kind === kind);
const kill = (world) => {
  world.ship.lives = 1;
  return hitShip(world, 'test');
};

// The leg: a checkpoint at 0 that grants the ground weapon, then a turret and an air craft. The run has reached the
// checkpoint, the turret and the air craft stand in play, and the ship carries what a run would have gathered since.
function leg(lives = LIVES + 2) {
  const world = flight([checkpoint(0, X, 'seed'), turret(LATER), air({ at: LATER })], { speed: FAST });
  Object.assign(world.ship, { lives, bombs: 2 });
  world.score = 1000;
  assert.ok(until(world, () => world.course.lit === 1));
  assert.ok(until(world, () => world.aliens.length > 0 && ground(world, 'turret')));
  return world;
}

// What the run earns and holds after the checkpoint, all of it lost on a death.
function gather(world) {
  const { ship, course } = world;
  hurtGround(world, ground(world, 'turret'), 1);
  world.score += 500;
  world.combo.mult = 4;
  world.combo.timer = 1;
  Object.assign(ship, { bombs: 0, power: { kind: 'rapid', left: 5 }, reserve: { kind: 'shield', left: 5 }, broadside: 3, x: 300, y: 700 });
  course.marks.push({ x: 1, at: 1, r: 1 });
  course.seeds.push({ x: 1, at: 1, t: 1 });
  bulletAt(world, 100, 100);
  shotAt(world, world.aliens[0]);
  pickupAt(world, 'bomb', 200, 200);
}

test('the last life lost starts the beat, and the leg rebuilds from the checkpoint when it is up', () => {
  const world = leg();
  const { ship, course } = world;
  const record = structuredClone(course.check);
  gather(world);
  assert.equal(kill(world), true);
  assert.equal(ship.alive, false);
  drain(world);
  step(world);
  assert.equal(course.respawn, RESPAWN_DELAY, 'the beat starts the tick the ship is down');
  const { dist } = course;
  for (let i = 1; i < DELAY_TICKS; i++) {
    step(world);
    assert.equal(course.dist, dist, 'the scroll stands still through the beat');
    assert.equal(ship.alive, false);
  }
  assert.equal(ofType(world.events, 'respawn').length, 0);
  step(world);
  assert.equal(world.state, 'play', 'a course never fails');
  assert.deepEqual(ofType(drain(world), 'respawn').map(({ x, y }) => ({ x, y })), [{ x: X, y: RESPAWN_Y }]);
  assert.equal(course.respawn, null);
  assert.deepEqual([course.dist, course.next, world.score, course.marks.length], [record.dist, record.next, record.score, record.marks]);
  assert.deepEqual(course.abilities, record.abilities);
  assert.notEqual(course.abilities, course.check.abilities, 'a copy: a later grant cannot change the record');
  assert.deepEqual(course.check, record, 'the record is kept');
  assert.equal(course.lit, 1, 'the last checkpoint stays lit');
  for (const list of [world.aliens, world.bullets, world.shots, world.pickups, course.ground, course.seeds]) assert.equal(list.length, 0);
  assert.deepEqual(world.combo, { mult: 1, timer: 0 });
  assert.deepEqual([ship.alive, ship.x, ship.y, ship.invuln, ship.lives, ship.bombs], [true, X, RESPAWN_Y, INVULN, record.lives, record.bombs]);
  assert.deepEqual([ship.power, ship.reserve, ship.broadside], [null, null, 0]);
});

test('every entry after the checkpoint comes again as it was, a hurt target at full hp; the checkpoint itself does not', () => {
  const world = leg();
  const first = ground(world, 'turret');
  gather(world);
  assert.equal(first.hp, 2);
  kill(world);
  assert.ok(until(world, () => world.course.respawn === null && world.ship.alive));
  assert.ok(until(world, () => ground(world, 'turret') && world.aliens.length > 0));
  const again = ground(world, 'turret');
  assert.notEqual(again.id, first.id);
  assert.deepEqual([again.at, again.x, again.hp], [first.at, first.x, 3]);
  assert.equal(world.course.ground.some((g) => g.kind === 'checkpoint'), false);
  assert.equal(world.course.lit, 1, 'and it is not reached twice');
  assert.deepEqual(ofType(world.events, 'checkpoint').length, 1);
});

test('lives refill to the checkpoint\'s, and never fewer than the start\'s', () => {
  for (const [had, after] of [[LIVES + 2, LIVES + 2], [1, LIVES]]) {
    const world = leg(had);
    kill(world);
    assert.ok(until(world, () => world.ship.alive));
    assert.equal(world.ship.lives, after);
  }
});

test('a death before any checkpoint returns to the start: checkpoint 0', () => {
  const world = flight([turret(300)], { speed: FAST, starts: ['seed'] });
  assert.ok(until(world, () => ground(world, 'turret')));
  world.score = 400;
  world.course.abilities.push('later');
  Object.assign(world.ship, { x: 200, bombs: 0 });
  kill(world);
  assert.ok(until(world, () => world.ship.alive));
  const { ship, course } = world;
  assert.deepEqual([course.dist, course.next, world.score, ship.x, ship.y, ship.bombs], [0, 0, 0, MID_X, RESPAWN_Y, 1]);
  assert.deepEqual(course.abilities, ['seed']);
  assert.equal(course.ground.length, 0);
  assert.ok(until(world, () => ground(world, 'turret')), 'the turret comes again');
});

test('a ship that is down neither moves, fires, drops a seed nor bombs, and a bomb key held through it is no fresh press', () => {
  const world = flight([], { starts: ['seed'], speed: FAST });
  step(world, 3);
  kill(world);
  const { ship, course } = world;
  const { x, y, bombs } = ship;
  const keys = input({ fire: true, bomb: true, target: { x: 200, y: 700 } });
  step(world, 1, keys);
  const { dist } = course;
  for (let i = 1; i < DELAY_TICKS; i++) {
    step(world, 1, keys);
    assert.deepEqual([ship.x, ship.y, ship.bombs, course.dist], [x, y, bombs, dist]);
    assert.deepEqual([world.shots.length, course.seeds.length], [0, 0]);
  }
  step(world, 1, keys);
  assert.equal(ship.alive, true);
  assert.deepEqual(world.events.filter((e) => e.type === 'fire' || e.type === 'bomb'), [], 'nothing was fired or bombed');
  step(world, 3, keys);
  assert.equal(ship.bombs, bombs, 'the key held through the beat is no fresh press');
  assert.deepEqual([world.shots.length > 0, ship.x, ship.y], [true, 200, 700], 'a living ship fires and follows the pointer');
});

test('a ship that goes down on the tick a checkpoint comes to the line has not reached it', () => {
  const world = flight([checkpoint(0, X, 'seed')], { speed: FAST });
  step(world);
  world.course.dist = RESPAWN_Y - SPAWN_Y - (FAST * TICK) / 2; // half a tick of scroll short of the line
  kill(world);
  step(world);
  assert.ok(world.course.ground[0].y >= RESPAWN_Y, 'it came to the line');
  assert.deepEqual([world.course.lit, ofType(world.events, 'checkpoint').length, world.course.abilities], [0, 0, []]);
  assert.ok(until(world, () => world.course.lit === 1), 'it comes again after the respawn');
});

test('a hold standing at the death is let go (course.held, once holds exist)', () => {
  const world = flight([checkpoint(0, X)], { speed: FAST });
  assert.ok(until(world, () => world.course.lit === 1));
  world.course.held = { holdId: 0, t: 4 };
  kill(world);
  assert.ok(until(world, () => world.ship.alive));
  assert.equal(world.course.held, null);
});

test('stepping is deterministic, through a death and from a snapshot taken during the beat', () => {
  const run = (world) => {
    const hashes = [];
    for (let i = 0; i < 400; i++) {
      step(world, 1, i % 3 === 0 ? FIRE : input({ target: { x: 300 + i, y: 800 } }));
      if (i === 150) kill(world);
      hashes.push(stateHash(world), JSON.stringify(world.course));
    }
    return hashes;
  };
  const a = leg();
  const b = leg();
  assert.deepEqual(run(a), run(b));
  assert.ok(ofType(a.events, 'respawn').length > 0, 'the run did respawn');
  const c = leg();
  step(c, 20);
  kill(c);
  step(c, 5);
  const copy = structuredClone(c);
  step(c, 2 * DELAY_TICKS, FIRE);
  step(copy, 2 * DELAY_TICKS, FIRE);
  assert.deepEqual(copy, c);
});
