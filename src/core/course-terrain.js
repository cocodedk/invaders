import { WIDTH } from './kinds.js';
import { SHIP_R, hitShip, fromOf } from './ship.js';
import { segBoxDist2, lerp } from './math.js';
import { SPAWN_Y, BOXES } from './course-kinds.js';

// The terrain of a course (world 22): the walls that narrow and widen the flyable band, and the boxes that stand in
// it (BOXES: the pillars and the thorn pieces of a hedge). Both ram: a ship that touches one loses a life through hitShip ('wall', and the
// box's kind, 'pillar' or 'thorn'), so the shield and the blinking protect as against anything else: a shielded ship skims the rock
// (hitShip sounds a shield hit on every tick it does), and a ship whose blinking ends inside it is hit on that tick. At most one
// hit a tick, the wall's or else a box's (the first on the ground list that the ship's path touched).
// The ship is tested along the path it moved this tick, from fromOf to where it is (R68: the pointer moves it at once).

export const WALL_SAMPLES = 24; // points along that path, both ends included, whose place on the band the wall test looks at

// The band, { left, right } in px, a course holds open at `at` px of scroll. `course` is the level's course data
// (`level.course`, whose `walls` are the [at, left, right] keyframes in order of `at`), not world.course: it takes no
// world, so the fairness tests and the view can ask the same question. It is linear between two keyframes and flat
// before the first and after the last; a course with no walls is open across the whole width.
export function bandAt(course, at) {
  const walls = course.walls ?? [];
  if (walls.length === 0) return { left: 0, right: WIDTH };
  if (at <= walls[0][0]) return { left: walls[0][1], right: walls[0][2] };
  for (let i = 1; i < walls.length; i++) {
    const [at0, left0, right0] = walls[i - 1];
    const [at1, left1, right1] = walls[i];
    if (at > at1) continue;
    const t = (at - at0) / (at1 - at0); // at > at0 here (the one before was passed), so at1 > at0: never 0 / 0
    return { left: lerp(left0, left1, t), right: lerp(right0, right1, t) };
  }
  const [, left, right] = walls[walls.length - 1];
  return { left, right };
}

// Did the ship's centre, at one of WALL_SAMPLES points along its move, bring its disc against the rock? The screen
// row y is where the course has scrolled to dist + SPAWN_Y - y (course.js puts the ground there the other way round).
function hitsWall(world) {
  const s = world.ship;
  const { x, y } = fromOf(s);
  for (let i = 0; i < WALL_SAMPLES; i++) {
    const t = i / (WALL_SAMPLES - 1);
    const px = lerp(x, s.x, t);
    const { left, right } = bandAt(world.level.course, world.course.dist + SPAWN_Y - lerp(y, s.y, t));
    if (px - SHIP_R < left || px + SHIP_R > right) return true;
  }
  return false;
}

// A box is a ground object { kind, x, y, w, h, hp } (kind in BOXES) whose (x, y) is the centre of its box. It rams while it has hp: one the
// ship's shots have broken this tick (course-shots.js runs before) no longer does. The box the ship's path touched, or undefined.
function rammedBox(world) {
  const s = world.ship;
  const { x, y } = fromOf(s);
  const touches = (g) => BOXES.includes(g.kind) && g.hp > 0 && segBoxDist2(x, y, s.x, s.y, g.x, g.y, g.w, g.h) <= SHIP_R * SHIP_R;
  return world.course.ground.find(touches);
}

// The tick's terrain hits (stepCourse calls it once the ground is where the scroll puts it).
export function terrainHits(world) {
  if (!world.ship.alive) return;
  if (hitsWall(world)) {
    hitShip(world, 'wall');
    return;
  }
  const box = rammedBox(world);
  if (box) hitShip(world, box.kind);
}
