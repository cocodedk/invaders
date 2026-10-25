import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMADA } from '../../src/ui/sfx-armada.js';
import { POWER } from '../../src/ui/sfx-power.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { installAudio, fakeVoice } from './audio-kit.js';

const KIT = kitFor({ mood: 'armada', root: 'G', scale: 'major', bpm: 132 });
const MAJOR = [7, 9, 11, 0, 2, 4, 6];
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const starts = (nodes) => oscillators(nodes).map((x) => x.frequency.calls[0][1]);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const gainPeaks = (nodes) => nodes.filter((x) => x.kind === 'Gain' && x.gain.calls.length === 3).map((x) => x.gain.calls[1][1]);

test('opening the side guns rings a ship\'s bell twice, on a note of G major, the second strike softer', () => {
  const { a, nodes } = fakeVoice(KIT);
  const secs = ARMADA.broadsideOn(a, { x: 960 });
  const fs = starts(nodes);
  assert.equal(fs.length, 4, 'two strikes of a carrier and its modulator');
  const note = Math.min(...fs);
  assert.ok(MAJOR.includes(pitchClass(note)), `in the scale: ${pitchClass(note)}`);
  assert.equal(fs.filter((f) => Math.abs(f - note) < 1e-6).length, 2, 'the same note struck twice');
  assert.ok(fs.every((f) => Math.abs(f / note - 1) < 1e-6 || Math.abs(f / note - 2.41) < 1e-6), 'with a bronze, inharmonic partner (2.41)');
  const [first, second] = oscillators(nodes).filter((x) => Math.abs(x.frequency.calls[0][1] - note) < 1e-6);
  assert.ok(Math.abs(second.frequency.calls[0][2] - first.frequency.calls[0][2] - 0.17) < 1e-9, 'the strikes 0.17 s apart');
  const [loud, soft] = gainPeaks(nodes).filter((p) => p > 0.05);
  assert.ok(soft < loud, `${loud} then ${soft}`);
  assert.equal(nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'highpass' && x.frequency.calls[0][1] === 4200).length, 2, 'a clapper tick on each');
  assert.ok(secs > 1 && secs < 1.5, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('the bell is higher the further right the ship is when the guns open, from G5 to F sharp 6, at any x', () => {
  const note = (x) => {
    const { a, nodes } = fakeVoice(KIT);
    ARMADA.broadsideOn(a, { x });
    return Math.min(...starts(nodes));
  };
  const pitches = [100, 400, 700, 1000, 1300, 1600, 1900].map(note);
  for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1], `x step ${i}: ${pitches}`);
  assert.ok(Math.abs(pitches[0] - 783.99) < 0.05 && Math.abs(pitches[6] - 1479.98) < 0.05, 'G5 on the left, F sharp 6 on the right');
  assert.equal(note(-50), pitches[0], 'left of the screen is the lowest');
  assert.equal(note(4000), pitches[6], 'right of it the highest');
  assert.equal(note(undefined), pitches[0], 'a bell without an x still rings');
});

test('a side shot is a short, light cannon thump: a low body that drops under a blast of noise, the left a third under the right', () => {
  const shot = (patch) => {
    const { a, nodes } = fakeVoice(KIT);
    const secs = patch(a, {});
    noLeak(a, nodes, secs);
    assert.ok(secs <= 0.25, `${secs} s: short`);
    assert.equal(oscillators(nodes).length, 1, 'one body');
    assert.equal(nodes.filter((x) => x.kind === 'BufferSource').length, 1, 'and one blast of noise');
    assert.ok(nodes.some((x) => x.kind === 'BiquadFilter' && x.type === 'lowpass' && x.frequency.calls[0][1] === 1800), 'a dull blast, not a hiss');
    assert.ok(gainPeaks(nodes).every((p) => p <= 0.2), `light: ${gainPeaks(nodes)}`);
    return oscillators(nodes)[0].frequency.calls;
  };
  const left = shot(ARMADA.cannonL);
  const right = shot(ARMADA.cannonR);
  assert.ok(left[0][1] < 200 && right[0][1] < 250, `low: ${left[0][1]} and ${right[0][1]} Hz`);
  assert.ok(Math.abs(right[0][1] / left[0][1] - 2 ** (4 / 12)) < 1e-9, 'the right a major third over the left');
  assert.ok(Math.abs(left[1][1] - 98 * 0.75) < 0.1, 'the body falls to three quarters of G2');
  assert.ok(left[1][1] < left[0][1] && right[1][1] < right[0][1], 'it drops');
});

test('the escorts add a light rattle: three thin ticks of noise, no tone, far softer than the ship\'s own drum hit', () => {
  const { a, nodes } = fakeVoice(KIT);
  const secs = ARMADA.escortShot(a, {});
  assert.equal(oscillators(nodes).length, 0, 'noise only');
  const ticks = nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass');
  assert.deepEqual(ticks.map((x) => x.frequency.calls[0][1]), [3900, 3100, 4600]);
  assert.ok(gainPeaks(nodes).every((p) => p <= 0.3), `subtle: ${gainPeaks(nodes)}`);
  assert.ok(secs <= 0.12, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('shutting the ports knocks twice, and catching the wingmen blows a short rising horn call on the scale', () => {
  const off = fakeVoice(KIT);
  const secsOff = ARMADA.broadsideOff(off.a);
  assert.equal(oscillators(off.nodes).length, 2, 'two timbers');
  noLeak(off.a, off.nodes, secsOff);
  const { a, nodes } = fakeVoice(KIT);
  const secs = POWER.powerOn(a, { kind: 'wingmen' });
  const horns = oscillators(nodes).filter((x) => x.type === 'sawtooth');
  assert.equal(horns.length, 6, 'three notes, each a pair of detuned horns');
  const notes = [...new Set(horns.map((x) => Math.round(x.frequency.calls[0][1])))];
  assert.deepEqual(notes, [392, 587, 784], 'G D G: a call that rises');
  assert.ok(horns.every((x) => MAJOR.includes(pitchClass(x.frequency.calls[0][1]))));
  assert.ok(horns.some((x) => x.detune.value < 0) && horns.some((x) => x.detune.value > 0), 'detuned both ways');
  assert.ok(Math.max(...horns.map((x) => x.stopAt - a.t)) < 0.8, 'short');
  noLeak(a, nodes, secs);
});

test('cannons and the rattle are throttled like the ship\'s own shot: a repeat inside the gap is dropped, the other side is not', async () => {
  installAudio({ currentTime: 10 });
  const { unlockAudio, play, audioStats } = await import('../../src/ui/audio.js');
  unlockAudio();
  const played = (...names) => {
    const before = audioStats().played;
    for (const n of names) play(n, { x: 900 });
    return audioStats().played - before;
  };
  assert.equal(played('cannonL', 'cannonL', 'cannonL'), 1, 'a left cannon once');
  assert.equal(played('cannonR', 'cannonR'), 1, 'a right cannon once, though the left just sounded');
  assert.equal(played('escortShot', 'escortShot'), 1);
  assert.equal(played('broadsideOn', 'broadsideOn'), 1, 'two catches in a breath ring one bell');
  assert.equal(audioStats().failed, 0, audioStats().error);
});
