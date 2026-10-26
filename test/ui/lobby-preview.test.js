import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, all, textOf } from './lobby-kit.js';

// World 18 (Anvil Sky, one level, free flight) is shown in the lobby as a "Sneak preview" card in the bottom
// row beside Back and Reset scores: not a poster in the main row and not a card in the side row, which is full
// at nine. It builds with no boss (a poster's "Featuring" line calls bossDef, which throws for none).
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
  const preview = named('preview')[0];
  const reel = all(preview).find((e) => has(e, 'reel'));
  const [backBtn, resetBtn] = foot.children;
  return { screen, log, named, foot, preview, reel, backBtn, resetBtn, key: (code) => screen.onKey(code), active: () => document.activeElement };
}

test('the world is free, has no boss and one level, so the lobby shows it as a preview', () => {
  assert.equal(WORLDS.length, 18);
  assert.equal(WORLDS[17].free, true);
  assert.equal(WORLDS[17].boss, undefined);
  assert.equal(WORLDS.filter((w) => w.free).length, 1);
  assert.deepEqual(LEVELS.filter((l) => l.world === 18).map((l) => l.id), ['w18-1']);
  assert.doesNotThrow(() => lobby());
});

test('the card stands in the bottom row after Back and Reset scores, and in neither poster row', () => {
  const { named, foot, preview, backBtn, resetBtn } = lobby();
  assert.ok(preview, 'there is a preview card');
  assert.deepEqual(foot.children.slice(0, 3), [backBtn, resetBtn, preview], 'Back, Reset scores, the preview');
  assert.equal(preview.parent, foot);
  const [posters] = named('posters');
  const [side] = named('side');
  assert.equal(posters.children.length, 8, 'the main row is the eight main worlds');
  assert.equal(side.children.filter((c) => has(c, 'poster')).length, 9, 'the side row is the nine side worlds');
  for (const row of [posters, side]) assert.ok(!all(row).some((e) => e.dataset.id === 'w18-1'), 'world 18 is in neither');
  assert.equal(named('poster').length, 17, 'the poster class is the other seventeen worlds');
  assert.ok(!has(preview, 'poster'), 'the card is no poster (it does not lift when focused)');
});

test('the card says what it is, bills no boss and holds one reel', () => {
  const { preview, named } = lobby();
  const say = textOf(preview);
  for (const part of ['Sneak preview', 'Anvil Sky', 'Make their fire follow you.']) assert.ok(say.includes(part), part);
  assert.ok(!say.includes('Featuring'), 'no boss line');
  assert.ok(!all(preview).some((e) => has(e, 'poster-bill')));
  assert.equal(all(preview).filter((e) => has(e, 'reel')).length, 1, 'one reel');
  assert.equal(named('reel').filter((r) => r.dataset.id === 'w18-1').length, 1);
  const reel = all(preview).find((e) => has(e, 'reel'));
  assert.equal(reel.attrs['aria-label'], 'Anvil Sky, reel 1');
  assert.ok(!has(reel, 'finale'), 'a lone level is no finale');
});

test('its reel carries the stars, the best score and the medal mark like any other', () => {
  const none = lobby().reel;
  assert.equal(textOf(none), '1★★★—', 'unplayed: the number, three stars, a dash');
  assert.equal(all(none).filter((e) => has(e, 'on')).length, 0);
  assert.ok(!all(none).some((e) => has(e, 'medal')));
  assert.ok(!has(none, 'played'));
  const { reel } = lobby({ 'w18-1': { score: 1004324, stars: 3, medal: true } });
  assert.ok(textOf(reel).endsWith('1,004,324'), 'a seven-digit score is shown whole');
  assert.equal(all(reel).filter((e) => has(e, 'on')).length, 3);
  assert.ok(all(reel).some((e) => has(e, 'medal')), 'the medal mark');
  assert.ok(has(reel, 'played'));
  const part = lobby({ 'w18-1': { score: 4200, stars: 1, medal: false } }).reel;
  assert.equal(all(part).filter((e) => has(e, 'on')).length, 1);
  assert.ok(!all(part).some((e) => has(e, 'medal')));
});

test('the keys: right from Reset reaches the reel, left returns, up goes to the last reel, Enter plays', () => {
  const { screen, log, resetBtn, reel, key, active } = lobby();
  screen.focus.focus();
  const first = active();
  resetBtn.focus();
  key('ArrowRight');
  assert.equal(active(), reel);
  key('ArrowRight');
  assert.equal(active(), reel, 'nothing right of the preview');
  key('ArrowDown');
  assert.equal(active(), reel, 'nothing below it');
  key('Enter');
  assert.deepEqual(log, ['start w18-1']);
  key('ArrowLeft');
  assert.equal(active(), resetBtn);
  key('ArrowRight');
  key('ArrowUp');
  assert.equal(active(), first, 'up returns to the last reel');
  reel.focus();
  key('KeyA');
  assert.equal(active(), resetBtn, 'WASD too');
  reel.focus();
  key('Space');
  assert.deepEqual(log, ['start w18-1', 'start w18-1'], 'Space plays as well');
});

test("up from the preview returns to the reel the pilot left for the foot: the last row's last reel", () => {
  const { screen, backBtn, key, active, reel } = lobby();
  screen.focus.focus();
  for (let i = 0; i < 4; i++) key('ArrowDown'); // down the first column
  key('ArrowDown'); // into the side row
  for (let i = 0; i < 4; i++) key('ArrowDown');
  const last = active();
  assert.equal(last.dataset.id, 'w9-5');
  key('ArrowDown');
  assert.equal(active(), backBtn, 'past the last reel: Back');
  key('ArrowRight');
  key('ArrowRight');
  assert.equal(active(), reel);
  key('ArrowUp');
  assert.equal(active(), last);
});

test('the lobby can open on the preview (the level just played): up then goes to a reel in a row, not to itself', () => {
  const { screen, key, active, reel } = lobby({}, 'w18-1');
  assert.equal(screen.focus, reel);
  screen.focus.focus();
  key('ArrowUp');
  assert.equal(active().dataset.id, 'w17-5', 'the last card of the last row, its last reel');
  assert.notEqual(active(), reel);
  key('ArrowDown');
  assert.equal(textOf(active()), 'Back');
});

test('the mouse: hover focuses the reel and a click plays the level', () => {
  const { log, reel, active } = lobby();
  reel.hover();
  assert.equal(active(), reel);
  reel.click();
  assert.deepEqual(log, ['start w18-1']);
});

test('the other keys still work with the preview beside Back: Esc goes back, Reset still asks first', () => {
  const { log, resetBtn, key, named, active } = lobby();
  key('Escape');
  assert.deepEqual(log, ['back']);
  resetBtn.click();
  assert.equal(named('confirm').length, 1);
  assert.equal(textOf(active()), 'Cancel');
  key('Escape');
  assert.equal(active(), resetBtn);
  assert.deepEqual(log, ['back']);
});
