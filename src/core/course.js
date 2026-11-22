import { HEIGHT } from './kinds.js';
import { prune } from './util.js';
import { spawnAir, stepAir } from './course-air.js';
import { spawnGround, stepGround } from './course-ground.js';
import { stepSeeds } from './course-seed.js';
import { SPAWN_Y, GROUND_MARGIN } from './course-kinds.js';

// A course (world 22): a top-down scrolling level, a third kind beside wave levels and boss levels. The
// simulation stays in screen space with no camera; `world.course` is plain data (it survives structuredClone):
//   dist    px of scroll so far; it goes up by the course's speed every tick of play
//   next    how many of the level's spawn entries have come up (the entries are sorted by `at`)
//   abilities  what the ship can do on the ground: 'seed' lets the gun drop seeds (course-seed.js); a level starts with
//           its `starts` and a checkpoint can grant more
//   seeds   the seeds in the air, { x, at, t }; seedCool is the s until the next may drop
//   marks   where seeds have burst, { x, at, r }; the view paints the ground's change from them
//   ground  the objects on the ground now, each { id, kind, at, x, y, hp } (a turret and a crate hold a little more,
//           course-ground.js); y is never stored as a speed, it is derived from the scroll (y = SPAWN_Y + dist - at),
//           so whatever stops `dist` stops the ground too
// The level's own data (`level.course`: speed, length, starts, walls, spawns) is read from the level, never copied.
// SPAWN_Y and the other constants more than one module reads are in course-kinds.js.

export function createCourse(level) {
  return { dist: 0, next: 0, ground: [], abilities: [...(level.course.starts ?? [])], marks: [], seeds: [], seedCool: 0 };
}

// One tick of the course: scroll, move the air craft (course-air.js: they fly paths in seconds, not with the
// scroll, and in `slow`, the enemy time of this tick: stepPlay's enemyDt, bullet time included; `dist` and the
// ground keep real time, but the turrets on it fire in `slow`), let the entries whose `at` has come up spawn in array
// order (an air craft becomes an alien, every other kind a ground object), put the ground where the scroll says, drop
// the seeds and let the ones and the bomb that are due hurt it (`input` is the tick's, course-seed.js), let the turrets
// fire (course-ground.js), and drop what has broken or sunk off the bottom. An air craft spawned this tick
// stands at its start until the next one.
export function stepCourse(world, dt, slow = dt, input = {}) {
  const { course } = world;
  const { speed, spawns } = world.level.course;
  course.dist += speed * dt;
  stepAir(world, slow);
  while (course.next < spawns.length && spawns[course.next].at <= course.dist) {
    const e = spawns[course.next++];
    if (e.kind === 'air') spawnAir(world, e);
    else spawnGround(world, e);
  }
  for (const g of course.ground) g.y = SPAWN_Y + course.dist - g.at;
  stepSeeds(world, dt, input);
  stepGround(world, slow);
  prune(course.ground, (g) => g.hp !== 0 && g.y <= HEIGHT + GROUND_MARGIN); // hp 0 is broken; a stone has hp null
}
