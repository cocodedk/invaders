// The ground of a course (world 22), drawn where the other worlds draw their sky and layers (view.js, `look.ground`), plain as the mockup:
//   buildCourseView(seed) -> cv     the view's state: the strips of land (course-land.js), baked as the scroll brings them in
//   drawCourse(ctx, cv, world, t)   the ground under the field's craft, back to front: the rock's tan either side of the band, the land slid down
//                                   by the scroll over it (pencil on parchment, the colour the seeds have brought back stamped into it, the rock
//                                   cut out of it with its contour lines pencilled in the hole: course-land-rock.js), the rock's pencilled edge,
//                                   the things that stand on the ground (course-objects.js), the ship's line hanging over them
//                                   (course-line-view.js), the seeds in the air and the sight of the next one
//   wallRows(courseData, dist) -> [{ at, y, left, right }]   the band at the rows the rock's edge is drawn through, top of the screen first
// Everything is placed from `world.course.dist`, the scroll, and from the course's own data and lists, never from a clock, so one world
// gives one picture (t only moves an eye). The screen row y is at = dist + SPAWN_Y - y of the course, which is what bandAt answers to
// and what the collision asks (course-terrain.js), so the rock drawn is the rock that rams. Pi 4: no gradients per frame, no shadow
// blur, a few hundred path operations at most (the rock's fill and edge are the bulk of them; its contours are baked into the strips).
import { W, H, rgba } from './sprites.js';
import { TAU } from '../core/math.js';
import { bandAt } from '../core/course-terrain.js';
import { SPAWN_Y } from '../core/course-kinds.js';
import { SEED_REACH, SEED_FALL } from '../core/course-seed.js';
import { drawObjects } from './course-objects.js';
import { drawCourseLine } from './course-line-view.js';
import { createLand, drawLand } from './course-land.js';
import { PAL } from './wander-kit.js';
import { LAND_WOOD } from '../core/levels-8-kit.js';

export const WALL_STEP = 32; // px of the course (of `at`) between the rows the rock's edge is drawn through, besides one row on every keyframe
export const SEED_DROP = 80; // px above the ground a seed starts its fall
export const SIGHT_R = 30; // px: the dashed ring where the next seed would land
const SIDES = [-1, 1]; // the left rock and the right rock
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

// The rock on one side (side -1 the left, 1 the right): a filled polygon out to the screen's edge, drawn under the land, whose strips have the rock cut
// out of them (course-land-rock.js) so the tan shows through, and its edge pencilled over the land.
const open = (rows, side) => rows.every((r) => (side < 0 ? r.left : r.right) === (side < 0 ? 0 : W)); // the band is open on this side

function rockFill(ctx, rows, side, fill) {
  if (open(rows, side)) return;
  const wall = side < 0 ? 0 : W;
  ctx.beginPath();
  ctx.moveTo(wall, rows[0].y);
  for (const r of rows) ctx.lineTo(side < 0 ? r.left : r.right, r.y);
  ctx.lineTo(wall, rows[rows.length - 1].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function rockEdge(ctx, rows, side) {
  if (open(rows, side)) return;
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
  const rows = wallRows(world.level.course, course.dist);
  const fill = world.level.course.land === LAND_WOOD ? PAL.canopyEdge : PAL.rock; // view only: the core never reads the land key
  for (const side of SIDES) rockFill(ctx, rows, side, fill);
  drawLand(ctx, cv.land, world);
  for (const side of SIDES) rockEdge(ctx, rows, side);
  drawObjects(ctx, world, t);
  drawCourseLine(ctx, course);
  seeds(ctx, course);
  sight(ctx, world);
}
