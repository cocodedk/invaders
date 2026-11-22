import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/core/world.js';
import { MID_X } from '../../src/core/kinds.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { GROUND_R, GROUND_SCORE } from '../../src/core/course-ground.js';
import { SEED_COOLDOWN, SEED_FALL, SEED_REACH, SEED_R, SEED_DMG } from '../../src/core/course-seed.js';
import { BOMB_DAMAGE, targets } from '../../src/core/damage.js';
import { step, drain, ofType, gunTicks, FIRE, input } from './world-kit.js';
import { courseLevel, launched } from './course-kit.js';

// The seeds (world 22's ground weapon) and the bomb on the ground. The scroll is slow (a pixel a tick); where a test puts
// a ground object next to a seed it says so in course coordinates (x, at), which no scroll changes.
const SPEED = 60;
const HP = 3 * Math.max(SEED_DMG, BOMB_DAMAGE); // enough to take a few hits
const REACH = SEED_R + GROUND_R; // how far from a burst a ground object is still hurt
const turret = (x = MID_X, hp = HP) => ({ kind: 'turret', at: 0, x, hp });
const crate = (x, drop = null, hp = HP) => ({ kind: 'crate', at: 0, x, hp, drop });
const yOf = (world, at) => SPAWN_Y + world.course.dist - at;
const put = (world, g, y) => { g.at = SPAWN_Y + world.course.dist - y; }; // the object stands at screen y now

// A course world past one play tick (the entries are on the ground), the ship unhurtable, with `starts` abilities.
function seedWorld(spawns = [turret()], starts = ['seed']) {
  const world = launched(spawns, { speed: SPEED, starts });
  world.ship.invuln = Infinity;
  return world;
}
// A seed dropped this tick, with the first ground object moved to (dx, dat) from where it will burst.
function dropOnto(world, dx = 0, dat = 0) {
  step(world, 1, FIRE);
  const seed = { ...world.course.seeds[0] };
  Object.assign(world.course.ground[0], { x: seed.x + dx, at: seed.at + dat });
  return seed;
}
const burst = (world) => step(world, gunTicks(SEED_FALL));

test('a course holds the abilities its level starts with, as its own copy, and none when the level names none', () => {
  const data = { speed: 100, length: 6000, starts: ['seed'], walls: [], spawns: [] };
  const world = createWorld(courseLevel(data));
  assert.deepEqual([world.course.abilities, world.course.marks, world.course.seeds, world.course.seedCool], [['seed'], [], [], 0]);
  world.course.abilities.push('later');
  assert.deepEqual(data.starts, ['seed']);
  const { starts, ...bare } = data;
  assert.deepEqual(createWorld(courseLevel(bare)).course.abilities, []);
});

test('without the seed ability, holding fire drops nothing, however long; gaining it (a checkpoint does) turns seeds on', () => {
  const world = seedWorld([turret()], []);
  step(world, 3 * gunTicks(SEED_COOLDOWN), FIRE);
  assert.deepEqual([world.course.seeds, world.course.marks, world.course.seedCool], [[], [], 0]);
  assert.equal(ofType(drain(world), 'seedBurst').length, 0);
  world.course.abilities.push('seed');
  step(world, 1, FIRE);
  assert.equal(world.course.seeds.length, 1);
});

test('holding fire drops one seed per SEED_COOLDOWN, the first on the first tick', () => {
  const world = seedWorld();
  const ticks = [];
  let total = 0;
  for (let tick = 1; ticks.length < 4; tick++) {
    step(world, 1, FIRE);
    const n = world.course.marks.length + world.course.seeds.length;
    if (n > total) { ticks.push(tick); total = n; }
  }
  assert.equal(ticks[0], 1);
  ticks.slice(1).forEach((t, i) => assert.equal(t - ticks[i], gunTicks(SEED_COOLDOWN)));
});

test('a seed is dropped SEED_REACH ahead of the ship and stays over the ground it fell on while the ground scrolls', () => {
  const world = seedWorld();
  step(world, 1, FIRE);
  const [s] = world.course.seeds;
  assert.deepEqual([s.x, s.t], [world.ship.x, SEED_FALL]);
  assert.ok(Math.abs(yOf(world, s.at) - (world.ship.y - SEED_REACH)) < 1e-9);
  const y = yOf(world, s.at);
  step(world, 5);
  assert.equal(world.course.seeds[0].at, s.at);
  assert.ok(yOf(world, s.at) > y, 'the ground carried it down the screen');
});

test('a seed bursts SEED_FALL after it is dropped: it hurts the turret under it, leaves a mark and says so', () => {
  const world = seedWorld();
  const g = world.course.ground[0];
  const rng = world.rng.s;
  const seed = dropOnto(world);
  drain(world);
  step(world, gunTicks(SEED_FALL) - 1);
  assert.deepEqual([g.hp, world.course.marks.length, world.course.seeds.length], [HP, 0, 1], 'not yet');
  step(world);
  assert.equal(g.hp, HP - SEED_DMG);
  assert.deepEqual(world.course.marks, [{ x: seed.x, at: seed.at, r: SEED_R }]);
  assert.equal(world.course.seeds.length, 0);
  assert.deepEqual(drain(world), [{ type: 'seedBurst', tick: world.tick, x: seed.x, y: yOf(world, seed.at), r: SEED_R }]);
  assert.equal(world.rng.s, rng, 'no draw on the way');
});

test('the burst is a ring: SEED_R plus the ground object\'s own reach, round, not square', () => {
  const cases = [
    [REACH - 1, 0, true], [-(REACH - 1), 0, true], [0, REACH - 1, true], [0, -(REACH - 1), true],
    [REACH + 1, 0, false], [0, REACH + 1, false], [0.8 * REACH, 0.8 * REACH, false], [0.7 * REACH, 0.7 * REACH, true],
  ];
  for (const [dx, dat, hurt] of cases) {
    const world = seedWorld();
    dropOnto(world, dx, dat);
    burst(world);
    assert.equal(world.course.ground[0].hp, hurt ? HP - SEED_DMG : HP, `dx ${dx}, dat ${dat}`);
  }
});

test('a burst breaks a turret it takes the last hp from (points, groundKill), hurts a crate, and leaves a stone alone', () => {
  const world = seedWorld([turret(MID_X, SEED_DMG), crate(MID_X), { kind: 'stone', at: 0, x: MID_X }]);
  const seed = dropOnto(world);
  const [, c, stone] = world.course.ground;
  Object.assign(c, { x: seed.x, at: seed.at });
  Object.assign(stone, { x: seed.x, at: seed.at });
  drain(world);
  burst(world);
  assert.deepEqual([c.hp, stone.hp, world.score], [HP - SEED_DMG, null, GROUND_SCORE.turret]);
  assert.deepEqual(ofType(drain(world), 'groundKill').map((e) => e.kind), ['turret']);
  assert.deepEqual(world.course.ground.map((g) => g.kind), ['crate', 'stone'], 'the broken turret is off the ground');
});

test('a burst with nothing in reach still leaves its mark', () => {
  const world = seedWorld([]);
  step(world, 1, FIRE);
  burst(world);
  assert.equal(world.course.marks.length, 1);
});

test('a ship that is down drops no seed', () => {
  const world = seedWorld();
  world.ship.alive = false;
  step(world, 3, FIRE);
  assert.equal(world.course.seeds.length, 0);
});

// A bomb world: a turret on screen, one above the top edge, a crate and a stone on screen; the bomb comes next tick.
function bombWorld() {
  const world = seedWorld([turret(300), turret(500), crate(1500), { kind: 'stone', at: 0, x: 900 }], []);
  [400, -40, 600, 300].forEach((y, i) => put(world, world.course.ground[i], y));
  return world;
}
const BOMB = input({ bomb: true });

test('a bomb hurts every ground object on screen and none above the top edge, and a stone takes nothing', () => {
  const world = bombWorld();
  step(world, 1, BOMB);
  const [on, above, c, stone] = world.course.ground;
  assert.deepEqual([on.hp, above.hp, c.hp, stone.hp], [HP - BOMB_DAMAGE, HP, HP - BOMB_DAMAGE, null]);
  assert.equal(world.ship.bombs, 0);
});

test('the bomb is spent once: the tick after, with the event still on the list, nothing more is hurt', () => {
  const world = bombWorld();
  step(world, 1, BOMB);
  assert.equal(ofType(world.events, 'bomb').length, 1);
  step(world, 3);
  assert.equal(world.course.ground[0].hp, HP - BOMB_DAMAGE);
});

test('a press with no bomb left hurts no ground object', () => {
  const world = bombWorld();
  world.ship.bombs = 0;
  step(world, 1, BOMB);
  assert.equal(world.course.ground[0].hp, HP);
});

test('a bomb breaks a crate like any other blow: its points and what it held', () => {
  const world = seedWorld([crate(MID_X, 'life', BOMB_DAMAGE)], []);
  put(world, world.course.ground[0], 500);
  step(world, 1, BOMB);
  assert.deepEqual([world.score, world.pickups.map((p) => p.kind)], [GROUND_SCORE.crate, ['life']]);
});

test('the laser beam burns no ground object, though one stands in its column', () => {
  const world = seedWorld([turret()], []);
  const g = world.course.ground[0];
  put(world, g, 400);
  world.ship.power = { kind: 'laser', left: 99 };
  step(world, 30, FIRE);
  assert.ok(world.ship.beam, 'the beam was on');
  assert.equal(g.hp, HP);
  assert.deepEqual(targets(world).filter((t) => world.course.ground.includes(t)), []);
});

test('seeds in the air survive a snapshot: the copy bursts on the same tick, with the same mark', () => {
  const world = seedWorld();
  dropOnto(world);
  step(world, 3, FIRE);
  const copy = structuredClone(world);
  step(world, gunTicks(SEED_FALL), FIRE);
  step(copy, gunTicks(SEED_FALL), FIRE);
  assert.ok(world.course.marks.length > 0);
  assert.deepEqual(copy.course, world.course);
  assert.deepEqual(copy.events, world.events);
});
