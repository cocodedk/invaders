import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, openLobby } from './lobby-kit.js';

// Level Select's scrolling on the DOM stand-in: a key that moves the focus scrolls the page the least that shows the whole
// card above the bar, worked out from layout sizes; the first show opens on the card of the level just played; the posters
// in view are told to the baker.
installDom();
const { lobbyScreen } = await import('../../src/ui/screens/lobby.js');
const { preferred } = await import('../../src/ui/screens/posters.js');
const { PER_ROW } = await import('../../src/ui/screens/lobby-nav.js');
const { WORLDS } = await import('../../src/core/levels.js');

const lobby = (focusId) => openLobby(lobbyScreen, focusId);
const inRows = (from, to) => WORLDS.slice(from * PER_ROW, to * PER_ROW).map((w) => w.id); // the worlds of rows from..to - 1
const PADS = { scrollPaddingTop: '28px', scrollPaddingBottom: '128px' }; // what lobby.css gives the page at 1080p
const withPads = (run) => {
  globalThis.getComputedStyle = () => PADS;
  try { run(); } finally { delete globalThis.getComputedStyle; }
};
const frame = (page, card) => { // card 9 stands at 1000, 600 tall, in a page 1080 tall
  card.offsetTop = 1000;
  card.offsetHeight = 600;
  page.clientHeight = 1080;
};

test('a key that moves the focus scrolls the least that shows the whole card between the scroll-padding; row one scrolls to the top', () => {
  withPads(() => {
    const { reels, key, card, page } = lobby();
    frame(page, card(9));
    reels['w1-5'].focus();
    page.scrollTop = 0;
    key('ArrowDown'); // into world 9, below the window: its foot (1000 + 600) plus the bar's room, at the page's foot
    assert.deepEqual(page.scrolled, [{ via: 'to', top: 648, behavior: 'smooth' }]);
    page.scrollTop = 700; // between 648 and 972 the whole card shows between the paddings: nothing to do
    key('ArrowDown');
    assert.equal(page.scrolled.length, 1, 'a move inside a card in view scrolls nothing');
    page.scrollTop = 1500; // the card is above the window: its top, less the scroll-padding
    key('ArrowDown');
    assert.deepEqual(page.scrolled.at(-1), { via: 'to', top: 972, behavior: 'smooth' });
    reels['w9-1'].focus();
    key('ArrowUp');
    assert.deepEqual(page.scrolled.at(-1), { via: 'to', top: 0, behavior: 'smooth' }, 'up into row one: the page from its top, marquee and all');
    for (const w of [1, 9]) assert.equal(card(w).scrolled.length, 0, 'never scrollIntoView, which measures the card the focus has lifted');
  });
});

test('the same, with no computed style to read: the scroll-padding counts as nothing', () => {
  const { reels, key, card, page } = lobby();
  frame(page, card(9));
  reels['w1-5'].focus();
  key('ArrowDown');
  assert.deepEqual(page.scrolled, [{ via: 'to', top: 520, behavior: 'smooth' }]);
});

test('under prefers-reduced-motion the scroll is instant', () => {
  globalThis.matchMedia = (q) => ({ matches: /reduce/.test(q) });
  try {
    const { reels, key, card, page } = lobby();
    frame(page, card(9));
    reels['w1-5'].focus();
    key('ArrowDown');
    assert.equal(page.scrolled[0].behavior, 'instant');
    reels['w9-1'].focus();
    key('ArrowUp');
    assert.equal(page.scrolled.at(-1).behavior, 'instant');
  } finally {
    delete globalThis.matchMedia;
  }
});

test('moving to the bar, and the pointer, never scroll the page', () => {
  const { reels, page, card, key, backBtn, move } = lobby();
  for (const id of ['w1-1', 'w9-3', 'w17-5', 'w18-2']) move(reels[id]);
  backBtn.hover();
  assert.equal(page.scrolled.length, 0, 'the pointer would make the page chase the mouse');
  for (const w of [1, 9, 17, 18]) assert.equal(card(w).scrolled.length, 0);
  reels['w17-5'].focus();
  key('ArrowDown');
  assert.equal(document.activeElement, backBtn);
  assert.equal(page.scrolled.length, 0, 'the bar is fixed: nothing to scroll to');
});

test('the lobby opens scrolled to the card of the level just played, centred in the page', () => {
  for (const [id, world] of [['w1-1', 1], ['w9-4', 9], ['w18-3', 18]]) {
    const { screen, page, card } = lobby(id);
    assert.equal(screen.focus.dataset.id, id);
    page.clientHeight = 600;
    card(world).offsetTop = 1000;
    card(world).offsetHeight = 300;
    screen.shown();
    assert.deepEqual(page.scrolled[0], { via: 'to', top: 850, behavior: 'instant' }, `the card of world ${world} at 1000 + 150, the page 600 tall`);
  }
  const { screen } = lobby();
  assert.equal(screen.focus.dataset.id, 'w1-1', 'by default the first reel');
  assert.equal(lobby('nope').screen.focus.dataset.id, 'w1-1', 'an unknown id falls back to it');
});

test('the rows in view are told to the poster baker, on the first show and on every scroll', () => {
  const { screen, page, rows } = lobby('w18-1');
  rows.forEach((row, i) => { row.offsetTop = 100 + 400 * i; row.offsetHeight = 380; }); // rows at 100-480, 500-880, 900-1280
  page.clientHeight = 520;
  page.scrollTop = 0;
  screen.shown();
  assert.deepEqual(preferred(), inRows(0, 2), 'rows one and two reach into the page');
  page.scrollTop = 700; // 700-1220
  page.emit('scroll');
  assert.deepEqual(preferred(), inRows(1, 3), 'rows two and three');
  page.scrollTop = 900; // 900-1420: row three alone
  page.emit('scroll');
  assert.deepEqual(preferred(), inRows(2, 3));
});
