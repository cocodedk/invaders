import { EPS } from './kinds.js';
import { emit } from './util.js';
import { spawnAir } from './course-air.js';
import { spawnGround } from './course-ground.js';
import { SPAWN_Y } from './course-kinds.js';

// The end hold (world 22): the scroll stops until every gate of the hold is broken. A hold is a spawn entry
//   { kind: 'hold', at, targets: [{ x, dy, hp }], flights: [{ t, role, path, x, pattern }], period }
// Its targets come up with the entry as ground objects of kind 'gate' (course-ground.js), each at `at + dy`, so `dy` is how far
// up the course it stands from the hold's anchor (a gate's hp is its target's, and its `holdId` is the entry's index in the
// level's spawns). When the anchor comes to HOLD_Y (`dist` reaches `at + HOLD_Y - SPAWN_Y`) course.held becomes
// { holdId, t: 0 } and `dist` stands still (course.js), which is also how the gates stand: their y comes from `dist`. The
// stop is within a tick of the line, never moved back. `t` is the clock of the hold in s since the stop, in the enemy time
// of the tick (bullet time slows it, as it slows the air craft and the turrets). Since `dist` is still, the hold brings its own
// air craft: a flight comes at its `t` and again every `period` s (a pure function of the clock, so `held` is
// all the state it takes), as the air craft its role, path, x and pattern name (course-air.js), while fewer than
// HOLD_FLIGHTS_MAX are alive. A flight that comes when the sky is full is lost, not kept for later. When no gate of the
// hold is left (the ground weapon and the bomb hurt them like any target, course-ground.js) the hold breaks: 'holdBreak',
// `held` is null and the scroll goes on. A hold whose gates are all broken before the scroll reaches it never stops it and
// says nothing: nothing is left to hold the ship.
// The data rules (a check on the level's data should hold them): `period` > 0; a gate must be where the ship can hurt it
// when the scroll stops, on the screen and in the band (`dy` in [0, HOLD_Y]); a hold's entry comes up beyond the screen a
// checkpoint saw (course-check.js), so a respawn spawns it again whole; and a level's length is at least where its last hold
// stops the scroll (a shorter one clears before the hold is reached), and exactly that when the level ends on the hold, which
// then clears on the tick the hold breaks.

export const HOLD_Y = 300; // screen y the hold's anchor stands at when the scroll stops: well up the screen, in the ship's reach
export const HOLD_FLIGHTS_MAX = 6; // air craft alive at most while a hold stands, the level's own and the hold's together

const stopAt = (e) => e.at + HOLD_Y - SPAWN_Y; // the dist at which the hold entry `e` stops the scroll
const gateStands = (course, id) => course.ground.some((g) => g.kind === 'gate' && g.holdId === id && g.hp > 0);
const airborne = (world) => world.aliens.filter((a) => a.mode === 'path' && a.hp > 0).length;

// How often the flight `f` has come by `t` s into the hold: at its own t, then every `period`, EPS early at most.
const comings = (f, t, period) => (t + EPS < f.t ? 0 : Math.floor((t + EPS - f.t) / period) + 1);

// The gates of the hold entry `e`, the `id`-th of the level's spawns (course.js hands it over on the tick its `at` comes up).
export function spawnHold(world, e, id) {
  for (const t of e.targets) spawnGround(world, { kind: 'gate', at: e.at + t.dy, x: t.x, hp: t.hp, holdId: id });
}

// One tick of a hold, `slow` being the enemy time of the tick: the scroll that has come to a hold with a gate left stops
// there; then the clock runs, the hold breaks when its last gate has, and the flights that have come up spawn (an
// air craft spawned this tick stands at its start until the next one). course.js calls this after the seeds, so the
// tick a seed or a bomb breaks the last gate is the tick the hold breaks.
export function stepHold(world, slow) {
  const { course } = world;
  let before = -Infinity; // the clock a tick ago: before the stop no flight has come
  if (course.held) {
    before = course.held.t;
    course.held.t += slow;
  } else {
    const { spawns } = world.level.course;
    const g = course.ground.find((o) => o.kind === 'gate' && o.hp > 0 && course.dist >= stopAt(spawns[o.holdId]));
    if (!g) return;
    course.held = { holdId: g.holdId, t: 0 };
  }
  const { held } = course;
  if (!gateStands(course, held.holdId)) {
    emit(world, 'holdBreak', { holdId: held.holdId });
    course.held = null;
    return;
  }
  const { flights, period } = world.level.course.spawns[held.holdId];
  for (const f of flights) {
    const n = comings(f, held.t, period) - comings(f, before, period); // a period of 0 or less gives Infinity or NaN: the cap ends it
    for (let i = 0; i < n && airborne(world) < HOLD_FLIGHTS_MAX; i++) spawnAir(world, f);
  }
}
