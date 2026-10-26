import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, all, textOf } from './lobby-kit.js';

// World 18 (Anvil Sky, the first free-flight world: four wave levels and the Squall Ray's) is shown in the lobby as a
// compact card in the bottom row beside Back and Reset scores: not a poster in the main row and not a card in the side
// row, which is full at nine. It is built like any world's card: its poster, its boss billed, its five reels.
installDom();
const { lobbyScreen } = await import('../../src/ui/screens/lobby.js');
const { WORLDS, LEVELS } = await import('../../src/core/levels.js');

const has = (e, cls) => e.className.split(' ').includes(cls);

function lobby(best = {}, focusId) {
  const log = [];
  const screen = lobbyScreen({
    best, start: (l) => log.push(`start ${l.id}`), back: () => log.push('back'), reset: () => log.push('reset'), focusId,
  });
  const named = (cls) => all(screen.el).filter((e) => has(e, cls));
  const [foot] = named('row');
  const card = named('free')[0];
  const reels = all(card).filter((e) => has(e, 'reel'));
  const [backBtn, resetBtn] = foot.children;
  return { screen, log, named, foot, card, reels, reel: reels[0], backBtn, resetBtn, key: (code) => screen.onKey(code), active: () => document.activeElement };
}

test('the world is free, has the ray for its boss and five levels, so the lobby shows it as the foot card', () => {
  assert.equal(WORLDS.length, 18);
  assert.equal(WORLDS[17].free, true);
  assert.equal(WORLDS[17].boss, 'ray');
  assert.equal(WORLDS.filter((w) => w.free).length, 1);
  assert.deepEqual(LEVELS.filter((l) => l.world === 18).map((l) => l.id), ['w18-1', 'w18-2', 'w18-3', 'w18-4', 'w18-5']);
  assert.doesNotThrow(() => lobby());
});

test('the card stands in the bottom row after Back and Reset scores, and in neither poster row', () => {
  const { named, foot, card, backBtn, resetBtn } = lobby();
  assert.ok(card, 'there is a card');
  assert.deepEqual(foot.children.slice(0, 3), [backBtn, resetBtn, card], 'Back, Reset scores, the card');
  assert.equal(card.parent, foot);
  const [posters] = named('posters');
  const [side] = named('side');
  assert.equal(posters.children.length, 8, 'the main row is the eight main worlds');
  assert.equal(side.children.filter((c) => has(c, 'poster')).length, 9, 'the side row is the nine side worlds');
  for (const row of [posters, side]) assert.ok(!all(row).some((e) => /^w18-/.test(e.dataset.id ?? '')), 'world 18 is in neither');
  assert.equal(named('poster').length, 17, 'the poster class is the other seventeen worlds');
  assert.ok(!has(card, 'poster'), 'the card is no poster (it does not lift when focused)');
});

test('the card says what it is, bills its boss like the other worlds and holds five reels, the last the finale', () => {
  const { card, named, reels } = lobby();
  const say = textOf(card);
  for (const part of ['World 18', 'Free flight', 'Anvil Sky', 'Make their fire follow you.', 'Featuring', 'The Squall Ray']) assert.ok(say.includes(part), part);
  assert.equal(all(card).filter((e) => has(e, 'poster-bill')).length, 1, 'the boss is billed');
  assert.equal(named('poster-flag').length, 1, 'and only this world is flagged free');
  assert.equal(reels.length, 5, 'five reels');
  assert.deepEqual(reels.map((r) => r.dataset.id), ['w18-1', 'w18-2', 'w18-3', 'w18-4', 'w18-5']);
  assert.deepEqual(reels.map((r) => r.attrs['aria-label']), ['Anvil Sky, reel 1', 'Anvil Sky, reel 2', 'Anvil Sky, reel 3', 'Anvil Sky, reel 4', 'Anvil Sky, finale']);
  assert.deepEqual(reels.map((r) => has(r, 'finale')), [false, false, false, false, true], 'the boss level is the finale');
  assert.equal(named('reel').filter((r) => /^w18-/.test(r.dataset.id)).length, 5, 'and the card holds them all');
});

test('every other world is billed as before, and no text leaks into a card that has none to show', () => {
  const { named, screen } = lobby();
  assert.equal(named('poster-bill').length, 18, 'a boss on every card');
  const say = textOf(screen.el);
  for (const stray of ['false', 'undefined', 'null']) assert.ok(!say.includes(stray), stray);
  assert.ok(!say.includes('Sneak'), 'no sneak preview any more');
});

test('its reels carry the stars, the best score and the medal mark like any other', () => {
  const none = lobby().reel;
  assert.equal(textOf(none), '1★★★—', 'unplayed: the number, three stars, a dash');
  assert.equal(all(none).filter((e) => has(e, 'on')).length, 0);
  assert.ok(!all(none).some((e) => has(e, 'medal')));
  assert.ok(!has(none, 'played'));
  const { reels } = lobby({ 'w18-1': { score: 1004324, stars: 3, medal: true }, 'w18-5': { score: 7300, stars: 2, medal: false } });
  const [first, , , , last] = reels;
  assert.ok(textOf(first).endsWith('1,004,324'), 'a seven-digit score is shown whole');
  assert.equal(all(first).filter((e) => has(e, 'on')).length, 3);
  assert.ok(all(first).some((e) => has(e, 'medal')), 'the medal mark');
  assert.ok(has(first, 'played'));
  assert.ok(textOf(last).endsWith('7,300'));
  assert.equal(all(last).filter((e) => has(e, 'on')).length, 2);
  assert.ok(!all(last).some((e) => has(e, 'medal')));
});

test('the keys: right from Reset reaches the first reel and on through the five, left returns, up goes to the last reel, Enter plays', () => {
  const { screen, log, resetBtn, reels, key, active } = lobby();
  screen.focus.focus();
  const first = active();
  resetBtn.focus();
  for (const reel of reels) {
    key('ArrowRight');
    assert.equal(active(), reel, reel.dataset.id);
  }
  key('ArrowRight');
  assert.equal(active(), reels[4], 'nothing right of the last reel');
  key('ArrowDown');
  assert.equal(active(), reels[4], 'nothing below it');
  key('Enter');
  assert.deepEqual(log, ['start w18-5']);
  key('ArrowLeft');
  assert.equal(active(), reels[3], 'left goes back one reel');
  for (let i = 0; i < 3; i++) key('ArrowLeft');
  assert.equal(active(), reels[0]);
  key('ArrowLeft');
  assert.equal(active(), resetBtn);
  key('ArrowRight');
  key('ArrowUp');
  assert.equal(active(), first, 'up returns to the last reel');
  reels[2].focus();
  key('ArrowUp');
  assert.equal(active(), first, 'from any of them');
  reels[1].focus();
  key('KeyA');
  assert.equal(active(), reels[0], 'WASD too');
  reels[0].focus();
  key('Space');
  assert.deepEqual(log, ['start w18-5', 'start w18-1'], 'Space plays as well');
});

test("up from the card returns to the reel the pilot left for the foot: the last row's last reel", () => {
  const { screen, backBtn, key, active, reels } = lobby();
  screen.focus.focus();
  for (let i = 0; i < 4; i++) key('ArrowDown'); // down the first column
  key('ArrowDown'); // into the side row
  for (let i = 0; i < 4; i++) key('ArrowDown');
  const last = active();
  assert.equal(last.dataset.id, 'w9-5');
  key('ArrowDown');
  assert.equal(active(), backBtn, 'past the last reel: Back');
  for (let i = 0; i < 3; i++) key('ArrowRight'); // Reset, then the first reel, then the second
  assert.equal(active(), reels[1]);
  key('ArrowUp');
  assert.equal(active(), last);
});

test('the lobby can open on a reel of the card (the level just played): up then goes to a reel in a row, not to itself', () => {
  for (const id of ['w18-1', 'w18-5']) {
    const { screen, key, active, reels } = lobby({}, id);
    assert.equal(screen.focus, reels.find((r) => r.dataset.id === id));
    screen.focus.focus();
    key('ArrowUp');
    assert.equal(active().dataset.id, 'w17-5', 'the last card of the last row, its last reel');
    assert.ok(!reels.includes(active()));
    key('ArrowDown');
    assert.equal(textOf(active()), 'Back');
  }
});

test('the mouse: hover focuses a reel and a click plays the level', () => {
  const { log, reels, active } = lobby();
  reels[3].hover();
  assert.equal(active(), reels[3]);
  reels[3].click();
  assert.deepEqual(log, ['start w18-4']);
});

test('the other keys still work with the card beside Back: Esc goes back, Reset still asks first', () => {
  const { log, resetBtn, key, named, active } = lobby();
  key('Escape');
  assert.deepEqual(log, ['back']);
  resetBtn.click();
  assert.equal(named('confirm').length, 1);
  assert.equal(textOf(active()), 'Cancel');
  key('ArrowRight'); // inside the card: Cancel to Reset, never out to a reel
  assert.equal(textOf(active()), 'Reset');
  key('Escape');
  assert.equal(active(), resetBtn);
  assert.deepEqual(log, ['back']);
});
