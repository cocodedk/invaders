import { createWorld, stepWorld } from './world.js';
import { levelById } from './levels.js';
import { clamp } from './math.js';
import { TICK } from './kinds.js';

export { stateHash } from './state-hash.js';

// A run is its level, its seed and the input of every tick: the core is deterministic, so
// re-simulating those gives back every state and event of the run.
//   input  { dx, dy, fire, bomb, target }  dx, dy in -1..1, target null or { x, y } in whole pixels
//   run    { v: 1, level: 'w3-2', seed, ticks, inputs: <encoded>, score, stars }   (makeRun)
// The encoded inputs are run-length coded: one token per run of identical inputs,
//   <flag>[@<x>,<y>][*<count>]      "A*120B@960,1000*3C"
// where <flag> is one letter for (dx, dy, fire, bomb) and the optional @ part is the pointer
// target. Letters keep tokens apart from the numbers after them.

export { TICK };
export const MAX_TICKS = 60 * 60 * 30; // half an hour of play: more than any level, small enough to bound a corrupt count
const FLAGS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij'; // (dx + 1) * 12 + (dy + 1) * 4 + fire * 2 + bomb
const WIDTH = 1920;
const HEIGHT = 1080;

// The one shape the core is fed and the encoder writes: keys signed, flags boolean, the pointer
// rounded to whole pixels and held on the screen (the ship's zone lies inside it, so the clamp
// changes nothing the ship does).
export function quantizeInput(raw = {}) {
  const t = raw.target;
  const aimed = t && Number.isFinite(t.x) && Number.isFinite(t.y);
  return {
    dx: Math.sign(raw.dx) || 0,
    dy: Math.sign(raw.dy) || 0,
    fire: Boolean(raw.fire),
    bomb: Boolean(raw.bomb),
    target: aimed ? { x: clamp(Math.round(t.x), 0, WIDTH), y: clamp(Math.round(t.y), 0, HEIGHT) } : null,
  };
}

const token = (i) => FLAGS[(i.dx + 1) * 12 + (i.dy + 1) * 4 + (i.fire ? 2 : 0) + (i.bomb ? 1 : 0)]
  + (i.target ? `@${i.target.x},${i.target.y}` : '');

export function encodeInputs(inputs) {
  let out = '';
  let last = '';
  let run = 0;
  for (const raw of inputs) {
    const t = token(quantizeInput(raw));
    if (t === last) {
      run++;
      continue;
    }
    out += run > 1 ? `${last}*${run}` : last;
    last = t;
    run = 1;
  }
  return out + (run > 1 ? `${last}*${run}` : last);
}

// The inputs back, or null for anything that is not what encodeInputs writes (a bad token, a
// count under 2, more than `max` inputs in all).
export function decodeInputs(text, max = MAX_TICKS) {
  if (typeof text !== 'string') return null;
  const re = /([A-Za-j])(?:@(\d{1,4}),(\d{1,4}))?(?:\*(\d{1,9}))?/y;
  const out = [];
  while (re.lastIndex < text.length) {
    const m = re.exec(text);
    if (!m) return null;
    const n = m[4] === undefined ? 1 : Number(m[4]);
    const f = FLAGS.indexOf(m[1]);
    if (f < 0) return null;
    const target = m[2] === undefined ? null : { x: Number(m[2]), y: Number(m[3]) };
    if ((m[4] !== undefined && n < 2) || out.length + n > max) return null;
    if (target && (target.x > WIDTH || target.y > HEIGHT)) return null;
    for (let i = 0; i < n; i++) {
      out.push({ dx: Math.floor(f / 12) - 1, dy: Math.floor((f % 12) / 4) - 1, fire: (f & 2) !== 0, bomb: (f & 1) !== 0,
        target: target && { ...target } });
    }
  }
  return out;
}

// The storable form of a finished run. `level` is a level or its id; `result` is { score, stars }.
export const makeRun = (level, seed, inputs, result) => ({
  v: 1, level: level.id ?? level, seed, ticks: inputs.length, inputs: encodeInputs(inputs),
  score: result.score, stars: result.stars,
});

const isCount = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;

// A saved run read back: the same fields with `inputs` decoded to a list, or null when it is not a
// valid run of version 1 (wrong version, unknown level, bad numbers, an encoding that is garbage
// or whose length is not `ticks`, which is what a truncation looks like).
export function decodeRun(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj) || obj.v !== 1) return null;
  const { level, seed, ticks, score, stars } = obj;
  if (typeof level !== 'string' || !levelById(level)) return null;
  if (!isCount(seed, 2 ** 32 - 1) || !isCount(ticks, MAX_TICKS) || !isCount(stars, 3)) return null;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) return null;
  const inputs = decodeInputs(obj.inputs, ticks);
  return inputs && inputs.length === ticks ? { v: 1, level, seed, ticks, inputs, score, stars } : null;
}

// Re-simulate a run: a fresh world for `level` (a level or its id) and `seed`, stepped through
// `inputs`, its events drained into one list as the game loop does. `snapshotsAt` lists ticks at
// which to keep a structuredClone of the world as it stands after that many ticks, i.e. before
// inputs[tick] is applied, so stepping a snapshot on from inputs[tick] carries the run on; a tick
// the run never reaches has none. (A cleared or failed world no longer moves.)
export function replay(level, seed, inputs, { snapshotsAt = [] } = {}) {
  const lv = typeof level === 'string' ? levelById(level) : level;
  if (!lv) throw new Error(`unknown level: ${level}`);
  const world = createWorld(lv, seed);
  const want = new Set(snapshotsAt);
  const snapshots = new Map();
  const events = [];
  const snap = () => {
    if (want.has(world.tick) && !snapshots.has(world.tick)) snapshots.set(world.tick, structuredClone(world));
  };
  snap();
  for (const input of inputs) {
    stepWorld(world, TICK, input);
    events.push(...world.events.splice(0));
    snap();
  }
  return { world, events, snapshots };
}
