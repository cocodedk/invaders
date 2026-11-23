import { LINE_STEP, drawLine } from '../../src/core/course-line.js';
import { TICK } from '../../src/core/kinds.js';
import { flight } from './course-kit.js';

// Shared by the line's tests (world 22, Leg 2): a quiet course world past its intro, holding the ability 'line' unless the
// test says otherwise, with the ship put and the line drawn by hand, so each rule is tried on its own.
export const Y = 800; // the row the tests' strokes lie on
export const lineWorld = (starts = ['line']) => flight([], { starts });

// The ship put at (x, y), as if it had been there all tick (no move to sweep).
export function put(world, x, y = Y) {
  Object.assign(world.ship, { x, y, fromX: x, fromY: y });
}

// The ship put at `x` and the line drawn from it a tick later, then to `x + dx`: for a dx of a whole number of segments, that many
// segments lie along the row, the first starting at `x`. The pen is left where the last one ends.
export function stroke(world, x, dx, y = Y) {
  put(world, x, y);
  drawLine(world, TICK);
  put(world, x + dx, y);
  drawLine(world, TICK);
}
export const hline = (world, x, segs, y = Y) => stroke(world, x, segs * LINE_STEP, y);
