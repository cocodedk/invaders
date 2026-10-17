import { test } from 'node:test';
import assert from 'node:assert/strict';

// The results card built on a few stand-in elements: which lines it shows.
const element = (tag) => ({
  tag, className: '', children: [], textContent: '',
  classList: { add() {}, remove() {}, contains: () => false },
  append(...kids) { this.children.push(...kids); },
  addEventListener() {},
});
globalThis.document = { createElement: element, addEventListener() {}, activeElement: null };
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
