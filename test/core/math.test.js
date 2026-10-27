import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp, lerp, approach, dist2, angleTo, segDist2, sweepDist2, sweepRel2, segSegDist2, segBoxDist2,
} from '../../src/core/math.js';

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

test('segDist2 is the squared distance to the nearest point of a segment, ends included', () => {
  assert.equal(segDist2(0, 0, 10, 0, 5, 3), 9, 'beside the middle');
  assert.equal(segDist2(0, 0, 10, 0, 14, 3), 25, 'past the end: measured to the end point');
  assert.equal(segDist2(0, 0, 10, 0, -3, 4), 25, 'before the start');
  assert.equal(segDist2(2, 2, 2, 2, 5, 6), 25, 'a segment of length 0 is a point');
});

test('sweepRel2 is sweepDist2 for a thing that stood still, and the gap between the two paths for one that moved', () => {
  const p = { x: 10, y: 0, vx: -600, vy: 0 }; // flew 10 px this tick (dt 1/60), from x 20 to x 10
  assert.equal(sweepRel2(p, 1 / 60, { x: 15, y: 3 }), sweepDist2(p, 1 / 60, { x: 15, y: 3 }));
  assert.equal(sweepRel2(p, 1 / 60, { x: 15, y: 3 }, { x: 15, y: 3 }), 9);
  // the other thing went from x 0 to x 40 while p went from 20 to 10: they met on the way, at x 16
  assert.equal(sweepRel2(p, 1 / 60, { x: 40, y: 0 }, { x: 0, y: 0 }), 0);
  assert.equal(sweepRel2(p, 1 / 60, { x: 40, y: 7 }, { x: 0, y: 7 }), 49, 'passed 7 px off');
});

test('segSegDist2: 0 when the segments cross, else the nearest end to the other segment', () => {
  assert.equal(segSegDist2(0, 0, 10, 10, 0, 10, 10, 0), 0, 'an X');
  assert.equal(segSegDist2(0, 0, 10, 0, 5, 3, 5, 9), 9, 'above the middle, not touching');
  assert.equal(segSegDist2(0, 0, 10, 0, 13, 4, 20, 4), 25, 'past the end: end to end');
  assert.equal(segSegDist2(0, 0, 10, 0, 5, 0, 15, 0), 0, 'overlapping on one line');
  assert.equal(segSegDist2(0, 0, 10, 0, 4, 6, 4, 6), 36, 'a point');
});

test('segBoxDist2: 0 through or into the box, else the squared gap to its nearest edge or corner', () => {
  assert.equal(segBoxDist2(0, 0, 100, 0, 50, 0, 20, 10), 0, 'through the middle');
  assert.equal(segBoxDist2(0, 20, 100, 20, 50, 0, 20, 10), 225, 'past the top edge, 15 px');
  assert.equal(segBoxDist2(40, 0, 45, 0, 50, 0, 20, 10), 0, 'ending inside');
  assert.equal(segBoxDist2(0, 0, 0, 0, 50, 0, 20, 10), 1600, 'a point 40 px from the left edge');
  assert.ok(Math.abs(segBoxDist2(0, 0, 100, 100, 50, 0, 20, 10) - 612.5) < 1e-3, 'a diagonal missing the box: its corner (40, 5), 35 px off the line x = y');
});
