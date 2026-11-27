// The rock of a strip of land (world 22): the highlands either side of the valley, as the mockup draws them. The rock itself (a tan fill and the pencilled
// edge) is live (course-view.js: the fill goes under the strips, the edge over them); this file cuts it out of the strips so the tan shows through, and
// pencils the contours into the hole, the lines of the mockup's highland: each the edge's own shape shifted into the rock, swaying as it goes. The lines
// are one opaque colour, the pencil as it shows on the tan: drawLand re-blits the last row of each strip over the seam (course-land.js), and in the hole
// nothing covers that row, so a translucent line would be inked twice there, a darker bead on every line at every seam.
//   paintRock(g, painted, lo, hi, course)   cut the rock out of a strip covering the rows lo to hi (its top row the highest): a transparent hole
//                                           along the very edge bandAt gives, in the sketch and in the painted strip alike (a seed's colour is
//                                           stamped through the painted one, and must not land in the rock); and, on the sketch only, the lines
//   contourOffset(at, k) -> px             how far into the rock line k (1 to CONTOURS) lies from the edge on the row at
// Everything is a function of `at`, the row of the course, so a line is the same whichever strip bakes it and scrolls with the land: no clock, no
// dice. The band is straight between two keyframes, so a hole through the keyframes is the edge exactly; a line sways, and is sampled every
// CONTOUR_STEP (which divides the strips' span, so every seam has a point on it) and on every keyframe.
import { W, mix } from './sprites.js';
import { bandAt } from '../core/course-terrain.js';
import { PAL } from './wander-kit.js';
import { LAND_WOOD } from '../core/levels-8-kit.js';

export const CONTOURS = 8; // pencilled lines inside the rock, as many as the mockup draws on its highland
export const CONTOUR_GAP = 30; // px between them, the first that far inside the rock (the mockup's own px, as is the sway)
export const CONTOUR_INK = 0.35; // how much of the pencil shows through on the tan, as the mockup's lines (rgba of the pencil at this alpha)
export const CONTOUR_WOBBLE = 6; // px a line sways from where the gap puts it, either way
export const CONTOUR_WAVE = 40; // px of `at` for one radian of the sway (the mockup's)
export const CONTOUR_STEP = 12; // px of `at` between the points a line is drawn through
export const SCALLOPS = 4; // rows of canopy scallops inside the wood's edge (Leg 2: course-land-wood.js has the floor)
export const SCALLOP_R = 14; // px: the radius of one scallop, a half circle bulging toward the valley
export const SCALLOP_GAP = 22; // px between the rows, the first that far inside the edge
export const SCALLOP_STEP = 28; // px of `at` between the scallops of a row (every other row shifted half a step)
export const SCALLOP_INK = 0.5; // how much of the canopy green the pencil lets through on the soft green
const OUT = 2; // px the hole reaches past the screen's edge
const SIDES = [-1, 1]; // the left rock, the right rock

export const contourOffset = (at, k) => k * CONTOUR_GAP + CONTOUR_WOBBLE * Math.sin(at / CONTOUR_WAVE + k);

// The band at every grid row from one step past each end of the span, and at every keyframe between those, highest row first. The step past the ends
// lets every line run on past the strip, so none breaks at a seam.
function rows(course, lo, hi) {
  const [first, last] = [Math.floor(lo / CONTOUR_STEP) * CONTOUR_STEP - CONTOUR_STEP, Math.ceil(hi / CONTOUR_STEP) * CONTOUR_STEP + CONTOUR_STEP];
  const ats = new Set();
  for (let at = first; at <= last; at += CONTOUR_STEP) ats.add(at);
  for (const [at] of course.walls ?? []) if (at > first && at < last) ats.add(at);
  return [...ats].sort((p, q) => q - p).map((at) => ({ at, ...bandAt(course, at) }));
}

const edgeOf = (r, side) => (side < 0 ? r.left : r.right);

// Leg 2: the rock's hole is massed canopy, rows of scallops along the edge, each on a grid fixed to `at` so two strips draw the seam alike.
function scallops(g, lo, hi, course) {
  g.strokeStyle = mix(PAL.canopyEdge, PAL.canopy, SCALLOP_INK);
  g.lineWidth = 1.4;
  g.beginPath();
  for (const side of SIDES) {
    for (let k = 0; k < SCALLOPS; k++) {
      const shift = (k % 2) * (SCALLOP_STEP / 2);
      const first = Math.floor((lo - SCALLOP_R - shift) / SCALLOP_STEP) * SCALLOP_STEP + shift;
      for (let at = first; at <= hi + SCALLOP_R; at += SCALLOP_STEP) {
        const x = edgeOf(bandAt(course, at), side) + side * (SCALLOP_R + k * SCALLOP_GAP);
        const y = hi - at;
        g.moveTo(x, y + side * SCALLOP_R);
        g.arc(x, y, SCALLOP_R, side < 0 ? Math.PI * 1.5 : Math.PI / 2, side < 0 ? Math.PI / 2 : Math.PI * 1.5);
      }
    }
  }
  g.stroke();
}

export function paintRock(g, painted, lo, hi, course) {
  const rs = rows(course, lo, hi);
  g.globalCompositeOperation = 'destination-out'; // whatever the colour, the fill takes the strip's pixels away
  g.fillStyle = '#000';
  for (const side of SIDES) {
    const out = side < 0 ? -OUT : W + OUT;
    g.beginPath();
    g.moveTo(out, hi - rs[0].at);
    for (const r of rs) g.lineTo(edgeOf(r, side), hi - r.at);
    g.lineTo(out, hi - rs[rs.length - 1].at);
    g.closePath();
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  if (painted) return;
  if (course.land === LAND_WOOD) return scallops(g, lo, hi, course);
  g.strokeStyle = mix(PAL.rock, PAL.pencil, CONTOUR_INK);
  g.lineWidth = 1.4;
  g.beginPath();
  for (const side of SIDES) {
    for (let k = 1; k <= CONTOURS; k++) {
      rs.forEach((r, i) => {
        const x = edgeOf(r, side) + side * contourOffset(r.at, k);
        if (i) g.lineTo(x, hi - r.at);
        else g.moveTo(x, hi - r.at);
      });
    }
  }
  g.stroke();
}
