import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MID_X, WIDTH, HEIGHT } from '../../src/core/kinds.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { GROUND_SCORE } from '../../src/core/course-ground.js';
import { BOMB_BLOOM_R } from '../../src/core/course-seed.js';
import { BOMB_DAMAGE, targets } from '../../src/core/damage.js';
import { step, ofType, input } from './world-kit.js';
import { launched } from './course-kit.js';

// The bomb on the ground (world 22): it hurts every ground object on screen and wakes the land it hits.
const SPEED = 60;
const HP = 3 * BOMB_DAMAGE; // enough to take a few hits
const turret = (x = MID_X, hp = HP) => ({ kind: 'turret', at: 0, x, hp });
const crate = (x, drop = null, hp = HP) => ({ kind: 'crate', at: 0, x, hp, drop });
const put = (world, g, y) => { g.at = SPAWN_Y + world.course.dist - y; }; // the object stands at screen y now
function seedWorld(spawns = [turret()], starts = ['seed']) {
  const world = launched(spawns, { speed: SPEED, starts });
  world.ship.invuln = Infinity;
  world.ship.cooldown = Infinity;
  return world;
}

// A bomb world: a turret on screen, one above the top edge, a crate, a stone and a lantern on screen; the bomb comes next tick.
function bombWorld() {
  const world = seedWorld([turret(300), turret(500), crate(1500), { kind: 'stone', at: 0, x: 900, hp: HP }, { kind: 'checkpoint', at: 0, x: 700 }], []);
  [400, -40, 600, 300, 200].forEach((y, i) => put(world, world.course.ground[i], y));
  return world;
}
const BOMB = input({ bomb: true });

test('a bomb hurts every ground object on screen and none above the top edge, and a lantern takes nothing', () => {
  const world = bombWorld();
  step(world, 1, BOMB);
  const [on, above, c, stone, lantern] = world.course.ground;
  assert.deepEqual([on.hp, above.hp, c.hp, stone.hp, lantern.hp], [HP - BOMB_DAMAGE, HP, HP - BOMB_DAMAGE, HP - BOMB_DAMAGE, null]);
  assert.equal(world.ship.bombs, 0);
});

test('a bomb wakes the whole screen: a mark at its centre whose circle reaches all four corners', () => {
  const world = bombWorld();
  const before = world.course.marks.length;
  step(world, 1, BOMB);
  const { marks, dist } = world.course;
  assert.equal(marks.length, before + 1);
  const m = marks[marks.length - 1];
  assert.deepEqual(m, { x: MID_X, at: SPAWN_Y + dist - HEIGHT / 2, r: BOMB_BLOOM_R });
  assert.ok(Math.hypot(WIDTH / 2, HEIGHT / 2) <= BOMB_BLOOM_R);
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

test('the ground is not one of damage.js targets: the bomb hurts it once, here, and the beam and the shots through course-shots.js', () => {
  const world = seedWorld([turret()], []);
  put(world, world.course.ground[0], 400);
  assert.deepEqual(targets(world).filter((t) => world.course.ground.includes(t)), []);
});
