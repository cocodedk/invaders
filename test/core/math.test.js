import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, lerp, approach, dist2, angleTo } from '../../src/core/math.js';

test('clamp keeps a value inside the range', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(30, 0, 10), 10);
});

test('lerp blends between two values', () => {
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 1), 20);
  assert.equal(lerp(10, 20, 0.25), 12.5);
});

test('approach moves toward the target by at most step and never overshoots', () => {
  assert.equal(approach(0, 10, 3), 3);
  assert.equal(approach(9, 10, 3), 10);
  assert.equal(approach(10, 0, 4), 6);
  assert.equal(approach(1, 0, 4), 0);
  assert.equal(approach(5, 5, 2), 5);
});

test('dist2 is the squared distance between two points', () => {
  assert.equal(dist2({ x: 0, y: 0 }, { x: 3, y: 4 }), 25);
  assert.equal(dist2({ x: -1, y: -1 }, { x: -1, y: -1 }), 0);
});

test('angleTo is the angle from the first point to the second, y down', () => {
  const o = { x: 0, y: 0 };
  assert.equal(angleTo(o, { x: 5, y: 0 }), 0);
  assert.equal(angleTo(o, { x: 0, y: 5 }), Math.PI / 2);
  assert.equal(angleTo(o, { x: -5, y: 0 }), Math.PI);
  assert.equal(angleTo(o, { x: 0, y: -5 }), -Math.PI / 2);
});
