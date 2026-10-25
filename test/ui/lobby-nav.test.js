import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVE } from '../../src/ui/keys.js';
import { step } from '../../src/ui/screens/lobby-nav.js';

// The lobby's layout: the main run's eight worlds in a row, the two side worlds under them, five
// reels each. `near` stands in for the measured layout: the side row sits under the middle, so
// worlds 0-3 are nearest world 8, worlds 4-7 world 9, and back up 8 is nearest 3, 9 nearest 4.
const ROWS = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 9]];
const near = (w, row) => (row.length === 2 ? row[w < 4 ? 0 : 1] : row[w === 8 ? 3 : 4]);
const go = (at, key, rows = ROWS) => step(at, MOVE[key], rows, 5, near);

test('left and right change world within a row, keep the reel, and wrap inside the row', () => {
  assert.deepEqual(go([0, 2], 'ArrowRight'), [1, 2]);
  assert.deepEqual(go([3, 4], 'ArrowLeft'), [2, 4]);
  assert.deepEqual(go([7, 1], 'ArrowRight'), [0, 1], 'the main row wraps on itself');
  assert.deepEqual(go([0, 1], 'ArrowLeft'), [7, 1]);
  assert.deepEqual(go([9, 0], 'KeyD'), [8, 0], 'the side row wraps on itself');
  assert.deepEqual(go([8, 0], 'KeyA'), [9, 0]);
});

test('up and down change reel inside a world', () => {
  assert.deepEqual(go([2, 0], 'ArrowDown'), [2, 1]);
  assert.deepEqual(go([9, 3], 'ArrowUp'), [9, 2]);
  assert.deepEqual(go([7, 3], 'KeyS'), [7, 4]);
});

test("past a column's end the keys run on into the nearest world of the row below or above", () => {
  assert.deepEqual(go([2, 4], 'ArrowDown'), [8, 0], 'the last reel of the main row goes to the first reel beneath');
  assert.deepEqual(go([6, 4], 'ArrowDown'), [9, 0]);
  assert.deepEqual(go([8, 0], 'ArrowUp'), [3, 4], 'and back up, to the last reel above');
  assert.deepEqual(go([9, 0], 'ArrowUp'), [4, 4]);
});

test("down from the last row's last reel leaves for Back, and up from the top stays put", () => {
  for (const w of [8, 9]) assert.equal(go([w, 4], 'ArrowDown'), null, `world ${w + 1}`);
  assert.equal(go([1, 4], 'ArrowDown', [[0, 1, 2]]), null, 'with one row, its last reels leave for Back');
  assert.deepEqual(go([3, 0], 'ArrowUp'), [3, 0]);
});

test('every reel is reachable from the first by the arrows', () => {
  const seen = new Set(['0,0']);
  const queue = [[0, 0]];
  while (queue.length) {
    const at = queue.pop();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const to = go(at, key);
      if (to && !seen.has(to.join())) {
        seen.add(to.join());
        queue.push(to);
      }
    }
  }
  assert.equal(seen.size, 50);
});

// World 12 makes the side row four cards wide, under the main row's eight (the row is as wide as the
// main row, 77 rem against 76.7). Mids in main-row world widths: main world w at w + 0.5, side card k
// at 2k + 1.2, so every world has one nearest card and no ties.
const ROWS12 = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11]];
const mid = (w) => (w < 8 ? w + 0.5 : 2 * (w - 8) + 1.2);
const nearest = (w, row) => row.reduce((a, b) => (Math.abs(mid(b) - mid(w)) < Math.abs(mid(a) - mid(w)) ? b : a));
const go12 = (at, key) => step(at, MOVE[key], ROWS12, 5, nearest);

test('a four-card side row wraps on itself, and the rows hand over to the nearest card', () => {
  assert.deepEqual(go12([11, 2], 'ArrowRight'), [8, 2]);
  assert.deepEqual(go12([8, 2], 'ArrowLeft'), [11, 2]);
  assert.deepEqual(go12([0, 4], 'ArrowDown'), [8, 0]);
  assert.deepEqual(go12([4, 4], 'ArrowDown'), [10, 0]);
  assert.deepEqual(go12([7, 4], 'ArrowDown'), [11, 0]);
  assert.deepEqual(go12([9, 0], 'ArrowUp'), [3, 4]);
  assert.equal(go12([11, 4], 'ArrowDown'), null, 'the last row leaves for Back');
});

test('with the fourth side card every one of the 60 reels is reachable by the arrows', () => {
  const seen = new Set(['0,0']);
  const queue = [[0, 0]];
  while (queue.length) {
    const at = queue.pop();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const to = go12(at, key);
      if (to && !seen.has(to.join())) {
        seen.add(to.join());
        queue.push(to);
      }
    }
  }
  assert.equal(seen.size, 60);
});
