import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readInput, resetInput } from '../../src/ui/input.js';
import { ZONE } from '../../src/core/ship.js';
import { quantizeInput } from '../../src/core/input-codec.js';
import { HAND } from '../../src/core/hand.js';
import { TICK } from '../../src/core/kinds.js';
import { level, wave, playing, step } from '../core/world-kit.js';

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

// The cursor is hidden in play, so a pointer that wakes after the keys had the ship must not throw it to where
// the cursor happens to lie (R68: it would cross the field in one tick, unseen, through whatever is on the way).
// The keys' mouse object has walk set by the keydown that took the ship (the listener itself needs a window).
test('a pointer that wakes after the keys walks the ship to its goal at a hand\'s pace, then is the ship again', () => {
  const view = viewOf();
  const input = pointer(1500, 700); // the unseen cursor, far from the ship
  input.mouse.walk = true;
  const ship = { x: 300, y: 1000 };
  const far = Math.hypot(1500 - ship.x, 700 - ship.y);
  let ticks = 0;
  for (let t = readInput(input, view, ZONE, ship).target; ; t = readInput(input, view, ZONE, ship).target) {
    ticks++;
    assert.ok(Math.hypot(t.x - ship.x, t.y - ship.y) <= HAND * TICK + 1e-9, `tick ${ticks}: ${t.x},${t.y} from ${ship.x},${ship.y}`);
    Object.assign(ship, t);
    if (!input.mouse.walk) break;
    assert.ok(ticks < 100, 'it gets there');
  }
  // a hand-step a tick, each up to 2 x SQRT1_2 short of HAND x TICK (handTarget's margin, then the rounding), and the last onto the goal
  const [least, most] = [Math.ceil(far / (HAND * TICK)), Math.ceil(far / (HAND * TICK - 2 * Math.SQRT1_2)) + 1];
  assert.ok(ticks >= least && ticks <= most, `${far.toFixed(0)} px at ${HAND * TICK} px a tick, got ${ticks} ticks`);
  assert.deepEqual([ship.x, ship.y], [1500, 700], 'on the goal itself');
  assert.deepEqual(aim(input, view, 100, 900), { x: 100, y: 900 }, 'from then on the pointer is the ship, at once');
});

test('without the keys having had the ship the pointer is the ship at once, far from it too', () => {
  const view = viewOf();
  const input = pointer(1500, 700);
  assert.deepEqual(readInput(input, view, ZONE, { x: 300, y: 1000 }).target, { x: 1500, y: 700 });
});

test('resetInput (a pause, a level, a blur) forgets the walk: the pointer is immediate again', () => {
  const view = viewOf();
  const input = pointer(1500, 700);
  input.mouse.walk = true;
  resetInput(input);
  Object.assign(input.mouse, { x: 1500, y: 700, active: true });
  assert.deepEqual(readInput(input, view, ZONE, { x: 300, y: 1000 }).target, { x: 1500, y: 700 });
});

test('flown with the keys to x = 300, a pointer that wakes at x = 1500 moves the ship a hand-step a tick, not 1200 px, and a key stops it', () => {
  const w = playing(level([wave()]));
  Object.assign(w.ship, { x: 300, y: 1000 });
  const input = pointer(1500, 900);
  input.mouse.walk = true;
  const tick = () => step(w, 1, quantizeInput(readInput(input, viewOf(), ZONE, w.ship)));
  tick();
  const reach = HAND * TICK; // px a hand carries the pointer in a tick
  assert.ok(w.ship.x > 300 && w.ship.x <= 300 + reach, `walked, not thrown: ${w.ship.x}`);
  for (let n = 0; n < 4; n++) tick();
  assert.ok(w.ship.x > 300 + 4 * reach && w.ship.x <= 300 + 5 * reach, `five ticks on, more than four hand-steps: ${w.ship.x}`);
  const there = w.ship.x;
  input.mouse.active = false; // a movement key took the ship back
  step(w, 10, quantizeInput(readInput(input, viewOf(), ZONE, w.ship)));
  assert.equal(w.ship.x, there, 'and it stops where it is, with no drift');
});
