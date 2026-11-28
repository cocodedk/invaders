import { segSegDist2 } from './math.js';
import { hurtAlien } from './aliens.js';
import { GROUND_SCORE, hurtGround } from './course-ground.js';
import { BOXES, LINE_STEP } from './course-kinds.js';
import { emit } from './util.js';

// The lasso (world 22, Leg 3 on): once the ship holds the ability 'lasso', the line it draws (course-line.js) closes on itself. When the newest
// segment touches or crosses an older one, within LOOP_SNAP px (the oldest it can, with the segments between them one unbroken chain: a stretch lineStops bit out breaks it)
// and the loop between holds at least LOOP_MIN_SEGS segments and LOOP_MIN_AREA px2 (a retraced stroke or a wobble closes nothing), closeLoop
// catches what is inside, by an even-odd ray cast, in array order: every enemy bullet (a laser too: life 0, settled, no dodge), every air craft
// (killed, scored), every ground object that can be hurt (broken, scored, a crate drops what it holds), then the pickups, which fly to the ship
// (the bomb a crate just let go included). A round thing counts by its centre, a box (BOXES) by all four corners; a lantern and the rest
// stay. The loop's ink goes (the segments from the crossed one on; older ink stays) and the lasso rests LASSO_RECHARGE s: course.lassoCool
// counts down in drawLine, and closeLoop is not tried while it runs, so one pointer jump that draws a figure-eight closes one loop. It says
// 'lasso' { x, y, poly, shots, craft, ground, pickups }: poly the loop's points, flat [x0, y0, ...], x, y their centre, the rest what it caught.

export const LASSO_INK = 2400; // px of stroke the line holds at most with the lasso (a loop of radius 200 is about 1250)
export const LASSO_SEGS = Math.floor(LASSO_INK / LINE_STEP);
export const LASSO_LIFE = 4; // s a segment hangs with the lasso
export const LOOP_MIN_SEGS = 8; // segments a loop holds at least
export const LOOP_MIN_AREA = 6000; // px2 a loop encloses at least
export const LOOP_SNAP = 6; // px: the newest segment closes on an older one it comes this near (the ink is drawn about this wide)
export const LASSO_RECHARGE = 1.5; // s after a loop closes before the next can

function area(poly) {
  let sum = 0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    sum += p.x * q.y - q.x * p.y;
  });
  return Math.abs(sum) / 2;
}

function inside(poly, x, y) {
  let odd = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = [poly[i], poly[j]];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) odd = !odd;
  }
  return odd;
}

const holds = (poly, g) => (BOXES.includes(g.kind)
  ? [-1, 1].every((sx) => [-1, 1].every((sy) => inside(poly, g.x + (sx * g.w) / 2, g.y + (sy * g.h) / 2)))
  : inside(poly, g.x, g.y));

// The oldest loop the newest segment closes, as its points, or null.
function findLoop(line) {
  const k = line.length - 1;
  let from = k; // the oldest segment of the unbroken chain that ends at k
  while (from > 0 && line[from].x1 === line[from - 1].x2 && line[from].y1 === line[from - 1].y2) from--;
  for (let j = from; j <= k - 3; j++) {
    const [a, b] = [line[j], line[k]];
    if (segSegDist2(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1, b.x2, b.y2) > LOOP_SNAP ** 2) continue;
    const poly = line.slice(j + 1).map((s) => ({ x: s.x1, y: s.y1 }));
    if (poly.length >= LOOP_MIN_SEGS && area(poly) >= LOOP_MIN_AREA) return { j, poly };
  }
  return null;
}

export function closeLoop(world) {
  const { course, ship, bullets, aliens, pickups } = world;
  const { line } = course;
  if (!ship.alive || line.length < LOOP_MIN_SEGS) return false;
  const found = findLoop(line);
  if (!found) return false;
  const { poly } = found;
  const caught = bullets.filter((b) => b.life > 0 && inside(poly, b.x, b.y));
  for (const b of caught) {
    b.life = 0;
    b.near = true;
  }
  const craft = aliens.filter((a) => a.hp > 0 && inside(poly, a.x, a.y));
  for (const a of craft) hurtAlien(world, a, a.hp);
  const before = pickups.length; // what a crate lets go in this catch lies past it, and is caught too
  const ground = course.ground.filter((g) => Object.hasOwn(GROUND_SCORE, g.kind) && g.hp > 0 && holds(poly, g));
  for (const g of ground) hurtGround(world, g, g.hp);
  let n = 0;
  pickups.forEach((p, i) => {
    if (i < before && !inside(poly, p.x, p.y)) return;
    Object.assign(p, { x: ship.x, y: ship.y });
    n++;
  });
  line.length = found.j;
  course.lassoCool = LASSO_RECHARGE;
  const c = { x: poly.reduce((s, p) => s + p.x, 0) / poly.length, y: poly.reduce((s, p) => s + p.y, 0) / poly.length };
  emit(world, 'lasso', { ...c, poly: poly.flatMap((p) => [p.x, p.y]), shots: caught.length, craft: craft.length, ground: ground.length, pickups: n });
  return true;
}
