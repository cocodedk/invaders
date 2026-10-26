import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installElements } from './dom-kit.js';

// The results card built on a few stand-in elements: which lines it shows.
installElements();
const { resultsScreen } = await import('../../src/ui/screens/results.js');

const all = (el) => [el, ...el.children.filter((k) => typeof k === 'object').flatMap(all)];
const bestLines = (o) => all(resultsScreen({ label: 'w1-1', score: 1200, stars: 2, ...o }, { retry() {}, select() {} }).el)
  .filter((e) => e.className.startsWith('result-best'))
  .map((e) => e.children.join(''));

test('the results card shows the best, or New best!, and no best line at all when there is none (the demo)', () => {
  assert.deepEqual(bestLines({ best: { score: 3400, stars: 3 }, newBest: false }), ['Best 3,400']);
  assert.deepEqual(bestLines({ best: { score: 1200, stars: 2 }, newBest: true }), ['New best!']);
  assert.deepEqual(bestLines({ best: null, newBest: false }), []);
});

// The tally under the score line: each `tally-line`'s text, and whether it carries the medal mark.
const card = (o) => resultsScreen({ label: 'w1-1', score: 187450, stars: 2, best: null, ...o }, { retry() {}, select() {} });
const text = (el) => el.children.map((k) => (typeof k === 'object' ? text(k) : k)).join('');
const tallyOf = (o) => all(card(o).el).filter((e) => e.className.startsWith('tally-line')).map((e) => text(e));
const T = { time: 48.9, par: 80, speed: 1.4, base: 60000, bonus: 5000, bombBonus: 0, lifeBonus: 0, total: 187450, medal: false };

test('the tally shows the time against the par and the speed, and a bonus line only when it was earned', () => {
  assert.deepEqual(tallyOf({ tally: T }), ['Time 0:48 · par 1:20 · ×1.40']);
  assert.deepEqual(tallyOf({ tally: { ...T, speed: 1, time: 95, par: 90 } }), ['Time 1:35 · par 1:30 · ×1.00']);
  assert.deepEqual(tallyOf({ tally: { ...T, speed: 2 } }), ['Time 0:48 · par 1:20 · ×2.00']);
  assert.deepEqual(tallyOf({ tally: { ...T, bombBonus: 4000, lifeBonus: 9000 } }), [
    'Time 0:48 · par 1:20 · ×1.40',
    'Bombs unused 2 × 2,000 +4,000',
    'Lives 3 × 3,000 +9,000',
  ]);
  assert.deepEqual(tallyOf({ tally: { ...T, lifeBonus: 3000 } }).slice(1), ['Lives 1 × 3,000 +3,000'], 'no bombs line when none were left');
  assert.deepEqual(tallyOf({ tally: { ...T, lifeBonus: 4500 } }).slice(1), ['Lives +4,500'], 'the count is left out when it is not whole');
});

test('without a tally the card is as it was: no tally block, no medal, no promotion', () => {
  const names = all(card({}).el).map((e) => e.className);
  for (const gone of ['result-tally', 'tally-line', 'result-promo']) assert.ok(!names.some((n) => n.startsWith(gone)), gone);
  assert.ok(names.includes('result-line'), 'the score line is still there');
  assert.deepEqual(tallyOf({ tally: null, promoted: null }), []);
});

test('a medal line with the medal mark shows only for a clear without powers', () => {
  const lines = (medal) => all(card({ tally: { ...T, medal } }).el).filter((e) => e.className.includes('tally-medal'));
  assert.equal(lines(false).length, 0);
  const [line] = lines(true);
  assert.equal(text(line), 'Medal · no powers');
  assert.ok(line.children.some((k) => typeof k === 'object' && k.className === 'medal'), 'the mark is drawn by CSS, not an emoji');
  assert.ok(!tallyOf({ tally: { ...T, medal: true } }).some((s) => /\p{Extended_Pictographic}/u.test(s)));
});

test('a promotion shows its rank, and nothing when the rank did not change', () => {
  const promo = (promoted) => all(card({ tally: T, promoted }).el).filter((e) => e.className.startsWith('result-promo')).map(text);
  assert.deepEqual(promo('Squadron Ace'), ['Promoted to Squadron Ace']);
  assert.deepEqual(promo(null), []);
  assert.deepEqual(promo(undefined), []);
});

test('the score still counts up to the final total, and the news slams in once it is done', () => {
  const s = card({ tally: T, promoted: 'Ace', best: { score: 1 }, newBest: true });
  const shown = [];
  for (const e of all(s.el)) e.classList = { add: (c) => shown.push([e.className, c]), contains: () => false, remove() {} };
  const score = all(s.el).find((e) => e.className === 'result-score');
  s.update(0.5);
  assert.notEqual(score.textContent, '187,450', 'still counting');
  s.update(1);
  assert.equal(score.textContent, '187,450', 'the total from the tally');
  assert.deepEqual(shown.filter(([, c]) => c === 'shown').map(([n]) => n).sort(), ['result-best new', 'result-promo']);
});
