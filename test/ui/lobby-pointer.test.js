import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, openLobby, all } from './lobby-kit.js';

// Level Select's mouse on the DOM stand-in: a pointer that moves focuses the reel under it, or the reel a poster stands for;
// a pointer that only has the page scrolled under it focuses nothing; a click on a poster plays that reel.
installDom();
const { lobbyScreen } = await import('../../src/ui/screens/lobby.js');

const lobby = (focusId, best) => openLobby(lobbyScreen, focusId, best);
const played = (...ids) => Object.fromEntries(ids.map((id) => [id, { score: 100, stars: 1, medal: false }]));

test('a pointer that moves over a reel focuses it, and a click plays it', () => {
  const { reels, move, at, log } = lobby();
  move(reels['w9-2']);
  assert.equal(at(), 'w9-2');
  move(reels['w5-4'], 0, -2);
  assert.equal(at(), 'w5-4', 'a move in either direction counts');
  reels['w5-4'].click();
  assert.deepEqual(log, ['start w5-4']);
});

test('a pointer that did not move focuses nothing: a wheel turn passes reels under it, and the focus stays where it is', () => {
  const { reels, move, at } = lobby();
  move(reels['w5-3']);
  for (const id of ['w6-3', 'w7-3', 'w13-3']) {
    move(reels[id], 0, 0); // a move with no movement: what a reel that scrolls under a still pointer gets
    reels[id].hover(); // pointerenter, which no reel listens to any more
  }
  assert.equal(at(), 'w5-3');
});

test('a poster stands for the first reel of its world not played yet, else the first, and a pointer over it focuses that reel', () => {
  const { reels, card, move, at } = lobby('w1-1', played('w1-1', 'w1-2', 'w2-1', 'w2-2', 'w2-3', 'w2-4', 'w2-5'));
  const art = (w) => all(card(w)).find((e) => e.className.split(' ').includes('poster-art'));
  move(art(1));
  assert.equal(at(), 'w1-3', 'the first two are played');
  move(art(3));
  assert.equal(at(), 'w3-1', 'none played: the first');
  move(art(2));
  assert.equal(at(), 'w2-1', 'all played: the first again');
  move(reels['w5-2'], 0, 0);
  move(art(4), 0, 0);
  assert.equal(at(), 'w2-1', 'and a still pointer over a poster moves nothing');
});

test('a click on a poster plays the reel it stands for', () => {
  const { card, log } = lobby('w1-1', played('w1-1', 'w1-2', 'w6-1', 'w6-2', 'w6-3', 'w6-4', 'w6-5'));
  const art = (w) => all(card(w)).find((e) => e.className.split(' ').includes('poster-art'));
  art(1).click();
  art(5).click();
  art(6).click();
  assert.deepEqual(log, ['start w1-3', 'start w5-1', 'start w6-1']);
});
