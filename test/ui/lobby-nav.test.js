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

// World 16 makes the side row eight banners on the same eight columns as the main row (lobby.css: both
// 76.7 rem wide). Card centres in rem, measured in Chromium on the real lobby at 1280, 1600 and 1920 wide
// (they agree to 0.01 rem): main world w and side card w - 8 both at 14.05 + 9.7 k. So down from every
// main world lands on the card straight under it, and up from a side card comes back to the world straight
// over it; there are no near ties for `near` to settle.
const ROWS16 = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11, 12, 13, 14, 15]];
const mid = (w) => 14.05 + 9.7 * (w % 8);
const nearest = (w, row) => row.reduce((a, b) => (Math.abs(mid(b) - mid(w)) < Math.abs(mid(a) - mid(w)) ? b : a));
const go16 = (at, key) => step(at, MOVE[key], ROWS16, 5, nearest);

test('an eight-card side row wraps on itself, one card at a time, and reaches world 16', () => {
  assert.deepEqual(go16([14, 2], 'ArrowRight'), [15, 2], 'world 15 to world 16');
  assert.deepEqual(go16([15, 2], 'ArrowRight'), [8, 2]);
  assert.deepEqual(go16([8, 2], 'ArrowLeft'), [15, 2]);
  assert.deepEqual(go16([15, 2], 'ArrowLeft'), [14, 2]);
  assert.deepEqual(go16([10, 1], 'ArrowRight'), [11, 1]);
  assert.deepEqual(go16([10, 1], 'ArrowLeft'), [9, 1]);
});

test('down from the main row lands on the side card straight under it, and up comes back to the world over it', () => {
  for (let w = 0; w < 8; w++) {
    assert.deepEqual(go16([w, 4], 'ArrowDown'), [8 + w, 0], `down from world ${w + 1}`);
    assert.deepEqual(go16([8 + w, 0], 'ArrowUp'), [w, 4], `up from world ${9 + w}`);
  }
  assert.equal(go16([15, 4], 'ArrowDown'), null, 'the last row leaves for Back');
  assert.equal(go16([8, 4], 'ArrowDown'), null);
});

test('with the eighth side card every one of the 80 reels is reachable by the arrows', () => {
  const seen = new Set(['0,0']);
  const queue = [[0, 0]];
  while (queue.length) {
    const at = queue.pop();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const to = go16(at, key);
      if (to && !seen.has(to.join())) {
        seen.add(to.join());
        queue.push(to);
      }
    }
  }
  assert.equal(seen.size, 80);
  for (let r = 0; r < 5; r++) assert.ok(seen.has(`15,${r}`), `world 16, reel ${r + 1}`);
});
