import { EPS } from './kinds.js';
import { emit, prune } from './util.js';
import { BOMB_DAMAGE } from './damage.js';
import { SPAWN_Y, inView } from './course-kinds.js';
import { GROUND_R, hurtGround } from './course-ground.js';

// The ground weapon (world 22) and the bomb on the ground: the only two things that hurt a ground object.
// A seed is { x, at, t } in course.seeds: dropped where the ship's gun is, SEED_REACH px ahead of it on the screen, it
// is fixed to the ground it fell on (x and `at` are course coordinates, so the scroll carries it down the screen with
// the land) and bursts `t` s later. A burst hurts every ground object within SEED_R of it (a ground object counts
// from its own edge, GROUND_R), adds { x, at, r } to course.marks (what the view paints, so a respawn or a snapshot
// shows the same land) and says 'seedBurst'. Seeds are the player's, so they run in real time, and they never touch a
// bullet or an air craft. The ability is `'seed'` in course.abilities (a level's `starts`, or a checkpoint's grant);
// with it, holding fire drops one every SEED_COOLDOWN s as well as the gun's shots. They draw no rng.

export const SEED_COOLDOWN = 0.4; // s between one seed and the next while fire is held
export const SEED_FALL = 0.5; // s from the drop to the burst
export const SEED_REACH = 380; // px ahead of the ship (up the screen) a seed falls
export const SEED_R = 100; // px: the burst's radius
export const SEED_DMG = 1; // hp a burst takes off each ground object in reach

const yOf = (course, at) => SPAWN_Y + course.dist - at;

// The ground objects in reach of the seed s, from their own edge: a circle in course coordinates (the ground's y
// differs from its `at` by a sign and a constant, so distances along it are the same either way).
function burst(world, s) {
  const { course } = world;
  const reach2 = (SEED_R + GROUND_R) ** 2;
  for (const g of course.ground) {
    if ((g.x - s.x) ** 2 + (g.at - s.at) ** 2 <= reach2) hurtGround(world, g, SEED_DMG);
  }
  course.marks.push({ x: s.x, at: s.at, r: SEED_R });
  emit(world, 'seedBurst', { x: s.x, y: yOf(course, s.at), r: SEED_R });
}

// Was the smart bomb pressed on this very tick? stepBomb (weapons.js) runs earlier in the tick and nothing has drained
// the events yet, so this tick's are the last ones on the list. An older bomb still on it does not count.
function bombed(world) {
  const list = world.events;
  for (let i = list.length - 1; i >= 0 && list[i].tick === world.tick; i--) if (list[i].type === 'bomb') return true;
  return false;
}

// One tick of the seeds, `dt` real seconds, in the order: the cooldown runs down, the seeds in the air fall and the
// ones whose time is up burst (in array order), then a fresh seed drops if the ability, fire, a living ship and the
// cooldown allow (it starts falling next tick), and last the bomb of this tick hurts every ground object on the
// screen. course.js calls this after the ground has been put where the scroll says, before the turrets fire, so a
// turret broken now does not fire on the tick it breaks.
export function stepSeeds(world, dt, input) {
  const { course, ship } = world;
  course.seedCool = Math.max(0, course.seedCool - dt);
  for (const s of course.seeds) {
    s.t -= dt;
    if (s.t <= EPS) burst(world, s);
  }
  prune(course.seeds, (s) => s.t > EPS);
  if (course.abilities.includes('seed') && input.fire && ship.alive && course.seedCool <= EPS) {
    course.seedCool = SEED_COOLDOWN;
    course.seeds.push({ x: ship.x, at: course.dist + SPAWN_Y - (ship.y - SEED_REACH), t: SEED_FALL });
  }
  if (bombed(world)) for (const g of course.ground) if (inView(g)) hurtGround(world, g, BOMB_DAMAGE);
}
