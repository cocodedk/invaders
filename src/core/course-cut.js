import { EPS } from './kinds.js';
import { sweepRel2, dist2 } from './math.js';
import { firstAlien } from './aliens.js';
import { MUZZLE } from './ship.js';
import { BEAM_W } from './weapons.js';
import { awardFlat } from './scoring.js';
import { emit } from './util.js';

// Shooting down incoming fire (world 22 only: stepPlay calls cutBullets when the world has a course). An enemy bullet has
// hit points by its pattern, taken from BULLET_HP the first time it is hurt (b.hp, so a bullet nobody shoots at gains no
// field); a pattern that is not in it, such as an enemy laser, cannot be shot, and the shot flies through it. Two things
// hurt a bullet:
//   a gun shot   each live ship shot is spent on the first bullet its path touches this tick, if that comes before any air
//                craft on the path (a tie goes to the air craft), and deals CUT_DMG. Every shot is the same, the trident's
//                and the side guns' too; collide.js then sees only the shots this left alive
//   the beam     while the laser power's beam is on, every bullet in its column above the muzzle collects BEAM_CUT_DPS a
//                second in b.burn (damage.js drip does the same for aliens) and loses one hp for each whole point
// A bullet that is hurt but not broken says 'chip' { x, y, pattern, hp }. One that breaks is dropped with the dead, pays
// CUT_SCORE outside the combo, and says 'cut' { x, y, pattern } (the event the shuriken's cut already uses).
// A course has no boss, so a shot is only ever weighed against air craft. Seeds and the ground never touch a bullet.

export const BULLET_HP = { aimed: 1, fan: 1, ring: 1, spiral: 1, rain: 1, homing: 2, heavy: 3 };
export const CUT_DMG = 1; // hp a gun shot takes off a bullet
export const BEAM_CUT_DPS = 6; // hp a second the laser beam takes off every bullet in its column
export const CUT_SCORE = 10; // points for breaking a bullet, the combo untouched

const shootable = (b) => b.life > 0 && Object.hasOwn(BULLET_HP, b.pattern);

// `dmg` hp off the bullet: a chip, or the break.
function hurtBullet(world, b, dmg) {
  b.hp ??= BULLET_HP[b.pattern];
  b.hp -= dmg;
  if (b.hp > 0) {
    emit(world, 'chip', { x: b.x, y: b.y, pattern: b.pattern, hp: b.hp });
    return;
  }
  b.life = 0;
  b.near = true; // settled: a cut is not a dodge, even inside the near band (R37)
  awardFlat(world, CUT_SCORE);
  emit(world, 'cut', { x: b.x, y: b.y, pattern: b.pattern });
}

// The shootable bullet the shot `s` met first this tick (the nearest to where its path started, `start`) and how far off
// that was, squared, or null. Both flew straight over the tick, the shot for `dt` and the bullet for `slow` (bullet time).
function firstBullet(world, s, start, dt, slow) {
  let best = null;
  let bestD = Infinity;
  for (const b of world.bullets) {
    if (!shootable(b)) continue;
    const from = { x: b.x - b.vx * slow, y: b.y - b.vy * slow };
    if (sweepRel2(s, dt, b, from) > (b.r + s.r) ** 2) continue;
    const d = dist2(start, b);
    if (d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best && { b: best, d: bestD };
}

function shotsVsBullets(world, dt, slow) {
  for (const s of world.shots) {
    if (s.life <= 0) continue;
    const start = { x: s.x - s.vx * dt, y: s.y - s.vy * dt };
    const hit = firstBullet(world, s, start, dt, slow);
    if (!hit) continue;
    const craft = firstAlien(world, s, dt);
    if (craft && dist2(start, craft) <= hit.d) continue; // the air craft comes first: collide.js spends the shot on it
    s.life = 0;
    hurtBullet(world, hit.b, CUT_DMG);
  }
}

// The beam (weapons.js stepBeam sets ship.beam this tick) burns the column BEAM_W wide, a bullet's radius counting, from
// the muzzle to the top of the screen. It runs in real time: it is the player's.
function beamVsBullets(world, dt) {
  const ship = world.ship;
  if (!ship.beam) return;
  const top = ship.y - MUZZLE;
  for (const b of world.bullets) {
    if (!shootable(b) || b.y < 0 || b.y >= top || Math.abs(b.x - ship.x) > BEAM_W / 2 + b.r) continue;
    b.burn = (b.burn ?? 0) + BEAM_CUT_DPS * dt;
    while (b.burn >= 1 - EPS && b.life > 0) {
      b.burn -= 1;
      hurtBullet(world, b, 1);
    }
  }
}

// One tick, before collide.js: the shots first, then the beam. `dt` is real time, `slow` the enemy time of the tick.
export function cutBullets(world, dt, slow = dt) {
  shotsVsBullets(world, dt, slow);
  beamVsBullets(world, dt);
}
