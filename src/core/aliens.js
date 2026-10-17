import { ROLES } from './kinds.js';
import { makeSlots, slotPosition, entryPosition, diveCurve, marchRate } from './formations.js';
import { emitPattern } from './patterns.js';
import { rand } from './rng.js';
import { awardKill } from './scoring.js';
import { emit } from './util.js';

// A wave of aliens: spawn, fly in, hold the formation, swoop, shoot back.
//   alien = { id, role, x, y, hp, slot, mode, t, dive }
//   mode  'enter' (ENTER_TIME s, the same for the whole wave) -> 'hold' -> 'dive' (first half of a
//         swoop) -> 'return' (second half) -> 'hold' again. t is seconds in the current mode; in
//         'hold' it is the wave's hold clock. dive is { fx, fy, ax, ay } while swooping (where it
//         left, where it is aiming), else null.
//   world.march = { age, clock, dir, speed, total, dive } is the wave's own state: seconds since it
//   spawned, the hold clock (restarts at 0 when the entry ends; for a grid it runs at marchRate),
//   the sideways direction, the formation speed, the size it spawned with, and seconds to the next dive.

export const ENTER_TIME = 1.5; // formations-2.js: entryPosition's length
export const DIVE_TIME = 2.2; // formations-2.js: diveCurve's length
export const MAX_BULLETS = 400;

const place = (a, p) => {
  a.x = p.x;
  a.y = p.y;
};

// Spawn the next wave (world.wave counts the waves spawned so far). R2: armorBonus is extra hp for
// armored and gunner aliens only.
export function spawnWave(world) {
  const spec = world.level.waves[world.wave];
  world.wave += 1;
  const slots = makeSlots(spec);
  for (const slot of slots) {
    const bonus = slot.role === 'armored' || slot.role === 'gunner' ? world.scale.armorBonus : 0;
    const a = {
      id: world.nextId++, role: slot.role, x: 0, y: 0, hp: ROLES[slot.role].hp + bonus,
      slot, mode: 'enter', t: 0, dive: null,
    };
    place(a, entryPosition(spec.formation, slot, 0));
    world.aliens.push(a);
  }
  world.march = {
    age: 0, clock: 0, dir: world.wave % 2 ? 1 : -1, speed: spec.speed * world.scale.formationSpeed,
    total: slots.length, dive: 2 + 2 * rand(world.rng),
  };
}

// Damage an alien; at 0 hp it dies (scored). The caller removes the dead from world.aliens.
export function hurtAlien(world, a, dmg) {
  if (a.hp <= 0) return;
  a.hp -= dmg;
  if (a.hp > 0) emit(world, 'hit', { id: a.id, role: a.role, x: a.x, y: a.y, hp: a.hp, dmg });
  else awardKill(world, a);
}

// One swoop tick: along diveCurve onto the slot's live position, landing exactly on it at the end.
function swoop(a, dt, home, clock) {
  a.t += dt;
  const u = a.t / DIVE_TIME;
  if (u >= 1) {
    a.mode = 'hold';
    a.t = clock;
    a.dive = null;
    place(a, home);
    return;
  }
  const d = a.dive;
  a.mode = u < 0.5 ? 'dive' : 'return';
  place(a, diveCurve({ x: d.fx, y: d.fy }, { x: d.ax, y: d.ay }, u, home));
}

// Every 2 to 4 s one holding diver leaves for the ship; one at a time at d = 0, up to 3 at d = 1.
function startDives(world, dt) {
  const m = world.march;
  m.dive -= dt;
  if (m.dive > 0) return;
  m.dive = 2 + 2 * rand(world.rng);
  let busy = 0;
  const ready = [];
  for (const a of world.aliens) {
    if (a.mode === 'dive' || a.mode === 'return') busy++;
    else if (a.mode === 'hold' && a.role === 'diver') ready.push(a);
  }
  if (busy >= Math.round(1 + 2 * world.level.d) || !ready.length) return;
  const a = ready[Math.floor(rand(world.rng) * ready.length)];
  a.mode = 'dive';
  a.t = 0;
  a.dive = { fx: a.x, fy: a.y, ax: world.ship.x, ay: world.ship.y };
}

// Each alien fires ROLES[role].fire * fireMult times a second, the wave's pattern at the ship.
function fire(world, dt, pattern) {
  const { bullets, ship, scale } = world;
  for (const a of world.aliens) {
    const rate = ROLES[a.role].fire * scale.fireMult;
    if (rate <= 0 || bullets.length >= MAX_BULLETS || rand(world.rng) >= rate * dt) continue;
    for (const b of emitPattern(pattern, a, ship, { speed: scale.bulletSpeed }, world.rng)) {
      if (bullets.length < MAX_BULLETS) bullets.push(b);
    }
    emit(world, 'fire', { side: 'enemy', id: a.id, role: a.role, x: a.x, y: a.y, pattern });
  }
}

// Move the wave: fly in, hold, swoop. Dives and shooting happen in play only (the first wave flies
// in during the intro).
export function stepAliens(world, dt) {
  const m = world.march;
  if (!m) return;
  const spec = world.level.waves[world.wave - 1];
  m.age += dt;
  if (m.age < ENTER_TIME) {
    for (const a of world.aliens) {
      a.t = m.age;
      place(a, entryPosition(spec.formation, a.slot, m.age / ENTER_TIME));
    }
    return;
  }
  for (const a of world.aliens) {
    if (a.mode === 'enter') a.mode = 'hold';
  }
  m.clock += dt * (spec.formation === 'grid' ? marchRate(world.aliens.length / m.total) : 1);
  const ctx = { dir: m.dir, speed: m.speed };
  for (const a of world.aliens) {
    const home = slotPosition(spec.formation, a.slot, m.clock, ctx);
    if (a.mode === 'hold') {
      a.t = m.clock;
      place(a, home);
    } else swoop(a, dt, home, m.clock);
  }
  if (world.state !== 'play') return;
  startDives(world, dt);
  fire(world, dt, spec.pattern);
}
