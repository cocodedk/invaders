import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { SPAWN_Y } from '../../src/core/course.js';
import { pathPos, AIR_MARGIN, DIVE_LOCK } from '../../src/core/course-air.js';
import { ROLES, WIDTH, HEIGHT, MID_X } from '../../src/core/kinds.js';
import { LIVES } from '../../src/core/ship.js';
import { TICK, IDLE, step, shotAt, drain, ofType } from './world-kit.js';
import { courseLevel } from './course-kit.js';

// Test-local data: an air entry that comes up on the first play tick (at 0), and a course around it.
const air = (o = {}) => ({ kind: 'air', at: 0, role: 'g', path: 'swoop', x: 400, pattern: 'aimed', ...o });
const PATHS = ['swoop', 'cross', 'dive'];
const ALWAYS = 1e6; // fireMult: every gunner that may fire does, on every tick
const MAX_TICKS = 2000; // a flight that has not ended by then never will

// A course world with its intro over, no play tick taken yet and the enemy quiet (fireMult 0 unless given).
function flight(spawns, fireMult = 0) {
  const world = createWorld(courseLevel({ speed: 100, length: 6000, starts: [], walls: [], spawns }));
  world.scale.fireMult = fireMult;
  while (world.state === 'intro') stepWorld(world, TICK, IDLE);
  return world;
}

// One tick of play: the alien that spawns on it is in world.aliens afterwards, still at t = 0.
const launched = (spawns, fireMult) => {
  const world = flight(spawns, fireMult);
  step(world);
  return world;
};

const outside = (a) => a.x < -AIR_MARGIN || a.x > WIDTH + AIR_MARGIN || a.y > HEIGHT + AIR_MARGIN;
const onScreen = (a) => a.x >= 0 && a.x <= WIDTH && a.y >= 0 && a.y <= HEIGHT;

test('an air entry becomes an alien on its path: hp from its role, at x, just above the top edge, nothing on the ground', () => {
  const world = launched([air({ role: 'u', path: 'cross', x: 120, pattern: 'fan' })]);
  assert.equal(world.course.ground.length, 0);
  assert.equal(world.course.next, 1);
  assert.equal(world.aliens.length, 1);
  const a = world.aliens[0];
  assert.deepEqual(
    { role: a.role, hp: a.hp, maxHp: a.maxHp, mode: a.mode, path: a.path, t: a.t, x: a.x, x0: a.x0, y: a.y, pattern: a.pattern },
    { role: 'gunner', hp: ROLES.gunner.hp, maxHp: ROLES.gunner.hp, mode: 'path', path: 'cross', t: 0, x: 120, x0: 120, y: SPAWN_Y, pattern: 'fan' },
  );
  assert.equal(a.id, 1, 'its id comes from the world, like a ground object\'s');
  step(world);
  assert.ok(Math.abs(a.t - TICK) < 1e-9 && a.y > SPAWN_Y, 'it moves from the next tick on');
});

test('each role letter makes its own role, with the hp of that role', () => {
  for (const [letter, role] of [['g', 'grunt'], ['d', 'diver'], ['u', 'gunner'], ['a', 'armored'], ['c', 'carrier']]) {
    const a = launched([air({ role: letter })]).aliens[0];
    assert.deepEqual([a.role, a.hp], [role, ROLES[role].hp]);
  }
});

test('a swoop and a crossing head for the far side from where they start, and fall as they go', () => {
  for (const path of ['swoop', 'cross']) {
    const right = pathPos(path, 1, MID_X - 300);
    const left = pathPos(path, 1, MID_X + 300);
    assert.ok(right.x > MID_X - 300 && left.x < MID_X + 300, path + ' bends toward the far side');
    assert.ok(right.y > SPAWN_Y && left.y > SPAWN_Y, path + ' falls');
    assert.deepEqual(pathPos(path, 0, 700), { x: 700, y: SPAWN_Y }, path + ' starts where it spawns');
  }
});

test('a dive falls straight until DIVE_LOCK, then keeps a heading toward the x it locked on', () => {
  const before = pathPos('dive', DIVE_LOCK / 2, 900, 1500);
  assert.equal(before.x, 900, 'before the lock it falls straight');
  assert.equal(pathPos('dive', DIVE_LOCK, 900, 1500).x, 900, 'and the lock is where it turns');
  const later = pathPos('dive', DIVE_LOCK + 1, 900, 1500);
  const further = pathPos('dive', DIVE_LOCK + 2, 900, 1500);
  assert.ok(later.x > 900 && further.x - later.x > 0, 'toward the locked x');
  const mirror = pathPos('dive', DIVE_LOCK + 1, 900, 300);
  assert.ok(mirror.x < 900, 'to either side');
  assert.ok(Math.abs(further.x - later.x - (later.x - 900)) < 1e-9, 'at a steady pace');
  assert.ok(later.y > before.y, 'falling all the while');
});

test('a dive locks on the ship x at DIVE_LOCK and then ignores the ship', () => {
  const world = launched([air({ path: 'dive', x: 960 })]);
  const a = world.aliens[0];
  world.ship.x = 300;
  while (a.t + TICK < DIVE_LOCK) step(world);
  assert.equal(a.aim, null, 'not yet locked');
  assert.equal(a.x, a.x0, 'and falling straight');
  step(world);
  assert.ok(a.t >= DIVE_LOCK && a.aim === 300, 'locked on the x the ship stood at');
  world.ship.x = 1700;
  step(world, 5);
  assert.equal(a.aim, 300, 'the ship moving on changes nothing');
  assert.ok(a.x < a.x0, 'it keeps its heading, toward where the ship was');
});

test('every path moves across the screen and leaves: gone for no kill, no score and no drop', () => {
  for (const path of PATHS) {
    const world = launched([air({ role: 'c', path, x: path === 'cross' ? -40 : 700 })]);
    const a = world.aliens[0];
    let seen = false;
    let last = { x: a.x, y: a.y };
    for (let i = 0; i < MAX_TICKS && world.aliens.length > 0; i++) {
      assert.ok(!outside(a), path + ' is within the margin while it flies');
      seen ||= onScreen(a);
      last = { x: a.x, y: a.y };
      step(world);
      assert.ok(a.y > last.y, path + ' falls every tick');
    }
    assert.ok(seen, path + ' crossed the screen');
    assert.equal(world.aliens.length, 0, path + ' left');
    assert.ok(outside(a), path + ' went past the margin');
    assert.equal(a.hp, 0);
    assert.equal(world.score, 0, 'no score');
    assert.equal(world.pickups.length, 0, 'a carrier that leaves drops nothing');
    assert.equal(ofType(drain(world), 'kill').length, 0, 'and it is no kill');
    assert.equal(world.course.next, 1, 'and it does not come back');
  }
});

test('a gunner on its path fires its pattern from where it flies, never from off screen', () => {
  const world = launched([air({ role: 'u', path: 'swoop', x: 700, pattern: 'aimed' })], ALWAYS);
  const a = world.aliens[0];
  assert.equal(ofType(world.events, 'fire').length, 0, 'it spawns off screen and is quiet');
  let shots = 0;
  for (let i = 0; i < MAX_TICKS && world.aliens.length > 0; i++) {
    step(world);
    const fired = ofType(drain(world), 'fire');
    const inView = a.hp > 0 && onScreen(a);
    assert.equal(fired.length, inView ? 1 : 0, 'one volley a tick on screen, none off it');
    for (const f of fired) assert.deepEqual([f.side, f.id, f.role, f.pattern], ['enemy', a.id, 'gunner', 'aimed']);
    shots += fired.length;
  }
  assert.ok(shots > 0, 'it fired');
  assert.ok(world.bullets.length > 0, 'and its bullets are in the world');
});

test('each pattern among the air craft is fired by its own craft, once each, and a dead craft fires nothing', () => {
  const spawns = [air({ role: 'u', x: 600, pattern: 'aimed' }), air({ role: 'u', x: 900, pattern: 'ring' }), air({ role: 'u', x: 1200, pattern: 'aimed' })];
  const world = launched(spawns, ALWAYS);
  step(world, 40);
  const fired = ofType(drain(world), 'fire');
  const by = (id) => fired.filter((f) => f.id === id).map((f) => f.pattern);
  const [a, b, c] = world.aliens;
  assert.ok(by(a.id).length > 0 && by(b.id).length > 0 && by(c.id).length > 0, 'all three fired');
  assert.ok(by(a.id).every((p) => p === 'aimed') && by(b.id).every((p) => p === 'ring') && by(c.id).every((p) => p === 'aimed'));
  const perTick = fired.filter((f) => f.tick === fired[0].tick);
  assert.equal(new Set(perTick.map((f) => f.id)).size, perTick.length, 'at most one volley per craft per tick');
  world.bullets.length = 0; // room under the bullet cap
  c.hp = 0;
  step(world);
  const after = ofType(drain(world), 'fire').map((f) => f.id);
  assert.deepEqual(after, [a.id, b.id], 'the craft still flying fire, the one that is down does not');
});

test('a shot kills an air craft and scores by its role; a carrier drops a pickup', () => {
  for (const role of ['g', 'd', 'u', 'a', 'c']) {
    const world = launched([air({ role })]);
    const a = world.aliens[0];
    const name = a.role;
    for (let i = 0; i < ROLES[name].hp; i++) shotAt(world, a);
    drain(world);
    step(world);
    assert.equal(world.score, ROLES[name].score, name + ' pays the score of its role');
    assert.deepEqual(ofType(drain(world), 'kill').map((k) => [k.role, k.scored]), [[name, true]]);
    assert.equal(world.aliens.length, 0, name + ' is gone');
    if (name === 'carrier') assert.equal(world.pickups.length, 1, 'a carrier drops a pickup');
  }
});

test('an air craft that touches the ship rams it, as in free flight: a life lost, the craft gone for no points', () => {
  const world = launched([air({ role: 'u' })]);
  const a = world.aliens[0];
  Object.assign(a, { x: world.ship.x, y: world.ship.y });
  drain(world);
  step(world);
  assert.equal(world.ship.lives, LIVES - 1);
  const events = drain(world);
  assert.deepEqual(ofType(events, 'shipHit').map((e) => e.source), ['ram']);
  assert.deepEqual(ofType(events, 'kill').map((k) => [k.role, k.scored, k.score]), [['gunner', false, 0]]);
  assert.equal(world.score, 0);
  assert.equal(world.aliens.length, 0);
});

test('stepping a snapshot of a course with air craft from the same inputs gives the same aliens and bullets', () => {
  const spawns = [air({ role: 'u', path: 'dive', x: 500, pattern: 'aimed' }), air({ role: 'u', at: 40, path: 'cross', x: 1800, pattern: 'ring' }), air({ role: 'a', at: 90, path: 'swoop', x: 900 })];
  const world = flight(spawns, 20);
  step(world, 90);
  const copy = structuredClone(world);
  step(world, 300);
  step(copy, 300);
  assert.deepEqual(copy.aliens, world.aliens);
  assert.deepEqual(copy.bullets, world.bullets);
  assert.deepEqual(copy.rng, world.rng);
  assert.equal(world.course.next, spawns.length);
});
