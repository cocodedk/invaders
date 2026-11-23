import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/core/world.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { MAX_BULLETS } from '../../src/core/aliens.js';
import { ROLES } from '../../src/core/kinds.js';
import { LIVES } from '../../src/core/ship.js';
import { TICK, step, shotAt, drain, ofType, level, wave } from './world-kit.js';
import { air, flight, launched, col, OFF_LEFT, OFF_RIGHT, outside, onScreen } from './course-kit.js';

const PATHS = ['swoop', 'cross', 'dive'];
const ROLE_LETTERS = [['g', 'grunt'], ['d', 'diver'], ['u', 'gunner'], ['a', 'armored'], ['c', 'carrier']];
const ALWAYS = 1e6; // fireMult: every gunner that may fire does, on every tick
const MAX_TICKS = 2000; // a flight that has not ended by then never will

// A course of air craft that fire on every tick they may, over a ship that cannot be hit: the run stays in play.
function loud(spawns) {
  const world = launched(spawns, { fireMult: ALWAYS });
  world.ship.invuln = Infinity;
  return world;
}

test('an air entry becomes an alien on its path: hp from its role, at x, just above the top edge, nothing on the ground', () => {
  const world = launched([air({ role: 'u', x: col(0.15), pattern: 'fan' })]);
  assert.equal(world.course.ground.length, 0);
  assert.equal(world.course.next, 1);
  assert.equal(world.aliens.length, 1);
  const a = world.aliens[0];
  const hp = ROLES.gunner.hp + world.scale.armorBonus;
  assert.deepEqual(
    { role: a.role, hp: a.hp, maxHp: a.maxHp, mode: a.mode, path: a.path, t: a.t, x: a.x, x0: a.x0, y: a.y, pattern: a.pattern },
    { role: 'gunner', hp, maxHp: hp, mode: 'path', path: 'swoop', t: 0, x: col(0.15), x0: col(0.15), y: SPAWN_Y, pattern: 'fan' },
  );
  assert.equal(a.id, 1, 'its id comes from the world, like a ground object\'s');
  step(world);
  assert.ok(Math.abs(a.t - TICK) < 1e-9 && a.y > SPAWN_Y, 'it moves from the next tick on');
});

test('each role letter makes its own role, with the hp a wave alien of that role has, armorBonus included', () => {
  const d = 0.9; // past the 0.6 where armorBonus turns on
  const roles = ROLE_LETTERS.map(([, role]) => role);
  const waveWorld = createWorld(level([wave({ rows: roles.length, cols: 1, roles })], d));
  const world = launched(ROLE_LETTERS.map(([letter]) => air({ role: letter })), { d });
  assert.ok(world.scale.armorBonus > 0, 'the bonus is on, so the test can tell the rules apart');
  assert.deepEqual(world.aliens.map((a) => a.role), roles);
  for (const a of world.aliens) {
    const peer = waveWorld.aliens.find((w) => w.role === a.role);
    assert.deepEqual([a.hp, a.maxHp], [peer.hp, peer.maxHp], a.role);
  }
});

test('every path moves across the screen and leaves: gone for no kill, no score and no drop', () => {
  for (const path of PATHS) {
    const world = launched([air({ role: 'c', path, x: path === 'cross' ? OFF_LEFT : col(0.35) })]);
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
  const world = loud([air({ role: 'u', path: 'swoop', x: col(0.35), pattern: 'aimed' })]);
  const a = world.aliens[0];
  assert.equal(ofType(world.events, 'fire').length, 0, 'it spawns off screen and is quiet');
  let shots = 0;
  for (let i = 0; i < MAX_TICKS && world.aliens.length > 0; i++) {
    step(world);
    assert.equal(world.state, 'play', 'the run stays in play, so every tick below is a real one');
    assert.ok(world.bullets.length < MAX_BULLETS, 'and the bullet cap never throttles the craft');
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
  const spawns = [air({ role: 'u', x: col(0.3), pattern: 'aimed' }), air({ role: 'u', x: col(0.5), pattern: 'ring' }), air({ role: 'u', x: col(0.7), pattern: 'aimed' })];
  const world = loud(spawns);
  step(world, 40);
  assert.equal(world.state, 'play');
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
  assert.ok(world.state === 'play' && world.bullets.length < MAX_BULLETS, 'in play and under the cap, so the quiet is the rule\'s');
  assert.deepEqual(ofType(drain(world), 'fire').map((f) => f.id), [a.id, b.id], 'the craft still flying fire, the one that is down does not');
});

test('a shot kills an air craft and scores by its role; a carrier drops a pickup', () => {
  for (const [letter, name] of ROLE_LETTERS) {
    const world = launched([air({ role: letter })]);
    const a = world.aliens[0];
    for (let i = 0; i < a.hp; i++) shotAt(world, a);
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
  const spawns = [
    air({ role: 'u', path: 'dive', x: col(0.25), pattern: 'aimed' }),
    air({ role: 'u', at: 40, path: 'cross', x: OFF_RIGHT, pattern: 'ring' }),
    air({ role: 'a', at: 90, path: 'swoop', x: col(0.5) }),
  ];
  const world = flight(spawns, { fireMult: 20 });
  step(world, 90);
  const copy = structuredClone(world);
  step(world, 300);
  step(copy, 300);
  assert.deepEqual(copy.aliens, world.aliens);
  assert.deepEqual(copy.bullets, world.bullets);
  assert.deepEqual(copy.rng, world.rng);
  assert.equal(world.course.next, spawns.length);
});
