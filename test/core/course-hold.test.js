import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EPS } from '../../src/core/kinds.js';
import { ROLE } from '../../src/core/levels-2.js';
import { GROUND_SCORE, hurtGround } from '../../src/core/course-ground.js';
import { SEED_DMG } from '../../src/core/course-seed.js';
import { enemyDt } from '../../src/core/twists-2.js';
import { HOLD_Y, HOLD_FLIGHTS_MAX } from '../../src/core/course-hold.js';
import { TICK, input, step, drain, ofType } from './world-kit.js';
import { flight, until, FAST, HOLD_PERIOD, GATE_HP, WAIT, gate, kite, hold, stopOf, gates, standing, alive, breakAll } from './course-kit.js';

// The end hold (world 22): the scroll stops, the gates stand until they are broken, and flights keep coming meanwhile.
// The clear and the death are in course-hold-end.test.js.

const SHORT = 1; // a shorter period, for the test that watches the cap

test('a hold spawns its targets as gates and stops the scroll when its anchor reaches HOLD_Y; its clock counts from there', () => {
  const e = hold();
  const spawns = [{ kind: 'stone', at: 0, x: 300 }, e];
  const world = standing(spawns);
  const { course } = world;
  const id = spawns.indexOf(e);
  assert.deepEqual(course.held, { holdId: id, t: 0 });
  assert.deepEqual(gates(world).map((g) => [g.at, g.x, g.hp, g.holdId]), e.targets.map((t) => [e.at + t.dy, t.x, t.hp, id]));
  assert.ok(course.dist >= stopOf(e) && course.dist - FAST * TICK < stopOf(e), 'it stops on the tick the anchor comes to the line');
  const [anchor] = gates(world);
  assert.ok(anchor.y >= HOLD_Y && anchor.y < HOLD_Y + FAST * TICK);
  const { dist } = course;
  const ys = gates(world).map((g) => g.y);
  step(world, WAIT);
  assert.equal(course.dist, dist);
  assert.deepEqual(gates(world).map((g) => g.y), ys);
  assert.ok(Math.abs(course.held.t - WAIT * TICK) < EPS);
});

test('the hold clock runs in enemy time: bullet time slows it', () => {
  const world = standing([hold()]);
  world.ship.power = { kind: 'slow', left: Infinity };
  const slow = enemyDt(world, TICK);
  assert.ok(slow < TICK);
  step(world, WAIT);
  assert.ok(Math.abs(world.course.held.t - WAIT * slow) < EPS);
});

test('each flight comes at its t and every period after, counted from the stop, as the craft its fields name', () => {
  const flights = [kite(0, { role: 'd', x: 500 }), kite(0.5, { role: 'u', x: 1400, pattern: 'heavy' })];
  const world = standing([hold({ flights })]);
  const seen = new Set();
  const comings = [];
  const note = () => {
    for (const a of world.aliens) if (!seen.has(a.id)) comings.push({ t: world.course.held.t, a: seen.add(a.id) && a });
  };
  note();
  const ROUNDS = 3;
  while (world.course.held.t < (ROUNDS - 1) * HOLD_PERIOD + 1) {
    step(world);
    note();
  }
  const due = [];
  for (let k = 0; k < ROUNDS; k++) for (const f of flights) due.push([f, f.t + k * HOLD_PERIOD]);
  assert.equal(comings.length, due.length);
  comings.forEach((c, i) => {
    const [f, t] = due[i];
    assert.deepEqual([c.a.role, c.a.path, c.a.x0, c.a.pattern], [ROLE[f.role], f.path, f.x, f.pattern]);
    assert.ok(c.t >= t - EPS && c.t < t + TICK, `came at ${c.t}, due ${t}`);
  });
});

test('no more than HOLD_FLIGHTS_MAX craft are alive: a flight that comes while the sky is full is dropped, not kept', () => {
  const flights = Array.from({ length: HOLD_FLIGHTS_MAX + 2 }, () => kite(0));
  const world = standing([hold({ flights, period: SHORT })]);
  assert.equal(alive(world), HOLD_FLIGHTS_MAX);
  world.aliens[0].hp = 0;
  assert.ok(WAIT * TICK < SHORT);
  step(world, WAIT);
  assert.equal(alive(world), HOLD_FLIGHTS_MAX - 1, 'the two turned away do not queue');
  assert.ok(until(world, () => world.course.held.t >= SHORT));
  assert.equal(alive(world), HOLD_FLIGHTS_MAX, 'the next round fills the sky again, to the cap and no further');
});

test('a period of zero cannot hang the step', () => {
  const world = standing([hold({ flights: [kite(0)], period: 0 })]);
  step(world, WAIT);
  assert.ok(alive(world) <= HOLD_FLIGHTS_MAX);
});

test('breaking every gate ends the hold with holdBreak and the scroll goes on; a gate left standing keeps it', () => {
  const e = hold();
  const world = standing([e]);
  const { course } = world;
  const [a, b] = gates(world);
  drain(world);
  hurtGround(world, a, a.hp);
  assert.equal(world.score, GROUND_SCORE.gate);
  step(world, WAIT);
  const { dist } = course;
  assert.ok(course.held, 'one gate still stands');
  assert.equal(ofType(world.events, 'holdBreak').length, 0);
  hurtGround(world, b, b.hp);
  step(world);
  assert.equal(course.held, null);
  assert.deepEqual(ofType(drain(world), 'holdBreak').map((v) => v.holdId), [world.level.course.spawns.indexOf(e)]);
  assert.equal(course.dist, dist, 'the tick it breaks is the last that stands still');
  step(world);
  assert.ok(Math.abs(course.dist - dist - FAST * TICK) < EPS);
  assert.equal(ofType(world.events, 'holdBreak').length, 0);
});

test('a seed burst and a bomb hurt gates like any ground target, and a bomb breaks the hold', () => {
  const world = standing([hold()]);
  const [a] = gates(world);
  world.course.seeds.push({ x: a.x, at: a.at, t: TICK / 2 });
  step(world);
  assert.equal(a.hp, GATE_HP - SEED_DMG);
  drain(world);
  step(world, 1, input({ bomb: true }));
  assert.deepEqual([world.course.held, gates(world).length], [null, 0]);
  assert.deepEqual(ofType(world.events, 'groundKill').map((e) => e.kind), ['gate', 'gate']);
  assert.equal(ofType(world.events, 'holdBreak').length, 1);
});

test('gates all broken before the scroll comes to the hold, even the tick before: it never stops it and never says holdBreak', () => {
  const e = hold({ targets: [gate(600)] });
  const world = flight([e], { speed: FAST });
  assert.ok(until(world, () => gates(world).length > 0));
  assert.ok(until(world, () => world.course.dist + FAST * TICK >= stopOf(e)), 'the next tick brings the scroll to the stop');
  hurtGround(world, gates(world)[0], GATE_HP);
  step(world);
  assert.ok(world.course.dist >= stopOf(e));
  const { dist } = world.course;
  step(world, WAIT);
  assert.equal(world.course.held, null);
  assert.ok(world.course.dist > dist);
  assert.equal(ofType(world.events, 'holdBreak').length, 0);
});

test('on the tick a hold breaks no flight comes', () => {
  const world = standing([hold({ flights: [kite(0)], period: SHORT })]);
  assert.ok(until(world, () => world.course.held.t + TICK + EPS >= SHORT), 'the next tick is the one a flight is due on');
  const before = world.aliens.length;
  breakAll(world);
  step(world);
  assert.deepEqual([world.course.held, world.aliens.length], [null, before]);
});
