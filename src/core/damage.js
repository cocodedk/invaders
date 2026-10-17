import { hurtAlien } from './aliens.js';
import { ALIEN_R } from './collide.js';

// The one place that knows what can be damaged. The bomb and the laser go through these six
// helpers and nothing else, so adding a new kind of target (the boss parts) means widening them here.
//   targets(world)        every live target, in a fixed order
//   inColumn(t, x, half)  does the target touch the vertical strip x +- half
//   onScreen(t)           is it visible, so a bomb reaches it
//   hurt(world, t, dmg)   whole points of damage, with the kill and the hit event
//   bombHurt(world, t)    what one bomb does to it
//   drip(world, t, amount) damage that arrives continuously, paid out in whole points

export const BOMB_DAMAGE = 3;
const EPS = 1e-9; // 8 / 60 added fifteen times is 2 only up to rounding

export const targets = (world) => world.aliens;
export const hurt = (world, t, dmg) => hurtAlien(world, t, dmg);
export const bombHurt = (world, t) => hurt(world, t, BOMB_DAMAGE);
export const inColumn = (t, x, half) => Math.abs(t.x - x) <= half + ALIEN_R;
export const onScreen = (t) => t.x >= 0 && t.x <= 1920 && t.y >= 0 && t.y <= 1080;

// Fractional damage collects on the target (t.burn) and lands one point at a time, so hp stays a
// whole number and a beam does not send a hit event every tick.
export function drip(world, t, amount) {
  t.burn = (t.burn ?? 0) + amount;
  while (t.burn >= 1 - EPS && t.hp > 0) {
    t.burn -= 1;
    hurt(world, t, 1);
  }
}
