import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficulty, scaled, FIRE_UP } from '../../src/core/difficulty.js';

test('difficulty runs from 0 at world 1 level 1 to 1 at world 8 level 5', () => {
  assert.equal(difficulty(1, 1), 0);
  assert.equal(difficulty(8, 5), 1);
  assert.equal(difficulty(2, 1), 5 / 39);
});

test('difficulty never falls as (world, level) advances', () => {
  let last = -1;
  for (let w = 1; w <= 8; w++) {
    for (let i = 1; i <= 5; i++) {
      const d = difficulty(w, i);
      assert.ok(d >= 0 && d <= 1);
      assert.ok(d > last, `w${w}-${i}`);
      last = d;
    }
  }
});

test('scaled gives the documented range at d = 0 and d = 1', () => {
  assert.deepEqual(scaled(0), { bulletSpeed: 260, fireMult: 0.6 * FIRE_UP, formationSpeed: 1, armorBonus: 0 });
  const hard = scaled(1);
  assert.equal(hard.bulletSpeed, 520);
  assert.equal(hard.fireMult, 1.6 * FIRE_UP);
  assert.equal(hard.formationSpeed, 1.6);
  assert.equal(hard.armorBonus, 1);
});

test('armorBonus switches on only above d = 0.6', () => {
  assert.equal(scaled(0.6).armorBonus, 0);
  assert.equal(scaled(0.61).armorBonus, 1);
});

// R54: the enemy shoots FIRE_UP times the fire rate the d curve (0.6 to 1.6) gives, to pay for the extra
// power-up drops. The spec's numbers: x1.5, so 0.9 at d = 0 and 2.4 at d = 1.
test('fireMult is the d curve times FIRE_UP (R54), at every d', () => {
  assert.equal(FIRE_UP, 1.5);
  for (const d of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
    assert.ok(Math.abs(scaled(d).fireMult - (0.6 + d) * FIRE_UP) < 1e-12, `d ${d}`);
  }
  assert.ok(Math.abs(scaled(0).fireMult - 0.9) < 1e-12);
  assert.ok(Math.abs(scaled(1).fireMult - 2.4) < 1e-12);
});
