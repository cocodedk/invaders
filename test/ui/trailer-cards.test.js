import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VOICES, KEYS, statsOf, fillLine, cardsFor, finalCard } from '../../src/ui/trailer/cards.js';
import { levelById } from '../../src/core/levels.js';

const ZERO = { kills: 0, near: 0, combo: 0, time: 0, bombs: 0, stars: 0, hits: 0 };
const ONE = { kills: 1, near: 1, combo: 1, time: 1, bombs: 1, stars: 1, hits: 1 };
const TYPICAL = { kills: 47, near: 9, combo: 6, time: 107.4, bombs: 2, stars: 3, hits: 0 };
const LONG = { kills: 1234, near: 88, combo: 8, time: 1800, bombs: 3, stars: 2, hits: 2 };
const ALL = [ZERO, ONE, TYPICAL, LONG];

// Well-known lines of the films the worlds pay homage to: none may appear (original lines only).
const BORROWED = ['FAR, FAR AWAY', 'GALAXY FAR', 'NO ONE CAN HEAR', 'TEARS IN RAIN', 'RED PILL', 'NO SPOON',
  "I'LL BE BACK", 'HASTA LA VISTA', 'JUDGMENT DAY', 'GO GENTLE', 'THE FORCE', 'WHITE RABBIT', 'GAME OVER, MAN'];

// A filled line reads well: no placeholder or junk left, no bare zero count, no "1 THINGS", no x0/x1 combo.
function readsWell(line, where) {
  assert.ok(line.length > 0, `${where}: empty`);
  assert.equal(line, line.toUpperCase(), `${where}: ${line}`);
  assert.doesNotMatch(line, /[{}]|undefined|NaN|null|Infinity/, `${where}: ${line}`);
  assert.doesNotMatch(line, /(^|\s)0 [A-Z]/, `${where}: a bare zero in "${line}"`);
  assert.doesNotMatch(line, /(^|\s)1 [A-Z]+S\b/, `${where}: singular/plural in "${line}"`);
  assert.doesNotMatch(line, /×[01]\b/, `${where}: a combo of nothing in "${line}"`);
  assert.doesNotMatch(line, /\s{2,}/, `${where}: double space in "${line}"`);
  for (const b of BORROWED) assert.ok(!line.includes(b), `${where}: borrowed line "${b}"`);
}

test('every world has three cards of one to three lines, and every placeholder is a known stat', () => {
  assert.equal(VOICES.length, 8);
  for (const [w, cards] of VOICES.entries()) {
    assert.equal(cards.length, 3, `world ${w + 1}`);
    const used = new Set();
    for (const card of cards) {
      assert.ok(card.length >= 1 && card.length <= 3, `world ${w + 1}: ${card}`);
      for (const line of card) {
        for (const [, key] of line.matchAll(/\{(\w+)\}/g)) {
          assert.ok(KEYS.includes(key), `world ${w + 1}: unknown placeholder {${key}}`);
          used.add(key);
        }
      }
    }
    assert.ok(used.size >= 2, `world ${w + 1} speaks from at least two stats`);
  }
});

test('cards fill every placeholder for every world, and read well for zeros, ones and big numbers', () => {
  for (let world = 1; world <= 8; world++) {
    for (const stats of ALL) {
      const cards = cardsFor(world, stats);
      assert.equal(cards.length, 3);
      for (const [i, card] of cards.entries()) {
        for (const line of card) readsWell(line, `world ${world} card ${i + 1} ${JSON.stringify(stats)}`);
      }
    }
  }
});

test('the stat line reads like a trailer: the spec example, and its zero and one forms', () => {
  assert.deepEqual(cardsFor(1, TYPICAL)[1], ['47 INVADERS.', '9 NEAR MISSES.', 'ONE PILOT.']);
  assert.deepEqual(cardsFor(1, ZERO)[1], ['NOT ONE INVADER.', 'NO NEAR MISSES.', 'ONE PILOT.']);
  assert.deepEqual(cardsFor(1, ONE)[1], ['ONE INVADER.', 'ONE NEAR MISS.', 'ONE PILOT.']);
  assert.deepEqual(cardsFor(2, ZERO)[1], ['NOT ONE INVADER WENT DARK.', 'NO NEAR MISSES IN THE NEON.']);
  assert.deepEqual(cardsFor(2, TYPICAL)[0], ['IN A CITY', 'OF ENDLESS RAIN…']);
});

test('each phrase has its zero form', () => {
  assert.equal(fillLine('{combo}.', ZERO), 'NO COMBO NEEDED.');
  assert.equal(fillLine('{combo}.', ONE), 'NO COMBO NEEDED.');
  assert.equal(fillLine('{combo}.', TYPICAL), 'A ×6 COMBO.');
  assert.equal(fillLine('{time} OF UPTIME.', ZERO), 'AN INSTANT OF UPTIME.');
  assert.equal(fillLine('{time}', ONE), 'ONE SECOND');
  assert.equal(fillLine('{time}', { ...ZERO, time: 41.2 }), '41 SECONDS');
  assert.equal(fillLine('{time}', TYPICAL), '2 MINUTES');
  assert.equal(fillLine('{bombs} DROPPED.', ZERO), 'NO BOMBS DROPPED.');
  assert.equal(fillLine('{bombs}', TYPICAL), '2 BOMBS');
  assert.equal(fillLine('{stars}', ZERO), 'NO STARS');
  assert.equal(fillLine('{stars}', ONE), 'ONE STAR');
  assert.equal(fillLine('{kills}', LONG), '1,234 INVADERS');
});

test('stats come from the event log: kills, near misses, the top combo, bombs, hits, stars and time', () => {
  const events = [
    { type: 'kill', tick: 10, mult: 1, scored: true }, { type: 'kill', tick: 20, mult: 2, scored: true },
    { type: 'kill', tick: 30, mult: 3, scored: true }, { type: 'kill', tick: 40, mult: 1, scored: false },
    { type: 'nearMiss', tick: 50 }, { type: 'nearMiss', tick: 60 }, { type: 'bomb', tick: 70 },
    { type: 'shipHit', tick: 80, lives: 2 }, { type: 'cleared', tick: 600, stars: 2 },
  ];
  assert.deepEqual(statsOf(events, 600), { kills: 4, near: 2, combo: 3, time: 10, bombs: 1, stars: 2, hits: 1 });
  assert.deepEqual(statsOf([], 0), ZERO);
});

test('the final card: the world as a film title, stars as critics, the score as box office or a record', () => {
  const level = levelById('w2-1');
  const f = finalCard({ level, stats: TYPICAL, stars: 2, score: 42350, newBest: false });
  assert.equal(f.title, 'NEON RAIN');
  assert.equal(f.kicker, 'WORLD 2 · REEL 1');
  assert.equal(f.stars, 2);
  assert.equal(f.label, 'BOX OFFICE');
  assert.equal(f.score, '42,350');
  assert.equal(f.record, false);
  assert.match(f.billing, /RUNNING TIME 1:47/);
  const r = finalCard({ level: levelById('w8-5'), stats: ZERO, stars: 0, score: 0, newBest: true });
  assert.equal(r.record, true);
  assert.equal(r.label, 'RECORD BOX OFFICE');
  assert.equal(r.kicker, 'WORLD 8 · FINALE');
  assert.equal(r.score, '0');
  for (const line of [r.title, r.kicker, r.label, r.billing, f.billing]) readsWell(line, 'final');
});
