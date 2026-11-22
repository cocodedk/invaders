// The ground of a course (world 22), drawn where the other worlds draw their sky and layers (view.js, `look.ground`), plain as the mockup:
//   buildCourseView(seed) -> cv     bakes the parchment once: one screen of it, flecked with specks and a few pencilled tufts
//   drawCourse(ctx, cv, world, t)   the ground under the field's craft, back to front: the parchment slid down by the scroll, the marks the
//                                   seeds have left (the colour coming back to the land), the rock either side of the band, the things
//                                   that stand on the ground (course-objects.js), the seeds in the air and the sight of the next one
//   wallRows(courseData, dist) -> [{ y, left, right }]   the band at the rows the rock's edge is drawn through
// Everything is placed from `world.course.dist`, the scroll, and from the course's own data and lists, never from a clock, so one world
// gives one picture (t only moves an eye). The screen row y is at = dist + SPAWN_Y - y of the course, which is what bandAt answers to
// and what the collision asks (course-terrain.js), so the rock drawn is the rock that rams. Pi 4: no gradients per frame, no shadow
// blur, about two hundred path operations at most (the rock is the bulk of them).
import { W, H, makeCanvas, rgba, hash } from './sprites.js';
import { TAU } from '../core/math.js';
import { bandAt } from '../core/course-terrain.js';
import { SPAWN_Y } from '../core/course-kinds.js';
import { SEED_REACH, SEED_FALL } from '../core/course-seed.js';
import { drawObjects } from './course-objects.js';
import { PAL } from './wander-kit.js';

export const WALL_STEP = 32; // px of screen between the rows the rock's edge is drawn through (the band is straight between its keyframes)
export const CONTOUR_GAP = 30; // px: how far inside the rock its pencilled contour runs
export const SEED_DROP = 80; // px above the ground a seed starts its fall
export const SIGHT_R = 30; // px: the dashed ring where the next seed would land
const SPECKS = 1500;
const TUFTS = 40;
const ROWS = Math.ceil(H / WALL_STEP) + 2; // one row above the screen to one below
const DASH = [6, 7];
const SOLID = [];

// The parchment, as tall as the screen so that two copies of it, slid by the scroll, cover it. Every speck and tuft lies whole inside it,
// so the seam shows nothing. Baked with `hash`, not dice.
export function buildCourseView(seed = 1) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = PAL.parchment;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < SPECKS; i++) {
    g.fillStyle = rgba('#786446', 0.02 + hash(seed * 9973 + i * 3 + 2) * 0.08);
    g.fillRect(hash(seed * 9973 + i * 3) * (W - 2), hash(seed * 9973 + i * 3 + 1) * (H - 2), 2, 2);
  }
  g.strokeStyle = rgba(PAL.pencil, 0.3);
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0; i < TUFTS; i++) { // a tuft: three short strokes up from one point
    const x = 24 + hash(seed * 7919 + i * 2) * (W - 48);
    const y = 24 + hash(seed * 7919 + i * 2 + 1) * (H - 48);
    for (const dx of [-5, 0, 5]) {
      g.moveTo(x, y);
      g.lineTo(x + dx, y - 9);
    }
  }
  g.stroke();
  return { tile: c };
}

export function wallRows(courseData, dist) {
  const rows = [];
  for (let i = 0; i < ROWS; i++) {
    const y = (i - 1) * WALL_STEP;
    const { left, right } = bandAt(courseData, dist + SPAWN_Y - y);
    rows.push({ y, left, right });
  }
  return rows;
}

// A line along the rock's edge, offset `inset` px into the rock, broken wherever it is off the screen.
function along(ctx, rows, side, inset) {
  let on = false;
  ctx.beginPath();
  for (const r of rows) {
    const x = (side < 0 ? r.left : r.right) + side * inset;
    if (side < 0 ? x <= 0 : x >= W) {
      on = false;
      continue;
    }
    if (on) ctx.lineTo(x, r.y);
    else ctx.moveTo(x, r.y);
    on = true;
  }
  ctx.stroke();
}

// The rock on one side (side -1 the left, 1 the right): a filled polygon out to the screen's edge, its edge and one contour pencilled.
function rock(ctx, rows, side) {
  const wall = side < 0 ? 0 : W;
  if (rows.every((r) => (side < 0 ? r.left : r.right) === wall)) return; // the band is open on this side
  ctx.beginPath();
  ctx.moveTo(wall, rows[0].y);
  for (const r of rows) ctx.lineTo(side < 0 ? r.left : r.right, r.y);
  ctx.lineTo(wall, rows[rows.length - 1].y);
  ctx.closePath();
  ctx.fillStyle = PAL.rock;
  ctx.fill();
  ctx.strokeStyle = rgba(PAL.pencil, 0.35);
  ctx.lineWidth = 1.4;
  along(ctx, rows, side, CONTOUR_GAP);
  ctx.strokeStyle = rgba(PAL.pencil, 0.85);
  ctx.lineWidth = 3;
  along(ctx, rows, side, 0);
}

// Every burst the seeds have left that is on the screen, as one path and one fill, so that overlaps do not stack.
function marks(ctx, course) {
  let seen = false;
  ctx.beginPath();
  for (const m of course.marks) {
    const y = SPAWN_Y + course.dist - m.at;
    if (y + m.r < 0 || y - m.r > H) continue;
    ctx.moveTo(m.x + m.r, y);
    ctx.arc(m.x, y, m.r, 0, TAU);
    seen = true;
  }
  if (!seen) return;
  ctx.fillStyle = rgba(PAL.paint, 0.6);
  ctx.fill();
}

// A seed falls onto the spot it was dropped on (it is fixed to the ground there): its shadow grows as it comes down.
function seeds(ctx, course) {
  for (const s of course.seeds) {
    const y = SPAWN_Y + course.dist - s.at;
    const k = Math.max(0, s.t / SEED_FALL); // 1 as it is dropped, 0 as it lands
    ctx.fillStyle = 'rgba(40,40,50,0.2)';
    ctx.beginPath();
    ctx.ellipse(s.x, y, 10 - 4 * k, 6 - 2 * k, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x, y - k * SEED_DROP, 4 + 3 * k, 0, TAU);
    ctx.fillStyle = PAL.gold;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = PAL.goldDeep;
    ctx.stroke();
  }
}

// Where a seed would land, shown while the ship has the ability and is alive.
function sight(ctx, { ship, course }) {
  if (!ship.alive || !course.abilities.includes('seed')) return;
  ctx.setLineDash(DASH);
  ctx.strokeStyle = PAL.goldDeep;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(ship.x, ship.y - SEED_REACH, SIGHT_R, 0, TAU);
  ctx.stroke();
  ctx.setLineDash(SOLID);
}

export function drawCourse(ctx, cv, world, t) {
  const { course } = world;
  const slide = Math.round(course.dist % H); // whole pixels: no resampling of the parchment
  ctx.drawImage(cv.tile, 0, slide - H);
  ctx.drawImage(cv.tile, 0, slide);
  marks(ctx, course);
  const rows = wallRows(world.level.course, course.dist);
  rock(ctx, rows, -1);
  rock(ctx, rows, 1);
  drawObjects(ctx, world, t);
  seeds(ctx, course);
  sight(ctx, world);
}
