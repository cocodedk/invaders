import { WIDTH, HEIGHT, MID_X, EPS } from './kinds.js';
import { ROLE } from './levels-2.js';
import { clamp } from './math.js';
import { fire, roleHp, addBullets, MAX_BULLETS } from './aliens.js';
import { emitPattern } from './patterns.js';
import { emit } from './util.js';
import { SPAWN_Y, CROSS_Y, inView } from './course-kinds.js';
import { flockCentre, spawnFlock, stepFlocks } from './course-flock.js';

// Air craft (world 22): ordinary aliens that fly a path through a course instead of holding a formation, so
// shots, rams, scoring and drops are the aliens' own (aliens.js, collide.js). They sit in world.aliens as
//   { id, role, x, y, hp, maxHp, mode: 'path', path, t, x0, aim, pattern }
//   path     'swoop' | 'cross' | 'dive' | 'hang' | 'flock' (pathPos; a flock's is its wheel's centre, and its motes are course-flock.js's)
//   t        seconds since it spawned: the path is a pure function of t, so the craft never integrates its position
//   x0       the x it spawned at (the course entry's x; a crossing's lies beyond the side edge it comes from, within AIR_MARGIN)
//   aim      a dive's locked x (the ship's x at DIVE_LOCK s), null until then and for the other paths
//   pattern  the bullet pattern it fires, at its role's rate
//   cool     a hang craft's only (the Smudge): s of hanging until its next shot; it starts at CURTAIN_WIND and counts down only while the craft hangs
// A craft that leaves past AIR_MARGIN is retired silently: hp 0 with no kill event, no score and no drop.

export const AIR_MARGIN = 100; // px past a screen edge (sides and bottom) where a craft that has left is retired
export const SWOOP_VY = 260; // px/s a swoop falls at
export const SWOOP_BEND = 220; // px/s^2 a swoop curves toward the far side at, so it ends sweeping out sideways
export const CROSS_VX = 420; // px/s a crossing moves across the screen at
export const CROSS_VY = 40; // px/s it sinks as it goes: a slight drift from CROSS_Y
export const DIVE_VY = 480; // px/s a dive falls at
export const DIVE_LOCK = 0.8; // s after spawning that a dive takes the ship's x, and the heading it keeps from then on
export const DIVE_REACH = 1.2; // s after the lock a dive would take to reach that x, at a steady sideways pace
export const DIVE_VX = 400; // px/s the most it ever moves sideways
// The Smudge (Leg 2): a 'hang' craft drifts straight down from above the top edge to HANG_Y, hangs there for HANG_SECS, then goes on down and
// is retired off the bottom like the rest. It fires its entry's pattern (the curtain, patterns.js) on its own cadence, only while it hangs.
export const HANG_Y = 240; // px: the screen row it hangs at
export const HANG_VY = 120; // px/s it drifts down at, in and out
export const HANG_SECS = 6; // s it hangs
export const CURTAIN_WIND = 0.6; // s after it arrives that the first curtain falls: the wind-up the player sees
export const CURTAIN_COOL = 2.5; // s of hanging between one curtain and the next
export const HANG_ARRIVE = (HANG_Y - SPAWN_Y) / HANG_VY; // s after spawning that it reaches HANG_Y
export const HANG_LEAVE = HANG_ARRIVE + HANG_SECS; // s after spawning that it goes on down

const side = (x0) => (x0 < MID_X ? 1 : -1); // a swoop and a crossing head for the far side from where they start

// Where a craft is `t` s after it spawned at x0: a swoop and a dive start above the top edge (SPAWN_Y), a crossing at
// CROSS_Y beyond a side edge. `aim` is only a dive's: the x it locked on (null before the lock).
const PATHS = {
  swoop: (t, x0) => ({ x: x0 + (side(x0) * SWOOP_BEND * t * t) / 2, y: SPAWN_Y + SWOOP_VY * t }),
  cross: (t, x0) => ({ x: x0 + side(x0) * CROSS_VX * t, y: CROSS_Y + CROSS_VY * t }),
  dive: (t, x0, aim) => {
    const vx = aim === null ? 0 : clamp((aim - x0) / DIVE_REACH, -DIVE_VX, DIVE_VX);
    return { x: x0 + vx * Math.max(0, t - DIVE_LOCK), y: SPAWN_Y + DIVE_VY * t };
  },
  flock: flockCentre,
  hang: (t, x0) => ({ x: x0, y: t <= HANG_LEAVE ? Math.min(HANG_Y, SPAWN_Y + HANG_VY * t) : HANG_Y + HANG_VY * (t - HANG_LEAVE) }),
};
export const pathPos = (path, t, x0, aim = null) => PATHS[path](t, x0, aim);
export const PATH_NAMES = Object.keys(PATHS); // the names a course entry's `path` may be (the data check reads them)

// A craft of the course entry `e` (course.js hands it over on the tick its `at` comes up), where its path starts,
// with the hp a wave alien of its role has (aliens.js roleHp).
export function spawnAir(world, e) {
  if (e.path === 'flock') return spawnFlock(world, e);
  const role = ROLE[e.role];
  const hp = roleHp(world, role);
  world.aliens.push({
    id: world.nextId++, role, ...pathPos(e.path, 0, e.x), hp, maxHp: hp,
    mode: 'path', path: e.path, t: 0, x0: e.x, aim: null, pattern: e.pattern, ...(e.path === 'hang' ? { cool: CURTAIN_WIND } : {}),
  });
}

const gone = (a) => a.x < -AIR_MARGIN || a.x > WIDTH + AIR_MARGIN || a.y > HEIGHT + AIR_MARGIN;

// A hang craft's shot, as stepGround fires a turret's: its cool counts down in the part of this tick it spent hanging (and on screen), and at 0 it
// fires its pattern at the ship and winds up CURTAIN_COOL more. It draws no rng. While the field holds MAX_BULLETS the shot is lost.
function stepHang(world, a, dt) {
  const hung = Math.min(a.t, HANG_LEAVE) - Math.max(a.t - dt, HANG_ARRIVE);
  if (hung <= 0 || !inView(a)) return;
  a.cool -= hung;
  if (a.cool > EPS) return;
  a.cool += CURTAIN_COOL;
  if (world.bullets.length >= MAX_BULLETS) return;
  addBullets(world, emitPattern(a.pattern, a, world.ship, { speed: world.scale.bulletSpeed }, world.rng));
  emit(world, 'fire', { side: 'enemy', id: a.id, role: a.role, x: a.x, y: a.y, pattern: a.pattern });
}

// One tick of every live craft, `dt` being the enemy time of the tick (bullet time slows it): fly, lock a dive,
// retire what has left, and fire (aliens.js `fire`, once for each pattern among the craft still flying, in the
// order first met; one rng draw per craft, in array order within a pattern; a hang craft is not among them, it fires
// by its own cadence, stepHang). A craft fires only while it is on screen, so no shot ever comes from where the player cannot see.
export function stepAir(world, dt) {
  const patterns = [];
  stepFlocks(world, dt, gone); // a flock's motes fly and fire nothing, here and below
  for (const a of world.aliens) {
    if (a.mode !== 'path' || a.hp <= 0 || a.path === 'flock') continue;
    a.t += dt;
    if (a.path === 'dive' && a.aim === null && a.t >= DIVE_LOCK) a.aim = world.ship.x;
    Object.assign(a, pathPos(a.path, a.t, a.x0, a.aim));
    if (gone(a)) a.hp = 0;
    else if (a.path === 'hang') stepHang(world, a, dt);
    else if (!patterns.includes(a.pattern)) patterns.push(a.pattern);
  }
  for (const pattern of patterns) {
    fire(world, dt, pattern, (a) => a.mode === 'path' && a.path !== 'hang' && a.path !== 'flock' && a.hp > 0 && a.pattern === pattern && inView(a));
  }
}
