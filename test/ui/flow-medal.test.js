import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, all, textOf } from './lobby-kit.js';

// A level's medal is recorded as the level is cleared, and when it raises the pilot's rank the results
// card says so (flow.js). Rank rungs from core/ranks.js: 1 medal Cadet, 3 Pilot, 6 Flight Lead.
installDom();
const backing = new Map();
globalThis.localStorage = {
  getItem: (k) => backing.get(k) ?? null, setItem: (k, v) => backing.set(k, String(v)), removeItem: (k) => backing.delete(k),
};

const { createFlow } = await import('../../src/ui/flow.js');
const { createSession } = await import('../../src/ui/session.js');
const { store, medalCount } = await import('../../src/ui/storage.js');
const { levelById } = await import('../../src/core/levels.js');

const clear = (flow, id, medal, mode = 'play') => {
  const level = levelById(id);
  const scene = { mode, level, session: createSession(level) };
  flow.onEvent(scene, { type: 'cleared', score: 5000, stars: 1, medal });
  return scene;
};

test('a clear that earns its first medals raises the rank; a clear that does not, or a repeat, does not', () => {
  const flow = createFlow({ app: {} }, { show() {} });
  assert.equal(clear(flow, 'w1-1', false).promoted, null, 'no medal, no promotion');
  assert.equal(medalCount(store.allBest()), 0);
  assert.equal(clear(flow, 'w1-2', true).promoted, 'Cadet', 'the first medal');
  assert.equal(clear(flow, 'w1-2', true).promoted, null, 'the same level again is no new medal');
  assert.equal(clear(flow, 'w1-3', true).promoted, null, 'two medals: still a Cadet');
  assert.equal(clear(flow, 'w1-4', true).promoted, 'Pilot', 'the third');
  assert.equal(clear(flow, 'w1-4', false).promoted, null, 'a later clear with powers keeps the medal');
  assert.equal(medalCount(store.allBest()), 3);
});

test('the demo records nothing', () => {
  const flow = createFlow({ app: {} }, { show() {} });
  const before = medalCount(store.allBest());
  assert.equal(clear(flow, 'w2-1', true, 'try').promoted, undefined);
  assert.equal(medalCount(store.allBest()), before);
});

// The card the flow shows for an outcome.
function shown(o) {
  let screen = null;
  const r = { app: {}, labelOf: () => 'World · Reel', goLobby() {}, goTitle() {}, startTry() {}, startLevel() {} };
  createFlow(r, { show: (s) => (screen = s) }).showResults({ level: levelById('w1-1'), mode: 'play', score: 1000, stars: 1, best: null, newBest: false, ...o });
  return all(screen.el).filter((e) => /^(result-promo|tally-line)/.test(e.className)).map(textOf);
}
const tally = { time: 30, par: 60, speed: 1.5, bombBonus: 0, lifeBonus: 3000, medal: true };

test('the results card gets the tally and the promotion; the demo card gets neither', () => {
  assert.deepEqual(shown({ tally, promoted: 'Flight Lead' }), [
    'Time 0:30 · par 1:00 · ×1.50', 'Lives 1 × 3,000 +3,000', 'Medal · no powers', 'Promoted to Flight Lead',
  ]);
  assert.deepEqual(shown({ tally: null, promoted: null }), [], 'an outcome without a tally shows as it did');
  assert.deepEqual(shown({ mode: 'try', tally, promoted: 'Flight Lead' }), []);
});
