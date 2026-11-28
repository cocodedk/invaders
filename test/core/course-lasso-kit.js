import { TICK } from '../../src/core/kinds.js';
import { LINE_STEP, drawLine } from '../../src/core/course-line.js';
import { ofType, step, bulletAt } from './world-kit.js';
import { air, flight } from './course-kit.js';
import { BULLET_R } from '../../src/core/patterns.js';
import { put } from './course-line-kit.js';

// Shared by the lasso's tests (world 22, Leg 3): a quiet course world holding 'lasso' with one armored craft, and a circle of flight flown by hand.
export const [CX, CY, R] = [900, 700, 200];
export const TURNS = 1.1; // a circle flown a little past its start, so the newest segment crosses the first
const STEP = LINE_STEP * 0.75; // px the ship moves a tick: a little under a segment, so the pen keeps up
const points = (r) => Math.ceil((2 * Math.PI * r) / STEP); // points in a whole turn
export const lassoWorld = (starts = ['line', 'lasso']) => {
  const world = flight([air({ role: 'a', path: 'hang' })], { starts });
  step(world);
  world.ship.invuln = Infinity;
  world.ship.cooldown = Infinity;
  Object.assign(world.aliens[0], { x: 10, y: 10 });
  return world;
};

// An enemy bullet of `pattern` standing at (x, y).
export function bullet(world, x, y, pattern = 'aimed') {
  bulletAt(world, x, y, 0, 0, BULLET_R);
  return Object.assign(world.bullets.at(-1), { pattern });
}

// A ground object put on the course, at screen (x, y).
export function gnd(world, kind, x, y, hp = 1, o = {}) {
  const g = { id: world.nextId++, kind, at: 0, x, y, hp, ...o };
  world.course.ground.push(g);
  return g;
}

// The ship flown round the circle at (CX, CY), r R unless given, `turns` times round from the angle `from` (in turns): one drawLine
// per point until a loop closes, or all in one tick with `once`. `ticks` stops after that many points.
export function circle(world, { r = R, turns = TURNS, from = 0, once = false, ticks = Infinity } = {}) {
  const at = (i) => {
    const a = (from + i / points(r)) * 2 * Math.PI;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  put(world, ...at(0));
  world.course.pen = null;
  drawLine(world, TICK);
  const n = Math.min(ticks, Math.round(turns * points(r)));
  for (let i = 1; i <= n && !ofType(world.events, 'lasso').length; i++) { // the flight ends where the loop closes
    put(world, ...at(i));
    if (!once) drawLine(world, TICK);
  }
  if (once) drawLine(world, TICK);
}
export const caught = (world, key) => ofType(world.events, 'lasso').reduce((n, e) => n + e[key], 0);
