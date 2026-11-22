import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardsFor, finalCard } from '../../src/ui/trailer/cards.js';
import { levelById } from '../../src/core/levels.js';
import { borrowedIn } from './borrowed-kit.js';

// World 22 (Wanderlight) is a course with no boss: its stat card counts the invaders, its cards open on the light and end on the road
// (the story's words), and its final card names the leg where the others name a reel or the finale.
const leg = levelById('w22-1');
const ZERO = { kills: 0, near: 0, combo: 0, time: 0, bombs: 0, stars: 0, hits: 0, boss: null };
const TYPICAL = { ...ZERO, kills: 47, near: 9, combo: 6, time: 107.4, bombs: 2, stars: 3 };
const LONG = { ...ZERO, kills: 1234, near: 88, combo: 8, time: 1800, bombs: 3, stars: 2, hits: 2 };

test("world 22's cards open on its light, end on the road and count invaders", () => {
  const cards = cardsFor(leg.world, TYPICAL);
  assert.equal(cards.length, 3);
  assert.equal(cards[0][0], 'A LIGHT WAKES.');
  assert.equal(cards.at(-1).at(-1), 'THE ROAD GOES ON.');
  assert.deepEqual(cards[1], ['47 INVADERS', 'LEFT IN COLOUR.']);
});

test("world 22's cards read well for zeros, ones and big numbers, and its final card reads Leg 1", () => {
  for (const stats of [ZERO, { ...ZERO, kills: 1, near: 1, time: 1 }, TYPICAL, LONG]) {
    for (const line of cardsFor(leg.world, stats).flat()) {
      assert.equal(line, line.toUpperCase(), line);
      assert.doesNotMatch(line, /[{}]|undefined|NaN|null|Infinity|\s{2,}|(^|\s)0 [A-Z]|(^|\s)1 [A-Z]+S\b/, line);
      assert.equal(borrowedIn(line), null, `borrows a guarded line: "${line}"`);
    }
  }
  const f = finalCard({ level: leg, stats: TYPICAL, stars: 2, score: 900, newBest: false });
  assert.equal(f.title, 'WANDERLIGHT');
  assert.equal(f.kicker, 'WORLD 22 · LEG 1');
});
