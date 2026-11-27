// The art of a course's land (world 22): one strip of the mockup's ground, drawn into any context, as pencil on parchment or as the same land in
// colour (course-land.js bakes the strips and stamps the colour through the marks). Everything is a function of `at`, the row of the course, and of
// the seed, never of a clock or dice, so a strip bakes the same every time; the specks lie whole inside their strip, rolled from the strip's own dice.
// The valley floor (scatter, riverAt) is in course-land-valley.js and is re-exported here.
//   paintStrip(g, painted, k, seed, course)   strip k, which covers the rows k * STRIP_SPAN to (k + 1) * STRIP_SPAN, its top row the highest row; the
//                                             rock is cut out of it last, with its contour lines on the sketch (course-land-rock.js)
//   scatter(seed, k, course)                  its trees and fields, { x, y } in the strip: only in the band (course is the level's course data)
//   riverAt(at) -> { x, w }                   the river's middle and half width on a row
// The land ends where course-land-end.js says: past that row a strip is blank parchment (flecked as the rest, in colour as in pencil, so a seed's
// colour changes nothing there) with the guide lines and the pencil line that leads on from the river's middle; no tree, field or river lies past it.
import { W, rgba } from './sprites.js';
import { PAL } from './wander-kit.js';
import { LAND_WOOD } from '../core/levels-8-kit.js';
import { paintRock } from './course-land-rock.js';
import { landEnd, paintRunout } from './course-land-end.js';
import { pathAt, paintWood } from './course-land-wood.js';
import { paintTrace } from './course-land-trace.js';
import { STRIP_SPAN, dice, riverAt, paintValley } from './course-land-valley.js';

export { STRIP_SPAN, TREE_MARGIN, FIELD_MARGIN, scatter, riverAt } from './course-land-valley.js'; // the valley floor's, kept here for the callers of the land's art

export const SPECKS = 500; // flecks on a strip's parchment
// Flecks on the parchment of the top h rows of a strip: SPECKS to a whole strip, as many to the row for part of one.
function flecks(g, r, h) {
  for (let i = 0; i < Math.round(SPECKS * h / STRIP_SPAN); i++) {
    g.fillStyle = rgba('#786446', 0.02 + r() * 0.08);
    g.fillRect(r() * (W - 2), r() * (h - 2), 2, 2);
  }
}

const riverX = (at) => riverAt(at).x; // the pencil line past the land's end is the river's middle, run on, or the path's middle on the wood
const pathX = (at) => pathAt(at).x;

// One strip's art: the parchment (flecked) or the green, the valley's fields, river and trees (course-land-valley.js, not on Leg 2's land); the blank past the land's end over the top of them (the same
// flecked parchment, the guide lines and the line, in both bakes, so that a seed's colour stamped there changes nothing); and last the rock cut out of it
// (course-land-rock.js).
export function paintStrip(g, painted, k, seed, course) {
  const lo = k * STRIP_SPAN;
  const hi = lo + STRIP_SPAN;
  const end = landEnd(course);
  const blank = Math.max(0, Math.min(STRIP_SPAN, hi - end)); // rows of the strip's top that lie past the end
  if (blank < STRIP_SPAN) {
    g.fillStyle = painted ? PAL.paint : PAL.parchment;
    g.fillRect(0, 0, W, STRIP_SPAN);
    if (!painted) flecks(g, dice(seed + 1, k), STRIP_SPAN);
    if (course.land === LAND_WOOD) { paintWood(g, painted, k, seed, course, end); paintTrace(g, painted, k, course); }
    else paintValley(g, painted, k, seed, course, end);
  }
  if (blank > 0) {
    g.fillStyle = PAL.parchment;
    g.fillRect(0, 0, W, blank);
    flecks(g, dice(seed + 2, k), blank);
    paintRunout(g, lo, hi, end, course.land === LAND_WOOD ? pathX : riverX);
  }
  paintRock(g, painted, lo, hi, course);
}
