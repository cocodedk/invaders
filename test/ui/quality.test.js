import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQuality, sampleFrame, DROP_MS, RESTORE_MS } from '../../src/ui/quality.js';

// Feed `secs` seconds of frames that each take `ms`.
function run(q, ms, secs) {
  for (let t = 0; t < secs * 1000; t += ms) sampleFrame(q, ms);
  return q.level;
}

test('starts at full quality', () => {
  assert.equal(createQuality().level, 1);
});

test('the thresholds are the spec values', () => {
  assert.equal(DROP_MS, 20);
  assert.equal(RESTORE_MS, 14);
});

test('a slow second drops to half, but not before the second is over', () => {
  const q = createQuality();
  run(q, 25, 0.9);
  assert.equal(q.level, 1, 'still averaging the first second');
  run(q, 25, 0.2);
  assert.equal(q.level, 0.5);
});

test('hysteresis: between 14 and 20 ms the level holds, whichever it is', () => {
  const q = createQuality();
  assert.equal(run(q, 18, 3), 1, '18 ms does not drop full quality');
  run(q, 25, 1.1);
  assert.equal(q.level, 0.5);
  assert.equal(run(q, 16, 3), 0.5, '16 ms does not restore half quality');
  assert.equal(run(q, 12, 1.1), 1, '12 ms restores it');
});

test('exactly at a threshold nothing changes (strictly above 20, strictly below 14)', () => {
  const q = createQuality();
  assert.equal(run(q, 20, 2), 1);
  run(q, 30, 1.1);
  assert.equal(run(q, 14, 2), 0.5);
});

test('the average is over the window, not the last frame', () => {
  const q = createQuality();
  for (let i = 0; i < 40; i++) {
    sampleFrame(q, 10);
    sampleFrame(q, 30); // average 20: not above the drop line
  }
  assert.equal(q.level, 1);
  for (let i = 0; i < 40; i++) {
    sampleFrame(q, 12);
    sampleFrame(q, 30); // average 21
  }
  assert.equal(q.level, 0.5);
});

test('a stall (hidden tab, GC pause) or a bad sample is ignored', () => {
  const q = createQuality();
  run(q, 12, 0.5);
  sampleFrame(q, 4000);
  sampleFrame(q, NaN);
  sampleFrame(q, -5);
  run(q, 12, 0.6);
  assert.equal(q.level, 1);
  assert.ok(q.avg > 11 && q.avg < 13, `avg ${q.avg}`);
});
