import { createWorld, stepWorld } from '../../src/core/world.js';
import { WIDTH, HEIGHT } from '../../src/core/kinds.js';
import { AIR_MARGIN } from '../../src/core/course-air.js';
import { TICK, IDLE, step } from './world-kit.js';

// Shared by the course tests (world 22): a test-only course level, which createWorld takes as it takes the
// tests' other own levels. `data` is the level's `course`: { speed, length, starts, walls, spawns }.
export const courseLevel = (data, d = 0.5) =>
  ({ id: 'test-course', world: 22, index: 1, seed: 1, d, twist: 'journey', free: true, bunkers: false, course: data });

// Where the air tests put things: a fraction of the width, and just off either side edge (a crossing's start).
export const col = (f) => WIDTH * f;
export const OFF_LEFT = -AIR_MARGIN / 2;
export const OFF_RIGHT = WIDTH + AIR_MARGIN / 2;
export const outside = (a) => a.x < -AIR_MARGIN || a.x > WIDTH + AIR_MARGIN || a.y > HEIGHT + AIR_MARGIN;
export const onScreen = (a) => a.x >= 0 && a.x <= WIDTH && a.y >= 0 && a.y <= HEIGHT;

// An air entry that comes up on the first play tick (at 0, unless given), over the shorthand's defaults.
export const air = (o = {}) => ({ kind: 'air', at: 0, role: 'g', path: 'swoop', x: col(0.4), pattern: 'aimed', ...o });

// A course world around `spawns` with its intro over, no play tick taken yet and the enemy quiet (fireMult 0
// unless given); `d` is the level's difficulty, `speed` the scroll's, px/s, and `starts` the abilities it begins with.
export function flight(spawns, { fireMult = 0, d, speed = 100, starts = [] } = {}) {
  const world = createWorld(courseLevel({ speed, length: 6000, starts, walls: [], spawns }, d));
  world.scale.fireMult = fireMult;
  while (world.state === 'intro') stepWorld(world, TICK, IDLE);
  return world;
}

// One tick of play on top of that: what spawns on it is in world.aliens afterwards, still at t = 0.
export const launched = (spawns, opts) => {
  const world = flight(spawns, opts);
  step(world);
  return world;
};
