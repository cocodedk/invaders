import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVE } from '../../src/ui/keys.js';
import { step } from '../../src/ui/screens/lobby-nav.js';

// A small layout: the main run's eight worlds in a row, two side worlds under them, five reels each. Up
// and down land on the same place in the next row, or on its last card when that row is shorter.
const ROWS = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 9]];
const go = (at, key, rows = ROWS) => step(at, MOVE[key], rows, 5);

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

test("past a column's end the keys run on into the same place in the row below or above, or its last card if that is shorter", () => {
  assert.deepEqual(go([0, 4], 'ArrowDown'), [8, 0], 'the last reel of the main row goes to the first reel beneath');
  assert.deepEqual(go([1, 4], 'ArrowDown'), [9, 0]);
  assert.deepEqual(go([6, 4], 'ArrowDown'), [9, 0], 'the row below has two cards: the seventh is past its end, so its last');
  assert.deepEqual(go([8, 0], 'ArrowUp'), [0, 4], 'and back up, to the last reel above');
  assert.deepEqual(go([9, 0], 'ArrowUp'), [1, 4]);
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

// World 17 makes the side row nine cards on the main row's own pitch (lobby.css: 86.4 rem against 76.7, both
// centred), so every side card stands half a column off the posters. Card centres in rem, measured in
// Chromium on the real lobby at 1280, 1600 and 1920 wide (they agree to 0.01 rem): main world k at
// 14.05 + 9.7 k, side card j at 9.2 + 9.7 j. Going down or up, two cards tie 4.85 rem away, and `step`
// takes the one at the same place, so down and then up comes back to where you were.
const ROWS17 = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11, 12, 13, 14, 15, 16]];
const mid = (w) => (w < 8 ? 14.05 + 9.7 * w : 9.2 + 9.7 * (w - 8));
const go17 = (at, key) => step(at, MOVE[key], ROWS17, 5);

test('a nine-card side row wraps on itself, one card at a time, and reaches world 17', () => {
  assert.deepEqual(go17([15, 2], 'ArrowRight'), [16, 2], 'world 16 to world 17');
  assert.deepEqual(go17([16, 2], 'ArrowRight'), [8, 2]);
  assert.deepEqual(go17([8, 2], 'ArrowLeft'), [16, 2]);
  assert.deepEqual(go17([16, 2], 'ArrowLeft'), [15, 2]);
  assert.deepEqual(go17([10, 1], 'ArrowRight'), [11, 1]);
  assert.deepEqual(go17([10, 1], 'ArrowLeft'), [9, 1]);
});

test('down and up always land on a nearest card, and down then up comes back', () => {
  const nearestDist = (w, row) => Math.min(...row.map((b) => Math.abs(mid(b) - mid(w))));
  for (let w = 0; w < 8; w++) {
    const [down, reel] = go17([w, 4], 'ArrowDown');
    assert.equal([down, reel].join(), `${8 + w},0`, `down from world ${w + 1}`);
    assert.ok(Math.abs(Math.abs(mid(down) - mid(w)) - nearestDist(w, ROWS17[1])) < 1e-9, `world ${w + 1} down is a nearest card`);
    assert.deepEqual(go17([down, 0], 'ArrowUp'), [w, 4], `back up to world ${w + 1}`);
  }
  for (let w = 8; w < 17; w++) {
    const [up, reel] = go17([w, 0], 'ArrowUp');
    assert.equal(reel, 4, 'the last reel above');
    assert.ok(Math.abs(Math.abs(mid(up) - mid(w)) - nearestDist(w, ROWS17[0])) < 1e-9, `world ${w + 1} up is a nearest card`);
  }
  assert.deepEqual(go17([16, 0], 'ArrowUp'), [7, 4], 'world 17 hangs past the main row: its nearest is world 8');
  assert.equal(go17([16, 4], 'ArrowDown'), null, 'the last row leaves for Back');
  assert.equal(go17([8, 4], 'ArrowDown'), null);
});

test('with the ninth side card every one of the 85 reels is reachable by the arrows', () => {
  const seen = new Set(['0,0']);
  const queue = [[0, 0]];
  while (queue.length) {
    const at = queue.pop();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const to = go17(at, key);
      if (to && !seen.has(to.join())) {
        seen.add(to.join());
        queue.push(to);
      }
    }
  }
  assert.equal(seen.size, 85);
  for (let r = 0; r < 5; r++) assert.ok(seen.has(`16,${r}`), `world 17, reel ${r + 1}`);
});

// A column need not hold five reels (world 18 is one reel): `reels` may be an array of counts by world. A
// shorter column takes the key's reel as its last, and up and down run on through it without a stop.
const COUNTS = [5, 1, 5, 5, 1]; // worlds 0, 2 and 3 hold five reels, worlds 1 and 4 one
const MIXED = [[0, 1, 2], [3, 4]];
const goMixed = (at, key, rows = MIXED) => step(at, MOVE[key], rows, COUNTS);

test('a one-reel column is passed through: down and up skip over the reels it does not have', () => {
  assert.equal(goMixed([1, 0], 'ArrowUp').join(), '1,0', 'at the top of the top row, up stays put');
  assert.equal(goMixed([1, 0], 'ArrowDown').join(), '4,0', 'down from a one-reel column goes straight on to the row below');
  assert.equal(goMixed([4, 0], 'ArrowUp').join(), '1,0', 'and up from the one-reel world below lands on its last (only) reel');
  assert.equal(goMixed([3, 0], 'ArrowUp').join(), '0,4', 'up from a five-reel world lands on the last reel above');
  assert.equal(goMixed([4, 0], 'ArrowDown'), null, "down from the last row's one reel leaves for Back");
  assert.equal(goMixed([1, 0], 'ArrowDown', [[0, 1, 2]]), null, 'with one row, a one-reel column leaves for Back');
});

test("left and right keep the reel but never past a column's last", () => {
  assert.equal(goMixed([0, 3], 'ArrowRight').join(), '1,0', 'reel 4 of world 1 to the only reel of world 2');
  assert.equal(goMixed([1, 0], 'ArrowRight').join(), '2,0', 'and on at reel 1');
  assert.equal(goMixed([2, 4], 'ArrowLeft').join(), '1,0');
  assert.equal(goMixed([2, 4], 'ArrowRight').join(), '0,4', 'the row wraps; world 1 has all five');
  assert.equal(goMixed([4, 0], 'ArrowRight').join(), '3,0');
  assert.equal(goMixed([3, 4], 'ArrowLeft').join(), '4,0');
});

test('with columns of other heights every reel is still reachable and every move lands on a reel that exists', () => {
  const seen = new Set(['0,0']);
  const queue = [[0, 0]];
  while (queue.length) {
    const at = queue.pop();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const to = goMixed(at, key);
      if (!to) continue;
      assert.ok(to[1] >= 0 && to[1] < COUNTS[to[0]], `${at} ${key} -> ${to}`);
      if (!seen.has(to.join())) {
        seen.add(to.join());
        queue.push(to);
      }
    }
  }
  assert.equal(seen.size, COUNTS.reduce((a, b) => a + b, 0));
});

test('a plain number still means every column holds that many reels', () => {
  assert.deepEqual(step([2, 3], MOVE.ArrowDown, MIXED, 5), [2, 4]);
  assert.deepEqual(step([0, 4], MOVE.ArrowDown, MIXED, 5), [3, 0]);
  assert.deepEqual(step([0, 4], MOVE.ArrowRight, MIXED, 5), [1, 4]);
});
