import { clamp, dist2 } from './math.js';
import { rand, randPick } from './rng.js';
import { POWERS, HEIGHT } from './kinds.js';
import { SHIP_R, ZONE, LIVES } from './ship.js';
import { emit, prune } from './util.js';
import { awardPickup } from './scoring.js';

// What carriers drop, and what the ship does with it.
//   pickup = { kind, x, y, vy, r }  kind is one of POWERS, 'bomb' or 'life' (makePickup).
//   ship.power = null | { kind, left }  the one running. A new power starts at its full time and the
//     one it displaces, with its time left, waits in ship.reserve = null | { kind, left } (R53): a
//     newer displacement overwrites the reserve, and the reserve does not tick while it waits.
//     When the running power ends the reserve takes over (tickPower). Nothing carries between levels.
// The effects live where they act: the gun in ship.js (spread, rapid, homing), the shield in hitShip,
// the beam and the bomb in weapons.js, slow in enemyDt (twists-2.js). Every pickup collected scores
// (awardPickup), and the clear sweeps up the ones still falling (sweepPickups).

export const POWER_TIME = 10; // s
const TIMES = { slow: 6 }; // s: the powers that do not last POWER_TIME
export const powerTime = (kind) => TIMES[kind] ?? POWER_TIME;
export const BOMB_MAX = 3;
const PICKUP_R = 22;
const FALL = 160; // px/s
const BOMB_SHARE = 0.2; // of drops: a bomb instead of a power
const LIFE_SHARE = 0.05; // of drops: an extra life, only while the ship is short of LIVES

// A pickup at (x, y), falling.
export const makePickup = (kind, x, y) => ({ kind, x, y, vy: FALL, r: PICKUP_R });

// A carrier died at `from`: 20 % a bomb, 5 % a life (at full lives that 5 % is a power instead), the
// rest one of the six powers.
export function dropPickup(world, from) {
  const r = rand(world.rng);
  const life = r >= BOMB_SHARE && r < BOMB_SHARE + LIFE_SHARE && world.ship.lives < LIVES;
  const kind = r < BOMB_SHARE ? 'bomb' : life ? 'life' : randPick(world.rng, POWERS);
  world.pickups.push(makePickup(kind, clamp(from.x, ZONE.x0, ZONE.x1), from.y));
}

function collect(world, p) {
  const ship = world.ship;
  emit(world, 'pickup', awardPickup(world, p));
  if (p.kind === 'bomb') {
    ship.bombs = Math.min(BOMB_MAX, ship.bombs + 1);
  } else if (p.kind === 'life') {
    ship.lives = Math.min(LIVES, ship.lives + 1);
  } else {
    if (ship.power) ship.reserve = ship.power; // waiting, not over: no event for it
    ship.power = { kind: p.kind, left: powerTime(p.kind) };
    emit(world, 'power', { kind: p.kind, on: true });
  }
}

// Pickups fall, the ship takes the ones it touches, and the ones below the floor are dropped.
export function stepPickups(world, dt) {
  const ship = world.ship;
  const reach = (PICKUP_R + SHIP_R) ** 2;
  prune(world.pickups, (p) => {
    p.y += p.vy * dt;
    if (ship.alive && dist2(p, ship) <= reach) {
      collect(world, p);
      return false;
    }
    return p.y - p.r < HEIGHT;
  });
}

// The level is cleared: every pickup still in the air is the ship's, in drop order. Its points count
// (before the clear is announced), its power or bomb comes too late to use. Each `sweep` says which of
// the run it is (`nth`, 0 first) so that the sound and the ship's glow can build up along it.
export function sweepPickups(world) {
  world.pickups.forEach((p, nth) => emit(world, 'sweep', { ...awardPickup(world, p), nth }));
  world.pickups.length = 0;
}

// The running power counts down; when it ends, the reserve (if any) takes over at the time it had left.
export function tickPower(world, dt) {
  const ship = world.ship;
  if (!ship.power) return;
  ship.power.left -= dt;
  if (ship.power.left > 0) return;
  emit(world, 'power', { kind: ship.power.kind, on: false });
  ship.power = ship.reserve;
  ship.reserve = null;
  if (ship.power) emit(world, 'power', { kind: ship.power.kind, on: true });
}
