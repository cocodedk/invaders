import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drain, ofType } from './world-kit.js';
import { lassoWorld, gnd, circle, CX, CY, R } from './course-lasso-kit.js';

// Radii and turns a fresh circle was once flown without closing: the line ran beside itself and never crossed.
const CASES = [[60, 1.1], [80, 1.1], [100, 1.1], [133, 1.1], [R, 1.1], [100, 1.3]];

for (const [r, turns] of CASES) {
  test(`a fresh circle of radius ${r} flown ${turns} turns closes one loop`, () => {
    const world = lassoWorld();
    drain(world);
    const stone = gnd(world, 'stone', CX, CY);
    circle(world, { r, turns });
    assert.equal(ofType(drain(world), 'lasso').length, 1);
    assert.ok(stone.hp <= 0, 'the stone inside is broken');
  });
}
