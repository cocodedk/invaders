import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { SHIP_SPEED, ZONE, FREE_ZONE } from '../../src/core/ship.js';
import { HAND, handToward, handTarget } from '../../src/core/hand.js';
import { autopilot, destination } from '../../src/core/autopilot.js';
import { level, wave, playing, input, step, seconds, bulletAt, TICK } from './world-kit.js';

// R68: the pointer is the ship. A pointer target puts the ship on its goal in the very tick, in every
// world; the keys keep their ease; the autopilot moves like a hand. (pointer-sweep.test.js has what a ship
// that crosses the field in one tick meets on the way.)

const at = (x, y) => input({ target: { x, y } });
// A quiet world past its intro with the ship at (300, 1000).
const still = (lv) => {
  const w = playing(lv);
  Object.assign(w.ship, { x: 300, y: 1000 });
  return w;
};

test('the pointer puts the ship on its goal in one tick, in every world, held inside that world\'s zone', () => {
  for (const id of ['w1-1', 'w9-3', 'w17-5', 'w18-1', 'w18-5']) {
    const lv = levelById(id);
    const zone = lv.free ? FREE_ZONE : ZONE;
    const w = createWorld(lv, 1);
    step(w, 1, at(1700, 700));
    assert.deepEqual([w.ship.x, w.ship.y], [1700, 700], `${id}: on its goal after one tick`);
    step(w, 1, at(100, 300));
    assert.deepEqual([w.ship.x, w.ship.y], [100, Math.max(300, zone.y0)], `${id}: a long diagonal, clamped to the zone`);
    step(w, 1, at(9000, -50));
    assert.deepEqual([w.ship.x, w.ship.y], [zone.x1, zone.y0], `${id}: clamped on both axes`);
  }
});

test('a ship on its goal stays there at rest: no drift, no velocity', () => {
  const w = playing(level([wave()]));
  step(w, 1, at(500, 800));
  step(w, 30, at(500, 800));
  assert.deepEqual([w.ship.x, w.ship.y, w.ship.vx, w.ship.vy], [500, 800, 0, 0]);
});

test('a flick leaves a velocity the drawing can bank on, never more than the keys\' top speed', () => {
  const w = playing(level([wave()]));
  Object.assign(w.ship, { x: 200, y: 900 });
  step(w, 1, at(1800, 900));
  assert.ok(Math.abs(w.ship.vx - SHIP_SPEED) < 1e-9 && w.ship.vy === 0, `a 1600 px jump says 720 px/s, got ${w.ship.vx}`);
  Object.assign(w.ship, { x: 200, y: 900 });
  step(w, 1, at(204, 903));
  assert.ok(Math.abs(w.ship.vx - 240) < 1e-9 && Math.abs(w.ship.vy - 180) < 1e-9, 'a 5 px move says 300 px/s, as it went');
  step(w, 1, at(204, 903));
  assert.deepEqual([w.ship.vx, w.ship.vy], [0, 0]);
});

test('when the pointer lets go the ship stops where it is: no drift after a pause or a blur', () => {
  const w = playing(level([wave()]));
  Object.assign(w.ship, { x: 200, y: 900 });
  step(w, 1, at(1500, 900)); // a flick: vx says 720 px/s, for the drawing only
  assert.ok(Math.abs(w.ship.vx - SHIP_SPEED) < 1e-9);
  step(w, 20, input()); // resetInput (a pause, a blur, a screen): no target and no key
  assert.deepEqual([w.ship.x, w.ship.y, w.ship.vx, w.ship.vy], [1500, 900, 0, 0]);
});

test('a key that takes over from the pointer eases from rest, not on from the flick', () => {
  const w = playing(level([wave()]));
  Object.assign(w.ship, { x: 200, y: 900 });
  step(w, 1, at(1500, 900));
  step(w, 1, input({ dx: -1 }));
  assert.ok(Math.abs(w.ship.vx + 120) < 1e-9, `0.1 s ease: one tick is 120 px/s, not ${w.ship.vx}`);
  assert.ok(Math.abs(w.ship.x - (1500 - 2)) < 1e-9, `and 2 px, got ${w.ship.x}`);
});

test('the keys still ease in every world: 0.1 s to full speed, 720 px/s after', () => {
  for (const id of ['w1-1', 'w18-1']) {
    const w = createWorld(levelById(id), 1);
    Object.assign(w.ship, { x: 100, y: 900 });
    step(w, 1, input({ dx: 1 }));
    assert.ok(w.ship.vx > 0 && w.ship.vx < SHIP_SPEED, `${id}: eases, does not snap`);
    step(w, 5, input({ dx: 1 }));
    assert.equal(w.ship.vx, SHIP_SPEED);
    step(w, 54, input({ dx: 1 }));
    assert.ok(Math.abs(w.ship.x - (100 + 690)) < 1e-6, `${id}: 6 ticks of ease and 54 at 720 px/s, got ${w.ship.x}`);
  }
});

test('the hand carries the pointer HAND px/s and no more, and `to` itself once it is that close', () => {
  assert.equal(HAND, 1800);
  const far = handToward({ x: 100, y: 100 }, { x: 3100, y: 4100 }, TICK);
  assert.ok(Math.abs(Math.hypot(far.x - 100, far.y - 100) - HAND * TICK) < 1e-9);
  assert.ok(Math.abs((far.y - 100) / (far.x - 100) - 4 / 3) < 1e-9, 'straight toward it');
  assert.deepEqual(handToward({ x: 100, y: 100 }, { x: 110, y: 90 }, TICK), { x: 110, y: 90 });
  assert.deepEqual(handToward({ x: 5, y: 5 }, { x: 5, y: 5 }, TICK), { x: 5, y: 5 });
});

test('handTarget is whole pixels and never beyond a hand\'s reach, from a whole or a fractional ship', () => {
  for (let n = 0; n < 5000; n++) {
    const from = { x: 100 + ((n * 37) % 1700) + (n % 3) * 0.37, y: 640 + ((n * 53) % 380) + (n % 2) * 0.5 };
    const to = { x: from.x + ((n * 211) % 90) - 45 + (n % 5) * 0.2, y: from.y + ((n * 97) % 60) - 30 + 0.5 };
    const t = handTarget(from, to, TICK);
    assert.ok(Number.isInteger(t.x) && Number.isInteger(t.y));
    assert.ok(Math.hypot(t.x - from.x, t.y - from.y) <= HAND * TICK + 1e-9, `${JSON.stringify(from)} to ${JSON.stringify(to)}`);
  }
  assert.deepEqual(handTarget({ x: 100, y: 100 }, { x: 110, y: 90 }, TICK), { x: 110, y: 90 }, 'near enough it is `to`');
});

test('the autopilot\'s target is never farther from the ship than a hand carries it in a tick', () => {
  let farthest = 0;
  for (const id of ['w1-3', 'w7-2', 'w12-5', 'w18-3']) {
    const w = createWorld(levelById(id));
    for (let n = 0; n < 1500 && w.state !== 'cleared' && w.state !== 'failed'; n++) {
      const i = autopilot(w);
      const d = Math.hypot(i.target.x - w.ship.x, i.target.y - w.ship.y);
      assert.ok(d <= HAND * TICK + 1e-9, `${id} tick ${n}: ${d.toFixed(3)} px`);
      const to = destination(w);
      farthest = Math.max(farthest, Math.hypot(to.x - w.ship.x, to.y - w.ship.y));
      step(w, 1, i);
    }
  }
  assert.ok(farthest > 2 * HAND * TICK, `it wanted to go farther (${farthest.toFixed(0)} px) and was held to the hand`);
});

test('dodge plans at hand speed: a gap 300 px away in 0.25 s is reached, which no key could do', () => {
  const wall = () => {
    const w = still(level([wave({ rows: 1, cols: 1, formation: 'spiral', speed: 0.001 })]));
    Object.assign(w.ship, { x: 960, y: 1000 });
    w.aliens[0].hp = 99;
    w.ship.bombs = 0; // a crowd of bullets would be bombed away
    for (let x = 700; x <= 1220; x += 36) bulletAt(w, x, 800, 0, 800); // 0.25 s to the ship's row; clear below 678 and above 1242
    return w;
  };
  const keys = wall();
  seconds(keys, 1, input({ dx: -1 }));
  assert.ok(keys.hits >= 1, 'at 720 px/s with the keys the gap is out of reach');
  const hand = wall();
  for (let n = 0; n < 60; n++) step(hand, 1, autopilot(hand));
  assert.equal(hand.hits, 0, 'the autopilot flies there, one hand-step a tick');
});
