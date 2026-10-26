import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The lobby's posters are baked in idle slices. World 18 (Anvil Sky) has no boss level: its poster is taken from its
// only level, and the bake must not throw (a throw in an idle slice would leave the baker stuck).
installCanvas();
globalThis.requestIdleCallback = (fn) => setImmediate(fn);
const { warmPosters, posterFor, TAGLINES } = await import('../../src/ui/screens/posters.js');
const { WORLDS } = await import('../../src/core/levels.js');

test('every world has its own tagline', () => {
  assert.equal(TAGLINES.length, WORLDS.length);
  assert.equal(new Set(TAGLINES).size, WORLDS.length);
  for (const line of TAGLINES) assert.ok(line.length > 0 && line.length < 60, line);
  assert.equal(TAGLINES[17], 'Make their fire follow you.');
});

test('every world is baked into a poster, the world without a boss from its only level', async () => {
  warmPosters(() => true);
  const done = () => WORLDS.every((w) => posterFor(w.id));
  for (let i = 0; i < 400 && !done(); i++) await new Promise((r) => setTimeout(r, 50));
  assert.ok(done(), `posters baked: ${WORLDS.filter((w) => posterFor(w.id)).map((w) => w.id)}`);
  assert.equal(posterFor(18).className, 'poster-canvas');
  assert.equal(posterFor(99), null);
});
