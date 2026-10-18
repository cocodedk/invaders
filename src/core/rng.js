// mulberry32: small, fast, seedable. Two forms of the same stream:
//   makeRng(seed)  a closure giving floats in [0, 1). For fx and ui, which never need to be cloned.
//   createRng(seed) + rand(r)  the state lives in a plain `{ s }` object, so a world that holds it
//                   survives structuredClone. The core only ever draws from `world.rng` via rand.
const STEP = 0x6d2b79f5;

function mix(a) {
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + STEP) >>> 0;
    return mix(a);
  };
}

export const createRng = (seed) => ({ s: seed >>> 0 });

export function rand(r) {
  r.s = (r.s + STEP) >>> 0;
  return mix(r.s);
}

// A uniform draw in [lo, hi), and a uniform pick from `list`: for a closure rng, and the same for a
// `{ s }` state (randBetween, randPick: one rand(r) draw each).
export const between = (rng, lo, hi) => lo + rng() * (hi - lo);
export const pick = (rng, list) => list[Math.floor(rng() * list.length)];
export const randBetween = (r, lo, hi) => lo + rand(r) * (hi - lo);
export const randPick = (r, list) => list[Math.floor(rand(r) * list.length)];
