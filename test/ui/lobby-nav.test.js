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

// World 14 makes the side row six cards wide, a frieze of its own, 87.8 rem against the main row's 76.7
// (lobby.css). Card centres in rem, measured in Chromium on the real lobby at 1280, 1600 and 1920 wide
// (they agree to 0.25 rem): main world w at 14.05 + 9.7 w, the side cards at 11, 25.8, 40.6, 55.4, 70.2
// and 85. Every main world is nearest to one side card by at least 0.4 rem, so there are no ties.
const ROWS14 = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11, 12, 13]];
const SIDE_AT = [11, 25.8, 40.6, 55.4, 70.2, 85];
const mid = (w) => (w < 8 ? 14.05 + 9.7 * w : SIDE_AT[w - 8]);
const nearest = (w, row) => row.reduce((a, b) => (Math.abs(mid(b) - mid(w)) < Math.abs(mid(a) - mid(w)) ? b : a));
const go14 = (at, key) => step(at, MOVE[key], ROWS14, 5, nearest);

test('a six-card side row wraps on itself, one card at a time, and reaches world 14', () => {
  assert.deepEqual(go14([12, 2], 'ArrowRight'), [13, 2], 'world 13 to world 14');
  assert.deepEqual(go14([13, 2], 'ArrowRight'), [8, 2]);
  assert.deepEqual(go14([8, 2], 'ArrowLeft'), [13, 2]);
  assert.deepEqual(go14([13, 2], 'ArrowLeft'), [12, 2]);
  assert.deepEqual(go14([10, 1], 'ArrowRight'), [11, 1]);
  assert.deepEqual(go14([10, 1], 'ArrowLeft'), [9, 1]);
});

test('down from the main row lands on the nearest of the six side cards, and up comes back to the nearest main world', () => {
  const below = [8, 9, 10, 10, 11, 11, 12, 13]; // the side card under main worlds 0..7
  for (const [w, card] of below.entries()) assert.deepEqual(go14([w, 4], 'ArrowDown'), [card, 0], `world ${w + 1}`);
  const above = [0, 1, 3, 4, 6, 7]; // the main world over side cards 0..5
  for (const [k, w] of above.entries()) assert.deepEqual(go14([8 + k, 0], 'ArrowUp'), [w, 4], `side card ${k + 1}`);
  assert.equal(go14([13, 4], 'ArrowDown'), null, 'the last row leaves for Back');
  assert.equal(go14([8, 4], 'ArrowDown'), null);
});

test('with the sixth side card every one of the 70 reels is reachable by the arrows', () => {
  const seen = new Set(['0,0']);
  const queue = [[0, 0]];
  while (queue.length) {
    const at = queue.pop();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const to = go14(at, key);
      if (to && !seen.has(to.join())) {
        seen.add(to.join());
        queue.push(to);
      }
    }
  }
  assert.equal(seen.size, 70);
  for (let r = 0; r < 5; r++) assert.ok(seen.has(`13,${r}`), `world 14, reel ${r + 1}`);
});
