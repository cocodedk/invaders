import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The lobby puts every world on one scrolling page and tells the baker which posters are in view (prefer): those
// are baked first, then the rest in world order, and a poster half baked is finished before the choice is made again.
// A file of its own: the baked posters are kept for the whole process.
installCanvas();
globalThis.requestIdleCallback = (fn) => setImmediate(fn);
const { warmPosters, posterFor, prefer, preferred } = await import('../../src/ui/screens/posters.js');
const { WORLDS } = await import('../../src/core/levels.js');

// Poll between the baker's own slices (both run on setImmediate), so each poster is seen the moment it is done.
const order = [];
async function watch(done) {
  for (let i = 0; i < 20000 && !done(); i++) {
    await new Promise((r) => setImmediate(r));
    for (const w of WORLDS) if (posterFor(w.id) && !order.includes(w.id)) order.push(w.id);
  }
}

test('the worlds in view are baked first, in the order given, then the rest in world order', async () => {
  assert.deepEqual(preferred(), [], 'nothing preferred at first');
  prefer([WORLDS.length, 9]);
  assert.deepEqual(preferred(), [WORLDS.length, 9]);
  warmPosters(() => true);
  await watch(() => order.length >= 4);
  assert.deepEqual(order.slice(0, 4), [WORLDS.length, 9, 1, 2], 'the last world, then world 9, then the rest in order');
  assert.equal(posterFor(WORLDS.length).className, 'poster-canvas');
});

test('changing the preference takes the next poster from the new list, and every poster still gets baked', async () => {
  const before = order.length;
  prefer([7]);
  await watch(() => order.includes(7));
  assert.ok(order.indexOf(7) <= before + 1, `world 7 comes ahead of every poster not yet started (at ${order.indexOf(7)}, ${before} baked)`);
  prefer([]);
  await watch(() => order.length === WORLDS.length);
  assert.equal(order.length, WORLDS.length, 'with no preference the baker still goes through every world');
  const after = order.slice(order.indexOf(7) + 1);
  assert.deepEqual(after, [...after].sort((a, b) => a - b), 'and takes the rest in world order');
});
