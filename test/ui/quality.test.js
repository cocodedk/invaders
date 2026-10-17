import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createQuality, sampleFrame, DROP_MS, RESTORE_MS, INTERVAL_DROP_MS, INTERVAL_RESTORE_MS,
} from '../../src/ui/quality.js';

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

// Feed `secs` seconds of a vsync-locked loop: each frame does `work` ms of work in an `interval` ms slot.
function runAt(q, work, interval, secs) {
  for (let t = 0; t < secs * 1000; t += interval) sampleFrame(q, work, interval);
  return q.level;
}

test('work time, not the 60 Hz interval: a heavy second drops, 6 ms of work restores within a second', () => {
  const q = createQuality();
  assert.equal(runAt(q, 24, 33.4, 1), 0.5, '24 ms of work a frame drops (30 frames, one window)');
  assert.equal(runAt(q, 6, 16.7, 1.05), 1, 'light work at 16.7 ms intervals restores');
  assert.ok(q.avg > 5.9 && q.avg < 6.1, `avg is the work, not the interval: ${q.avg}`);
});

test('the window is a second of frames even when the work per frame is tiny', () => {
  const q = createQuality();
  runAt(q, 25, 25, 1); // exactly one window: no frames left over
  assert.equal(q.level, 0.5);
  assert.equal(runAt(q, 0.5, 16.7, 0.9), 0.5, 'not judged before a second of intervals');
  assert.equal(runAt(q, 0.5, 16.7, 0.2), 1);
  assert.equal(runAt(q, 0, 16.7, 1.1), 1, 'zero work (a coarse timer) is a valid sample');
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

// Ruling R23: a GPU-bound Pi shows up in the display's pace, not in the work measured on the CPU.
test('a slow display pace drops quality even when the work is light (1 s average interval > 22 ms)', () => {
  assert.equal(INTERVAL_DROP_MS, 22);
  assert.equal(INTERVAL_RESTORE_MS, 18);
  const q = createQuality();
  assert.equal(runAt(q, 5, 22, 2), 1, 'exactly 22 ms does not drop');
  assert.equal(runAt(q, 5, 33.4, 1.05), 0.5, 'light work at 30 fps drops');
  assert.ok(q.interval > 33 && q.interval < 34, `the window's average interval is kept: ${q.interval}`);
});

test('restoring needs light work AND a quick pace (work < 14 ms and interval < 18 ms)', () => {
  const dropped = () => {
    const q = createQuality();
    runAt(q, 25, 25, 1); // exactly one window: nothing carried into the next
    assert.equal(q.level, 0.5);
    return q;
  };
  assert.equal(runAt(dropped(), 5, 20, 2), 0.5, 'light work at 50 fps: the pace still holds it down');
  assert.equal(runAt(dropped(), 15, 16.7, 2), 0.5, 'a 60 fps pace with 15 ms of work holds it down');
  assert.equal(runAt(dropped(), 5, 18, 2), 0.5, 'exactly 18 ms does not restore');
  assert.equal(runAt(dropped(), 5, 16.7, 1.05), 1, 'both under their lines restores');
});
