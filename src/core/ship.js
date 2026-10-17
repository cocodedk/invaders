import { approach, clamp } from './math.js';
import { emit } from './util.js';

// The player's ship: movement, the base gun, and what a hit does.

export const SHIP_R = 14; // hit radius
export const SHIP_SPEED = 720; // px/s
export const ZONE = { x0: 40, x1: 1880, y0: 620, y1: 1040 };
export const LIVES = 3;
export const INVULN = 1.5; // s of blinking after a hit
export const COOLDOWN = 0.18; // s between base shots
export const SHOT_SPEED = 1400;

const ACCEL = 7200; // px/s^2: from rest to full speed in 0.1 s, the same to stop (a short ease)
const FOLLOW = 12; // 1/s: how hard a pointer target pulls; speed is FOLLOW * distance, capped at max

export const createShip = () => ({
  x: 960, y: 1000, vx: 0, vy: 0, lives: LIVES, invuln: 0, power: null, bombs: 1, cooldown: 0, alive: true,
});

const SNAP = 0.5; // px: closer than this to a pointer target, the ship stops dead on it

// The pointer target, held inside the zone.
const goal = (t) => t && { x: clamp(t.x, ZONE.x0, ZONE.x1), y: clamp(t.y, ZONE.y0, ZONE.y1) };

// The velocity the ship eases toward: the keys, normalised so a diagonal is no faster, or the pull
// of the pointer goal.
function wanted(ship, input, g) {
  if (g) {
    const ex = g.x - ship.x;
    const ey = g.y - ship.y;
    const d = Math.hypot(ex, ey);
    const k = Math.min(SHIP_SPEED, d * FOLLOW) / d;
    return [ex * k, ey * k];
  }
  const dx = input.dx || 0;
  const dy = input.dy || 0;
  const k = SHIP_SPEED / (Math.hypot(dx, dy) || 1);
  return [dx * k, dy * k];
}

function shoot(world) {
  const s = world.ship;
  s.cooldown = COOLDOWN;
  const at = { x: s.x, y: s.y - 22 };
  world.shots.push({ pattern: 'shot', x: at.x, y: at.y, vx: 0, vy: -SHOT_SPEED, r: 5, life: 1.5, dmg: 1 });
  emit(world, 'fire', { side: 'ship', x: at.x, y: at.y });
}

// Ease, move, clamp to the zone, count the timers down, and shoot while fire is held. The ship
// moves during the intro too, but only shoots in play.
export function stepShip(world, dt, input) {
  const s = world.ship;
  s.cooldown = Math.max(0, s.cooldown - dt);
  s.invuln = Math.max(0, s.invuln - dt);
  const g = goal(input.target);
  if (g && Math.hypot(g.x - s.x, g.y - s.y) < SNAP) {
    Object.assign(s, { x: g.x, y: g.y, vx: 0, vy: 0 });
  } else {
    const [wx, wy] = wanted(s, input, g);
    s.vx = approach(s.vx, wx, ACCEL * dt);
    s.vy = approach(s.vy, wy, ACCEL * dt);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < ZONE.x0 || s.x > ZONE.x1) {
      s.x = clamp(s.x, ZONE.x0, ZONE.x1);
      s.vx = 0;
    }
    if (s.y < ZONE.y0 || s.y > ZONE.y1) {
      s.y = clamp(s.y, ZONE.y0, ZONE.y1);
      s.vy = 0;
    }
  }
  if (world.state === 'play' && input.fire && s.cooldown <= 0) shoot(world);
}

// A bullet, a beam or a ram reached the ship. True when it was spent, i.e. the hit landed; a
// blinking ship cannot be touched and a dead one has nothing left to lose, so those pass through.
export function hitShip(world, source) {
  const s = world.ship;
  if (!s.alive || s.invuln > 0) return false;
  s.lives -= 1;
  s.invuln = INVULN;
  world.hits += 1;
  emit(world, 'shipHit', { x: s.x, y: s.y, lives: s.lives, source });
  if (s.lives <= 0) {
    s.alive = false;
    emit(world, 'explode', { x: s.x, y: s.y, size: 2 });
  }
  return true;
}
