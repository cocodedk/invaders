import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The lobby's posters are baked in idle slices, each from its world's boss level (world 18's is the Squall Ray's, world 19's the Dowager Duck's), and the
// bake must not throw (a throw in an idle slice would leave the baker stuck).
installCanvas();
globalThis.requestIdleCallback = (fn) => setImmediate(fn);
const { warmPosters, posterFor, posterLevel, TAGLINES } = await import('../../src/ui/screens/posters.js');
const { WORLDS, LEVELS } = await import('../../src/core/levels.js');

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
