// Where the land of a course (world 22) runs out. The valley ends on the row of the leg's last hold, its anchor (the gate's feet: HOLD_Y - SPAWN_Y before the
// leg's length, where the hold stops the scroll), and from that row up the land is blank parchment with a few faint construction lines and one pencil line
// leading on: the design's "The end", that the map is still being drawn and the road goes on. So the blank is what the top of the screen shows when the leg
// clears: the highest row on it then is length + SPAWN_Y, HOLD_Y px past the anchor. (Past the length itself nothing is ever on screen: the scroll stops.)
// The gate's own targets stand past the anchor (hold.targets' dy), so the gate itself stands on the blank, at the edge of the drawn land, and a seed that
// bursts on one colours only the rows below the edge. A ruling for the owner; to end the land elsewhere, change landEnd, nothing else.
// Art only: the walls past the anchor still ram, so the rock goes on and is cut out of the blank as of any strip (course-land-rock.js).
//   landEnd(course) -> at                             the row the land ends on: the rows from it up are blank
//   paintRunout(g, lo, hi, end, lineX)                the guide lines and the pencil line for the rows of a strip (lo to hi, its top row the highest)
//                                                     that lie at or past `end`; lineX(at) is the x of the line on a row
// Everything is a function of `at`, so a strip bakes the same every time and the line runs on through every seam: it is drawn from one step past each
// end of the strip, and a guide that lies on a seam is drawn by both strips.
import { W, rgba } from './sprites.js';
import { MID_X } from '../core/kinds.js';
import { HOLD_Y } from '../core/course-hold.js';
import { SPAWN_Y } from '../core/course-kinds.js';
import { PAL } from './wander-kit.js';

export const GUIDE_GAP = 180; // rows between two guide lines (and the one down the middle): the paper's ruling, faint
export const GUIDE_INK = 0.16;
export const GUIDE_WIDTH = 1.2;
export const LINE_INK = 0.85; // the one line leading on, drawn as the rock's edge is
export const LINE_WIDTH = 3;
export const LINE_STEP = 6; // rows between the points the line is drawn through (it divides the strips' span, so every seam has a point on it)

export const landEnd = (course) => course.length - (HOLD_Y - SPAWN_Y);

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
