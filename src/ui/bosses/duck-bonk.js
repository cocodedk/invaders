// When The Dowager Duck is bonked (World 19, Rubber Regatta; bosses/duck*.js): a body batted into a part of hers (core/bonk.js) sets her
// `bonked` to the tick it landed on. This module's own memory, a WeakMap per boss, keeps the stamp it last saw and the time it changed: a
// new stamp is a bonk, whether it finished the part or not, and nothing else (a shot, the beam, a bomb) is. Nothing on world or fx is
// written, and a boss first seen (a frozen frame, a clone in the trailer) starts with no bonk.
//   bonkAge(b, t)  seconds since her last bonk (Infinity if none); idempotent within a frame (the pose and the live pass both ask)
//   pose(b, t)     the squash, for bosses/index.js: [sx, sy, py], her whole drawing scaled about the line y = py, or null. She squashes
//                  wider and lower, never taller, for SQUASH s, wobbling out; the boxes never move (art only)
import { RING } from './duck-shape.js';

export const SQUASH = 0.42; // s the squash lasts
export const CROSS = 0.8; // s her eyes stay crossed
export const SQUASH_X = 0.08; // how much wider she grows at the squash's deepest
export const SQUASH_Y = 0.13; // how much lower
const BOUNCE = 12; // rad/s: she squashes, springs back and squashes again, less, as rubber does
const PIVOT = RING.y + 30; // she squashes down onto her foam

const memo = new WeakMap(); // boss -> { seen: the stamp last seen, at: t it changed }

export function bonkAge(b, t) {
  let m = memo.get(b);
  if (!m) {
    m = { seen: b.bonked, at: -Infinity };
    memo.set(b, m);
  }
  if (b.bonked !== m.seen) [m.seen, m.at] = [b.bonked, t];
  return t - m.at;
}

export function pose(b, t) {
  const age = bonkAge(b, t);
  if (!(age >= 0 && age < SQUASH)) return null;
  const e = (1 - age / SQUASH) ** 2 * Math.abs(Math.cos(age * BOUNCE)); // flattened on the frame it lands, as a cartoon is
  return [1 + SQUASH_X * e, 1 - SQUASH_Y * e, PIVOT];
}
