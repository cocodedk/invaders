import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, openLobby } from './lobby-kit.js';

// Level Select's keys on the DOM stand-in: arrows over the uniform grid (eight worlds to a row), the goal column that
// lets up and down undo each other across the short last row, down from the last row reaching the bar, Esc and the click.
// (The scroll the keys cause is lobby-scroll.test.js, the pointer lobby-pointer.test.js.)
installDom();
const { lobbyScreen } = await import('../../src/ui/screens/lobby.js');

const lobby = (focusId) => openLobby(lobbyScreen, focusId);

test('left and right move along the row, keeping the reel, and wrap inside it, the short last row too', () => {
  const { reels, key, at } = lobby();
  reels['w1-3'].focus();
  key('ArrowRight');
  assert.equal(at(), 'w2-3');
  key('ArrowLeft', 'ArrowLeft');
  assert.equal(at(), 'w8-3', 'row one wraps on itself');
  reels['w16-2'].focus();
  key('KeyD');
  assert.equal(at(), 'w9-2', 'so does row two');
  reels['w17-1'].focus();
  key('ArrowRight');
  assert.equal(at(), 'w18-1', 'world 17 to world 18');
  key('ArrowRight');
  assert.equal(at(), 'w17-1', 'the two-card row wraps on itself');
  key('ArrowLeft');
  assert.equal(at(), 'w18-1');
});

test('down walks the reels of a world and on into the first reel of the same column in the row below', () => {
  const { reels, key, at, backBtn } = lobby();
  reels['w1-1'].focus();
  const seen = [];
  for (let i = 0; i < 16; i++) {
    key('ArrowDown');
    seen.push(at());
  }
  assert.deepEqual(seen.slice(0, 6), ['w1-2', 'w1-3', 'w1-4', 'w1-5', 'w9-1', 'w9-2']);
  assert.deepEqual(seen.slice(8, 11), ['w9-5', 'w17-1', 'w17-2']);
  assert.equal(seen[13], 'w17-5');
  assert.equal(seen[14], backBtn, 'down from the last row reaches the bar: Back');
  key('ArrowDown');
  assert.equal(at(), backBtn, 'and stops there');
});

test('down from a reel of the short last row also reaches the bar, from either card', () => {
  const { reels, key, at, backBtn } = lobby();
  for (const id of ['w17-5', 'w18-5']) {
    reels[id].focus();
    key('KeyS');
    assert.equal(at(), backBtn, id);
  }
});

test('up runs back into the last reel of the row above, at the same column or on the last card of a short row', () => {
  const { reels, key, at } = lobby();
  reels['w9-1'].focus();
  key('ArrowUp');
  assert.equal(at(), 'w1-5');
  reels['w17-1'].focus();
  key('ArrowUp');
  assert.equal(at(), 'w9-5');
  reels['w18-1'].focus();
  key('ArrowUp');
  assert.equal(at(), 'w10-5');
  reels['w1-1'].focus();
  key('ArrowUp');
  assert.equal(at(), 'w1-1', 'above the first row: stays');
});

test('from the bar, up returns to the reel the pilot left, left and right move between the buttons, Enter picks', () => {
  const { reels, key, at, backBtn, resetBtn, log } = lobby();
  reels['w18-5'].focus();
  key('ArrowDown');
  assert.equal(at(), backBtn);
  key('ArrowRight');
  assert.equal(at(), resetBtn);
  key('ArrowUp');
  assert.equal(at(), 'w18-5', 'the last reel it left');
  key('ArrowDown', 'Enter');
  assert.deepEqual(log, ['back']);
  reels['w18-5'].focus();
  key('Enter');
  key('Space');
  assert.deepEqual(log, ['back', 'start w18-5', 'start w18-5'], 'Enter and Space play the focused reel');
  assert.deepEqual(key('KeyX', 'Tab'), [false, false], 'other keys are not taken');
});

test('Esc goes back from anywhere, and a click plays a reel', () => {
  const { reels, key, log } = lobby();
  key('Escape');
  reels['w9-2'].click();
  key('Backspace');
  assert.deepEqual(log, ['back', 'start w9-2', 'back']);
});

test('up undoes down across the short last row: the column last chosen is remembered, from every column', () => {
  const { reels, key, at } = lobby();
  for (const w of [9, 10, 11, 12, 13, 14, 15, 16]) { // the eight columns of row two
    reels[`w${w}-5`].focus();
    key('ArrowDown'); // into the two-card last row: the card its column reaches, clamped to the last
    assert.equal(at(), w === 9 ? 'w17-1' : 'w18-1', `down from world ${w}`);
    key('ArrowUp');
    assert.equal(at(), `w${w}-5`, `and up again, back to world ${w}`);
  }
});

test('the goal column follows left and right, and a focus the keys did not make (the pointer, Tab) starts a new one', () => {
  const { reels, key, at, move } = lobby();
  reels['w12-5'].focus();
  key('ArrowDown'); // w18-1, the goal still column four
  key('ArrowLeft'); // w17-1: left chose column one
  key('ArrowUp');
  assert.equal(at(), 'w9-5');
  key('ArrowRight', 'ArrowRight', 'ArrowDown'); // world 11, column three: the last row has two, so world 18
  assert.equal(at(), 'w18-1');
  key('ArrowUp');
  assert.equal(at(), 'w11-5', 'back to column three');
  reels['w14-5'].focus(); // Tab, or any focus that was not the keys'
  key('ArrowDown', 'ArrowUp');
  assert.equal(at(), 'w14-5', 'a new goal: column six');
  key('ArrowDown'); // w18-1 again, the goal still column six
  move(reels['w18-1']); // the pointer over world 18 chooses its column instead
  key('ArrowUp');
  assert.equal(at(), 'w10-5');
});
