import { HEIGHT } from './kinds.js';
import { prune } from './util.js';
import { spawnAir, stepAir } from './course-air.js';

// A course (world 22): a top-down scrolling level, a third kind beside wave levels and boss levels. The
// simulation stays in screen space with no camera; `world.course` is plain data (it survives structuredClone):
//   dist    px of scroll so far; it goes up by the course's speed every tick of play
//   next    how many of the level's spawn entries have come up (the entries are sorted by `at`)
//   ground  the objects on the ground now, each { id, kind, at, x, y, hp }; y is never stored as a speed, it is
//           derived from the scroll (y = SPAWN_Y + dist - at), so whatever stops `dist` stops the ground too
// The level's own data (`level.course`: speed, length, starts, walls, spawns) is read from the level, never copied.

export const SPAWN_Y = -80; // screen y of a thing on the tick dist reaches its `at`: just above the top edge
export const GROUND_MARGIN = -SPAWN_Y; // px below the screen a ground object may sink before it is dropped

export function createCourse(level) {
  return { dist: 0, next: 0, ground: [] };
}

// One tick of the course: scroll, move the air craft (course-air.js: they fly paths in seconds, not with the
// scroll), let the entries whose `at` has come up spawn in array order (an air craft becomes an alien, every
// other kind a plain ground object for now), put the ground where the scroll says, and drop what has sunk off
// the bottom. An air craft spawned this tick stands at its start until the next one.
export function stepCourse(world, dt) {
  const { course } = world;
  const { speed, spawns } = world.level.course;
  course.dist += speed * dt;
  stepAir(world, dt);
  while (course.next < spawns.length && spawns[course.next].at <= course.dist) {
    const e = spawns[course.next++];
    if (e.kind === 'air') spawnAir(world, e);
    else course.ground.push({ id: world.nextId++, kind: e.kind, at: e.at, x: e.x, y: 0, hp: e.hp ?? null });
  }
  for (const g of course.ground) g.y = SPAWN_Y + course.dist - g.at;
  prune(course.ground, (g) => g.y <= HEIGHT + GROUND_MARGIN);
}
