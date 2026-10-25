import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficulty, scaled, FIRE_UP, isSide } from '../../src/core/difficulty.js';

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

// Worlds 9-12 are side worlds with their own d: world 9 about world 4-5 hard, world 10 between
// worlds 3 and 4, world 11 about world 5, world 12 world 6's. Worlds 1-8 keep the 39-step curve.
test('world 9 sets its own difficulty per level, rising within the world, and leaves worlds 1-8 alone', () => {
  const own = [1, 2, 3, 4, 5].map((i) => difficulty(9, i));
  assert.deepEqual(own, [0.40, 0.43, 0.45, 0.48, 0.50]);
  own.forEach((d, i) => assert.ok(i === 0 || d > own[i - 1], `w9-${i + 1}`));
  for (let w = 1; w <= 8; w++) {
    for (let i = 1; i <= 5; i++) assert.equal(difficulty(w, i), ((w - 1) * 5 + i - 1) / 39, `w${w}-${i}`);
  }
});

test('world 10 sets its own difficulty per level, rising within the world, between worlds 3 and 4', () => {
  const own = [1, 2, 3, 4, 5].map((i) => difficulty(10, i));
  assert.deepEqual(own, [0.30, 0.32, 0.34, 0.36, 0.38]);
  own.forEach((d, i) => assert.ok(i === 0 || d > own[i - 1], `w10-${i + 1}`));
  assert.ok(own[0] > difficulty(3, 1) && own[4] <= difficulty(4, 1), 'between world 3 and world 4');
});

test('world 11 sets its own difficulty per level, rising within the world, about world 5 hard, armorBonus off', () => {
  const own = [1, 2, 3, 4, 5].map((i) => difficulty(11, i));
  assert.deepEqual(own, [0.51, 0.53, 0.56, 0.58, 0.60]);
  own.forEach((d, i) => assert.ok(i === 0 || d > own[i - 1], `w11-${i + 1}`));
  own.forEach((d, i) => assert.ok(Math.abs(d - difficulty(5, i + 1)) < 0.03, `w11-${i + 1} near w5-${i + 1}`));
  assert.ok(own.every((d) => scaled(d).armorBonus === 0), 'at or under 0.6 keeps armorBonus off');
});

test('world 12 runs world 6\'s own difficulty, rising within the world, armorBonus on', () => {
  const own = [1, 2, 3, 4, 5].map((i) => difficulty(12, i));
  assert.deepEqual(own, [0.64, 0.66, 0.69, 0.71, 0.74]);
  own.forEach((d, i) => assert.ok(i === 0 || d > own[i - 1], `w12-${i + 1}`));
  own.forEach((d, i) => assert.ok(Math.abs(d - difficulty(6, i + 1)) < 0.01, `w12-${i + 1} near w6-${i + 1}`));
  assert.ok(own.every((d) => scaled(d).armorBonus === 1), 'above 0.6 turns armorBonus on, as in world 6');
});

test('world 13 runs a notch above world 12, rising within the world, armorBonus on', () => {
  const own = [1, 2, 3, 4, 5].map((i) => difficulty(13, i));
  assert.deepEqual(own, [0.66, 0.68, 0.71, 0.73, 0.76]);
  own.forEach((d, i) => assert.ok(i === 0 || d > own[i - 1], `w13-${i + 1}`));
  own.forEach((d, i) => assert.ok(d > difficulty(12, i + 1) && d - difficulty(12, i + 1) < 0.04, `w13-${i + 1} just above w12-${i + 1}`));
  assert.ok(own.every((d) => scaled(d).armorBonus === 1), 'above 0.6 turns armorBonus on, as in world 6');
  assert.equal(isSide(13), true);
});

test('world 14 runs another notch above world 13, rising within the world, armorBonus on', () => {
  const own = [1, 2, 3, 4, 5].map((i) => difficulty(14, i));
  assert.deepEqual(own, [0.70, 0.72, 0.75, 0.77, 0.80]);
  own.forEach((d, i) => assert.ok(i === 0 || d > own[i - 1], `w14-${i + 1}`));
  own.forEach((d, i) => assert.ok(d > difficulty(13, i + 1) && d - difficulty(13, i + 1) < 0.05, `w14-${i + 1} just above w13-${i + 1}`));
  assert.ok(own.every((d) => scaled(d).armorBonus === 1), 'above 0.6 turns armorBonus on, as in world 6');
  assert.equal(isSide(14), true);
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

test('the side worlds are the ones that set their own d: 9 and 10, not the main run', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(isSide), [9, 10]);
});
