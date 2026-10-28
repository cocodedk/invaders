import { createWorld, stepWorld } from '../../src/core/world.js';
import { TICK } from '../../src/core/kinds.js';
import { IDLE } from '../../src/core/input-codec.js';
import { makePickup } from '../../src/core/powerups.js';
import { rand } from '../../src/core/rng.js';

export { TICK, IDLE };

// Shared by the world tests: tiny levels, a quiet world, and injected shots and bullets, so each
// test exercises one rule without waiting for the real thing to line up.
export const input = (o) => ({ ...IDLE, ...o });
export const FIRE = input({ fire: true });
// The ticks from one shot to the next for a gun `cooldown` (ship.js COOLDOWN, RAPID_COOLDOWN): it fires on the first tick its cooldown has run out.
export const gunTicks = (cooldown) => Math.ceil(cooldown / TICK - 1e-9);
export const solid = (b) => b.mask.reduce((n, v) => n + v, 0); // a bunker's solid pixels

export const wave = (o = {}) =>
  ({ formation: 'grid', rows: 1, cols: 3, roles: ['grunt'], pattern: 'aimed', speed: 1, ...o });
export const level = (waves, d = 0, extra = {}) =>
  ({ id: 't-1', world: 1, index: 1, seed: 1, d, twist: 'bunkers', bunkers: false, waves, ...extra });

export function step(world, ticks = 1, inp = IDLE) {
  for (let i = 0; i < ticks; i++) stepWorld(world, TICK, inp);
}
export const seconds = (world, s, inp = IDLE) => step(world, Math.round(s * 60), inp);

// A world past its intro with every alien holding; `quiet` stops all enemy fire.
export function playing(lv, { seed = 1, quiet = true } = {}) {
  const world = createWorld(lv, seed);
  if (quiet) world.scale.fireMult = 0;
  while (world.state === 'intro') step(world);
  step(world, 3);
  world.events.length = 0;
  return world;
}

// R54: any alien that dies may drop a pickup (KILL_DROP of the non-carriers, one draw on world.rng).
// A test about the clear, the score or the sweep should not hang on whether the grunt it kills
// happens to drop one, so `dry` moves the world's rng to a state whose next `n` draws are all >= 0.5,
// far above KILL_DROP: every kill within them misses. The state is nudged, never the rule.
export function dry(world, n = 6) {
  for (let tries = 0; tries < 100000; tries++, world.rng.s = (world.rng.s + 1) >>> 0) {
    const probe = { s: world.rng.s };
    if (Array.from({ length: n }, () => rand(probe)).every((r) => r >= 0.5)) return world;
  }
  throw new Error('no dry rng state found');
}

export const drain = (world) => world.events.splice(0);
export const ofType = (events, type) => events.filter((e) => e.type === type);

// A ship shot placed on an alien, and an enemy bullet placed anywhere.
export const shotAt = (world, a) =>
  world.shots.push({ pattern: 'shot', x: a.x, y: a.y + 8, vx: 0, vy: -1400, r: 5, life: 1, dmg: 1 });
export const bulletAt = (world, x, y, vx = 0, vy = 0, r = 8) =>
  world.bullets.push({ pattern: 'aimed', x, y, vx, vy, r, life: 6 });
export const bulletOnShip = (world) => bulletAt(world, world.ship.x, world.ship.y);

// A pickup placed anywhere, as a carrier drops it.
export const pickupAt = (world, kind, x, y) => world.pickups.push(makePickup(kind, x, y));
export const pickupOnShip = (world, kind) => pickupAt(world, kind, world.ship.x, world.ship.y);

// The world's aliens swapped for one that stands still at (x, y) with `hp`: nothing moves (no march),
// and with a lot of hp the level cannot be cleared by firing at it, or at nothing.
export function holdAlien(world, x, y, hp = 1, role = 'grunt') {
  world.march = null;
  world.aliens.length = 0;
  const a = { id: 900, role, x, y, hp, maxHp: hp, slot: null, mode: 'hold', t: 0, dive: null };
  world.aliens.push(a);
  return a;
}

// One more alien standing still at (x, y), beside the one holdAlien placed (ids go on from 901): a
// shell of world 14 when `shell` is set.
export function addAlien(world, x, y, { hp = 1, role = 'grunt', shell = false } = {}) {
  const a = { id: 900 + world.aliens.length, role, x, y, hp, maxHp: hp, slot: null, mode: 'hold', t: 0, dive: null };
  if (shell) a.shell = true;
  world.aliens.push(a);
  return a;
}
