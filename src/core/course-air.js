import { ROLES, WIDTH, HEIGHT, MID_X } from './kinds.js';
import { ROLE } from './levels-2.js';
import { clamp } from './math.js';
import { fire } from './aliens.js';
import { SPAWN_Y } from './course.js'; // course.js imports this file too; SPAWN_Y is only read inside functions

// Air craft (world 22): ordinary aliens that fly a path through a course instead of holding a formation, so
// shots, rams, scoring and drops are the aliens' own (aliens.js, collide.js). They sit in world.aliens as
//   { id, role, x, y, hp, maxHp, mode: 'path', path, t, x0, aim, pattern }
//   path     'swoop' | 'cross' | 'dive' (pathPos)
//   t        seconds since it spawned: the path is a pure function of t, so the craft never integrates its position
//   x0       the x it spawned at (the course entry's x)
//   aim      a dive's locked x (the ship's x at DIVE_LOCK s), null until then and for the other paths
//   pattern  the bullet pattern it fires, at its role's rate
// A craft that leaves past AIR_MARGIN is retired silently: hp 0 with no kill event, no score and no drop.

export const AIR_MARGIN = 100; // px past a screen edge (sides and bottom) where a craft that has left is retired
export const SWOOP_VY = 260; // px/s a swoop falls at
export const SWOOP_BEND = 220; // px/s^2 a swoop curves toward the far side at, so it ends sweeping out sideways
export const CROSS_VX = 420; // px/s a crossing moves across the screen at
export const CROSS_VY = 90; // px/s it sinks as it goes: a shallow slope that starts at the top corner
export const DIVE_VY = 480; // px/s a dive falls at
export const DIVE_LOCK = 0.8; // s after spawning that a dive takes the ship's x, and the heading it keeps from then on
export const DIVE_REACH = 1.2; // s after the lock a dive would take to reach that x, at a steady sideways pace
export const DIVE_VX = 400; // px/s the most it ever moves sideways

const side = (x0) => (x0 < MID_X ? 1 : -1); // a swoop and a crossing head for the far side from where they start

// Where a craft is `t` s after it spawned at x0. `aim` is only a dive's: the x it locked on (null before the lock).
const PATHS = {
  swoop: (t, x0) => ({ x: x0 + (side(x0) * SWOOP_BEND * t * t) / 2, y: SPAWN_Y + SWOOP_VY * t }),
  cross: (t, x0) => ({ x: x0 + side(x0) * CROSS_VX * t, y: SPAWN_Y + CROSS_VY * t }),
  dive: (t, x0, aim) => {
    const vx = aim === null ? 0 : clamp((aim - x0) / DIVE_REACH, -DIVE_VX, DIVE_VX);
    return { x: x0 + vx * Math.max(0, t - DIVE_LOCK), y: SPAWN_Y + DIVE_VY * t };
  },
};
export const pathPos = (path, t, x0, aim = null) => PATHS[path](t, x0, aim);

// A craft of the course entry `e` (course.js hands it over on the tick its `at` comes up), just above the top edge.
export function spawnAir(world, e) {
  const role = ROLE[e.role];
  const hp = ROLES[role].hp;
  world.aliens.push({
    id: world.nextId++, role, x: e.x, y: SPAWN_Y, hp, maxHp: hp,
    mode: 'path', path: e.path, t: 0, x0: e.x, aim: null, pattern: e.pattern,
  });
}

const gone = (a) => a.x < -AIR_MARGIN || a.x > WIDTH + AIR_MARGIN || a.y > HEIGHT + AIR_MARGIN;
const inView = (a) => a.x >= 0 && a.x <= WIDTH && a.y >= 0 && a.y <= HEIGHT;

// One tick of every live craft: fly, lock a dive, retire what has left, and fire (aliens.js `fire`, once for
// each pattern among the craft still flying, in the order first met; one rng draw per craft, in array order within a pattern). A craft
// fires only while it is on screen, so no shot ever comes from where the player cannot see.
export function stepAir(world, dt) {
  const patterns = [];
  for (const a of world.aliens) {
    if (a.mode !== 'path' || a.hp <= 0) continue;
    a.t += dt;
    if (a.path === 'dive' && a.aim === null && a.t >= DIVE_LOCK) a.aim = world.ship.x;
    Object.assign(a, pathPos(a.path, a.t, a.x0, a.aim));
    if (gone(a)) a.hp = 0;
    else if (!patterns.includes(a.pattern)) patterns.push(a.pattern);
  }
  for (const pattern of patterns) {
    fire(world, dt, pattern, (a) => a.mode === 'path' && a.hp > 0 && a.pattern === pattern && inView(a));
  }
}
