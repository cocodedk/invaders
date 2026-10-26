import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, medalCount, PREFIX } from '../../src/ui/storage.js';

// A working localStorage stand-in.
function memoryBackend(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

// Private windows, kiosks with blocked storage, a full quota: every call throws.
const throwing = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
  removeItem() { throw new Error('SecurityError'); },
};

test('keys are prefixed invaders. and results survive a new instance over the same storage', () => {
  assert.equal(PREFIX, 'invaders.');
  const back = memoryBackend();
  const s = createStorage(() => back);
  const r = s.recordResult('w2-1', { score: 12000, stars: 2 });
  assert.deepEqual(r.best, { score: 12000, stars: 2, medal: false });
  assert.equal(r.newBest, true);
  for (const key of back.map.keys()) assert.ok(key.startsWith('invaders.'), key);
  assert.deepEqual(createStorage(() => back).best('w2-1'), { score: 12000, stars: 2, medal: false });
});

test('best score and best stars are kept apart, each the highest so far', () => {
  const s = createStorage(() => memoryBackend());
  assert.deepEqual(s.best('w1-1'), { score: 0, stars: 0, medal: false }, 'never played');
  s.recordResult('w1-1', { score: 9000, stars: 3 });
  const r = s.recordResult('w1-1', { score: 15000, stars: 1 });
  assert.deepEqual(r.best, { score: 15000, stars: 3, medal: false });
  assert.equal(r.newBest, true);
  const again = s.recordResult('w1-1', { score: 15000, stars: 3 });
  assert.equal(again.newBest, false, 'a tie is not a new best');
  assert.deepEqual(s.allBest(), { 'w1-1': { score: 15000, stars: 3, medal: false } });
});

test('a throwing localStorage never breaks the game: everything holds for the session', () => {
  const s = createStorage(() => throwing);
  assert.deepEqual(s.best('w3-2'), { score: 0, stars: 0, medal: false });
  const r = s.recordResult('w3-2', { score: 5000, stars: 1 });
  assert.equal(r.newBest, true);
  assert.deepEqual(s.best('w3-2'), { score: 5000, stars: 1, medal: false }, 'remembered in memory');
  s.setMuted(true);
  assert.equal(s.muted(), true);
  assert.equal(s.demoSeen(), false);
  s.setDemoSeen();
  assert.equal(s.demoSeen(), true);
  assert.equal(s.setBestRun('w3-2', { v: 1 }), false, 'reports that the run was not stored');
  assert.deepEqual(s.bestRun('w3-2'), { v: 1 }, 'but keeps it for the session');
});

test('a localStorage getter that throws, or no localStorage at all, works the same', () => {
  for (const get of [() => { throw new Error('denied'); }, () => undefined, () => null]) {
    const s = createStorage(get);
    s.recordResult('w8-5', { score: 100, stars: 1 });
    assert.deepEqual(s.best('w8-5'), { score: 100, stars: 1, medal: false });
    assert.equal(s.muted(), false);
  }
});

test('corrupted JSON reads as nothing saved, and the next result overwrites it', () => {
  const back = memoryBackend({ 'invaders.best': '{"w1-1": {"score": 50', 'invaders.run.w1-1': 'not json' });
  const s = createStorage(() => back);
  assert.deepEqual(s.best('w1-1'), { score: 0, stars: 0, medal: false });
  assert.deepEqual(s.allBest(), {});
  assert.equal(s.bestRun('w1-1'), null);
  s.recordResult('w1-1', { score: 700, stars: 1 });
  assert.deepEqual(JSON.parse(back.map.get('invaders.best')), { 'w1-1': { score: 700, stars: 1, medal: false } });
});

test('well-formed JSON of the wrong shape is cleaned entry by entry', () => {
  const saved = {
    'w1-1': { score: 4000, stars: 2 },
    'w1-2': { score: 'lots', stars: 2 },
    'w1-3': { score: 10, stars: 9 },
    'w1-4': null,
    'w1-5': { score: -5, stars: 1 },
  };
  const overflow = JSON.stringify(saved).replace(/}$/, ',"w2-1":{"score":1e999,"stars":1}}'); // parses to Infinity
  for (const raw of [JSON.stringify(saved), overflow, '[1,2,3]', '"text"', 'null', '42']) {
    const s = createStorage(() => memoryBackend({ 'invaders.best': raw }));
    const all = s.allBest();
    assert.deepEqual(Object.keys(all).filter((k) => k !== 'w1-1'), [], raw);
    if (raw.startsWith('{')) assert.deepEqual(all['w1-1'], { score: 4000, stars: 2, medal: false });
  }
});

test('the mute switch and the demo flag read garbage as off', () => {
  const s = createStorage(() => memoryBackend({ 'invaders.muted': 'maybe', 'invaders.demoSeen': '{' }));
  assert.equal(s.muted(), false);
  assert.equal(s.demoSeen(), false);
  s.setMuted(true);
  assert.equal(s.muted(), true);
  s.setMuted(false);
  assert.equal(s.muted(), false);
});

test('a best run is stored per level as JSON and read back as the same object', () => {
  const back = memoryBackend();
  const s = createStorage(() => back);
  const run = { v: 1, level: 'w4-2', seed: 9, ticks: 3, inputs: 'A*3', score: 10, stars: 1 };
  assert.equal(s.setBestRun('w4-2', run), true);
  assert.deepEqual(createStorage(() => back).bestRun('w4-2'), run);
  assert.equal(s.bestRun('w4-3'), null);
});

test('a level\'s medal is kept once earned, like its best stars, and an old entry reads as no medal', () => {
  const back = memoryBackend({ 'invaders.best': JSON.stringify({ 'w1-1': { score: 4000, stars: 2 } }) }); // saved before medals
  const s = createStorage(() => back);
  assert.deepEqual(s.best('w1-1'), { score: 4000, stars: 2, medal: false });
  assert.equal(s.recordResult('w1-1', { score: 3000, stars: 1, medal: true }).best.medal, true, 'a lower score can still earn it');
  assert.equal(s.recordResult('w1-1', { score: 9000, stars: 3, medal: false }).best.medal, true, 'a later clear with powers does not take it back');
  assert.equal(s.recordResult('w1-1', { score: 9000, stars: 3 }).best.medal, true, 'nor does an event without the field');
  assert.equal(createStorage(() => back).best('w1-1').medal, true, 'and it is saved');
  assert.equal(s.recordResult('w1-2', { score: 100, stars: 0, medal: 'yes' }).best.medal, false, 'only true is a medal');
  const junk = createStorage(() => memoryBackend({ 'invaders.best': JSON.stringify({ 'w2-1': { score: 5, stars: 1, medal: 1 } }) }));
  assert.deepEqual(junk.best('w2-1'), { score: 5, stars: 1, medal: false }, 'a malformed medal reads as none and keeps the entry');
});

test('medalCount counts the levels that hold their medal', () => {
  assert.equal(medalCount({}), 0);
  const s = createStorage(() => memoryBackend());
  s.recordResult('w1-1', { score: 1, stars: 0, medal: true });
  s.recordResult('w1-2', { score: 1, stars: 0, medal: false });
  s.recordResult('w1-3', { score: 1, stars: 0, medal: true });
  assert.equal(medalCount(s.allBest()), 2);
});

test('resetBest clears every best score, star and medal and keeps the runs, the mute switch and the demo flag', () => {
  const back = memoryBackend();
  const s = createStorage(() => back);
  s.recordResult('w1-1', { score: 9000, stars: 3, medal: true });
  s.recordResult('w2-4', { score: 500, stars: 1, medal: false });
  s.setBestRun('w1-1', { v: 1, level: 'w1-1' });
  s.setMuted(true);
  s.setDemoSeen();
  assert.equal(s.resetBest(), true);
  assert.deepEqual(s.allBest(), {});
  assert.deepEqual(s.best('w1-1'), { score: 0, stars: 0, medal: false });
  assert.equal(medalCount(s.allBest()), 0);
  assert.equal(back.map.has('invaders.best'), false, 'the key is gone');
  assert.deepEqual(s.bestRun('w1-1'), { v: 1, level: 'w1-1' }, 'the saved run stays for Cinema');
  assert.equal(s.muted(), true);
  assert.equal(s.demoSeen(), true);
  const next = createStorage(() => back);
  assert.deepEqual(next.allBest(), {}, 'a new session over the same storage sees nothing');
  assert.deepEqual(next.bestRun('w1-1'), { v: 1, level: 'w1-1' });
  assert.equal(s.recordResult('w1-1', { score: 70, stars: 1, medal: false }).newBest, true, 'play goes on from zero');
});

test('resetBest never throws on a blocked storage and still empties the session', () => {
  for (const get of [() => throwing, () => { throw new Error('denied'); }, () => undefined]) {
    const s = createStorage(get);
    s.recordResult('w3-2', { score: 5000, stars: 1, medal: true });
    assert.equal(s.resetBest(), false, 'the backend did not take it');
    assert.deepEqual(s.allBest(), {}, 'but this session reads empty');
    assert.equal(s.recordResult('w3-2', { score: 10, stars: 0 }).newBest, true);
  }
});
