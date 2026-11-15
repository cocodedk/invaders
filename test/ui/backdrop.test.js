import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The title's backdrop battle (M5): a random world's wave level, and on a return to the title from a
// level, another world than the one just shown (the router passes it), so a kiosk cycles worlds.
installCanvas();
const { pickBackdrop } = await import('../../src/ui/scenes.js');
const { WORLDS } = await import('../../src/core/levels.js');

// The draw is uniform over the wave levels, four a world: 2000 draws all but surely reach every world, the newest included.
const DRAWS = 2000;

test('the backdrop is a wave level of any world, and never the world it is told to skip', () => {
  const worlds = new Set();
  for (let i = 0; i < DRAWS; i++) {
    const level = pickBackdrop();
    assert.ok(level.waves, `${level.id} is a wave level`);
    worlds.add(level.world);
  }
  assert.equal(worlds.size, WORLDS.length, 'every world comes up, the last one among them');
  for (let skip = 1; skip <= WORLDS.length; skip++) {
    const other = new Set();
    for (let i = 0; i < DRAWS; i++) {
      const level = pickBackdrop(skip);
      assert.ok(level.waves, `${level.id} is a wave level`);
      assert.notEqual(level.world, skip, `skipping world ${skip}`);
      other.add(level.world);
    }
    assert.equal(other.size, WORLDS.length - 1, `every other world comes up when skipping ${skip}`);
  }
});
