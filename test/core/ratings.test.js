import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS } from '../../src/core/levels.js';
import { RATINGS } from '../../src/core/ratings.js';
import { measured, rowsOf, FLIGHTS } from '../../scripts/ratings.mjs';

// A world's difficulty score on its Level Select card: scripts/ratings.mjs measures and writes the table
// (slow, so it is not run here; run it again when a world is added or retuned).

test('every world has exactly one score, out of 10, with at most one decimal', () => {
  assert.equal(RATINGS.length, WORLDS.length);
  for (const v of RATINGS) {
    assert.ok(typeof v === 'number' && v >= 1 && v <= 10, `${v}`);
    assert.equal(Number(v.toFixed(1)), v, `${v} has more than one decimal`);
  }
});

// A course world (world 22) is not flown by the pilot: scripts/ratings.mjs skips it and keeps the score set by hand.
const levels = [
  { id: 'a-1', world: 1, d: 0.2 }, { id: 'a-2', world: 1, d: 0.2 },
  { id: 'c-1', world: 2, d: 0.85, course: { speed: 1, length: 1, spawns: [] } },
];
const worlds = [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }];

test('the pilot flies no course level', () => {
  assert.deepEqual(measured(levels).map((l) => l.id), ['a-1', 'a-2']);
});

test('a course world keeps its hand-set score and shows no clear rate; the others are measured', () => {
  const rows = rowsOf(levels, worlds, { 'a-1': FLIGHTS, 'a-2': FLIGHTS }, [4.4, 7]);
  assert.deepEqual(rows[0], { world: 1, name: 'One', clear: '100.0', setting: '0.200', score: '1.9', levels: '100 100' });
  assert.deepEqual(rows[1], { world: 2, name: 'Two', clear: '-', setting: '0.850', score: '7.0', levels: 'set by hand' });
});

test('a course world with no hand-set score is an error, not a hole in the table', () => {
  assert.throws(() => rowsOf(levels, worlds, { 'a-1': FLIGHTS, 'a-2': FLIGHTS }, [4.4]), /world 2 is a course/);
});
