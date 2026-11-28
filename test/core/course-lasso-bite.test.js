import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK } from '../../src/core/kinds.js';
import { LINE_STEP, drawLine } from '../../src/core/course-line.js';
import { drain, ofType } from './world-kit.js';
import { put } from './course-line-kit.js';
import { lassoWorld, CX, CY, R } from './course-lasso-kit.js';

test('a chain bitten right after the segment it then crosses does not close', () => {
  const world = lassoWorld();
  const N = Math.ceil((2 * Math.PI * R) / LINE_STEP);
  const at = (i) => [CX + R * Math.cos((i / N) * 2 * Math.PI), CY + R * Math.sin((i / N) * 2 * Math.PI)];
  put(world, ...at(0));
  world.course.pen = null;
  drawLine(world, TICK);
  for (let i = 1; i < N - 8; i++) {
    put(world, ...at(i));
    drawLine(world, TICK);
  }
  const { line } = world.course;
  line.splice(2, 2); // the bite lies just past segment 1
  const [mx, my] = [(line[1].x1 + line[1].x2) / 2, (line[1].y1 + line[1].y2) / 2];
  for (const [x, y] of [[mx - 30, my + 5], [mx - 5, my], [mx + 40, my]]) {
    put(world, x, y);
    drawLine(world, TICK);
  }
  assert.equal(ofType(drain(world), 'lasso').length, 0, 'the bitten chain is no loop');
});
