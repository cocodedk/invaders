import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readInput } from '../../src/ui/input.js';
import { ZONE } from '../../src/core/ship.js';

// A canvas `bar` px wider than the world on each side (a wide window's letterbox), shown 1:1.
const viewOf = (bar = 0) => ({
  canvas: {
    width: 1920 + 2 * bar, height: 1080,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 1920 + 2 * bar, bottom: 1080, width: 1920 + 2 * bar, height: 1080 }),
  },
  fit: { s: 1, ox: bar, oy: 0 },
});
// The input state createInput keeps, with the pointer steering; aim moves it (client px) and reads a tick.
const pointer = (x, y) => ({
  down: new Set(), taps: new Set(), mouse: { x, y, left: false, right: false, active: true },
});
const aim = (input, view, x, y) => {
  Object.assign(input.mouse, { x, y });
  return readInput(input, view).target;
};

test('the pointer steers to where it is, inside the ship\'s zone', () => {
  const view = viewOf();
  const input = pointer(960, 900);
  assert.deepEqual(readInput(input, view).target, { x: 960, y: 900 });
  assert.deepEqual(aim(input, view, 300, 700), { x: 300, y: 700 });
});

// The cursor is hidden in play: past the zone's edge it would leave a dead stretch to cross back.
test('a pointer up in the sky drags the goal along the zone\'s top, so a move back down answers at once', () => {
  const view = viewOf();
  const input = pointer(960, 900);
  assert.deepEqual(aim(input, view, 960, 100), { x: 960, y: ZONE.y0 });
  assert.deepEqual(aim(input, view, 960, 400), { x: 960, y: ZONE.y0 + 300 });
});

test('in a wide window\'s letterbox bars the goal stays on the zone\'s side, and a move back answers at once', () => {
  const view = viewOf(330); // a 2.4:1 window: 330 world px of bar on each side
  const input = pointer(1290, 900);
  assert.deepEqual(aim(input, view, 0, 900), { x: ZONE.x0, y: 900 }, 'deep in the left bar');
  assert.deepEqual(aim(input, view, 200, 900), { x: ZONE.x0 + 200, y: 900 }, '200 px back right');
  assert.deepEqual(aim(input, view, 2580, 900), { x: ZONE.x1, y: 900 }, 'deep in the right bar');
  assert.deepEqual(aim(input, view, 2480, 900), { x: ZONE.x1 - 100, y: 900 }, '100 px back left');
});

test('every spot of the zone stays in reach of a pointer inside the window, wherever it drifted', () => {
  for (const bar of [0, 330]) {
    const view = viewOf(bar);
    const right = 1920 + 2 * bar;
    for (const [x, y] of [[-900, -700], [right + 900, 1700], [960 + bar, 0], [0, 1080]]) {
      const input = pointer(960 + bar, 900);
      aim(input, view, x, y); // out of the window too, as with the button held (pointer capture)
      assert.deepEqual(aim(input, view, 0, 0), { x: ZONE.x0, y: ZONE.y0 }, `bar ${bar}, after ${x},${y}`);
      assert.deepEqual(aim(input, view, right, 1080), { x: ZONE.x1, y: ZONE.y1 }, `bar ${bar}, after ${x},${y}`);
    }
  }
});

test('when the keys take the ship back, the pointer steers from where it is again', () => {
  const view = viewOf();
  const input = pointer(960, 900);
  aim(input, view, 960, 100);
  input.mouse.active = false; // a movement key was pressed
  assert.equal(readInput(input, view).target, null);
  input.mouse.active = true;
  assert.deepEqual(aim(input, view, 960, 900), { x: 960, y: 900 });
});
