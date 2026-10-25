import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARNIVAL, burstDegree, CHAIN_STEPS } from '../../src/ui/sfx-carnival.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { installAudio, fakeVoice } from './audio-kit.js';

const KIT = kitFor({ mood: 'carnival', root: 'A#', scale: 'mixolydian', bpm: 156 });
const MIXOLYDIAN = [10, 0, 2, 3, 5, 7, 8]; // B flat C D E flat F G A flat
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const start = (x) => x.frequency.calls[0][1];
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const gainPeaks = (nodes) => nodes.filter((x) => x.kind === 'Gain' && x.gain.calls.length === 3).map((x) => x.gain.calls[1][1]);
const filters = (nodes, type) => nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === type);

// The ping: the carrier of the one FM tone (its modulator sits at 3.51 times its pitch).
function ping(o) {
  const { a, nodes } = fakeVoice(KIT);
  CARNIVAL.burst(a, o);
  const osc = oscillators(nodes);
  const car = osc.find((c) => osc.some((m) => Math.abs(start(m) / start(c) - 3.51) < 1e-9));
  return start(car);
}

test('a burst is a crack, a boom, a glassy ping on the scale and a crackle of five sparks, light and over in about half a second', () => {
  const { a, nodes } = fakeVoice(KIT);
  const secs = CARNIVAL.burst(a, { x: 960, depth: 0 });
  assert.equal(filters(nodes, 'highpass').length, 1, 'one crack');
  assert.equal(filters(nodes, 'highpass')[0].frequency.calls[0][1], 5200);
  assert.equal(filters(nodes, 'lowpass').filter((x) => x.frequency.calls[0][1] === 2400).length, 1, 'and a boom of dull noise');
  const body = oscillators(nodes).filter((x) => x.frequency.calls[1]?.[1] === 55);
  assert.equal(body.length, 1, 'with a thump falling to 55 Hz');
  assert.deepEqual(filters(nodes, 'bandpass').map((x) => x.frequency.calls[0][1]), [6200, 4800, 7400, 5400, 6800], 'five sparks');
  assert.ok(filters(nodes, 'bandpass').every((x) => x.Q.value === 6), 'thin ticks');
  assert.equal(oscillators(nodes).length, 3, 'the thump, and the ping with its modulator');
  assert.ok(MIXOLYDIAN.includes(pitchClass(ping({ x: 960, depth: 0 }))), 'the ping is a note of B flat mixolydian');
  assert.ok(gainPeaks(nodes).every((p) => p <= 0.12), `light, well under the ship's shot: ${gainPeaks(nodes)}`);
  assert.ok(secs > 0.4 && secs < 0.8, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('the ping is higher the further right the shell bursts, a note of the scale in each of seven bands, from B flat 4 to A flat 5', () => {
  const pitches = [100, 400, 700, 1000, 1300, 1600, 1900].map((x) => ping({ x, depth: 0 }));
  for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1], `x step ${i}: ${pitches}`);
  assert.ok(pitches.every((f) => MIXOLYDIAN.includes(pitchClass(f))));
  assert.ok(Math.abs(pitches[0] - 466.16) < 0.05 && Math.abs(pitches[6] - 830.61) < 0.05, 'B flat 4 on the left, A flat 5 on the right');
  assert.equal(new Set([10, 100, 200, 270].map((x) => ping({ x, depth: 0 }))).size, 1, 'a band is one note');
  assert.equal(ping({ x: -50, depth: 0 }), pitches[0], 'left of the screen is the lowest');
  assert.equal(ping({ x: 4000, depth: 0 }), pitches[6], 'right of it the highest');
  assert.equal(ping({ depth: 0 }), pitches[0], 'a burst without an x still sounds');
});

test('each link of a chain is one step of the scale higher, so a chain plays a rising run, an octave in all', () => {
  const run = [0, 1, 2, 3, 4, 5, 6, 7].map((depth) => ping({ x: 100, depth }));
  for (let i = 1; i < run.length; i++) assert.ok(run[i] > run[i - 1], `link ${i}: ${run}`);
  assert.ok(run.every((f) => MIXOLYDIAN.includes(pitchClass(f))), 'every link is in the scale');
  assert.ok(Math.abs(run[7] / run[0] - 2) < 1e-9, 'the eighth is the octave of the first');
  assert.equal(burstDegree(100, 0), 0);
  assert.equal(burstDegree(100, 3), 3);
  assert.equal(burstDegree(1900, 3), 9, 'where it bursts and how far down the chain add up');
  assert.ok(ping({ x: 960, depth: 1 }) > ping({ x: 960, depth: 0 }), 'at any x');
});

test('the climb is capped at one octave: a longer chain holds the top note, and a missing or odd depth counts as the first shell', () => {
  assert.equal(CHAIN_STEPS, 7);
  const top = ping({ x: 100, depth: CHAIN_STEPS });
  for (const depth of [8, 20, 1000, Infinity]) assert.equal(ping({ x: 100, depth }), top, `depth ${depth}`);
  for (const depth of [undefined, null, NaN, -3]) assert.equal(ping({ x: 100, depth }), ping({ x: 100, depth: 0 }), `depth ${depth}`);
  assert.equal(ping({ x: 100, depth: 2.9 }), ping({ x: 100, depth: 2 }), 'a part of a link is not a step');
  const highest = Math.max(...[0, 1900].flatMap((x) => [0, 7, 50].map((depth) => ping({ x, depth }))));
  assert.ok(highest < 1700, `at most A flat 6, ${highest} Hz`);
});

test('bursts are thinned like the ship\'s own shot: a cluster in one tick sounds once, a chain at its fuse spacing sounds link by link without stacking', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); // the voices' clean-up timers need not run
  installAudio({ currentTime: 10 });
  const { unlockAudio, play, audioStats, audioNodes } = await import('../../src/ui/audio.js');
  unlockAudio();
  const { ctx } = audioNodes();
  const played = () => audioStats().played;
  let before = played();
  for (let i = 0; i < 30; i++) play('burst', { x: i * 60, depth: 1 }); // thirty shells going off on one tick
  assert.equal(played() - before, 1, 'one voice for the cluster');
  before = played();
  for (let i = 0; i < 40; i++) { // a chain of forty links, one fuse (0.12 s) apart
    ctx.currentTime += 0.12;
    play('burst', { x: 900, depth: i });
  }
  assert.equal(played() - before, 40, 'every link of the chain sounds');
  assert.ok(audioStats().voices <= 7, `${audioStats().voices} voices ringing: a handful, not dozens`);
  before = played();
  for (let i = 0; i < 20; i++) { // links closer than that are thinned to every other one
    ctx.currentTime += 0.05;
    play('burst', { x: 900, depth: i });
  }
  assert.equal(played() - before, 10);
  assert.equal(audioStats().failed, 0, audioStats().error);
});
