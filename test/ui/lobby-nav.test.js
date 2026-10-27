import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVE } from '../../src/ui/keys.js';
import { PER_ROW, rowsOf, step } from '../../src/ui/screens/lobby-nav.js';

// The lobby is one uniform grid: the worlds in order, eight to a row, a new world taking the next empty slot,
// five reels each. The keys need no case for any world; these tests walk grids of 18 (the game's), 19 and 25 worlds.
const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
const go = (at, key, rows, reels = 5) => step(at, MOVE[key], rows, reels);

test('rowsOf lays the worlds in order, eight to a row, the last row partly filled', () => {
  assert.equal(PER_ROW, 8);
  assert.deepEqual(rowsOf(0), []);
  assert.deepEqual(rowsOf(8), [[0, 1, 2, 3, 4, 5, 6, 7]]);
  assert.deepEqual(rowsOf(9), [[0, 1, 2, 3, 4, 5, 6, 7], [8]]);
  assert.deepEqual(rowsOf(18).map((r) => r.length), [8, 8, 2]);
  for (let n = 1; n <= 40; n++) {
    const rows = rowsOf(n);
    assert.equal(rows.length, Math.ceil(n / 8), `${n} worlds`);
    assert.deepEqual(rows.flat(), Array.from({ length: n }, (_, i) => i), 'every world once, in order');
    for (const row of rows.slice(0, -1)) assert.equal(row.length, 8);
  }
});

test('left and right change world within a row, keep the reel, and wrap inside that row, a short last row included', () => {
  const rows = rowsOf(19); // rows of 8, 8 and 3
  assert.deepEqual(go([0, 2], 'ArrowRight', rows), [1, 2]);
  assert.deepEqual(go([3, 4], 'ArrowLeft', rows), [2, 4]);
  assert.deepEqual(go([7, 1], 'ArrowRight', rows), [0, 1], 'row one wraps on itself');
  assert.deepEqual(go([8, 1], 'ArrowLeft', rows), [15, 1], 'and row two');
  assert.deepEqual(go([18, 0], 'KeyD', rows), [16, 0], 'the three-card row wraps on its own three');
  assert.deepEqual(go([16, 0], 'KeyA', rows), [18, 0]);
  assert.deepEqual(go([0, 0], 'ArrowRight', rowsOf(1)), [0, 0], 'a lone world stays');
});

test('up and down change reel inside a world', () => {
  const rows = rowsOf(19);
  assert.deepEqual(go([2, 0], 'ArrowDown', rows), [2, 1]);
  assert.deepEqual(go([18, 3], 'ArrowUp', rows), [18, 2]);
  assert.deepEqual(go([7, 3], 'KeyS', rows), [7, 4]);
});

test("past a column's end the keys run on into the same column of the row below or above, or its last card if that row is shorter", () => {
  const rows = rowsOf(19);
  assert.deepEqual(go([0, 4], 'ArrowDown', rows), [8, 0], 'the last reel of row one goes to the first reel of row two');
  assert.deepEqual(go([7, 4], 'ArrowDown', rows), [15, 0]);
  assert.deepEqual(go([8, 4], 'ArrowDown', rows), [16, 0]);
  assert.deepEqual(go([10, 4], 'ArrowDown', rows), [18, 0], 'the third column of the short row');
  assert.deepEqual(go([13, 4], 'ArrowDown', rows), [18, 0], 'the sixth is past its end: its last card');
  assert.deepEqual(go([16, 0], 'ArrowUp', rows), [8, 4], 'and back up, to the last reel above');
  assert.deepEqual(go([18, 0], 'ArrowUp', rows), [10, 4]);
  assert.deepEqual(go([8, 0], 'ArrowUp', rows), [0, 4]);
});

test("down from the last row's last reel leaves for the bar (null), and up from the top stays on the first reel", () => {
  for (const n of [1, 8, 9, 18, 19, 24, 25]) {
    const rows = rowsOf(n);
    for (const w of rows.at(-1)) assert.equal(go([w, 4], 'ArrowDown', rows), null, `${n} worlds, world ${w + 1}`);
    assert.deepEqual(go([0, 0], 'ArrowUp', rows), [0, 0]);
    assert.deepEqual(go([3 % n, 3], 'ArrowUp', rows), [3 % n, 2]);
  }
  assert.deepEqual(go([3, 0], 'ArrowUp', rowsOf(19)), [3, 0], 'no row above row one');
});

test('down then up comes back to where you were, as long as the row below has a card in that column', () => {
  const rows = rowsOf(19); // the short row has columns 1 to 3
  for (const w of [0, 1, 2, 8, 9, 10, 5, 6]) {
    const down = go([w, 4], 'ArrowDown', rows);
    assert.equal(down[1], 0);
    assert.deepEqual(go(down, 'ArrowUp', rows), [w, 4], `world ${w + 1}`);
  }
});

test('with the goal column given, down then up returns to the same world from every column of a full row, short last row or not', () => {
  for (const n of [9, 10, 18, 19, 20, 25]) {
    const rows = rowsOf(n);
    for (const [r, row] of rows.slice(0, -1).entries()) {
      for (const [col, w] of row.entries()) {
        const down = step([w, 4], MOVE.ArrowDown, rows, 5, col); // the next row's card, clamped if it is shorter
        assert.deepEqual(down, [rows[r + 1][Math.min(col, rows[r + 1].length - 1)], 0], `${n} worlds, world ${w + 1}`);
        assert.deepEqual(step(down, MOVE.ArrowUp, rows, 5, col), [w, 4], `${n} worlds: up again is world ${w + 1}`);
      }
    }
  }
  const rows = rowsOf(18);
  assert.deepEqual(step([17, 0], MOVE.ArrowUp, rows, 5, 3), [11, 4], 'a goal of column four reaches world 12 from world 18, not world 10');
  assert.deepEqual(step([17, 0], MOVE.ArrowUp, rows, 5), [9, 4], 'without a goal the current column counts, as before');
  assert.deepEqual(step([17, 0], MOVE.ArrowUp, rows, 5, undefined), [9, 4]);
});

// Every reel of every grid from one world to forty is reachable from the first by the arrows: nothing in the
// walk depends on how many worlds there are or which ones.
function reach(rows, reels) {
  const seen = new Set(['0,0']);
  const queue = [[0, 0]];
  while (queue.length) {
    const at = queue.pop();
    for (const key of arrows) {
      const to = go(at, key, rows, reels);
      if (to && !seen.has(to.join())) {
        seen.add(to.join());
        queue.push(to);
      }
    }
  }
  return seen;
}

test('every reel is reachable by the arrows on a grid of any number of worlds', () => {
  for (let n = 1; n <= 40; n++) assert.equal(reach(rowsOf(n), 5).size, n * 5, `${n} worlds`);
  assert.equal(reach(rowsOf(18), 5).size, 90);
  assert.equal(reach(rowsOf(19), 5).size, 95, 'a nineteenth world is in the third row: no special case');
  assert.equal(reach(rowsOf(25), 5).size, 125, 'a twenty-fifth starts a fourth row');
});

test('a nineteenth and a twenty-fifth world are the next slots of a row, and the arrows reach their last reels', () => {
  const rows19 = rowsOf(19);
  assert.deepEqual(rows19.at(-1), [16, 17, 18], 'world 19 is the third of row three');
  assert.equal(go([17, 0], 'ArrowRight', rows19)[0], 18);
  const rows25 = rowsOf(25);
  assert.deepEqual(rows25.at(-1), [24], 'world 25 opens row four');
  assert.deepEqual(go([23, 4], 'ArrowDown', rows25), [24, 0], 'from the last card of row three: the same column, clamped');
  assert.deepEqual(go([16, 4], 'ArrowDown', rows25), [24, 0]);
  assert.equal(go([24, 4], 'ArrowDown', rows25), null);
});
