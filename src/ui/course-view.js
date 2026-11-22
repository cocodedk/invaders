// The ground of a course (world 22), drawn where the other worlds draw their sky and layers (view.js, `look.ground`), plain as the mockup:
//   buildCourseView(seed) -> cv     the view's state: the strips of land (course-land.js), baked as the scroll brings them in
//   drawCourse(ctx, cv, world, t)   the ground under the field's craft, back to front: the land slid down by the scroll (pencil on parchment, the
//                                   colour the seeds have brought back stamped into it), the rock either side of the band, the things
//                                   that stand on the ground (course-objects.js), the seeds in the air and the sight of the next one
//   wallRows(courseData, dist) -> [{ at, y, left, right }]   the band at the rows the rock's edge is drawn through, top of the screen first
// Everything is placed from `world.course.dist`, the scroll, and from the course's own data and lists, never from a clock, so one world
// gives one picture (t only moves an eye). The screen row y is at = dist + SPAWN_Y - y of the course, which is what bandAt answers to
// and what the collision asks (course-terrain.js), so the rock drawn is the rock that rams. Pi 4: no gradients per frame, no shadow
// blur, a few hundred path operations at most (the rock is the bulk of them).
import { W, H, rgba } from './sprites.js';
import { TAU } from '../core/math.js';
import { bandAt } from '../core/course-terrain.js';
import { SPAWN_Y } from '../core/course-kinds.js';
import { SEED_REACH, SEED_FALL } from '../core/course-seed.js';
import { drawObjects } from './course-objects.js';
import { createLand, drawLand } from './course-land.js';
import { PAL } from './wander-kit.js';

export const WALL_STEP = 32; // px of the course (of `at`) between the rows the rock's edge is drawn through, besides one row on every keyframe
export const CONTOURS = 8; // pencilled lines inside the rock, as many as the mockup draws on its highland
export const CONTOUR_GAP = 30; // px between them, the first that far inside the rock
export const SEED_DROP = 80; // px above the ground a seed starts its fall
export const SIGHT_R = 30; // px: the dashed ring where the next seed would land
const DASH = [6, 7];
const SOLID = [];

export const buildCourseView = (seed = 1) => ({ land: createLand(seed) });

// The rows are fixed to the course, not to the screen: a row at every multiple of WALL_STEP in `at` and one on each keyframe of the walls in
// view, from one row above the screen to one below. The band is straight between two keyframes, so a polygon through them is the rock exactly,
// and as the scroll carries the rows down they keep their corners (rows fixed to the screen would cut a corner by a different amount every frame).
export function wallRows(courseData, dist) {
  const top = dist + SPAWN_Y + WALL_STEP; // the `at` of a row one step above the screen, and of one below:
  const bottom = dist + SPAWN_Y - H - WALL_STEP;
  const ats = new Set();
  for (let at = Math.ceil(top / WALL_STEP) * WALL_STEP; at >= bottom - WALL_STEP; at -= WALL_STEP) ats.add(at);
  for (const [at] of courseData.walls ?? []) if (at < top && at > bottom) ats.add(at);
  return [...ats].sort((p, q) => q - p).map((at) => ({ at, y: dist + SPAWN_Y - at, ...bandAt(courseData, at) }));
}

// A line along the rock's edge, broken wherever it is off the screen.
function along(ctx, rows, side) {
  let on = false;
  ctx.beginPath();
  for (const r of rows) {
    const x = side < 0 ? r.left : r.right;
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

// The contours, CONTOURS lines CONTOUR_GAP apart, each the edge's own shape shifted into the rock. The band is straight between two keyframes, so a
// line through the first and last row and every keyframe between them (wallRows leaves out one that lies in the gap between its last admitted
// row and the end row, so they are read from the walls) is exactly that shape, a few path operations a line in place of a row's worth.
function contours(ctx, rows, side, walls) {
  const [first, last] = [rows[0], rows[rows.length - 1]];
  const keys = walls.filter(([at]) => at < first.at && at > last.at).reverse().map(([at, left, right]) => ({ y: first.y + first.at - at, left, right }));
  const corners = [first, ...keys, last];
  ctx.strokeStyle = rgba(PAL.pencil, 0.35);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 1; k <= CONTOURS; k++) {
    corners.forEach((r, i) => {
      const x = (side < 0 ? r.left : r.right) + side * k * CONTOUR_GAP;
      if (i) ctx.lineTo(x, r.y);
      else ctx.moveTo(x, r.y);
    });
  }
  ctx.stroke();
}

// The rock on one side (side -1 the left, 1 the right): a filled polygon out to the screen's edge, its contours and its edge pencilled.
function rock(ctx, rows, side, walls) {
  const wall = side < 0 ? 0 : W;
  if (rows.every((r) => (side < 0 ? r.left : r.right) === wall)) return; // the band is open on this side
  ctx.beginPath();
  ctx.moveTo(wall, rows[0].y);
  for (const r of rows) ctx.lineTo(side < 0 ? r.left : r.right, r.y);
  ctx.lineTo(wall, rows[rows.length - 1].y);
  ctx.closePath();
  ctx.fillStyle = PAL.rock;
  ctx.fill();
  contours(ctx, rows, side, walls);
  ctx.strokeStyle = rgba(PAL.pencil, 0.85);
  ctx.lineWidth = 3;
  along(ctx, rows, side);
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
  drawLand(ctx, cv.land, world);
  const rows = wallRows(world.level.course, course.dist);
  const walls = world.level.course.walls ?? [];
  rock(ctx, rows, -1, walls);
  rock(ctx, rows, 1, walls);
  drawObjects(ctx, world, t);
  seeds(ctx, course);
  sight(ctx, world);
}
