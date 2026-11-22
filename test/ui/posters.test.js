import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The lobby's posters are baked in idle slices, each from its world's boss level (world 18's is the Squall Ray's, world 19's the Dowager Duck's), and the
// bake must not throw (a throw in an idle slice would leave the baker stuck).
installCanvas();
globalThis.requestIdleCallback = (fn) => setImmediate(fn);
const { warmPosters, posterFor, posterLevel, runUp, RUNUP_SLICE, TAGLINES } = await import('../../src/ui/screens/posters.js');
const { WORLDS, LEVELS } = await import('../../src/core/levels.js');
const { createWorld } = await import('../../src/core/world.js');
const { TICK } = await import('../../src/core/kinds.js');
const { createFx } = await import('../../src/fx/fx.js');
const { fxRng } = await import('../../src/ui/session.js');

test('every world has its own tagline', () => {
  assert.equal(TAGLINES.length, WORLDS.length);
  assert.equal(new Set(TAGLINES).size, WORLDS.length);
  for (const line of TAGLINES) assert.ok(line.length > 0 && line.length < 60, line);
  assert.equal(TAGLINES[17], 'Make their fire follow you.');
  assert.equal(TAGLINES[18], 'Bath time. Bring a bat.');
  assert.equal(TAGLINES.at(-1), 'Colour follows the light.');
});

test('every world is baked into a poster, each from its boss level', async () => {
  warmPosters(() => true);
  const done = () => WORLDS.every((w) => posterFor(w.id));
  for (let i = 0; i < 400 && !done(); i++) await new Promise((r) => setTimeout(r, 50));
  assert.ok(done(), `posters baked: ${WORLDS.filter((w) => posterFor(w.id)).map((w) => w.id)}`);
  assert.equal(posterFor(18).className, 'poster-canvas');
  assert.equal(posterFor(99), null);
});

// A poster is taken from its world's boss level, or, in a world without one (a one-leg course), from its last level.
const lv = (id, world, boss) => ({ id, world, boss });
const LIST = [lv('a1', 3), lv('a2', 3), lv('a3', 3, 'boss'), lv('b1', 4), lv('b2', 4), lv('c1', 5, 'boss'), lv('c2', 5)];

test('posterLevel is the world\'s boss level, else its last level', () => {
  assert.equal(posterLevel(3, LIST).id, 'a3', 'the boss level, wherever it stands in the list');
  assert.equal(posterLevel(5, LIST).id, 'c1', 'the boss level even when it is not the last');
  assert.equal(posterLevel(4, LIST).id, 'b2', 'a world without a boss level: its last');
  assert.equal(posterLevel(9, [lv('z1', 9)]).id, 'z1', 'a one-level world: that level');
  assert.equal(posterLevel(8, LIST), undefined, 'a world with no levels has none');
});

test('every world of the game has its boss level for a poster, and a course world its one leg', () => {
  for (const w of WORLDS.filter((x) => x.boss)) assert.equal(posterLevel(w.id).id, LEVELS.find((l) => l.world === w.id && l.boss).id, `world ${w.id}`);
  for (const w of WORLDS.filter((x) => !x.boss)) assert.equal(posterLevel(w.id).id, LEVELS.find((l) => l.world === w.id && l.course).id, `world ${w.id}`);
});

// A poster whose run-up is long (a course's: tens of seconds of the autopilot's flight) must not step it all in one idle period: the
// run-up hands the period back every RUNUP_SLICE ticks, and a short one (a boss fight's few seconds) keeps its single slice.
const ticksPerSlice = (secs) => {
  const level = posterLevel(WORLDS.find((x) => !x.boss).id);
  const w = createWorld(level, level.seed);
  const run = runUp(w, createFx(), fxRng(level.seed), secs);
  const steps = [];
  let from = w.tick;
  while (!run.next().done) { // each hand-back ends a slice
    steps.push(w.tick - from);
    from = w.tick;
  }
  steps.push(w.tick - from); // what the run-up steps after its last hand-back
  return steps;
};

test('a long run-up is stepped in slices of at most RUNUP_SLICE ticks, every tick of it', () => {
  const ticks = 3.5 * RUNUP_SLICE;
  const steps = ticksPerSlice(ticks * TICK);
  assert.equal(steps.reduce((a, b) => a + b, 0), ticks);
  assert.ok(steps.every((n) => n <= RUNUP_SLICE), `slices of ${steps} ticks`);
  assert.ok(steps.length >= Math.ceil(ticks / RUNUP_SLICE), `only ${steps.length} slices`);
});

test('a run-up shorter than a slice stays one slice', () => {
  assert.deepEqual(ticksPerSlice((RUNUP_SLICE / 2) * TICK), [RUNUP_SLICE / 2]);
});
