import { hurtAlien } from './aliens.js';
import { ALIEN_R } from './kinds.js';
import { liveParts, hurtPart, bombBoss } from './boss-hit.js';
import { hurtWreck } from './twists-2.js';

// The one place that knows what can be damaged. The bomb and the laser go through these helpers
// and nothing else, so a new kind of target means widening them here.
//   targets(world)        every live target, in a fixed order: aliens, the saucer, wrecks, the boss's parts
//   inColumn(t, x, half)  does the target touch the vertical strip x +- half (and is it on screen)
//   onScreen(t)           is it visible, so a bomb reaches it
//   hurt(world, t, dmg)   damage with the kill and the hit event; a boss part applies its own
//                         rule (weak 100 %, armor 25 %, bare hull 0), a wreck just breaks
//   bombAll(world)        what one bomb does: 3 to everything loose on screen, and 8 % of the boss's
//                         max hp in all, shared by its weak points
//   drip(world, t, amount) damage that arrives continuously, paid out in whole points

export const BOMB_DAMAGE = 3;
const EPS = 1e-9; // 8 / 60 added fifteen times is 2 only up to rounding

// Everything that is not the boss: aliens, the bonus saucer (an alien in all but its list), wrecks.
const loose = (world) => (world.saucer ? [...world.aliens, world.saucer, ...world.wrecks] : [...world.aliens, ...world.wrecks]);

export const targets = (world) => [...loose(world), ...liveParts(world)];
export function hurt(world, t, dmg) {
  if (t.part) hurtPart(world, t, dmg);
  else if (t.wreck) hurtWreck(world, t, dmg);
  else hurtAlien(world, t, dmg);
}
export const bombHurt = (world, t) => hurt(world, t, BOMB_DAMAGE);
export const inColumn = (t, x, half) =>
  t.y >= 0 && Math.abs(t.x - x) <= half + (t.part ? t.w / 2 : ALIEN_R);
export const onScreen = (t) => t.x >= 0 && t.x <= 1920 && t.y >= 0 && t.y <= 1080;

export function bombAll(world) {
  for (const t of loose(world)) if (onScreen(t)) bombHurt(world, t);
  bombBoss(world);
}

// Fractional damage collects on the target (t.burn) and lands one point at a time, so hp stays a
// whole number and a beam does not send a hit event every tick. (An armour plate turns each point
// into a quarter.)
export function drip(world, t, amount) {
  t.burn = (t.burn ?? 0) + amount;
  while (t.burn >= 1 - EPS && t.hp > 0) {
    t.burn -= 1;
    hurt(world, t, 1);
  }
}
