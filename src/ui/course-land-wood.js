// The wood floor of a course's land (world 22, Leg 2, the Pencil Wood): a sandy path, pale clearings and canopy rings, drawn into a strip as pencil or as
// colour (course-land-art.js calls it for a course whose land is LAND_WOOD). As the valley's, it is a function of `at` and of the seed, never of a clock or dice:
// the path sways as a function of `at`, so it runs on through every seam; what is scattered lies whole inside its strip, rolled from the strip's own dice.
// A canopy is a scalloped pencil ring with a short hard noon shadow offset a few px (no blur); in colour a crown with a highlight, bluebells by it.
//   pathAt(at) -> { x, w }                          the path's middle and half width on a row
//   scatterWood(seed, k, course) -> { crowns, clearings }   { x, y, s, ... } in the strip: only in the band, off the path, before the land's end
//   paintWood(g, painted, k, seed, course, end)     strip k's clearings, path and the fallen pencil (course-land-trace.js, it lies on the ground), then the canopies over them, the path stopping on the row `end`
import { W, rgba } from './sprites.js';
import { MID_X } from '../core/kinds.js';
import { PAL } from './wander-kit.js';
import { STRIP_SPAN, dice, clear, WOBBLES } from './course-land-valley.js';
import { landEnd } from './course-land-end.js';
import { paintTrace } from './course-land-trace.js';

export const CROWN_TRIES = 22; // spots tried for canopies on a strip: the ones in the band and off the path stay
export const CLEARING_TRIES = 2;
export const WOOD_MARGIN = 60; // px a thing keeps from its strip's edges (a clearing's reach, a crown's shadow)
export const CROWN_R = 22; // px: radius of the smallest crown, and CROWN_VAR the most it grows
export const CROWN_VAR = 16;
export const CROWN_GAP = 24; // px a crown keeps from the path and the band's edge
export const SHADOW = { dx: 7, dy: 5, ink: 0.2 }; // the hard noon shadow: its offset in px and the pencil's alpha
export const CROWN_BUMPS = 9; // bumps round a canopy's ring
export const BELLS = 7; // bluebell dots by a crown
export const BELL = { gap: 6, rise: 12, spread: 24, size: 3 }; // a bell dot: px right of the crown's edge, px above its middle, the px the dice spread it over, its size
export const HIGHLIGHT = { off: 0.3, r: 0.4 }; // the crown's light patch, as shares of its radius: how far up and left of the middle, and its own radius
export const BUMP = { swell: 0.1, wobble: 0.05 }; // a canopy ring's radius, as shares of it: the scallops' swell and the wobble the dice add
export const CROWN_INK = { line: 0.6, width: 1.3 }; // a canopy's pencil outline: alpha and px
export const PATH_INK = { alpha: 0.7, width: 2 }; // the path's two edges on the sketch
export const CLEARING_INK = { painted: 0.15, sketch: 0.3, width: 1.2 }; // a clearing's outline: alpha on the colour bake and on the sketch, px
export const CLEARING = { rx: 90, rxVar: 40, ry: 50, ryVar: 20, gap: 30 };
export const PATH = { sway: 110, wave: 300, phase: 1.1, width: 34, swell: 8, swellWave: 130 };
export const PATH_STEP = 6; // px of `at` between the points the path is drawn through (it divides STRIP_SPAN, so every strip has a point on each seam)
const WOB = WOBBLES; // the valley's wobble table length
export const RING_POINTS = 48; // points a canopy's ring is drawn through (enough that its scallops read as round bumps)

const pencil = (a) => rgba(PAL.pencil, a);
export const pathAt = (at) => ({ x: MID_X + PATH.sway * Math.sin(at / PATH.wave + PATH.phase), w: PATH.width + PATH.swell * Math.sin(at / PATH.swellWave) });

export function scatterWood(seed, k, course) {
  const r = dice(seed + 3, k);
  const hi = (k + 1) * STRIP_SPAN;
  const end = landEnd(course);
  const clearings = [];
  const crowns = [];
  for (let i = 0; i < CLEARING_TRIES; i++) {
    const c = { x: r() * W, y: WOOD_MARGIN + r() * (STRIP_SPAN - 2 * WOOD_MARGIN), rx: CLEARING.rx + r() * CLEARING.rxVar, ry: CLEARING.ry + r() * CLEARING.ryVar };
    if (clear(course, end, pathAt, c.x, hi - c.y, c.rx, c.ry, CLEARING.gap)) clearings.push(c);
  }
  for (let i = 0; i < CROWN_TRIES; i++) {
    const t = { x: r() * W, y: WOOD_MARGIN + r() * (STRIP_SPAN - 2 * WOOD_MARGIN), s: CROWN_R + r() * CROWN_VAR, wob: Array.from({ length: WOB }, r), bells: Array.from({ length: 2 * BELLS }, r) };
    const inClearing = clearings.some((c) => ((t.x - c.x) / c.rx) ** 2 + ((t.y - c.y) / c.ry) ** 2 < 1.3);
    if (!inClearing && clear(course, end, pathAt, t.x, hi - t.y, t.s, t.s, CROWN_GAP)) crowns.push(t);
  }
  return { crowns, clearings };
}

// The path through strip k, from one step past each end so no edge breaks, stopping on the row `end`.
function path(g, k, painted, end) {
  const lo = k * STRIP_SPAN;
  const hi = lo + STRIP_SPAN;
  const pts = [];
  for (let at = lo - PATH_STEP; at <= hi + PATH_STEP; at += PATH_STEP) {
    const row = Math.min(at, end);
    pts.push({ ...pathAt(row), y: hi - row });
    if (row === end) break;
  }
  if (painted) {
    g.beginPath();
    for (const p of pts) g.lineTo(p.x - p.w, p.y);
    for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].x + pts[i].w, pts[i].y);
    g.closePath();
    g.fillStyle = PAL.sand;
    g.fill();
  }
  g.strokeStyle = painted ? PAL.sandLine : pencil(PATH_INK.alpha);
  g.lineWidth = PATH_INK.width;
  for (const side of [-1, 1]) {
    g.beginPath();
    for (const p of pts) g.lineTo(p.x + side * p.w, p.y);
    g.stroke();
  }
}

function clearing(g, c, painted) {
  g.beginPath();
  g.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, 7);
  if (painted) {
    g.fillStyle = PAL.clearing;
    g.fill();
  }
  g.strokeStyle = pencil(painted ? CLEARING_INK.painted : CLEARING_INK.sketch);
  g.lineWidth = CLEARING_INK.width;
  g.stroke();
}

// The scalloped ring of a canopy, centred on (x, y) at radius s.
function ring(g, t, x, y) {
  g.beginPath();
  for (let j = 0; j < RING_POINTS; j++) {
    const a = (j / RING_POINTS) * 2 * Math.PI;
    const rr = t.s * (1 + BUMP.swell * Math.abs(Math.sin((CROWN_BUMPS * a) / 2)) + BUMP.wobble * t.wob[j % WOB]);
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

function crown(g, t, painted) {
  const { x, y, s } = t;
  g.fillStyle = rgba(PAL.pencil, SHADOW.ink);
  ring(g, t, x + SHADOW.dx, y + SHADOW.dy);
  g.fill();
  if (painted) {
    g.fillStyle = PAL.canopy;
    ring(g, t, x, y);
    g.fill();
    g.fillStyle = PAL.canopyLight;
    g.beginPath();
    g.arc(x - s * HIGHLIGHT.off, y - s * HIGHLIGHT.off, s * HIGHLIGHT.r, 0, 7);
    g.fill();
    g.fillStyle = PAL.bluebell;
    for (let j = 0; j < BELLS; j++) g.fillRect(x + s + BELL.gap + t.bells[2 * j] * BELL.spread, y - BELL.rise + t.bells[2 * j + 1] * BELL.spread, BELL.size, BELL.size);
  }
  g.strokeStyle = pencil(CROWN_INK.line);
  g.lineWidth = CROWN_INK.width;
  ring(g, t, x, y);
  g.stroke();
}

export function paintWood(g, painted, k, seed, course, end) {
  const { crowns, clearings } = scatterWood(seed, k, course);
  for (const c of clearings) clearing(g, c, painted);
  path(g, k, painted, end);
  paintTrace(g, painted, k, course);
  for (const t of crowns) crown(g, t, painted);
}
