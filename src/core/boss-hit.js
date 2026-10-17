import { syncBoss } from './boss-phase.js';
import { emit } from './util.js';

// What hurts a boss. The parts are the targets: damage.js lists them, and these are the rules.
//   weak part  full damage        armor plate  25 %        bare hull  none (it still soaks shots)
// A part at 0 hp is gone and no longer blocks. Every change re-adds the boss's hp (syncBoss), which
// is where phases change and the boss dies.

export const ARMOR = 0.25;
export const BOMB_SHARE = 0.08; // of the boss's max hp, per bomb

// The parts that can be hit right now: none while the boss flies in or once it is dying.
export function liveParts(world) {
  const b = world.boss;
  return b && b.enter <= 0 && b.dying === null ? b.parts.filter((p) => p.hp > 0) : [];
}

// `dmg` through the part's rule. `at` is where it landed (default: the part's centre), for the sparks.
export function hurtPart(world, p, dmg, at = p) {
  if (p.hp <= 0) return;
  const dealt = dmg * (p.weak ? 1 : p.armor ? ARMOR : 0);
  p.hp = Math.max(0, p.hp - dealt);
  const b = world.boss;
  if (p.hp > 0) {
    emit(world, 'hit', { id: p.id, role: 'boss', part: p.id, x: at.x, y: at.y, hp: p.hp, dmg: dealt, weak: p.weak });
  } else {
    emit(world, 'partDown', { kind: b.kind, part: p.id, x: p.x, y: p.y, weak: p.weak });
    emit(world, 'explode', { x: p.x, y: p.y, size: 1 });
  }
  syncBoss(world);
}

// A bomb takes 8 % of the boss's max hp in all, shared by the weak points it can see; with none
// left, by what is left, through the armour rule.
export function bombBoss(world) {
  const live = liveParts(world);
  if (!live.length) return;
  const weak = live.filter((p) => p.weak);
  const pool = weak.length ? weak : live;
  const share = (world.boss.maxHp * BOMB_SHARE) / pool.length;
  for (const p of pool) hurtPart(world, p, share);
}

// Where the segment (ax, ay)-(bx, by) first enters the rectangle of `p` grown by r: its fraction
// along the segment, or Infinity when it never does. (Slab method.)
function entry(ax, ay, bx, by, r, p) {
  let t0 = 0;
  let t1 = 1;
  const axes = [[ax, bx, p.x - p.w / 2 - r, p.x + p.w / 2 + r], [ay, by, p.y - p.h / 2 - r, p.y + p.h / 2 + r]];
  for (const [a, b, lo, hi] of axes) {
    const d = b - a;
    if (Math.abs(d) < 1e-9) {
      if (a < lo || a > hi) return Infinity;
    } else {
      const u = (lo - a) / d;
      const v = (hi - a) / d;
      t0 = Math.max(t0, Math.min(u, v));
      t1 = Math.min(t1, Math.max(u, v));
      if (t0 > t1) return Infinity;
    }
  }
  return t0;
}

// Each ship shot still flying is spent on the first live part its path crossed this tick, which
// takes the damage (a plate in front of a weak point shields it).
export function shotsVsBoss(world, dt) {
  const parts = liveParts(world);
  if (!parts.length) return;
  for (const s of world.shots) {
    if (s.life <= 0) continue;
    let best = null;
    let first = Infinity;
    for (const p of parts) {
      if (p.hp <= 0) continue;
      const u = entry(s.x - s.vx * dt, s.y - s.vy * dt, s.x, s.y, s.r, p);
      if (u < first) {
        best = p;
        first = u;
      }
    }
    if (!best) continue;
    s.life = 0;
    hurtPart(world, best, s.dmg ?? 1, s);
  }
}
