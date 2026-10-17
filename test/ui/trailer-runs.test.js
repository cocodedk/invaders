import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../../src/ui/storage.js';
import { saveBestRun, cinemaReels } from '../../src/ui/trailer/runs.js';
import { levelById } from '../../src/core/levels.js';
import { makeRun } from '../../src/core/replay.js';

const IDLE = { dx: 0, dy: 0, fire: false, bomb: false, target: null };
const runFor = (id, score = 9000, n = 120) => makeRun(levelById(id), levelById(id).seed, Array.from({ length: n }, () => ({ ...IDLE })), { score, stars: 2 });

function backend({ refuseRuns = false } = {}) {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (refuseRuns && k.includes('.run.')) throw new Error('QuotaExceededError');
      map.set(k, String(v));
    },
  };
}

// The outcome flow.js hands over, with storage's own recordResult as the cleared event did it.
function outcome(store, id, { score = 9000, mode = 'play', cleared = true, run = runFor(id, score) } = {}) {
  const res = cleared && mode === 'play' ? store.recordResult(id, { score, stars: 2 }) : { newBest: false };
  return { level: levelById(id), mode, cleared, score, newBest: res.newBest, run };
}

test('a cleared run that beats the best is saved as the level best run', () => {
  const back = backend();
  const store = createStorage(() => back);
  assert.equal(saveBestRun(store, outcome(store, 'w2-1')), 'saved');
  assert.ok(back.map.has('invaders.run.w2-1'));
  assert.deepEqual(store.bestRun('w2-1'), runFor('w2-1'));
});

test('only on a new best: a lower score, a tainted run, the demo and a failure keep what is there', () => {
  const store = createStorage(() => backend());
  saveBestRun(store, outcome(store, 'w2-1', { score: 9000 }));
  assert.equal(saveBestRun(store, outcome(store, 'w2-1', { score: 8000 })), 'skip', 'not a new best');
  assert.equal(saveBestRun(store, outcome(store, 'w2-1', { score: 9000 })), 'skip', 'equal is not better');
  assert.equal(store.bestRun('w2-1').score, 9000);
  assert.equal(saveBestRun(store, outcome(store, 'w3-1', { run: null })), 'skip', 'tainted: no run');
  assert.equal(store.bestRun('w3-1'), null);
  assert.equal(saveBestRun(store, outcome(store, 'w1-1', { mode: 'try' })), 'skip', 'the demo');
  assert.equal(saveBestRun(store, outcome(store, 'w1-2', { cleared: false })), 'skip', 'failed');
  assert.equal(store.bestRun('w1-2'), null);
});

test('a full or blocked storage never crashes and keeps the score; the run lasts the session', () => {
  const back = backend({ refuseRuns: true });
  const store = createStorage(() => back);
  const o = outcome(store, 'w4-2', { score: 12000 });
  assert.equal(saveBestRun(store, o), 'unsaved');
  assert.deepEqual(createStorage(() => back).best('w4-2'), { score: 12000, stars: 2 }, 'the score was kept');
  assert.equal(createStorage(() => back).bestRun('w4-2'), null, 'the run was not');
  assert.deepEqual(cinemaReels(store).map((r) => r.level.id), ['w4-2'], 'this session can still watch it');
  const broken = createStorage(() => { throw new Error('SecurityError'); });
  assert.equal(saveBestRun(broken, outcome(broken, 'w4-2')), 'unsaved');
});

test('cinema lists the levels with a playable saved run, in level order, skipping corrupted ones', () => {
  const back = backend();
  const put = (id, value) => back.map.set(`invaders.run.${id}`, typeof value === 'string' ? value : JSON.stringify(value));
  put('w3-2', runFor('w3-2', 5000));
  put('w1-1', runFor('w1-1', 7000));
  put('w1-2', '{"v":1,"level":"w1-2","seed":'); // cut off mid-write
  put('w1-3', { ...runFor('w1-3'), v: 2 }); // an old or future version
  put('w2-1', runFor('w1-1')); // another level's run under this key
  put('w2-2', { ...runFor('w2-2'), inputs: runFor('w2-2').inputs.slice(0, 2) }); // truncated inputs
  put('w2-3', 'null');
  const reels = cinemaReels(createStorage(() => back));
  assert.deepEqual(reels.map((r) => r.level.id), ['w1-1', 'w3-2']);
  assert.equal(reels[0].run.score, 7000);
  assert.equal(reels[0].run.inputs.length, 120, 'decoded, ready to replay');
  assert.deepEqual(cinemaReels(createStorage(() => backend())), [], 'nothing saved, nothing listed');
});
