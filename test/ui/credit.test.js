import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installElements } from './dom-kit.js';

// The author's credit on every screen that is not play, and the privacy note on the title, built on stand-in elements.
installElements();
const { titleScreen } = await import('../../src/ui/screens/title.js');
const { pauseScreen } = await import('../../src/ui/screens/pause.js');
const { resultsScreen } = await import('../../src/ui/screens/results.js');
const { failedScreen } = await import('../../src/ui/screens/failed.js');

const all = (el) => [el, ...el.children.filter((k) => typeof k === 'object').flatMap(all)];
const text = (el) => el.children.map((k) => (typeof k === 'object' ? text(k) : k)).join('');
const act = { retry() {}, select() {}, resume() {}, restart() {}, title() {} };
const SCREENS = {
  title: () => titleScreen({ items: [{ label: 'Play', pick() {} }], nowShowing: 'Neon City' }),
  pause: () => pauseScreen({ label: 'w1-1', ...act }),
  results: () => resultsScreen({ label: 'w1-1', score: 1200, stars: 2, best: null }, act),
  failed: () => failedScreen({ label: 'w1-1', score: 1200, progress: '' }, act),
};

for (const [name, make] of Object.entries(SCREENS)) {
  test(`the ${name} screen carries the credit, a link to cocode.dk the keys never land on`, () => {
    const links = all(make().el).filter((e) => e.className === 'credit');
    assert.equal(links.length, 1);
    const [a] = links;
    assert.equal(text(a), 'Babak Bandpey · cocode.dk');
    assert.equal(a.href, 'https://cocode.dk');
    assert.equal(a.target, '_blank');
    assert.equal(a.tabIndex, -1);
  });
}

test('the title says what the game keeps and what its host logs, and links the host\'s own words', () => {
  const [note] = all(SCREENS.title().el).filter((e) => e.className === 'privacy');
  assert.match(text(note), /no tracking/);
  assert.match(text(note), /stays in this browser/);
  assert.match(text(note), /GitHub Pages, logs visitors’ IP addresses/);
  const [a] = all(note).filter((e) => e.href);
  assert.match(a.href, /^https:\/\/docs\.github\.com\/.*#data-collection$/);
});
