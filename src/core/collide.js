import { clamp, dist2 } from './math.js';
import { laserHits } from './patterns.js';
import { SHIP_R, hitShip } from './ship.js';
import { hurtAlien } from './aliens.js';
import { awardKill } from './scoring.js';
import { emit } from './util.js';

// Who hits whom. Projectiles are tested along the path they flew this tick (from where their
// velocity says they were to where they are), so a fast shot cannot tunnel through anything.

export const ALIEN_R = 26;
export const NEAR_MISS = 28; // centre distance, for a standard 8 px bullet: 6 px outside the hit circle

// Squared distance from the point (px, py) to the segment (ax, ay)-(bx, by).
function segDist2(ax, ay, bx, by, px, py) {
  const ex = bx - ax;
  const ey = by - ay;
  const len2 = ex * ex + ey * ey;
  const u = len2 ? clamp(((px - ax) * ex + (py - ay) * ey) / len2, 0, 1) : 0;
  return (ax + ex * u - px) ** 2 + (ay + ey * u - py) ** 2;
}

// Each shot is spent on the alien it meets first, the nearest to where it started this tick.
function shotsVsAliens(world, dt) {
  for (const s of world.shots) {
    if (s.life <= 0) continue;
    const px = s.x - s.vx * dt;
    const py = s.y - s.vy * dt;
    const reach = (ALIEN_R + s.r) ** 2;
    let best = null;
    let bestD = Infinity;
    for (const a of world.aliens) {
      if (a.hp <= 0 || segDist2(px, py, s.x, s.y, a.x, a.y) > reach) continue;
      const d = (a.x - px) ** 2 + (a.y - py) ** 2;
      if (d < bestD) {
        best = a;
        bestD = d;
      }
    }
    if (!best) continue;
    s.life = 0;
    hurtAlien(world, best, s.dmg ?? 1);
  }
}

// A diver that reaches the ship costs a life and is lost with no score. A blinking ship is passed.
function rams(world) {
  const reach = (ALIEN_R + SHIP_R) ** 2;
  for (const a of world.aliens) {
    if (a.hp <= 0 || (a.mode !== 'dive' && a.mode !== 'return')) continue;
    if (dist2(a, world.ship) <= reach && hitShip(world, 'ram')) {
      a.hp = 0;
      awardKill(world, a, false);
    }
  }
}

// Bullets hit within their radius + 14 and are spent. A bullet that comes close without touching
// is a nearMiss, reported once it has gone past (so a bullet that goes on to hit is never one).
// b.near is its closest approach while it is in the zone, and true once settled. A beam is tested by
// laserHits (the warning line harms nothing) and never counts. A bullet that passes through a
// blinking ship is settled without an event.
function bulletsVsShip(world, dt) {
  const ship = world.ship;
  if (!ship.alive) return;
  for (const b of world.bullets) {
    if (b.life <= 0) continue;
    if (b.pattern === 'laser') {
      if (laserHits(b, ship, SHIP_R)) hitShip(world, 'laser');
      continue;
    }
    const hit = b.r + SHIP_R;
    const d2 = segDist2(b.x - b.vx * dt, b.y - b.vy * dt, b.x, b.y, ship.x, ship.y);
    if (d2 <= hit * hit) {
      if (hitShip(world, b.pattern)) b.life = 0;
      else b.near = true;
    } else if (b.near !== true) {
      if (d2 <= Math.max(NEAR_MISS, hit + 6) ** 2) b.near = Math.min(b.near ?? Infinity, Math.sqrt(d2));
      else if (b.near !== undefined) {
        emit(world, 'nearMiss', { x: b.x, y: b.y, dist: b.near });
        b.near = true;
      }
    }
  }
}

// The dead (shots with life 0, aliens with hp 0, bullets with life 0) are pruned by the caller.
export function collide(world, dt) {
  shotsVsAliens(world, dt);
  rams(world);
  bulletsVsShip(world, dt);
}
