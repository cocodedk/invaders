import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, POWERS_13, POWERS_15, POWERS_16, MIRROR, powersFor } from '../../src/core/kinds.js';
import { hurtAlien } from '../../src/core/aliens.js';
import { createWorld } from '../../src/core/world.js';
import { rand, randPick } from '../../src/core/rng.js';
import { powerTime, POWER_TIME } from '../../src/core/powerups.js';
import { twinOf } from '../../src/core/ship.js';
import { step, seconds, playing, drain, ofType, pickupOnShip } from './world-kit.js';
import { lv, w16 } from './mirror-kit.js';

// World 16's power: only world 16 drops the mirror, and it lasts 10 s like most powers, with the ring
// and the reserve of R53. What the twin does is in mirror-twin.test.js.

test('the drop list is the six powers, plus the mirror in world 16 only', () => {
  assert.equal(MIRROR, 'mirror');
  assert.deepEqual(POWERS_16, [...POWERS, 'mirror']);
  assert.equal(powersFor({ world: 16 }), POWERS_16);
  assert.equal(powersFor({ world: 13 }), POWERS_13, 'world 13 keeps its wingmen');
  assert.equal(powersFor({ world: 15 }), POWERS_15, 'world 15 keeps its pearls and trident');
  for (const n of [1, 6, 12, 14]) assert.equal(powersFor({ world: n }), POWERS, `world ${n}`);
  assert.deepEqual(POWERS, ['spread', 'laser', 'rapid', 'shield', 'homing', 'slow']);
  assert.ok(!POWERS_13.includes('mirror') && !POWERS_15.includes('mirror'));
});

test('1000 seeded carrier deaths in world 16: about 20 % bombs and every one of the seven powers', () => {
  const w = createWorld(w16(), 99);
  for (let i = 0; i < 1000; i++) hurtAlien(w, { id: i, role: 'carrier', x: 500, y: 200, hp: 1 }, 1);
  const count = (k) => w.pickups.filter((p) => p.kind === k).length;
  assert.ok(count('bomb') >= 160 && count('bomb') <= 240, `bombs ${count('bomb')}`);
  for (const k of POWERS_16) assert.ok(count(k) >= 85 && count(k) <= 145, `${k} ${count(k)}`); // 114 each: 80 % in seven
  assert.ok(w.pickups.every((p) => p.kind !== 'pearls' && p.kind !== 'trident' && p.kind !== 'wingmen'));
});

test('every other world makes the very draws it always made, and never drops the mirror', () => {
  for (const [world, list] of [[1, POWERS], [6, POWERS], [12, POWERS], [13, POWERS_13], [14, POWERS], [15, POWERS_15]]) {
    const w = createWorld(lv({ world }), 7);
    const ref = { s: w.rng.s };
    for (let i = 0; i < 200; i++) hurtAlien(w, { id: i, role: 'carrier', x: 500, y: 200, hp: 1 }, 1);
    for (const p of w.pickups) {
      const r = rand(ref); // the split: 20 % bomb, 5 % life (not at full lives), the rest a power
      assert.equal(p.kind, r < 0.2 ? 'bomb' : randPick(ref, list), `world ${world}`);
      assert.ok(p.kind !== 'mirror', `world ${world}`);
    }
    assert.equal(w.rng.s, ref.s, `world ${world} drew nothing else`);
  }
});

test('the mirror lasts 10 s, like most powers, with the ring and the reserve of R53', () => {
  assert.equal(powerTime('mirror'), POWER_TIME);
  assert.equal(POWER_TIME, 10);
  const w = playing(w16());
  w.pickups.length = 0;
  pickupOnShip(w, 'mirror');
  step(w);
  assert.deepEqual(w.ship.power, { kind: 'mirror', left: 10 });
  assert.deepEqual(ofType(drain(w), 'power').map((e) => [e.kind, e.on]), [['mirror', true]]);
  seconds(w, 2);
  pickupOnShip(w, 'rapid'); // displaces the mirror, with the time it had left, into the reserve
  step(w);
  assert.equal(w.ship.power.kind, 'rapid');
  assert.equal(w.ship.reserve.kind, 'mirror');
  assert.ok(Math.abs(w.ship.reserve.left - 8) < 0.1, `left ${w.ship.reserve.left}`);
  assert.deepEqual(twinOf(w.ship), [], 'no twin while another power runs');
  seconds(w, 10.2); // the rapid ends and the mirror goes on from there
  assert.equal(w.ship.power.kind, 'mirror');
  assert.equal(w.ship.reserve, null);
  assert.equal(twinOf(w.ship).length, 1, 'the twin is back');
});

test('the mirror itself can wait in the reserve behind a newer pickup of any kind', () => {
  const w = playing(w16());
  w.pickups.length = 0;
  pickupOnShip(w, 'shield');
  step(w);
  seconds(w, 3);
  pickupOnShip(w, 'mirror'); // displaces the shield (7 s left) into the reserve
  step(w);
  assert.deepEqual([w.ship.power.kind, w.ship.reserve.kind], ['mirror', 'shield']);
  seconds(w, 10.2);
  assert.deepEqual([w.ship.power.kind, w.ship.reserve], ['shield', null]);
  assert.deepEqual(twinOf(w.ship), [], 'the twin is gone with the mirror');
});

test('a world-16 pickup of the mirror scores and sounds as any pickup', () => {
  const w = playing(w16());
  pickupOnShip(w, 'mirror');
  step(w);
  const ev = drain(w);
  assert.equal(ofType(ev, 'pickup')[0].kind, 'mirror');
  assert.equal(w.score, 500, 'the flat 500 for a pickup');
});
