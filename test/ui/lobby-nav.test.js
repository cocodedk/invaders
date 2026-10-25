import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVE } from '../../src/ui/keys.js';
import { step, PER_ROW } from '../../src/ui/screens/lobby-nav.js';

// Ten worlds of five reels, in two rows of five (the lobby's layout).
const go = (at, key, worlds = 10) => step(at, MOVE[key], worlds, 5);

test('left and right change world within a row, keep the reel, and wrap inside the row', () => {
  assert.equal(PER_ROW, 5);
  assert.deepEqual(go([0, 2], 'ArrowRight'), [1, 2]);
  assert.deepEqual(go([3, 4], 'ArrowLeft'), [2, 4]);
  assert.deepEqual(go([4, 1], 'ArrowRight'), [0, 1], 'the first row wraps on itself');
  assert.deepEqual(go([0, 1], 'ArrowLeft'), [4, 1]);
  assert.deepEqual(go([9, 0], 'KeyD'), [5, 0], 'the second row wraps on itself');
  assert.deepEqual(go([5, 0], 'KeyA'), [9, 0]);
});

test('a short last row wraps within the worlds it has', () => {
  assert.deepEqual(go([7, 3], 'ArrowRight', 8), [5, 3]);
  assert.deepEqual(go([5, 3], 'ArrowLeft', 8), [7, 3]);
});

test('up and down change reel inside a world', () => {
  assert.deepEqual(go([2, 0], 'ArrowDown'), [2, 1]);
  assert.deepEqual(go([7, 3], 'ArrowUp'), [7, 2]);
  assert.deepEqual(go([7, 3], 'KeyS'), [7, 4]);
});

test('past a column\'s end the keys run on into the row below or above', () => {
  assert.deepEqual(go([2, 4], 'ArrowDown'), [7, 0], 'the last reel of the top row goes to the first reel beneath');
  assert.deepEqual(go([7, 0], 'ArrowUp'), [2, 4], 'and back up');
  assert.deepEqual(go([0, 4], 'ArrowDown'), [5, 0]);
  assert.deepEqual(go([9, 0], 'ArrowUp'), [4, 4]);
});

test('down from the last row\'s last reel leaves for Back, and up from the top stays put', () => {
  for (let w = 5; w < 10; w++) assert.equal(go([w, 4], 'ArrowDown'), null, `world ${w + 1}`);
  assert.equal(go([1, 4], 'ArrowDown', 3), null, 'a world with none beneath it leaves for Back too');
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
