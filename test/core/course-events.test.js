import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BULLETS } from '../../src/core/aliens.js';
import { hitShip } from '../../src/core/ship.js';
import { TURRET_COOL, TURRET_PATTERN, GROUND_SCORE, hurtGround } from '../../src/core/course-ground.js';
import { RESPAWN_DELAY } from '../../src/core/course-check.js';
import { step, drain, ofType, bulletAt, pickupAt, TICK } from './world-kit.js';
import { air, flight, checkpoint, until, FAST, HOLD_AT, hold, kite, gate, gates, standing, breakAll } from './course-kit.js';

// What world 22's sounds and effects need of the core: a hold that falls before the scroll stops at it still breaks, a break washes the sky
// clean, a turret's shot is said, a power cut short by a respawn says it ended, and a ground break says what it paid.

const ids = (events) => ofType(events, 'holdBreak').map((e) => e.holdId);

test('a hold whose last gate falls before the scroll stops at it breaks on that tick, once: two gates on one tick are one break', () => {
  const e = hold();
  const world = flight([e], { speed: FAST });
  assert.ok(until(world, () => gates(world).length > 0));
  assert.equal(world.course.held, null);
  drain(world);
  breakAll(world);
  step(world);
  assert.deepEqual(ids(drain(world)), [0]);
  assert.equal(world.course.held, null);
  step(world, 3);
  assert.deepEqual(ids(drain(world)), [], 'and never again');
});

test('a hold falls early only with its last gate: the first of two says nothing, the second says holdBreak on its own tick', () => {
  const world = flight([hold()], { speed: FAST });
  assert.ok(until(world, () => gates(world).length > 0));
  const [a, b] = gates(world);
  drain(world);
  hurtGround(world, a, a.hp);
  step(world, 2);
  assert.deepEqual(ids(drain(world)), []);
  hurtGround(world, b, b.hp);
  step(world);
  assert.deepEqual(ids(drain(world)), [0]);
  step(world, 2);
  assert.deepEqual(ids(drain(world)), []);
});

test('each hold breaks by itself: two holds whose gates fall on one tick say holdBreak twice, each with its own holdId', () => {
  const first = hold({ at: HOLD_AT });
  const second = hold({ at: HOLD_AT + 20, targets: [gate(300), gate(1500, 40)] });
  const world = flight([first, second], { speed: FAST });
  assert.ok(until(world, () => gates(world).length === 4));
  drain(world);
  breakAll(world);
  step(world);
  assert.deepEqual(ids(drain(world)), [0, 1]);
});

// A hold standing with an air craft in the sky, bullets in the air and a turret due to fire on the tick the hold breaks.
function flood() {
  const turret = { kind: 'turret', at: HOLD_AT + 200, x: 900, hp: 3 };
  const world = standing([hold({ flights: [kite(0), kite(0, { x: 1400 })] }), turret]);
  assert.ok(until(world, () => world.course.ground.some((g) => g.kind === 'turret')));
  assert.ok(world.aliens.length > 0);
  for (let i = 0; i < 3; i++) bulletAt(world, 300 + 100 * i, 500);
  return { world, turret: world.course.ground.find((g) => g.kind === 'turret') };
}

test('the tick a standing hold breaks, its flood washes away every enemy bullet and every air craft, with no kill, no score and no drop', () => {
  const { world } = flood();
  pickupAt(world, 'bomb', 200, 200);
  breakAll(world);
  const { score } = world;
  const [id, pickups, shots] = [world.nextId, world.pickups.length, world.shots.length];
  drain(world);
  step(world);
  const events = drain(world);
  assert.deepEqual(ids(events), [0]);
  assert.deepEqual([world.bullets.length, world.aliens.length], [0, 0]);
  assert.deepEqual(events.filter((e) => ['kill', 'explode', 'hit'].includes(e.type)), []);
  assert.equal(world.score, score);
  assert.deepEqual([world.nextId, world.pickups.length, world.shots.length], [id, pickups, shots]);
  step(world, 60);
  assert.deepEqual([world.bullets.length, world.aliens.length], [0, 0], 'no later craft: the hold is the last the sky is fed from');
});

test('the shot a turret fires on the tick of the break is washed away too; a hold that falls early washes the sky as well', () => {
  const { world, turret } = flood();
  turret.cool = TICK / 2;
  breakAll(world);
  drain(world);
  step(world);
  const events = drain(world);
  assert.equal(ofType(events, 'fire').length, 1, 'it fired on the tick');
  assert.deepEqual([ids(events), world.bullets.length], [[0], 0]);

  const spawns = [air(), hold()];
  const early = flight(spawns, { speed: FAST });
  assert.ok(until(early, () => gates(early).length > 0));
  bulletAt(early, 300, 500);
  assert.deepEqual([early.course.held, early.aliens.length], [null, 1]);
  drain(early);
  breakAll(early);
  step(early);
  assert.deepEqual([ids(drain(early)), early.bullets.length, early.aliens.length], [[1], 0, 0]);
  assert.equal(spawns[1].kind, 'hold');
});

test('a turret that fires says so as an alien does: side enemy, its id, its place and its pattern; a shot lost to a full sky is not said', () => {
  const world = flight([{ kind: 'turret', at: 0, x: 900, hp: 3 }], { speed: 20 });
  world.ship.invuln = Infinity;
  assert.ok(until(world, () => world.course.ground[0]?.y > 0));
  const g = world.course.ground[0];
  const bullets = world.bullets.length;
  g.cool = TICK / 2;
  drain(world);
  step(world);
  const fires = ofType(drain(world), 'fire');
  assert.equal(fires.length, 1);
  const { type, tick, ...fire } = fires[0];
  assert.deepEqual(fire, { side: 'enemy', id: g.id, role: 'turret', x: g.x, y: g.y, pattern: TURRET_PATTERN });
  assert.ok(world.bullets.length > bullets && g.cool > TURRET_COOL - 2 * TICK);
  for (let i = world.bullets.length; i < MAX_BULLETS; i++) bulletAt(world, 100, 100);
  g.cool = TICK / 2;
  step(world);
  assert.equal(ofType(drain(world), 'fire').length, 0);
});

// A leg with a checkpoint reached, the ship alive.
function leg() {
  const world = flight([checkpoint(0, 700, null)], { speed: FAST });
  assert.ok(until(world, () => world.course.lit > 0));
  drain(world);
  return world;
}
const downAndUp = (world) => {
  world.ship.lives = 1;
  hitShip(world, 'test');
  assert.ok(until(world, () => world.course.respawn === null && world.ship.alive));
  return drain(world);
};
const powerEnds = (events) => ofType(events, 'power').filter((e) => !e.on).map((e) => e.kind);

test('a power still running when the respawn cuts it short says it ended, before the respawn; the reserve, which waits, says nothing', () => {
  const world = leg();
  Object.assign(world.ship, { power: { kind: 'rapid', left: 30 }, reserve: { kind: 'shield', left: 30 } });
  const events = downAndUp(world);
  assert.deepEqual(powerEnds(events), ['rapid']);
  assert.deepEqual(ofType(events, 'power').map((e) => e.on), [false]);
  assert.ok(events.findIndex((e) => e.type === 'power') < events.findIndex((e) => e.type === 'respawn'));
  assert.deepEqual([world.ship.power, world.ship.reserve], [null, null]);
});

test('a power that runs out during the beat says so once, by itself, and a ship with none says nothing at the respawn', () => {
  const world = leg();
  world.ship.power = { kind: 'laser', left: RESPAWN_DELAY / 2 };
  assert.deepEqual(powerEnds(downAndUp(world)), ['laser']);
  assert.deepEqual(powerEnds(downAndUp(world)), []);
});

test('a ground break says what it paid and the multiplier it came at: two on one tick climb the combo, each with its own', () => {
  const world = flight([{ kind: 'turret', at: 0, x: 900, hp: 1 }, { kind: 'crate', at: 0, x: 500, hp: 1, drop: 'bomb' }], { speed: 20 });
  assert.ok(until(world, () => world.course.ground.length === 2));
  drain(world);
  const [t, c] = world.course.ground;
  hurtGround(world, t, 1);
  hurtGround(world, c, 1);
  const kills = ofType(drain(world), 'groundKill');
  assert.deepEqual(kills.map((k) => [k.kind, k.mult, k.score]), [['turret', 1, GROUND_SCORE.turret], ['crate', 2, GROUND_SCORE.crate * 2]]);
  assert.equal(world.score, kills[0].score + kills[1].score);
});
