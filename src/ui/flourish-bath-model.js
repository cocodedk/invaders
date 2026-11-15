// When Rubber Regatta's flourishes happen (flourish-bath.js): pure functions of time, and of fx's flashes for the spurt, each handing
// back one shared object so nothing is allocated and a test can read the timetable.
//   drip(t)     each DRIP.period one tap, the two in turn: a drop gathers on its dolphin's lip (swell), falls (fall) and lands in a
//               crown splash (splash), then nothing till the next; { phase: 'swell' | 'fall' | 'splash' | null, tap, k 0..1 through it }
//   bubble(t)   each BUBBLE.period a giant bubble drifts in from one side, rising, for BUBBLE.drift s, then pops (BUBBLE.pop s);
//               { on, popped, x, y, k 0..1 through the drift or the pop, wob -1..1 }
//   steamer(t)  each STEAMER.period the toy steamer crosses the frame in STEAMER.cross s, the other way each time; { on, x, dir, k }
//   spurt(fx)   the strongest live flash tagged 'strike' (fx/react-bath.js): { k its life left 0..1 (0 with none), age s }
import { W, hash } from './sprites.js';
import { BOAT } from './flourish-bath-steamer.js';

export const DRIP = { period: 6.8, swell: 1.6, fall: 0.5, splash: 0.7 };
export const BUBBLE = { period: 18, drift: 11, pop: 0.7, r: 100, from: 840, rise: 320, reach: 0.74 };
export const STEAMER = { period: 56, cross: 40, y: 806, bob: 3 }; // y: the frame y of its waterline, in the near layer's foam
export const STRIKE = 'strike';

const drop = { phase: null, tap: 0, k: 0 };
const STEPS = [['swell', DRIP.swell], ['fall', DRIP.fall], ['splash', DRIP.splash]];
export function drip(t) {
  const i = Math.floor(t / DRIP.period);
  let age = t - i * DRIP.period;
  drop.tap = ((i % 2) + 2) % 2;
  drop.phase = null;
  drop.k = 0;
  for (const [name, len] of STEPS) {
    if (age < len) {
      drop.phase = name;
      drop.k = age / len;
      break;
    }
    age -= len;
  }
  return drop;
}

const bub = { on: false, popped: false, x: 0, y: 0, k: 0, wob: 0 };
export function bubble(t) {
  const i = Math.floor(t / BUBBLE.period);
  const age = t - i * BUBBLE.period;
  bub.on = age < BUBBLE.drift + BUBBLE.pop;
  const held = Math.min(age, BUBBLE.drift);
  const u = held / BUBBLE.drift;
  const span = W * (BUBBLE.reach - 0.14 * hash(i * 5 + 2));
  bub.x = hash(i * 5 + 1) < 0.5 ? -BUBBLE.r + u * span : W + BUBBLE.r - u * span;
  bub.y = BUBBLE.from - BUBBLE.rise * u + 22 * Math.sin(held * 1.1 + i);
  bub.popped = age >= BUBBLE.drift;
  bub.k = bub.popped ? Math.min(1, (age - BUBBLE.drift) / BUBBLE.pop) : u;
  bub.wob = Math.sin(held * 2.3);
  return bub;
}

const boat = { on: false, x: 0, dir: 1, k: 0 };
export function steamer(t) {
  const i = Math.floor(t / STEAMER.period);
  const age = t - i * STEAMER.period;
  const m = BOAT.w / 2 + 40;
  boat.on = age < STEAMER.cross;
  boat.dir = i % 2 ? -1 : 1;
  boat.k = Math.min(1, age / STEAMER.cross);
  boat.x = boat.dir > 0 ? -m + boat.k * (W + 2 * m) : W + m - boat.k * (W + 2 * m);
  return boat;
}

const gush = { k: 0, age: 0 };
export function spurt(fx) {
  gush.k = 0;
  gush.age = 0;
  for (const f of fx.flashes) {
    if (f.tag !== STRIKE || !(f.life > 0)) continue;
    const k = Math.min(1, f.life / f.max);
    if (k > gush.k) {
      gush.k = k;
      gush.age = f.max - f.life;
    }
  }
  return gush;
}
