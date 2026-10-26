import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, all, textOf } from './lobby-kit.js';

// The lobby on a DOM stand-in: Reset scores beside Back (keys and mouse), its confirm card, and the
// rank and medals under the title.
installDom();
const { lobbyScreen } = await import('../../src/ui/screens/lobby.js');
const { LEVELS } = await import('../../src/core/levels.js');
const { RANKS } = await import('../../src/core/ranks.js');

const has = (e, cls) => e.className.split(' ').includes(cls);

function lobby(best = {}) {
  const log = [];
  const screen = lobbyScreen({
    best, start: (l) => log.push(`start ${l.id}`), back: () => log.push('back'), reset: () => log.push('reset'),
  });
  const named = (cls) => all(screen.el).filter((e) => has(e, cls)); // the elements of a class
  const [backBtn, resetBtn] = named('row')[0].children;
  return { screen, log, named, backBtn, resetBtn, key: (code) => screen.onKey(code), active: () => document.activeElement };
}

test('the bottom row holds Back and Reset scores side by side', () => {
  const { backBtn, resetBtn } = lobby();
  assert.equal(textOf(backBtn), 'Back');
  assert.equal(textOf(resetBtn), 'Reset scores');
});

test('right from Back reaches Reset and then the sneak preview, left returns, up goes back to the last reel from any of them', () => {
  const { screen, backBtn, resetBtn, named, key, active } = lobby();
  screen.focus.focus(); // the first reel
  const reel = active();
  assert.ok(has(reel, 'reel'));
  const preview = named('reel').find((r) => r.dataset.id === 'w18-1');
  backBtn.focus();
  key('ArrowRight');
  assert.equal(active(), resetBtn);
  key('ArrowRight');
  assert.equal(active(), preview, 'the sneak preview stands right of Reset');
  key('ArrowRight');
  assert.equal(active(), preview, 'nothing right of it');
  key('ArrowLeft');
  assert.equal(active(), resetBtn);
  key('ArrowLeft');
  assert.equal(active(), backBtn);
  key('ArrowLeft');
  assert.equal(active(), backBtn);
  key('KeyD');
  assert.equal(active(), resetBtn, 'WASD too');
  key('ArrowUp');
  assert.equal(active(), reel, 'up from Reset: the last reel');
  backBtn.focus();
  key('ArrowUp');
  assert.equal(active(), reel, 'and from Back');
});

test('Enter on Back goes back; Enter on Reset opens the confirm with Cancel focused, and nothing is reset yet', () => {
  const { screen, log, backBtn, resetBtn, key, active, named } = lobby();
  backBtn.focus();
  key('Enter');
  assert.deepEqual(log, ['back']);
  resetBtn.focus();
  key('Enter');
  const card = named('confirm')[0];
  assert.ok(card && card.parent === screen.el, 'the card is laid over the lobby');
  assert.equal(textOf(active()), 'Cancel');
  assert.deepEqual(log, ['back'], 'nothing was reset');
});

test('the mouse opens the same card', () => {
  const { resetBtn, named, active } = lobby();
  resetBtn.click();
  assert.equal(named('confirm').length, 1);
  assert.equal(textOf(active()), 'Cancel');
});

test('the card says what is reset and what stays, with Cancel then a dangerous Reset', () => {
  const { resetBtn, named } = lobby();
  resetBtn.click();
  const say = textOf(named('confirm-text')[0]);
  for (const part of ['best score', 'stars', 'medal', 'every level', 'saved trailers', 'Cinema', 'cannot be undone']) assert.ok(say.includes(part), part);
  const [cancel, yes] = all(named('confirm')[0]).filter((e) => e.tag === 'button');
  assert.equal(textOf(cancel), 'Cancel');
  assert.equal(textOf(yes), 'Reset');
  assert.ok(has(yes, 'btn-danger'));
  assert.ok(!has(cancel, 'btn-danger'));
});

test('Esc, Backspace and the Cancel button close the card, focus returns to Reset, and no key leaks to the lobby', () => {
  const { log, resetBtn, key, active, named } = lobby();
  for (const close of [() => key('Escape'), () => key('Backspace'), () => active().click()]) {
    resetBtn.click();
    key('ArrowDown'); // inside the card: moves between its buttons, never to a reel
    key('ArrowUp');
    assert.equal(textOf(active()), 'Cancel');
    close();
    assert.equal(named('confirm').length, 0, 'closed');
    assert.equal(active(), resetBtn);
  }
  assert.deepEqual(log, [], 'neither back nor reset was called');
});

test('Reset in the card calls reset once; the arrows reach it from Cancel', () => {
  const { log, resetBtn, key, active } = lobby();
  resetBtn.click();
  key('ArrowRight');
  assert.equal(textOf(active()), 'Reset');
  key('Enter');
  assert.deepEqual(log, ['reset']);
  const again = lobby();
  again.resetBtn.click();
  again.key('ArrowLeft'); // wraps round to Reset in a two-button row
  assert.equal(textOf(again.active()), 'Reset');
  again.active().click();
  assert.deepEqual(again.log, ['reset']);
});

test('the rank and the medal count stand beside the star total, and a reel with its medal carries the mark', () => {
  const { named } = lobby();
  assert.equal(textOf(named('lobby-rank')[0]), `Rank Rookie · 0 / ${LEVELS.length} medals`);
  assert.equal(textOf(named('lobby-total')[0]), `★ 0 / ${LEVELS.length * 3}`);
  assert.equal(named('medal').length, 0);
  const ids = LEVELS.map((l) => l.id);
  const best = (n) => Object.fromEntries(ids.slice(0, n).map((id) => [id, { score: 100, stars: 1, medal: true }]));
  for (const [n, name] of [[1, 'Cadet'], [3, 'Pilot'], [10, 'Ace'], [17, 'Ace'], [18, 'Squadron Ace']]) {
    assert.equal(textOf(lobby(best(n)).named('lobby-rank')[0]), `Rank ${name} · ${n} / ${LEVELS.length} medals`, `${n} medals`);
  }
  assert.equal(RANKS[RANKS.length - 1].at, LEVELS.length, 'the top rung needs every level');
  const some = lobby({ [ids[0]]: { score: 100, stars: 1, medal: true }, [ids[1]]: { score: 100, stars: 1, medal: false } });
  const marked = some.named('reel').filter((r) => all(r).some((e) => has(e, 'medal'))).map((r) => r.dataset.id);
  assert.deepEqual(marked, [ids[0]], 'only the reel that holds its medal');
});
