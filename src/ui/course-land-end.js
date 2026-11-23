// Where the land of a course (world 22) runs out. The valley stays whole through its last hold, the gate, and ends a margin past the hold's highest
// target (END_MARGIN, a seed's burst radius, so a seed that bursts on that target colours a whole circle): from that row up the land is blank
// parchment with a few faint construction lines and one pencil line leading on, the design's "The end", that the map is still being drawn and the road
// goes on. The row comes from the hold entry itself, the course's last, so a later leg's land ends where its own last hold is; a course with no hold
// has land to its length. The leg runs on END_RUN px of scroll past the hold's stop (course-kinds.js; a leg's length is the stop plus it), so once the
// gate has fallen the scroll goes on and the blank comes down the screen, and the ship flies into it and clears there.
// Art only: the walls past the gate still ram, so the rock goes on and is cut out of the blank as of any strip (course-land-rock.js).
//   landEnd(course) -> at                             the row the land ends on: the rows from it up are blank
//   paintRunout(g, lo, hi, end, lineX)                the guide lines and the pencil line for the rows of a strip (lo to hi, its top row the highest)
//                                                     that lie at or past `end`; lineX(at) is the x of the line on a row
// Everything is a function of `at`, so a strip bakes the same every time and the line runs on through every seam: it is drawn from one step past each
// end of the strip, and a guide that lies on a seam is drawn by both strips.
import { W, rgba } from './sprites.js';
import { MID_X } from '../core/kinds.js';
import { SEED_R } from '../core/course-seed.js';
import { PAL } from './wander-kit.js';

export const END_MARGIN = SEED_R; // rows the land runs on past the hold's highest target
export const GUIDE_GAP = 180; // rows between two guide lines (and the one down the middle): the paper's ruling, faint
export const GUIDE_INK = 0.16;
export const GUIDE_WIDTH = 1.2;
export const LINE_INK = 0.85; // the one line leading on, drawn as the rock's edge is
export const LINE_WIDTH = 3;
export const LINE_STEP = 6; // rows between the points the line is drawn through (it divides the strips' span, so every seam has a point on it)

export function landEnd(course) {
  const hold = course.spawns.findLast((e) => e.kind === 'hold');
  return hold ? hold.at + Math.max(...hold.targets.map((t) => t.dy)) + END_MARGIN : course.length;
}

export function paintRunout(g, lo, hi, end, lineX) {
  const first = Math.max(lo, end);
  g.strokeStyle = rgba(PAL.pencil, GUIDE_INK);
  g.lineWidth = GUIDE_WIDTH;
  g.beginPath();
  for (let at = Math.ceil(first / GUIDE_GAP) * GUIDE_GAP; at <= hi; at += GUIDE_GAP) {
    g.moveTo(0, hi - at);
    g.lineTo(W, hi - at);
  }
  g.moveTo(MID_X, 0);
  g.lineTo(MID_X, hi - first);
  g.stroke();
  const from = Math.max(lo - LINE_STEP, end);
  g.strokeStyle = rgba(PAL.pencil, LINE_INK);
  g.lineWidth = LINE_WIDTH;
  g.beginPath();
  g.moveTo(lineX(from), hi - from);
  for (let at = (Math.floor(from / LINE_STEP) + 1) * LINE_STEP; at <= hi + LINE_STEP; at += LINE_STEP) g.lineTo(lineX(at), hi - at);
  g.stroke();
}
