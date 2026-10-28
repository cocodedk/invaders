import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS } from '../../src/core/levels.js';
import { RATINGS } from '../../src/core/ratings.js';

// A world's difficulty score on its Level Select card: scripts/ratings.mjs measures and writes the table
// (slow, so it is not run here; run it again when a world is added or retuned).

test('every world has exactly one score, out of 10, with at most one decimal', () => {
  assert.equal(RATINGS.length, WORLDS.length);
  for (const v of RATINGS) {
    assert.ok(typeof v === 'number' && v >= 1 && v <= 10, `${v}`);
    assert.equal(Number(v.toFixed(1)), v, `${v} has more than one decimal`);
  }
});
