import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MID_X } from '../../src/core/kinds.js';
import { MUZZLE, SHOT_SPEED, bolt } from '../../src/core/ship.js';
import { MAX_BULLETS } from '../../src/core/aliens.js';
import { SPAWN_Y, SHARD_SPEED, SHARD_MIN_RANGE } from '../../src/core/course-kinds.js';
import { GROUND_HP, GROUND_SCORE, hurtGround } from '../../src/core/course-ground.js';
import { shard } from '../../src/core/levels-8-kit.js';
import { step, drain, ofType, shotAt } from './world-kit.js';
import { flight } from './course-kit.js';

// Mirror shards (world 22, Leg 3): the scroll stands still, the ship far below out of the way.
const SHIP_Y = 900;
const ROW = 400;
const shot = (x, y, o = {}) => ({ ...bolt(x, y, 0, -SHOT_SPEED), life: 1, ...o });

function arena(spawns, ship = {}) {
  const world = flight(spawns, { speed: 0 });
  Object.assign(world.ship, { x: MID_X, y: SHIP_Y, fromX: MID_X, fromY: SHIP_Y, invuln: Infinity, ...ship });
  step(world);
  drain(world);
  return world;
}
const put = (x, hp) => ({ ...shard(SPAWN_Y - ROW, x), ...(hp ? { hp } : {}) });

test('a shard has its hp and score from the tables', () => {
  assert.ok(GROUND_HP.shard > 1);
  assert.equal(GROUND_SCORE.shard, 150);
  const world = arena([put(MID_X)]);
  assert.equal(world.course.ground[0].hp, GROUND_HP.shard);
});

test('a shot on a standing shard returns one aimed bullet at the ship, SHARD_SPEED of the scaled speed', () => {
  const world = arena([put(MID_X - 400)]);
  const g = world.course.ground[0];
  const rng = world.rng.state ?? JSON.stringify(world.rng);
  shotAt(world, g);
  step(world);
  assert.equal(g.hp, GROUND_HP.shard - 1);
  const b = world.bullets.filter((x) => x.pattern === 'aimed');
  assert.equal(b.length, 1);
  assert.ok(Math.abs(Math.hypot(b[0].vx, b[0].vy) - world.scale.bulletSpeed * SHARD_SPEED) < 1e-6);
  assert.ok(b[0].vx > 0 && b[0].vy > 0, 'it flies toward the ship');
  assert.equal(ofType(world.events, 'shardBounce').length, 1);
  assert.equal(world.rng.state ?? JSON.stringify(world.rng), rng, 'no rng drawn');
});

test('the breaking hit returns nothing', () => {
  const world = arena([put(MID_X - 400, 1)]);
  shotAt(world, world.course.ground[0]);
  step(world);
  assert.equal(world.bullets.length, 0);
  assert.equal(ofType(world.events, 'shardBounce').length, 0);
});

test('no return with the ship inside SHARD_MIN_RANGE', () => {
  const world = arena([put(MID_X)], { y: ROW + SHARD_MIN_RANGE - 20 });
  shotAt(world, world.course.ground[0]);
  step(world);
  assert.equal(world.bullets.length, 0);
});

test('a volley onto shards with the field one short of MAX_BULLETS never passes the cap', () => {
  const world = arena([put(MID_X - 60), put(MID_X), put(MID_X + 60)]);
  while (world.bullets.length < MAX_BULLETS - 1) world.bullets.push({ pattern: 'aimed', x: 0, y: 0, vx: 0, vy: 0, r: 8, life: 9 });
  for (const g of world.course.ground) shotAt(world, g);
  step(world);
  assert.ok(world.bullets.length <= MAX_BULLETS);
});

test('the bomb-style breaks (hurtGround alone) return nothing, and flying through costs nothing', () => {
  const world = arena([put(MID_X)]);
  hurtGround(world, world.course.ground[0], 1);
  hurtGround(world, world.course.ground[0], 99);
  assert.equal(world.bullets.length, 0);
  const w2 = arena([put(MID_X)], { x: MID_X, y: ROW });
  w2.ship.invuln = 0;
  const lives = w2.lives;
  step(w2, 5);
  assert.equal(w2.lives, lives);
  assert.equal(w2.ship.alive, true);
});

test('a trident shot returns once per shard it pierces', () => {
  const world = arena([put(MID_X - 20), put(MID_X + 20)]);
  world.shots.push({ ...shot(MID_X, ROW + MUZZLE), trident: true, pierced: [], r: 60 });
  step(world);
  assert.equal(world.bullets.filter((b) => b.pattern === 'aimed').length, 2);
  assert.equal(ofType(world.events, 'shardBounce').length, 2);
});
