import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lockedMove } from '../../src/ui/pointer-lock.js';
import { readInput } from '../../src/ui/input.js';
import { ZONE } from '../../src/core/ship.js';

// The canvas's box in client px, offset from the page's corner, and a pointer steering inside it.
const rect = { left: 100, top: 50, right: 1100, bottom: 650 };
const at = (x, y) => ({ x, y });
// What a locked pointermove carries: the position is frozen (clientX/Y), only the movement is new.
const move = (movementX, movementY) => ({ clientX: 7, clientY: 9, movementX, movementY });

test('locked moves accumulate on the steering position, and the frozen clientX/Y are not used', () => {
  const m = at(500, 400);
  assert.equal(lockedMove(m, move(10, -5), rect), true);
  assert.deepEqual(m, { x: 510, y: 395 });
  lockedMove(m, move(-3, 2), rect);
  assert.deepEqual(m, { x: 507, y: 397 });
});

test('the result is held on the canvas at each edge', () => {
  const far = 1e6;
  for (const [dx, dy, want] of [
    [-far, 0, { x: rect.left, y: 400 }], [far, 0, { x: rect.right, y: 400 }],
    [0, -far, { x: 500, y: rect.top }], [0, far, { x: 500, y: rect.bottom }],
    [-far, far, { x: rect.left, y: rect.bottom }], [far, -far, { x: rect.right, y: rect.top }],
  ]) {
    const m = at(500, 400);
    lockedMove(m, move(dx, dy), rect);
    assert.deepEqual(m, want, `${dx},${dy}`);
  }
});

test('a move at the edge pushing on out of it leaves the position at the edge, and a move back answers at once', () => {
  const m = at(rect.right - 4, 400);
  lockedMove(m, move(500, 0), rect);
  lockedMove(m, move(500, 0), rect);
  assert.equal(m.x, rect.right);
  lockedMove(m, move(-30, 0), rect);
  assert.equal(m.x, rect.right - 30);
});

test('a locked move with no movement is ignored; one axis alone is a move', () => {
  const m = at(500, 400);
  for (const e of [move(0, 0), { clientX: 1, clientY: 1 }, move(NaN, undefined)]) {
    assert.equal(lockedMove(m, e, rect), false);
    assert.deepEqual(m, { x: 500, y: 400 });
  }
  assert.equal(lockedMove(m, move(0, 6), rect), true);
  assert.deepEqual(m, { x: 500, y: 406 });
});

test('a pointer the page never saw starts at the canvas\'s centre', () => {
  const m = at(null, null);
  lockedMove(m, move(10, -10), rect);
  assert.deepEqual(m, { x: (rect.left + rect.right) / 2 + 10, y: (rect.top + rect.bottom) / 2 - 10 });
});

// A locked pointer at the canvas's edge must steer exactly as the window's edge does (input.js: steer, axis).
test('a locked pointer pushed past the right edge and back gives the goal the window edge gives', () => {
  const width = 1920;
  const box = { left: 0, top: 0, right: width, bottom: 1080 };
  const view = {
    canvas: { width, height: 1080, getBoundingClientRect: () => ({ ...box, width, height: 1080 }) },
    fit: { s: 1, ox: 0, oy: 0 },
  };
  const input = { down: new Set(), taps: new Set(), mouse: { x: 1500, y: 900, left: false, right: false, active: true } };
  const goal = () => readInput(input, view).target;
  lockedMove(input.mouse, move(1e6, 0), box); // the hand keeps pushing right
  assert.deepEqual(goal(), { x: ZONE.x1, y: 900 });
  lockedMove(input.mouse, move(-100, 0), box);
  assert.deepEqual(goal(), { x: ZONE.x1 - 100, y: 900 }, 'a move back answers at once, with no dead stretch');
});
