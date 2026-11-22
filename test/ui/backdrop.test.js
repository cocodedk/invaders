import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The title's backdrop battle (M5): a random world's wave level, and on a return to the title from a
// level, another world than the one just shown (the router passes it), so a kiosk cycles worlds.
installCanvas();
const { pickBackdrop } = await import('../../src/ui/scenes.js');
const { WORLDS, LEVELS } = await import('../../src/core/levels.js');

// The draw is uniform over the wave levels, four a world: 2000 draws all but surely reach every world with waves, the newest of
// them included. A course world (22) has no waves, so it is never the backdrop.
const DRAWS = 2000;
const waveWorlds = new Set(LEVELS.filter((l) => l.waves).map((l) => l.world));

test('the backdrop is a wave level of any world, and never the world it is told to skip', () => {
  const worlds = new Set();
  for (let i = 0; i < DRAWS; i++) {
    const level = pickBackdrop();
    assert.ok(level.waves, `${level.id} is a wave level`);
    worlds.add(level.world);
  }
  assert.deepEqual([...worlds].sort((a, b) => a - b), [...waveWorlds], 'every world with waves comes up, the last of them among it, and no other');
  for (let skip = 1; skip <= WORLDS.length; skip++) {
    const other = new Set();
    for (let i = 0; i < DRAWS; i++) {
      const level = pickBackdrop(skip);
      assert.ok(level.waves, `${level.id} is a wave level`);
      assert.notEqual(level.world, skip, `skipping world ${skip}`);
      other.add(level.world);
    }
    assert.equal(other.size, waveWorlds.size - Number(waveWorlds.has(skip)), `every other world with waves comes up when skipping ${skip}`);
  }
});
