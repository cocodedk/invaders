import { createWorld, stepWorld } from '../../src/core/world.js';
import { TICK } from '../../src/core/kinds.js';
import { parOf } from '../../src/core/pars.js';
import { SPAWN_Y, inView } from '../../src/core/course-kinds.js';
import { RESPAWN_Y } from '../../src/core/course-check.js';
import { GROUND_SCORE } from '../../src/core/course-ground.js';
import { SEED_REACH } from '../../src/core/course-seed.js';
import { bandAt } from '../../src/core/course-terrain.js';
import { IDLE } from './world-kit.js';

// A trivial pilot for a course (world 22): the proof that a leg can be cleared, not that a hand can dodge it (the design's
// Measuring). The ship cannot be hit, the fire button is held, and the pointer goes to
//   the nearest ground target it can still hurt that stands ahead of the seeds' landing line inside the band: its x, and the row a
//   seed dropped from there lands on it (a seed falls SEED_REACH px ahead of the ship), kept on the respawn line or above; or
//   with none, the middle of the band, on the respawn line.
// So the ground weapon is the only thing that has to break the gates of a hold, and the proof is that it can.

export const CLEAR_PARS = 3; // a leg must clear within this many of its pars

const hurtable = (g) => Object.hasOwn(GROUND_SCORE, g.kind) && g.hp > 0 && inView(g);

export function steer(world) {
  const { course, ship } = world;
  const data = world.level.course;
  const open = (g) => g.x >= bandAt(data, g.at).left && g.x <= bandAt(data, g.at).right;
  const ahead = course.ground.filter((g) => hurtable(g) && open(g) && g.y <= RESPAWN_Y - SEED_REACH);
  const g = ahead.reduce((best, o) => (best === null || o.y > best.y ? o : best), null); // the nearest: the lowest on the screen
  if (g) return { ...IDLE, fire: true, target: { x: Math.round(g.x), y: Math.round(Math.min(RESPAWN_Y, g.y + SEED_REACH)) } };
  const { left, right } = bandAt(data, course.dist + SPAWN_Y - ship.y);
  return { ...IDLE, fire: true, target: { x: Math.round((left + right) / 2), y: RESPAWN_Y } };
}

// The level flown until it is cleared, or for CLEAR_PARS pars: { world, types (the types of the events there were, in a Set),
// held (did a hold stand at any tick) }.
export function flyCourse(level) {
  const world = createWorld(level);
  const types = new Set();
  let held = false;
  for (let i = 0; i < (CLEAR_PARS * parOf(level)) / TICK && world.state !== 'cleared'; i++) {
    world.ship.invuln = Infinity;
    stepWorld(world, TICK, steer(world));
    held ||= world.course.held !== null;
    for (const e of world.events) types.add(e.type);
    world.events.length = 0;
  }
  return { world, types, held };
}
