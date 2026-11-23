import { EPS } from './kinds.js';
import { segDist2, segSegDist2 } from './math.js';
import { BULLET_HP } from './course-cut.js';
import { emit, prune } from './util.js';

// Your line (world 22, Leg 2 on): once the ship holds the ability 'line' (a lantern grants it, course-check.js), the path it flies hangs
// in the air and stops enemy fire. The strokes are in screen space and do not drift with the land. course.line is the ink, oldest first,
// each segment { x1, y1, x2, y2, t } (t its age, s); course.pen is where the last segment ended, { x, y }, or null while nothing is being
// drawn (the ship has not moved since it got the ability, or is down, or has just come back from a death: the line starts where the ship
// is, never at a distance, so a jump after a respawn draws nothing). Both are plain data, hashed once the line has been drawn (state-hash.js).
//   drawLine   each tick, after the ship has moved: age the ink and let go of what is LINE_LIFE old, then lay segments of LINE_STEP px from the
//              pen toward the ship while it is a step away or more (a pointer jump draws a long stroke in one tick), then rub out the oldest
//              until no more than LINE_SEGS are left: a flick across the field leaves only its last stretch, nearest the ship
//   lineStops  an enemy bullet whose move this tick (from where its velocity says it was over `slow`, the enemy time of the tick, to where it
//              is) comes within its radius of a segment breaks: it pays nothing (the gun's cut still does), counts as settled (a dodge it is
//              not), says 'lineStop' { x, y, pattern }, and rubs out the segment that stopped it and every one within LINE_BITE px of where it
//              ended for each hit point of its pattern (BULLET_HP, a pattern with none counting one), so a curtain wears the line through.
//              A laser, which no shot can break either, passes. The ship, its shots and the air craft pass through the line.
// stepPlay calls lineStops first, then drawLine: the stops use the ink laid before this tick, so a move never draws its own shield.

export const LINE_STEP = 16; // px: one segment's length
export const LINE_INK = 700; // px of stroke the line holds at most
export const LINE_SEGS = Math.floor(LINE_INK / LINE_STEP);
export const LINE_LIFE = 3; // s a segment hangs before it is gone
export const LINE_BITE = 12; // px of ink a stopped bullet rubs out around it, for each hit point it had

export function drawLine(world, dt) {
  const { course, ship } = world;
  if (!course.abilities.includes('line')) return;
  const { line } = course;
  for (const s of line) s.t += dt;
  prune(line, (s) => s.t < LINE_LIFE - EPS);
  if (!ship.alive) {
    course.pen = null;
    return;
  }
  if (course.pen === null) {
    course.pen = { x: ship.x, y: ship.y };
    return;
  }
  const { pen } = course;
  const dx = ship.x - pen.x;
  const dy = ship.y - pen.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.floor(dist / LINE_STEP);
  for (let i = 0; i < steps; i++) {
    const x2 = pen.x + (dx / dist) * LINE_STEP;
    const y2 = pen.y + (dy / dist) * LINE_STEP;
    line.push({ x1: pen.x, y1: pen.y, x2, y2, t: 0 });
    pen.x = x2;
    pen.y = y2;
  }
  if (line.length > LINE_SEGS) line.splice(0, line.length - LINE_SEGS);
}

export function lineStops(world, slow) {
  const { line } = world.course;
  if (line.length === 0) return;
  for (const b of world.bullets) {
    if (b.life <= 0 || b.pattern === 'laser') continue;
    const [x0, y0] = [b.x - b.vx * slow, b.y - b.vy * slow];
    const hit = line.find((s) => segSegDist2(x0, y0, b.x, b.y, s.x1, s.y1, s.x2, s.y2) <= b.r ** 2);
    if (!hit) continue;
    b.life = 0;
    b.near = true;
    emit(world, 'lineStop', { x: b.x, y: b.y, pattern: b.pattern });
    const bite = (LINE_BITE * (BULLET_HP[b.pattern] ?? 1)) ** 2;
    prune(line, (s) => s !== hit && segDist2(s.x1, s.y1, s.x2, s.y2, b.x, b.y) > bite);
  }
}
