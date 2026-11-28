import { HEIGHT } from './kinds.js';
import { prune } from './util.js';
import { spawnAir, stepAir } from './course-air.js';
import { spawnGround, stepGround } from './course-ground.js';
import { spawnHold, stepHold, washAway } from './course-hold.js';
import { stepSeeds } from './course-seed.js';
import { startCheck, reachCheckpoints, stepRespawn } from './course-check.js';
import { terrainHits } from './course-terrain.js';
import { SPAWN_Y, GROUND_MARGIN } from './course-kinds.js';

// A course (world 22): a top-down scrolling level, a third kind beside wave levels and boss levels. The
// simulation stays in screen space with no camera; `world.course` is plain data (it survives structuredClone):
//   dist    px of scroll so far; it goes up by the course's speed every tick of play
//   next    how many of the level's spawn entries have come up (the entries are sorted by `at`)
//   abilities  what the ship can do on the ground: 'seed' lets the gun drop seeds (course-seed.js); a level starts with
//           its `starts` and a checkpoint can grant more
//   seeds   the seeds in the air, { x, at, t }; seedCool is the s until the next may drop
//   marks   where seeds have burst, { x, at, r }; the view paints the ground's change from them
//   line    the ink of the ship's line once it holds the ability 'line': segments { x1, y1, x2, y2, t } in screen space, oldest first, and pen
//           where the last one ended, { x, y }, or null (course-line.js; world-step.js draws it and lets it stop bullets)
//   respawn s left of the beat after the last life was lost, or null; the scroll stands still through it, and there is none once the leg's
//           last hold has broken (course-check.js)
//   held    the hold the scroll has stopped at, { holdId, t } (t the s since the stop), or null (course-hold.js)
//   check   the record of the last checkpoint reached, checkpoint 0 being the start, and lit how many have been reached
//           (course-check.js)
//   ground  the objects on the ground now, each { id, kind, at, x, y, hp } (a turret, a crate, a pillar or thorn piece, a checkpoint and a
//           gate hold a little more, course-ground.js); y is never stored as a speed, it is derived from the scroll (y = SPAWN_Y + dist - at),
//           so whatever stops `dist` stops the ground too
// The level's own data (`level.course`: speed, length, starts, walls, spawns) is read from the level, never copied.
// SPAWN_Y and the other constants more than one module reads are in course-kinds.js.

export function createCourse(level) {
  return {
    dist: 0, next: 0, ground: [], abilities: [...(level.course.starts ?? [])], marks: [], seeds: [], seedCool: 0,
    respawn: null, held: null, check: startCheck(level), lit: 0, line: [], pen: null, lassoCool: 0,
  };
}

// One tick of the course: scroll (not while a hold stands or a respawn is pending), move the air craft (course-air.js: they
// fly paths in seconds, not with the scroll, and in `slow`, the enemy time of this tick: stepPlay's enemyDt, bullet time
// included; `dist` and the ground keep real time, but the turrets on it fire in `slow`), let the entries whose `at` has
// come up spawn in array order (an air craft becomes an alien, a hold its gates, every other kind a ground object), put the
// ground where the scroll says, reach the checkpoints that have come down to the respawn line (course-check.js), let the
// walls and the boxes (pillars, thorn pieces) ram the ship (course-terrain.js), drop the seeds and let the ones and the bomb that are due hurt
// it (`input` is the tick's, course-seed.js), stop at a hold, run its clock and break it (course-hold.js), let the turrets
// fire (course-ground.js), wash the sky clean if a hold broke (course-hold.js washAway), drop what has broken or sunk off the bottom, and last start or run down the beat after a death
// (course-check.js). While that beat runs nothing scrolls, so no entry comes up. An air craft spawned this tick stands at
// its start until the next one. The ship's shots and beam have hurt the ground before this (course-shots.js, called by
// stepPlay between collide and here), so what they broke is dropped in the same tick.
export function stepCourse(world, dt, slow = dt, input = {}) {
  const { course } = world;
  const { speed, spawns } = world.level.course;
  if (course.respawn === null && course.held === null) course.dist += speed * dt;
  stepAir(world, slow);
  while (course.next < spawns.length && spawns[course.next].at <= course.dist) {
    const id = course.next++;
    const e = spawns[id];
    if (e.kind === 'air') spawnAir(world, e);
    else if (e.kind === 'hold') spawnHold(world, e, id);
    else spawnGround(world, e);
  }
  for (const g of course.ground) g.y = SPAWN_Y + course.dist - g.at;
  reachCheckpoints(world);
  terrainHits(world);
  stepSeeds(world, dt, input);
  const broke = stepHold(world, slow);
  stepGround(world, slow);
  if (broke) washAway(world); // after the turrets: a shot they fire on the tick of the break is washed away too
  // hp 0 is broken, a lantern has hp null; an object goes once its top edge is past the margin (h is a box's height)
  prune(course.ground, (g) => g.hp !== 0 && g.y - (g.h ?? 0) / 2 <= HEIGHT + GROUND_MARGIN);
  stepRespawn(world, dt);
}
