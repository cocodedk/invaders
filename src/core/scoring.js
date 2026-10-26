import { ROLES } from './kinds.js';
import { emit } from './util.js';

// Points, the combo and stars: every point the score gets is awarded here, by the same rules in every
// level of every world. world.combo = { mult, timer }: every kill within COMBO_WINDOW of the last
// raises mult by 1 (up to COMBO_MAX); timer counts down and mult falls back to 1 at 0. A pickup is
// worth a flat PICKUP_POINTS, caught or swept up at the clear (R51), and a boss's death a flat
// BOSS_POINTS: no multiplier, the combo untouched, so they read the same every time.

export const COMBO_WINDOW = 1.5;
export const COMBO_MAX = 8;
export const COMBO_HOT = 4; // from this multiplier the combo runs hot: the meter pulses, pop-ups turn gold, the kill sound sizzles
const PICKUP_POINTS = 500;
const BOSS_POINTS = 10000;
const CLEAR_BONUS = 2000;
const FLAWLESS_BONUS = 3000; // on top of CLEAR_BONUS when the ship was never hit

// An alien is dead (its hp is already 0). `scored` false is a ram: no points, the combo untouched.
// The caller removes it from world.aliens.
export function awardKill(world, alien, scored = true) {
  const c = world.combo;
  let points = 0;
  if (scored) {
    c.mult = c.timer > 0 ? Math.min(COMBO_MAX, c.mult + 1) : 1;
    c.timer = COMBO_WINDOW;
    points = ROLES[alien.role].score * c.mult;
    world.score += points;
  }
  const { id, role, x, y } = alien;
  emit(world, 'kill', { id, role, x, y, score: points, mult: c.mult, scored });
  emit(world, 'explode', { x, y, size: 1 });
}

// A pickup collected: its points go on the score. Returns the fields of the event that announces it,
// which the caller emits: `pickup` (the ship caught it) or `sweep` (the clear swept it up).
export function awardPickup(world, p) {
  world.score += PICKUP_POINTS;
  return { kind: p.kind, x: p.x, y: p.y, points: PICKUP_POINTS };
}

export function tickCombo(world, dt) {
  const c = world.combo;
  if (c.timer <= 0) return;
  c.timer = Math.max(0, c.timer - dt);
  if (c.timer === 0) c.mult = 1;
}

// A boss is dead: its points go on the score. Returns them, for the event that announces the death.
export function awardBoss(world) {
  world.score += BOSS_POINTS;
  return BOSS_POINTS;
}

// The level is cleared, wave level or boss alike: the clear bonus (and the flawless one when the ship
// was never hit) goes on the score. Returns it, for the cleared event.
export function awardClear(world) {
  const bonus = CLEAR_BONUS + (world.hits === 0 ? FLAWLESS_BONUS : 0);
  world.score += bonus;
  return bonus;
}

export const MAX_STARS = 3;

// 0 unless cleared; 3 with no hits, 2 after losing one life, 1 after more.
export const stars = (world) => (world.state === 'cleared' ? Math.max(1, MAX_STARS - world.hits) : 0);
