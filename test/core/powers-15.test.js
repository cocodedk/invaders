import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, POWERS_13, POWERS_15, powersFor } from '../../src/core/kinds.js';
import { hurtAlien } from '../../src/core/aliens.js';
import { createWorld } from '../../src/core/world.js';
import { rand, randPick } from '../../src/core/rng.js';
import { level, wave } from './world-kit.js';

// World 15 alone drops the pearls and the trident (R63): powersFor gives its levels the eight-power
// list, and every other world keeps the list and the rng draws it always had.

test('world 15 alone drops the pearls and the trident: eight powers, the six first', () => {
  assert.deepEqual(POWERS_15, [...POWERS, 'pearls', 'trident']);
  assert.equal(powersFor({ world: 15 }), POWERS_15);
  assert.equal(powersFor({ world: 13 }), POWERS_13, 'world 13 keeps its wingmen');
  for (const n of [1, 6, 12, 14, 17]) assert.equal(powersFor({ world: n }), POWERS, `world ${n}`);
  const w = createWorld(level([wave()], 0, { world: 15 }), 99);
  for (let i = 0; i < 1000; i++) hurtAlien(w, { id: i, role: 'carrier', x: 500, y: 200, hp: 1 }, 1);
  const count = (k) => w.pickups.filter((p) => p.kind === k).length;
  assert.ok(count('bomb') >= 160 && count('bomb') <= 240, `bombs ${count('bomb')}`);
  for (const k of POWERS_15) assert.ok(count(k) >= 70 && count(k) <= 130, `${k} ${count(k)}`); // 100 each: 80 % in eight
  assert.ok(w.pickups.every((p) => p.kind !== 'wingmen'));
});

test('every other world makes the very draws it always made, and drops neither new power', () => {
  for (const [world, list] of [[1, POWERS], [6, POWERS], [12, POWERS], [13, POWERS_13], [14, POWERS]]) {
    const w = createWorld(level([wave()], 0, { world }), 7);
    const ref = { s: w.rng.s };
    for (let i = 0; i < 200; i++) hurtAlien(w, { id: i, role: 'carrier', x: 500, y: 200, hp: 1 }, 1);
    for (const p of w.pickups) {
      const r = rand(ref); // 20 % bomb, 5 % life, the rest a power
      assert.equal(p.kind, r < 0.2 ? 'bomb' : r < 0.25 ? 'life' : randPick(ref, list), `world ${world}`);
      assert.ok(p.kind !== 'pearls' && p.kind !== 'trident', `world ${world}`);
    }
    assert.equal(w.rng.s, ref.s, `world ${world} drew nothing else`);
  }
});
