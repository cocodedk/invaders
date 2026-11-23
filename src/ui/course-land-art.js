// The art of a course's land (world 22): one strip of the mockup's ground, drawn into any context, as pencil on parchment or as the same land in
// colour (course-land.js bakes the strips and stamps the colour through the marks). Everything is a function of `at`, the row of the course, and of
// the seed, never of a clock or dice, so a strip bakes the same every time. The river is a function of `at`, so it runs on through every seam;
// what is scattered (trees, fields, specks) lies whole inside its strip, rolled from the strip's own dice.
//   paintStrip(g, painted, k, seed, course)   strip k, which covers the rows k * STRIP_SPAN to (k + 1) * STRIP_SPAN, its top row the highest row; the
//                                             rock is cut out of it last, with its contour lines on the sketch (course-land-rock.js)
//   scatter(seed, k, course)                  its trees and fields, { x, y } in the strip: only in the band (course is the level's course data)
//   riverAt(at) -> { x, w }                   the river's middle and half width on a row
// The land ends where course-land-end.js says: past that row a strip is blank parchment (flecked as the rest, in colour as in pencil, so a seed's
// colour changes nothing there) with the guide lines and the pencil line that leads on from the river's middle; no tree, field or river lies past it.
import { W, rgba, hash } from './sprites.js';
import { MID_X } from '../core/kinds.js';
import { bandAt } from '../core/course-terrain.js';
import { PAL } from './wander-kit.js';
import { paintRock } from './course-land-rock.js';
import { landEnd, paintRunout } from './course-land-end.js';

export const STRIP_SPAN = 360; // px of `at` a strip covers
export const SPECKS = 500; // flecks on a strip's parchment
export const TREE_TRIES = 50; // spots tried for trees on a strip: the ones in the band and off the river stay
export const FIELD_TRIES = 2;
export const TREE_MARGIN = 30; // px a tree keeps from its strip's edges (its poppies reach furthest)
export const FIELD_MARGIN = 80; // and a tilted field
const TREE_R = 10; // px: radius of the smallest tree, and TREE_VAR the most it grows
const TREE_VAR = 10;
const FIELD = { w: 130, wVar: 45, h: 80, hVar: 25, tilt: 0.5 }; // px, and the tilt in rad
// The river, the mockup's scaled by 1920/1600: its middle sways about the middle of the world and its width swells and shrinks; RIVER_STEP is the px
// of `at` between the points its banks are drawn through (it divides STRIP_SPAN, so every strip has a point on each seam).
const RIVER = { sway: 132, wave: 252, width: 41, swell: 10, swellWave: 108 };
const RIVER_STEP = 6;
const RIPPLE_STEP = 11;
const RIPPLE_RISE = 8; // px a ripple's stroke rises

const pencil = (a) => rgba(PAL.pencil, a);
export const riverAt = (at) => ({ x: MID_X + RIVER.sway * Math.sin(at / RIVER.wave + 0.5), w: RIVER.width + RIVER.swell * Math.sin(at / RIVER.swellWave) });

// A strip's own dice: the same strip of the same seed always rolls the same numbers.
const dice = (seed, k) => {
  const base = seed * 7919 + k * 104729;
  let i = 0;
  return () => hash(base + 31 * i++);
};

// Is a thing `half` px wide (and `reach` px up and down) at x on the row `at` inside the band and off the river, `gap` px to spare, and before the land's end?
const clear = (course, end, x, at, half, reach, gap) =>
  [at - reach, at, at + reach].every((a) => {
    const { left, right } = bandAt(course, a);
    const rv = riverAt(a);
    return a < end && x - half - gap > left && x + half + gap < right && Math.abs(x - rv.x) > rv.w + half + gap;
  });

// The trees and fields of strip k, { x, y } in the strip (y down from its top, so the course row is (k + 1) * STRIP_SPAN - y).
export function scatter(seed, k, course) {
  const r = dice(seed, k);
  const hi = (k + 1) * STRIP_SPAN;
  const end = landEnd(course);
  const fields = [];
  const trees = [];
  for (let i = 0; i < FIELD_TRIES; i++) {
    const f = { w: FIELD.w + r() * FIELD.wVar, h: FIELD.h + r() * FIELD.hVar, x: r() * W, y: FIELD_MARGIN + r() * (STRIP_SPAN - 2 * FIELD_MARGIN), a: (r() - 0.5) * FIELD.tilt };
    if (clear(course, end, f.x, hi - f.y, f.w / 2, FIELD_MARGIN, 20)) fields.push(f);
  }
  for (let i = 0; i < TREE_TRIES; i++) {
    const t = { x: r() * W, y: TREE_MARGIN + r() * (STRIP_SPAN - 2 * TREE_MARGIN), s: TREE_R + r() * TREE_VAR, wob: Array.from({ length: 14 }, r), pop: Array.from({ length: 11 }, r) };
    if (clear(course, end, t.x, hi - t.y, 0, 0, 36)) trees.push(t);
  }
  return { trees, fields };
}

function field(g, f, painted) {
  g.save();
  g.translate(f.x, f.y);
  g.rotate(f.a);
  if (painted) {
    g.fillStyle = PAL.field;
    g.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
  }
  g.strokeStyle = painted ? rgba(PAL.fieldLine, 0.6) : pencil(0.45);
  g.lineWidth = 1.2;
  g.strokeRect(-f.w / 2, -f.h / 2, f.w, f.h);
  g.beginPath();
  for (let x = -f.w / 2 + 8; x < f.w / 2; x += 9) {
    g.moveTo(x, -f.h / 2);
    g.lineTo(x, f.h / 2);
  }
  g.stroke();
  g.restore();
}

// The river through strip k, drawn from one step past each end so that no bank breaks and no fill closes inside the strip, and stopping on the row `end`.
function river(g, k, painted, end) {
  const lo = k * STRIP_SPAN;
  const hi = lo + STRIP_SPAN;
  const pts = [];
  for (let at = lo - RIVER_STEP; at <= hi + RIVER_STEP; at += RIVER_STEP) {
    const row = Math.min(at, end);
    pts.push({ ...riverAt(row), y: hi - row });
    if (row === end) break;
  }
  if (painted) {
    g.beginPath();
    for (const p of pts) g.lineTo(p.x - p.w, p.y);
    for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].x + pts[i].w, pts[i].y);
    g.closePath();
    g.fillStyle = PAL.river;
    g.fill();
  }
  g.strokeStyle = painted ? PAL.riverDeep : pencil(0.8);
  g.lineWidth = 2.2;
  for (const side of [-1, 1]) {
    g.beginPath();
    for (const p of pts) g.lineTo(p.x + side * p.w, p.y);
    g.stroke();
  }
  g.strokeStyle = painted ? 'rgba(220,250,245,0.5)' : pencil(0.3);
  g.lineWidth = 1.2;
  g.beginPath();
  for (let at = Math.ceil((lo - 12) / RIPPLE_STEP) * RIPPLE_STEP; at <= Math.min(hi + 12, end - RIPPLE_RISE); at += RIPPLE_STEP) {
    const { x, w } = riverAt(at);
    g.moveTo(x - w * 0.6, hi - at);
    g.lineTo(x - w * 0.1, hi - at - RIPPLE_RISE);
  }
  g.stroke();
}

// A tree: a wobbly pencil ring and a stroke for its trunk's shadow; in colour a round crown with a highlight, and sometimes poppies by it.
function tree(g, t, painted) {
  const { x, y, s } = t;
  if (painted) {
    g.fillStyle = PAL.leaf;
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.fill();
    g.fillStyle = rgba(PAL.leafLight, 0.6);
    g.beginPath();
    g.arc(x - s * 0.3, y - s * 0.3, s * 0.45, 0, 7);
    g.fill();
    if (t.pop[0] < 0.5) {
      g.fillStyle = PAL.poppy;
      for (let j = 0; j < 5; j++) g.fillRect(x + 22 + t.pop[1 + 2 * j] * 29, y + t.pop[2 + 2 * j] * 24, 3, 3);
    }
    return;
  }
  g.strokeStyle = pencil(0.6);
  g.lineWidth = 1.3;
  g.beginPath();
  t.wob.forEach((v, j) => g.lineTo(x + Math.cos(j * 0.5) * s * (0.85 + v * 0.3), y + Math.sin(j * 0.5) * s * (0.85 + v * 0.3)));
  g.stroke();
  g.beginPath();
  g.moveTo(x + s * 0.5, y + s);
  g.lineTo(x + s * 1.3, y + s * 0.4);
  g.stroke();
}

// Flecks on the parchment of the top h rows of a strip: SPECKS to a whole strip, as many to the row for part of one.
function flecks(g, r, h) {
  for (let i = 0; i < Math.round(SPECKS * h / STRIP_SPAN); i++) {
    g.fillStyle = rgba('#786446', 0.02 + r() * 0.08);
    g.fillRect(r() * (W - 2), r() * (h - 2), 2, 2);
  }
}

const riverX = (at) => riverAt(at).x; // the pencil line past the land's end is the river's middle, run on

// One strip's art: the parchment (flecked) or the green, the fields, the river, the trees; the blank past the land's end over the top of them (the same
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
    const { trees, fields } = scatter(seed, k, course);
    for (const f of fields) field(g, f, painted);
    river(g, k, painted, end);
    for (const t of trees) tree(g, t, painted);
  }
  if (blank > 0) {
    g.fillStyle = PAL.parchment;
    g.fillRect(0, 0, W, blank);
    flecks(g, dice(seed + 2, k), blank);
    paintRunout(g, lo, hi, end, riverX);
  }
  paintRock(g, painted, lo, hi, course);
}
