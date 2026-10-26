import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedOf, awardClear, BOMB_POINTS, LIFE_POINTS } from '../../src/core/scoring.js';
import { RANKS, rankOf } from '../../src/core/ranks.js';
import { PARS, DEFAULT_PAR } from '../../src/core/pars.js';
import { LEVELS } from '../../src/core/levels.js';
import { INTRO } from '../../src/core/kinds.js';
import { level, wave, step, playing, dry, shotAt, pickupOnShip, input } from './world-kit.js';

// R66: the round is tallied at the clear. Its points (kills, pickups, the clear and flawless bonuses, the
// bombs still held when none was fired, the lives still held) are multiplied by how fast it went against
// the level's par, and a level cleared without catching a power earns its medal.

// A world just cleared, as awardClear reads it: a level with no par of its own plays to DEFAULT_PAR (60 s).
const cleared = ({ time = 60, score = 10000, hits = 1, bombs = 1, bombsUsed = 0, lives = 3, powersUsed = 0 } = {}) =>
  ({ t: INTRO + time, level: { id: 'a-test-level' }, score, hits, ship: { bombs, bombsUsed, lives, powersUsed } });

test('the speed multiplier: x2 at half the par or faster, x1 at par or slower, a straight line between', () => {
  assert.equal(DEFAULT_PAR, 60);
  for (const [time, speed] of [[0, 2], [10, 2], [30, 2], [45, 1.5], [40, 1.67], [59, 1.03], [60, 1], [90, 1], [600, 1]]) {
    assert.equal(speedOf(time, 60), speed, `${time} s`);
  }
});

test('the play time leaves out the intro, and the par is the level\'s own', () => {
  const tally = awardClear(cleared({ time: 45 }));
  assert.deepEqual([tally.time, tally.par, tally.speed], [45, 60, 1.5]);
  assert.equal(awardClear({ ...cleared(), level: LEVELS[0] }).par, PARS[LEVELS[0].id], 'w1-1 has a par of its own');
});

test('every point goes into the multiplier, and the total is rounded to 10', () => {
  const w = cleared({ time: 45, score: 10000, hits: 0, bombs: 2, lives: 3 });
  const tally = awardClear(w);
  assert.deepEqual([tally.base, tally.bonus, tally.bombBonus, tally.lifeBonus], [10000, 5000, 2 * BOMB_POINTS, 3 * LIFE_POINTS]);
  assert.equal(tally.total, (10000 + 5000 + 4000 + 9000) * 1.5);
  assert.equal(w.score, tally.total, 'the round\'s score is the tally');
  assert.equal(w.tally, tally, 'kept on the world for the results screen');
  const odd = awardClear(cleared({ time: 40, score: 10050, hits: 0, bombs: 2 })); // 28050 x 1.67 = 46843.5
  assert.equal(odd.total, 46840);
});

test('the bombs held pay 2,000 each, but only when not one was fired', () => {
  assert.equal(BOMB_POINTS, 2000);
  assert.equal(awardClear(cleared({ bombs: 5 })).bombBonus, 10000, 'five held, none fired: the stock has no cap');
  assert.equal(awardClear(cleared({ bombs: 0 })).bombBonus, 0);
  assert.equal(awardClear(cleared({ bombs: 4, bombsUsed: 1 })).bombBonus, 0, 'one fired: nothing for the four left');
});

test('the lives held pay 3,000 each, however many', () => {
  assert.equal(LIFE_POINTS, 3000);
  for (const lives of [0, 1, 3, 7]) assert.equal(awardClear(cleared({ lives })).lifeBonus, 3000 * lives, `${lives} lives`);
});

test('the medal is for a level cleared without catching a power; bombs and lives do not count', () => {
  assert.equal(awardClear(cleared()).medal, true);
  assert.equal(awardClear(cleared({ bombsUsed: 3 })).medal, true);
  assert.equal(awardClear(cleared({ powersUsed: 1 })).medal, false);
});

const killAll = (w) => {
  for (const a of [...w.aliens]) shotAt(w, a);
  step(w);
};

test('in play: a caught bomb and a caught life count up past three, and leave the medal', () => {
  const w = dry(playing(level([wave({ cols: 2 })])));
  for (let i = 0; i < 4; i++) {
    pickupOnShip(w, 'bomb');
    pickupOnShip(w, 'life');
    step(w);
  }
  assert.deepEqual([w.ship.bombs, w.ship.lives], [5, 7]);
  killAll(w);
  assert.equal(w.state, 'cleared');
  assert.deepEqual([w.tally.bombBonus, w.tally.lifeBonus, w.tally.medal], [5 * 2000, 7 * 3000, true]);
});

test('in play: a caught power costs the medal, a fired bomb the bombs\' bonus', () => {
  const w = dry(playing(level([wave({ cols: 2 }), wave({ cols: 2 })])));
  pickupOnShip(w, 'rapid');
  step(w);
  assert.equal(w.ship.powersUsed, 1);
  step(w, 1, input({ bomb: true }));
  assert.equal(w.ship.bombsUsed, 1);
  while (w.state !== 'cleared' && w.t < 30) w.aliens.length ? killAll(w) : step(w);
  assert.equal(w.state, 'cleared');
  assert.deepEqual([w.tally.medal, w.tally.bombBonus], [false, 0]);
});

test('the pilot ladder: rungs from Rookie up, each needing more medals, the top needing all of them', () => {
  assert.equal(RANKS[0].at, 0);
  for (let i = 1; i < RANKS.length; i++) assert.ok(RANKS[i].at > RANKS[i - 1].at, RANKS[i].name);
  assert.equal(RANKS.at(-1).at, LEVELS.length);
  assert.deepEqual(rankOf(0), { name: 'Rookie', index: 0, next: { name: 'Cadet', at: 1 } });
  assert.equal(rankOf(1).name, 'Cadet');
  assert.equal(rankOf(2).name, 'Cadet');
  assert.equal(rankOf(29).name, 'Squadron Ace');
  assert.equal(rankOf(30).name, 'Wing Leader');
  assert.deepEqual(rankOf(LEVELS.length), { name: 'Legend', index: RANKS.length - 1, next: null });
  assert.equal(rankOf(LEVELS.length + 10).name, 'Legend');
});
