import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/core/world.js';
import { LEVELS, levelById } from '../../src/core/levels.js';
import { TWISTS } from '../../src/core/kinds.js';
import { HELP_FIRST, HELP_EVERY, BREATH_TIME, breathFront } from '../../src/core/twists-3.js';
import { stateHash } from '../../src/core/state-hash.js';
import { step, seconds, drain, ofType, TICK, level, wave } from './world-kit.js';
import { arena, until, w17, RISE_TICKS } from './breath-kit.js';

// World 17's twist: the first breath 14 s into play, then one every 24 s, wave levels and the boss
// fight alike; a front rises from y 1080 to the HUD's edge (y 96) in 0.8 s. (What it wipes, and what
// it leaves, is in breath-wipe.test.js.)

test('the constants: the first breath at 14 s, one every 24 s, a rise of 0.8 s', () => {
  assert.deepEqual([HELP_FIRST, HELP_EVERY, BREATH_TIME], [14, 24, 0.8]);
  assert.equal(RISE_TICKS, 48);
});

test('only world 17 has the breath: its levels, its state, and nothing in any other world', () => {
  assert.equal(TWISTS.filter((t) => t === 'breath').length, 1);
  assert.equal(TWISTS[16], 'breath');
  for (const l of LEVELS) assert.equal(l.twist === 'breath', l.world === 17, l.id);
  const w = createWorld(levelById('w17-1'));
  assert.deepEqual(w.twist, { timer: 14, cool: 0, wave: 0, sent: 0, drips: [], rise: null });
  assert.doesNotThrow(() => structuredClone(w));
  for (const l of LEVELS.filter((x) => x.world !== 17)) {
    const other = createWorld(l);
    assert.ok(!('rise' in other.twist), `${l.id} has no rise`);
    assert.equal(breathFront(other), null, `${l.id} has no front`);
  }
});

test('no other twist ever breathes: 40 s of each brings no breath or cleanse', () => {
  for (const twist of TWISTS.filter((t) => t !== 'breath')) {
    const w = createWorld(level([wave(), wave()], 0, { twist }), 3);
    w.ship.invuln = Infinity;
    seconds(w, 40);
    const types = new Set(drain(w).map((e) => e.type));
    assert.ok(!types.has('breath') && !types.has('cleanse'), twist);
  }
});

test('the first breath starts 14 s into play, the next 24 s after it, and so on', () => {
  const w = arena();
  w.twist.timer = HELP_FIRST; // the arena has already played 3 ticks: start the count clean
  const gaps = [];
  for (let i = 0; i < 3; i++) {
    const { ticks, events } = until(w, 'breath');
    gaps.push(ticks);
    assert.deepEqual(ofType(events, 'breath').map(({ y0, y1, dur }) => ({ y0, y1, dur })), [{ y0: 1080, y1: 96, dur: 0.8 }]);
  }
  assert.deepEqual(gaps, [840, 1440, 1440]);
});

test('counted from the start of play: tick 840 of play, in a wave level and in the boss fight', () => {
  for (const id of ['w17-3', 'w17-5']) {
    const w = createWorld(levelById(id));
    w.ship.invuln = Infinity;
    while (w.state === 'intro') step(w);
    drain(w);
    assert.equal(until(w, 'breath').ticks, 840, `${id} first`);
    assert.equal(until(w, 'breath').ticks, 1440, `${id} second`);
  }
});

test('the front rises from y 1080 to 96 in 0.8 s, evenly, and breathFront says where it is', () => {
  const w = arena();
  assert.equal(breathFront(w), null, 'no front before a breath');
  until(w, 'breath');
  assert.equal(w.twist.rise, 0);
  assert.equal(breathFront(w), 1080, 'it starts at the bottom of the field');
  let last = 1080;
  for (let k = 1; k < RISE_TICKS; k++) {
    step(w);
    const y = breathFront(w);
    assert.ok(Math.abs(y - (1080 - ((1080 - 96) * k) / RISE_TICKS)) < 1e-6, `tick ${k}: ${y}`);
    assert.ok(y < last && y > 96);
    last = y;
  }
  step(w);
  assert.equal(breathFront(w), null, 'spent after 48 ticks');
  assert.equal(w.twist.rise, null);
  seconds(w, 3);
  assert.equal(breathFront(w), null);
});

test('the front is a function of the state: a clone mid-rise carries on identically, and the hash sees it', () => {
  const a = arena();
  until(a, 'breath');
  step(a, 20);
  const b = structuredClone(a);
  assert.equal(breathFront(b), breathFront(a));
  const early = stateHash(a);
  step(a, 40);
  step(b, 40);
  assert.equal(stateHash(a), stateHash(b));
  assert.deepEqual(a, b);
  assert.notEqual(stateHash(a), early);
  const c = createWorld(w17());
  const d = createWorld(w17());
  d.twist.rise = 0.4;
  assert.notEqual(stateHash(c), stateHash(d), 'the hash sees the front');
});

test('a level that ends mid-rise leaves no front to draw: the air is gone with the field', () => {
  for (const state of ['cleared', 'failed']) {
    const w = arena();
    until(w, 'breath');
    for (let i = 0; i < RISE_TICKS / 2; i++) step(w);
    assert.ok(breathFront(w) !== null, 'the front is rising');
    w.state = state; // the world stops stepping here (world.js), so the rise is never spent
    assert.equal(breathFront(w), null, `no front once the level is ${state}`);
  }
});

test('a breath ends before the next begins however the knobs are tuned: a late timer waits for the front', () => {
  const w = arena();
  until(w, 'breath');
  w.twist.timer = 0; // due again at once, while the front is still rising
  step(w, 5);
  assert.equal(ofType(drain(w), 'breath').length, 0, 'not while one rises');
  const { ticks } = until(w, 'breath', 2);
  assert.ok(ticks <= RISE_TICKS - 5 + 1, `it starts as the first is spent: ${ticks}`);
  assert.ok(Math.abs(w.twist.timer - (HELP_EVERY - ticks * TICK)) < 0.1, 'and the clock is kept');
});
