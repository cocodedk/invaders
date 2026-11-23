import { HEIGHT } from '../../src/core/kinds.js';
import { bandAt } from '../../src/core/course-terrain.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';

// What course-fair-kit.js and course-fair-wood.js both ask: the rows of a course, and the room the boxes (pillars, thorn pieces) leave in the band at one.

export const rowsOf = (lo, hi) => { // the integer rows from lo up to hi, and hi itself
  const rows = [];
  for (let at = lo; at < hi; at++) rows.push(at);
  return [...rows, hi];
};
export const courseRows = ({ length }) => rowsOf(SPAWN_Y - HEIGHT, length); // every row the ship may meet: the one at the bottom edge as the course starts, down to its end

// The px and the rows each box entry covers, in order of its left edge (a box's rows are its `at` +- h / 2).
export const blocksOf = (boxes) => boxes
  .map((p) => ({ left: p.x - p.w / 2, right: p.x + p.w / 2, top: p.at - p.h / 2, bottom: p.at + p.h / 2 }))
  .sort((a, b) => a.left - b.left);

// The widest gap at row `at`: the band less the blocks across it.
export function widestGap(course, blocks, at) {
  const { left, right } = bandAt(course, at);
  let widest = 0;
  let from = left;
  for (const b of blocks) {
    if (at < b.top || at > b.bottom) continue;
    widest = Math.max(widest, b.left - from);
    from = Math.max(from, b.right);
  }
  return Math.max(widest, right - from);
}
