import { createWorld, stepWorld } from '../../src/core/world.js';
import { WIDTH, HEIGHT, MID_X } from '../../src/core/kinds.js';
import { AIR_MARGIN } from '../../src/core/course-air.js';
import { SPAWN_Y, RESPAWN_SAFE } from '../../src/core/course-kinds.js';
import { RESPAWN_Y } from '../../src/core/course-check.js';
import { BOMB_DAMAGE } from '../../src/core/damage.js';
import { hurtGround } from '../../src/core/course-ground.js';
import { stopAt } from '../../src/core/course-hold.js';
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

// A scroll speed, px/s, that brings an entry to the respawn line in few ticks (a tick scrolls FAST * TICK px).
export const FAST = 600;

// A checkpoint entry (it grants `grants`, 'seed' or null), and the world stepped, a tick at a time, until `done()` holds: true if
// it did within `limit` ticks.
export const checkpoint = (at, x = MID_X, grants = null) => ({ kind: 'checkpoint', at, x, grants });
export function until(world, done, limit = 3000) {
  for (let i = 0; i < limit && !done(); i++) step(world);
  return done();
}

// A course world around `spawns` with its intro over, no play tick taken yet and the enemy quiet (fireMult 0
// unless given); `d` is the level's difficulty, `speed` the scroll's, px/s, `starts` the abilities it begins with and
// `walls` its wall keyframes ([at, left, right] each; none by default) and `length` the px of scroll that clear it.
export function flight(spawns, { fireMult = 0, d, speed = 100, starts = [], walls = [], length = 6000 } = {}) {
  const world = createWorld(courseLevel({ speed, length, starts, walls, spawns }, d));
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

// The end hold (world 22). `hold()` is an entry with two gates and no flights, over which `o` goes; a gate is { x, dy, hp } and a
// flight is an air entry with a time t: it comes t s after the stop, and again every `period`. `stopOf` is the dist the scroll stops at (the
// entry's anchor, which dy measures from, then stands at HOLD_Y). `standing` is a world stepped until a hold stands, `breakAll` breaks every
// gate on the ground, and `alive` counts the aliens with hp.
export const HOLD_AT = 100; // where a hold entry comes up
export const HOLD_PERIOD = 3; // s between the comings of a flight
export const GATE_HP = BOMB_DAMAGE; // one bomb breaks a gate; a seed burst takes less off
export const gate = (x, dy = 0) => ({ x, dy, hp: GATE_HP });
export const kite = (t, o = {}) => ({ t, role: 'g', path: 'swoop', x: 500, pattern: 'aimed', ...o });
export const hold = (o = {}) =>
  ({ kind: 'hold', at: HOLD_AT, targets: [gate(600), gate(1200, 40)], flights: [], period: HOLD_PERIOD, ...o });
export const stopOf = stopAt;
export const gates = (world) => world.course.ground.filter((g) => g.kind === 'gate');
export function standing(spawns, opts = {}) {
  const world = flight(spawns, { speed: FAST, ...opts });
  if (!until(world, () => world.course.held)) throw new Error('no hold stood');
  return world;
}
export const WAIT = 30; // ticks the hold tests stand and watch
export const alive = (world) => world.aliens.filter((a) => a.hp > 0).length;
export const breakAll = (world) => gates(world).forEach((g) => hurtGround(world, g, g.hp));

// A course that breaks no data rule (course-fair-kit.js unfair says so), for the fairness and the clear tests: open land that
// narrows into a gorge with a pillar in it and opens again, a checkpoint that grants the ground weapon, then turrets, a crate,
// a narrowing and, where the leg ends, a hold of two gates. Where things stand is derived from the quiet stretches the rules
// ask for, so the data follows the constants (RESPAWN_SAFE, RESPAWN_Y).
export const FAIR_SPEED = 200; // px/s
const FIRST = FAIR_SPEED * RESPAWN_SAFE + 100; // the first entry: past the quiet stretch of the start
export const FAIR_CP_AT = FIRST + 2700; // the checkpoint
export const FAIR_QUIET_END = FAIR_CP_AT + RESPAWN_Y - SPAWN_Y + FAIR_SPEED * RESPAWN_SAFE; // the end of its quiet stretch
const AFTER = FAIR_QUIET_END + 100; // the first entry past it
const FAIR_HOLD = hold({
  at: AFTER + 700, targets: [{ x: 600, dy: 0, hp: 6 }, { x: 1200, dy: 60, hp: 6 }], period: 5,
  flights: [kite(2), kite(4, { role: 'd', path: 'cross', x: OFF_RIGHT, pattern: 'fan' })],
});
export const FAIR_COURSE = {
  speed: FAIR_SPEED, length: stopOf(FAIR_HOLD), starts: [],
  walls: [
    [0, 0, WIDTH], [FIRST + 300, 0, WIDTH], [FIRST + 900, 400, 1500], [FIRST + 1700, 400, 1500], [FIRST + 2300, 0, WIDTH],
    [FAIR_QUIET_END, 0, WIDTH], [FAIR_QUIET_END + 400, 300, 1600],
  ],
  spawns: [
    air({ at: FIRST, x: col(0.3) }),
    air({ at: FIRST + 200, path: 'cross', x: OFF_LEFT, pattern: 'fan' }),
    { kind: 'turret', at: FIRST + 500, x: 500, hp: 3 },
    air({ at: FIRST + 600, role: 'd', path: 'dive', x: col(0.6) }),
    { kind: 'crate', at: FIRST + 700, x: 1400, hp: 2, drop: 'bomb' },
    { kind: 'stone', at: FIRST + 800, x: 1000 },
    { kind: 'pillar', at: FIRST + 1300, x: 900, w: 140, h: 140 },
    air({ at: FIRST + 1500, role: 'u', x: col(0.7), pattern: 'ring' }),
    checkpoint(FAIR_CP_AT, MID_X, 'seed'),
    { kind: 'turret', at: AFTER, x: 700, hp: 3 },
    { kind: 'crate', at: AFTER + 100, x: 1200, hp: 2, drop: 'life' },
    air({ at: AFTER + 200, role: 'a', path: 'dive', x: col(0.5) }),
    air({ at: AFTER + 300, role: 'u', x: col(0.4), pattern: 'homing' }),
    FAIR_HOLD,
  ],
};
