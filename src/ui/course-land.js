// The land of a course (world 22), the mockup's ground baked in strips (the art is course-land-art.js): pencil on parchment, and under it the same
// land in colour, which a mark (course.marks, { x, at, r }: where a seed burst) lets through a soft circle.
//   createLand(seed) -> land      the view's state: a few strips, one scratch canvas and one soft circle, all made when first needed
//   drawLand(ctx, land, world)    blits the strips on or just above the screen at y = SPAWN_Y + dist - at, whole pixels (the scroll comes from
//                                 world.course.dist only); a frame that needs no baking draws no path and builds nothing
// A strip covers STRIP_SPAN of the course's rows and has two canvases: sketch, which the frame blits (the pencil art, and the colour stamped into
// it), and painted, the whole strip in colour, baked when a mark first touches it. Stamping a mark copies the painted square under its circle
// through the soft circle onto the sketch, once. A strip entering the screen is baked, and every strip again when the marks have gone back or
// changed (a respawn, a snapshot). At most BAKES_PER_FRAME strips are baked or stamped a frame, those on screen first and the one ahead last (an
// unbaked one is skipped: view.js has filled the parchment under it); only a view with nothing to show yet bakes the whole screen at once. Each strip's
// last row is also stretched over the seam under the next strip's first, so that no seam shows when the view scales the canvas. The pool keeps
// MAX_STRIPS strips, each two W x STRIP_SPAN canvases, and recycles them as the scroll moves. The rock is cut out of both canvases of a strip (a transparent
// hole, course-land-rock.js) so the live rock's tan, drawn under the strips, shows through, and no seed's colour is stamped into it; the sketch carries the
// rock's contour lines.
import { W, H, makeCanvas } from './sprites.js';
import { SPAWN_Y } from '../core/course-kinds.js';
import { SOFT_CORE } from '../core/course-seed.js';
import { STRIP_SPAN, paintStrip } from './course-land-art.js';

export const MAX_STRIPS = Math.ceil(H / STRIP_SPAN) + 2; // the strips on the screen at most, and the one above it that is baked ahead
export const BAKES_PER_FRAME = 2;
export const SEAM = 1; // rows either side of two strips' edge that the last row of the upper covers
export const SOFT_PX = 256; // the soft circle's sprite, baked once and drawn at the mark's size

export const createLand = (seed = 1) => ({ seed, slots: new Map(), free: [], marks: [], epoch: 0, scratch: null, soft: null });

// The marks the strips know, as values: when course.marks is shorter than they remember, or differs from it, every strip is stale.
function sync(land, marks) {
  const known = land.marks;
  const same = known.length <= marks.length && known.every((m, i) => m.x === marks[i].x && m.at === marks[i].at && m.r === marks[i].r);
  if (!same) {
    known.length = 0;
    land.epoch++;
  }
  for (let i = known.length; i < marks.length; i++) known.push({ x: marks[i].x, at: marks[i].at, r: marks[i].r });
}

function softCircle() {
  const c = makeCanvas(SOFT_PX, SOFT_PX);
  const g = c.getContext('2d');
  const m = SOFT_PX / 2;
  const grad = g.createRadialGradient(m, m, m * SOFT_CORE, m, m, m);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, SOFT_PX, SOFT_PX);
  return c;
}

// Let the colour through where a mark burst: the painted square under its circle, masked by the soft circle, onto the sketch, at whole pixels.
function stamp(land, s, m, course) {
  const hi = (s.k + 1) * STRIP_SPAN;
  if (m.at + m.r <= hi - STRIP_SPAN || m.at - m.r >= hi) return; // the circle misses this strip
  if (s.paintOf !== s.k) {
    paintStrip(s.painted.getContext('2d'), true, s.k, land.seed, course);
    s.paintOf = s.k;
  }
  land.soft ??= softCircle();
  // only the part of the circle's square inside this strip is worked on: (cx, cy, w, h) in strip pixels, the circle's square at (x0, y0), d wide
  const d = Math.ceil(2 * m.r);
  const [x0, y0] = [Math.round(m.x - m.r), Math.round(hi - m.at - m.r)];
  const [cx, cy] = [Math.max(0, x0), Math.max(0, y0)];
  const [w, h] = [Math.min(W, x0 + d) - cx, Math.min(STRIP_SPAN, y0 + d) - cy];
  if (w <= 0 || h <= 0) return;
  if (!land.scratch) land.scratch = makeCanvas(W, STRIP_SPAN);
  const g = land.scratch.getContext('2d');
  const k = SOFT_PX / d; // the soft circle's pixels per pixel of the mark
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, w, h);
  g.drawImage(land.soft, (cx - x0) * k, (cy - y0) * k, w * k, h * k, 0, 0, w, h);
  g.globalCompositeOperation = 'source-in';
  g.drawImage(s.painted, cx, cy, w, h, 0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  s.sketch.getContext('2d').drawImage(land.scratch, 0, 0, w, h, cx, cy, w, h);
}

// Bake a strip's sketch if it is new or stale, then stamp the marks it has not had yet.
function bake(land, s, course) {
  if (s.epoch !== land.epoch) {
    paintStrip(s.sketch.getContext('2d'), false, s.k, land.seed, course);
    Object.assign(s, { epoch: land.epoch, ready: true, n: 0 });
  }
  for (; s.n < land.marks.length; s.n++) stamp(land, s, land.marks[s.n], course);
}

function slotFor(land, k) {
  let s = land.slots.get(k);
  if (!s) {
    s = land.free.pop() ?? { sketch: makeCanvas(W, STRIP_SPAN), painted: makeCanvas(W, STRIP_SPAN), paintOf: null };
    Object.assign(s, { k, epoch: -1, ready: false, n: 0 });
    land.slots.set(k, s);
  }
  return s;
}

export function drawLand(ctx, land, world) {
  const { course } = world;
  sync(land, course.marks);
  const top = Math.round(SPAWN_Y + course.dist); // the screen row of at = 0
  const first = Math.floor((top - H) / STRIP_SPAN); // the strips on the screen, and one above it
  const last = Math.ceil(top / STRIP_SPAN) - 1;
  for (const [k, s] of land.slots) {
    if (k >= first && k <= last + 1) continue;
    land.slots.delete(k);
    land.free.push(s);
  }
  const order = [];
  for (let k = last; k >= first; k--) order.push(k);
  order.push(last + 1);
  // a view with nothing on screen to show yet (a new one, or a jump to land it has not baked) bakes the whole screen in its frame: a one-shot draw,
  // the lobby's poster, must show all of it; from there on it is BAKES_PER_FRAME a frame, so scrolling never hitches
  let bakes = order.some((k) => k <= last && land.slots.get(k)?.ready) ? BAKES_PER_FRAME : last - first + 1;
  for (const k of order) {
    const s = slotFor(land, k);
    if (bakes > 0 && (s.epoch !== land.epoch || s.n < land.marks.length)) {
      bake(land, s, world.level.course);
      bakes--;
    }
    if (k > last || !s.ready) continue;
    const y = top - (k + 1) * STRIP_SPAN;
    ctx.drawImage(s.sketch, 0, y);
    ctx.drawImage(s.sketch, 0, STRIP_SPAN - 1, W, 1, 0, y + STRIP_SPAN - SEAM, W, 2 * SEAM + 1); // the last row, stretched over the seam: where the view scales, the edge pixel is half covered by each strip and the fill shows
  }
}
