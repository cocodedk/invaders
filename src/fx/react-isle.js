// The turn of world 21's returning arrow (core/quiver.js): a golden flash where it turns, from the cached glow sprite
// fx-view.js draws every flash with, and a thin gold arc opening round it. No particles: turns come many a second
// while the fire button is held. Pure, and it draws no randomness.
import { addFlash, addRing } from './fx.js';

export const TURN_GOLD = '#ffd36a';
export const TURN_FLASH_R = 30; // px
export const TURN_FLASH_LIFE = 0.14; // s
export const TURN_ARC_R = 34; // px the arc opens to
export const TURN_ARC_LIFE = 0.22; // s

function arrowTurn(fx, ev) {
  addFlash(fx, { x: ev.x, y: ev.y, r: TURN_FLASH_R, color: TURN_GOLD, alpha: 0.85, life: TURN_FLASH_LIFE, tag: 'turn' });
  addRing(fx, { x: ev.x, y: ev.y, r0: 6, maxR: TURN_ARC_R, width: 2, color: TURN_GOLD, life: TURN_ARC_LIFE });
}

export const ISLE = { arrowTurn };
