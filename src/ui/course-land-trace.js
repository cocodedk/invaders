// The fallen pencil of the Pencil Wood (world 22, Leg 2): a pencil the size of a tower lying in the quiet stretch after lantern 1, its point snapped off and
// lying a little apart, a short graphite line running on from the snap. The data's `trace: { at, x, a }` places it (the course row of its middle, its x, its
// angle in radians); the core never reads it. Pencil on the sketch; yellow lacquer and bare wood on the painted bake (what a seed stamps through).
// Every strip it overlaps draws the whole shape at the same course row and the canvas clips it, so no seam shows: nothing here is a function of a clock or dice.
//   traceReach(a) -> px                  how far (in rows) the shape reaches from its middle, up and down, at angle a
//   paintTrace(g, painted, k, course)    strip k's share of the pencil, if course.trace is set and the strip is within its reach
import { rgba } from './sprites.js';
import { PAL } from './wander-kit.js';
import { STRIP_SPAN } from './course-land-valley.js';

export const PENCIL = { body: 900, cone: 300, width: 110, tipGap: 40, tipLen: 90, tipTilt: 0.18, tipDrift: 26, lineLen: 260, lineWobble: 7, lineStep: 20, snapTeeth: 5 };
export const SNAP_TOOTH = 9; // px a jagged tooth of the snap reaches along the axis
export const TIP_MARK = { at: 0.7, half: 0.4 }; // the graphite tip's dark point: where it starts along the tip's length, and its half width as a share of the tip's
export const LINE_INK = { width: 3, wave: 31 }; // the graphite line: its px width, and the px of its length for one radian of its wobble
export const TRACE_INK = { line: 0.65, fine: 0.35, fade: 0.8 }; // pencil alphas: outlines, ridges, and the graphite line's start (it fades along its length)
const HALF = (PENCIL.body + PENCIL.cone) / 2;
const TAIL = HALF + PENCIL.tipGap + PENCIL.tipLen + PENCIL.lineLen; // the furthest the graphite line runs from the middle, along the axis
const TIP_HALF = 0.1; // the cone's point, as a share of the half width, where it snaps
export const TIP_POINT = { u: HALF + PENCIL.tipGap + PENCIL.tipLen * Math.cos(PENCIL.tipTilt), v: PENCIL.tipDrift + PENCIL.tipLen * Math.sin(PENCIL.tipTilt) }; // where the snapped point's graphite tip lies, in the axis' frame: the line starts here

export const traceReach = (a) => Math.ceil(TAIL * Math.abs(Math.sin(a)) + PENCIL.width);

const pencil = (a) => rgba(PAL.pencil, a);

function poly(g, pts, fill, stroke, width) {
  g.beginPath();
  for (const [u, v] of pts) g.lineTo(u, v);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  g.strokeStyle = stroke;
  g.lineWidth = width;
  g.stroke();
}

// The jagged edge of the snap at u, half width h: the cone's end and the tip piece's start are cut along it.
const teeth = (u, h, dir) => Array.from({ length: PENCIL.snapTeeth * 2 + 1 }, (_, i) => [u + dir * (i % 2) * SNAP_TOOTH, -h + (2 * h * i) / (PENCIL.snapTeeth * 2)]);

function body(g, painted) {
  const h = PENCIL.width / 2;
  const x0 = -HALF;
  const x1 = x0 + PENCIL.body;
  poly(g, [[x0, -h], [x1, -h], [x1, h], [x0, h]], painted ? PAL.lacquer : null, pencil(TRACE_INK.line), 2);
  g.strokeStyle = pencil(TRACE_INK.fine); // the hexagon's two ridges
  g.lineWidth = 1.2;
  for (const v of [-h / 2, h / 2]) { g.beginPath(); g.moveTo(x0, v); g.lineTo(x1, v); g.stroke(); }
  const tip = h * TIP_HALF;
  const snap = teeth(HALF, tip, -1);
  poly(g, [[x1, -h], ...snap.map(([u, v]) => [u, v]), [x1, h]], painted ? PAL.woodBare : null, pencil(TRACE_INK.line), 2);
}

// The snapped point, a little off the axis and tilted, its graphite tip toward the line.
function tip(g, painted) {
  const h = PENCIL.width / 2 * TIP_HALF;
  g.save();
  g.translate(HALF + PENCIL.tipGap, PENCIL.tipDrift);
  g.rotate(PENCIL.tipTilt);
  poly(g, [...teeth(0, h, 1), [PENCIL.tipLen, 0]], painted ? PAL.woodBare : null, pencil(TRACE_INK.line), 1.6);
  g.fillStyle = pencil(TRACE_INK.line);
  g.beginPath();
  g.moveTo(PENCIL.tipLen * TIP_MARK.at, -h * TIP_MARK.half);
  g.lineTo(PENCIL.tipLen, 0);
  g.lineTo(PENCIL.tipLen * TIP_MARK.at, h * TIP_MARK.half);
  g.fill();
  g.restore();
}

// The graphite the point left running on from the snap (it starts at the tip's point, TIP_POINT), wobbling a little and fading.
function line(g) {
  g.lineWidth = LINE_INK.width;
  for (let s = 0; s < PENCIL.lineLen; s += PENCIL.lineStep) {
    g.strokeStyle = pencil(TRACE_INK.fade * (1 - s / PENCIL.lineLen));
    g.beginPath();
    g.moveTo(TIP_POINT.u + s, TIP_POINT.v + PENCIL.lineWobble * Math.sin(s / LINE_INK.wave));
    g.lineTo(TIP_POINT.u + s + PENCIL.lineStep, TIP_POINT.v + PENCIL.lineWobble * Math.sin((s + PENCIL.lineStep) / LINE_INK.wave));
    g.stroke();
  }
}

export function paintTrace(g, painted, k, course) {
  const t = course.trace;
  if (!t) return;
  const lo = k * STRIP_SPAN;
  const reach = traceReach(t.a);
  if (t.at + reach <= lo || t.at - reach >= lo + STRIP_SPAN) return;
  g.save();
  g.translate(t.x, lo + STRIP_SPAN - t.at);
  g.rotate(t.a);
  body(g, painted);
  tip(g, painted);
  line(g);
  g.restore();
}
