import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardsFor, finalCard } from '../../src/ui/trailer/cards.js';
import { levelById } from '../../src/core/levels.js';

// World 22 (Wanderlight) is a course with no boss: its stat card counts the invaders, its cards open on the light and end on the road
// (the story's words), and its final card names the leg where the others name a reel or the finale. That every card reads well for
// zeros, ones and big numbers is trailer-cards.test.js's, which runs over every world.
const leg = levelById('w22-1');
const TYPICAL = { kills: 47, near: 9, combo: 6, time: 107.4, bombs: 2, stars: 3, hits: 0, boss: null };

test("world 22's cards open on its light, end on the road and count invaders", () => {
  const cards = cardsFor(leg.world, TYPICAL);
  assert.equal(cards.length, 3);
  assert.equal(cards[0][0], 'A LIGHT WAKES.');
  assert.equal(cards.at(-1).at(-1), 'THE ROAD GOES ON.');
  assert.deepEqual(cards[1], ['47 INVADERS', 'LEFT IN COLOUR.']);
});

test("world 22's final card names its leg", () => {
  const f = finalCard({ level: leg, stats: TYPICAL, stars: 2, score: 900, newBest: false });
  assert.equal(f.title, 'WANDERLIGHT');
  assert.equal(f.kicker, 'WORLD 22 · LEG 1');
});
