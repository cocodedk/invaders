import { ALIEN_R, EPS } from './kinds.js';
import { ROLE } from './levels-2.js';
import { dropPickup } from './powerups.js';
import { emit } from './util.js';
import { SPAWN_Y } from './course-kinds.js';

// The Flock (world 22, Leg 3): FLOCK_N motes that wheel round a centre which drifts down at FLOCK_VY, one air entry with the path 'flock'.
// They sit in world.aliens like any air craft ({ id, role: grunt, hp 1, mode: 'path', path: 'flock', t, x0, flock, i, sc }): flock is the
// id of the first mote (the whole flock's), i the mote's place on the wheel, sc the scatter record or null. A mote fires nothing, rolls
// no drop (powerups.js skips a mote), and its place is a pure function of t, x0, i and sc, so a replay follows it exactly and no rng is drawn.
//   scatter  a live ship shot within SCATTER_R of a mote (course-air stepFlocks runs first in stepAir) flings the whole flock away from
//            the shot: sc = { t, sx, sy }, each mote leaving the point it stood on at sc.t along the line from the shot at SCATTER_SPEED
//            for SCATTER_SECS, then flying back to its place on the wheel over REGROUP_SECS, when sc is cleared. 'flockScatter' { x, y }
//            (the shot's) says so; a flock already scattering takes no second scatter
//   drop     the mote killed last drops one pickup, where it died (dropPickup): a flock whose last mote dies on this tick, a loop's
//            catch of the whole wheel included. A mote that leaves past AIR_MARGIN (course-air.js) is retired, not killed, so a flock
//            that leaves with motes alive drops nothing

export const FLOCK_N = 12; // motes in a flock
export const FLOCK_R = Math.ceil(ALIEN_R / Math.sin(Math.PI / FLOCK_N)) + 10; // px: the wheel's radius, wide enough that no two motes' discs touch
export const FLOCK_VY = 90; // px/s the wheel's centre drifts down at
export const FLOCK_SPIN = 1.2; // rad/s the wheel turns at
export const SCATTER_R = 120; // px: a shot this close to a mote scatters the flock
export const SCATTER_SPEED = 420; // px/s a scattered mote flies away from the shot at
export const SCATTER_SECS = 0.8; // s it flies away
export const REGROUP_SECS = 1.2; // s it takes to fly back to the wheel

// Where the wheel's centre is `t` s after the flock spawned at x0 (the 'flock' path).
export const flockCentre = (t, x0) => ({ x: x0, y: SPAWN_Y + FLOCK_VY * t });

const wheel = (a, t) => {
  const c = flockCentre(t, a.x0);
  const turn = FLOCK_SPIN * t + (a.i * 2 * Math.PI) / FLOCK_N;
  return { x: c.x + FLOCK_R * Math.cos(turn), y: c.y + FLOCK_R * Math.sin(turn) };
};

// Where mote `a` is at its own time a.t.
export function motePos(a) {
  if (!a.sc) return wheel(a, a.t);
  const { sc } = a;
  const u = a.t - sc.t;
  const p = wheel(a, sc.t);
  const d = Math.max(EPS, Math.hypot(p.x - sc.sx, p.y - sc.sy));
  const run = SCATTER_SPEED * Math.min(u, SCATTER_SECS);
  const far = { x: p.x + ((p.x - sc.sx) / d) * run, y: p.y + ((p.y - sc.sy) / d) * run };
  if (u <= SCATTER_SECS) return far;
  const k = Math.min(1, (u - SCATTER_SECS) / REGROUP_SECS);
  const w = wheel(a, a.t);
  return { x: far.x + (w.x - far.x) * k, y: far.y + (w.y - far.y) * k };
}

// A flock of the course entry `e`: FLOCK_N motes on the wheel at t = 0.
export function spawnFlock(world, e) {
  const flock = world.nextId;
  const role = ROLE[e.role];
  for (let i = 0; i < FLOCK_N; i++) {
    const mote = { id: world.nextId++, role, hp: 1, maxHp: 1, mode: 'path', path: 'flock', t: 0, x0: e.x, aim: null, pattern: e.pattern, flock, i, sc: null };
    world.aliens.push({ ...mote, ...motePos(mote) });
  }
}

const motes = (world) => world.aliens.filter((a) => a.path === 'flock');

// The last mote of a flock that died on this tick (hp 0, not retired) drops a pickup, when no mote of its flock is left alive.
function dropLast(world, all) {
  for (const flock of new Set(all.map((a) => a.flock))) {
    const mine = all.filter((a) => a.flock === flock);
    if (mine.some((a) => a.hp > 0)) continue;
    const dead = mine.filter((a) => !a.left);
    if (dead.length > 0) dropPickup(world, dead.at(-1));
  }
}

function scatter(world, all) {
  for (const s of world.shots) {
    if (s.life <= 0) continue;
    const hit = all.find((a) => a.hp > 0 && !a.left && (a.x - s.x) ** 2 + (a.y - s.y) ** 2 <= SCATTER_R ** 2);
    if (!hit || all.some((a) => a.flock === hit.flock && a.sc)) continue;
    for (const a of all) if (a.flock === hit.flock) a.sc = { t: a.t, sx: s.x, sy: s.y };
    emit(world, 'flockScatter', { x: s.x, y: s.y });
  }
}

// One tick of every flock, `dt` being the enemy time: the drop for a flock that has just died out, the scatter a shot calls, then the wheel
// (or the scatter) moves on. `gone` says whether a mote has left the screen for good (course-air.js): it is retired with hp 0 and left set.
export function stepFlocks(world, dt, gone) {
  const all = motes(world);
  if (all.length === 0) return;
  dropLast(world, all);
  scatter(world, all);
  for (const a of all) {
    if (a.hp <= 0) continue;
    a.t += dt;
    if (a.sc && a.t - a.sc.t >= SCATTER_SECS + REGROUP_SECS) a.sc = null;
    Object.assign(a, motePos(a));
    if (gone(a)) Object.assign(a, { hp: 0, left: true });
  }
}
