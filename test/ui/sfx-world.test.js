import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLD } from '../../src/ui/sfx-world.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { tone } from '../../src/ui/audio-kit.js';
import { fakeVoice } from './audio-kit.js';

const AURORA = kitFor({ mood: 'aurora', root: 'E', scale: 'lydian', bpm: 84 });
const ARCHIVE = kitFor({ mood: 'archive', root: 'D', scale: 'dorian', bpm: 116 });
const DORIAN = [2, 4, 5, 7, 9, 11, 0];
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const starts = (nodes) => oscillators(nodes).map((x) => x.frequency.calls[0][1]);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};

test('in Aurora Kingdom a cut shard shatters: a glassy crack, splinters tinkling down, a chime on the scale', () => {
  const { a, nodes } = fakeVoice(AURORA);
  const secs = WORLD.cut(a, { x: 960 });
  const crack = nodes.find((x) => x.kind === 'BiquadFilter' && x.type === 'highpass');
  assert.ok(crack && crack.frequency.calls[0][1] >= 6000, 'a bright crack of noise');
  const splinters = starts(nodes).filter((f) => f >= 4300 && f <= 6900);
  assert.ok(splinters.length >= 3, `${splinters.length} splinters`);
  const chime = starts(nodes).filter((f) => f > 800 && f < 1700);
  assert.equal(chime.length, 1, 'one chime');
  const pc = (Math.round(12 * Math.log2(chime[0] / 440)) + 69) % 12;
  assert.ok([4, 6, 8, 10, 11, 1, 3].includes(pc), `the chime is in E lydian: ${pc}`);
  assert.ok(starts(nodes).some((f) => Math.abs(f - chime[0] * 3.51) < 1), 'with a glassy inharmonic partner');
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
});

test('the shatter chimes higher the further right the shard broke, at any x', () => {
  const chime = (x) => {
    const { a, nodes } = fakeVoice(AURORA);
    WORLD.cut(a, { x });
    return starts(nodes).find((f) => f > 800 && f < 1700);
  };
  const pitches = [100, 500, 900, 1300, 1800].map(chime);
  for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1], `x step ${i}: ${pitches}`);
  assert.equal(chime(-50), pitches[0], 'left of the screen is the lowest');
  assert.equal(chime(4000), pitches[4], 'right of it the highest');
  assert.ok(chime(undefined) > 0, 'a cut without an x still chimes');
});

test("every other world's cut is still Ronin Moon's steel shing: one FM ring and a hiss of noise", () => {
  for (const look of LOOKS) {
    const kit = kitFor(look.music);
    if (kit.style === 'aurora') continue;
    const { a, nodes } = fakeVoice(kit);
    assert.equal(WORLD.cut(a, { x: 960 }), 0.42, `w${look.world}`);
    assert.deepEqual(starts(nodes).sort((p, q) => p - q), [3100, 3100 * 1.41], `w${look.world}`);
    assert.equal(nodes.filter((x) => x.kind === 'BufferSource').length, 1, `w${look.world}`);
  }
});

test('in Starlit Archive a blink is a page turning: a flutter of paper and a harp note in D dorian', () => {
  const { a, nodes } = fakeVoice(ARCHIVE);
  const secs = WORLD.teleport(a, { x: 960 });
  const flutter = nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass' && x.frequency.calls[0][1] >= 3600);
  assert.equal(flutter.length, 5, 'five short bursts of filtered noise');
  assert.equal(nodes.filter((x) => x.kind === 'BufferSource').length, 5, 'and nothing but noise and the note');
  assert.equal(nodes.filter((x) => x.kind === 'WaveShaper').length, 0, 'no digital crush');
  const [note, partner] = starts(nodes).sort((p, q) => p - q);
  assert.ok(DORIAN.includes(pitchClass(note)), `the note is in D dorian: ${pitchClass(note)}`);
  assert.ok(Math.abs(partner - note * 3) < 1e-6, 'a whole-number FM partner: a plucked string');
  assert.ok(secs > 0.5 && secs < 1.2, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('the blink plays higher the further right the alien lands, from D4 to A5, at any x', () => {
  const note = (x) => {
    const { a, nodes } = fakeVoice(ARCHIVE);
    WORLD.teleport(a, { x });
    return Math.min(...starts(nodes));
  };
  const pitches = [100, 400, 700, 1000, 1300, 1600, 1900].map(note);
  for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1], `x step ${i}: ${pitches}`);
  assert.ok(Math.abs(pitches[0] - 293.66) < 0.05 && Math.abs(pitches[6] - 880) < 0.05, 'D4 on the left, A5 on the right');
  assert.equal(note(-50), pitches[0], 'left of the screen is the lowest');
  assert.equal(note(4000), pitches[6], 'right of it the highest');
  assert.equal(note(undefined), pitches[0], 'a blink without an x still sounds');
});

test('in Starlit Archive bullet time is a string chord bowed in and held for its two seconds, and it falls away when time returns', () => {
  const on = fakeVoice(ARCHIVE);
  const secsOn = WORLD.bulletOn(on.a);
  const saws = oscillators(on.nodes).filter((x) => x.type === 'sawtooth');
  assert.equal(saws.length, 8, 'four notes of two detuned voices');
  const notes = [...new Set(saws.map((x) => Math.round(x.frequency.calls[0][1])))].sort((p, q) => p - q);
  assert.deepEqual(notes, [147, 220, 294, 349], 'D A D F');
  assert.ok(saws.some((x) => x.detune.value < 0) && saws.some((x) => x.detune.value > 0), 'detuned both ways');
  assert.ok(oscillators(on.nodes).some((x) => x.type === 'sine' && Math.abs(x.frequency.calls[0][1] - 73.42) < 0.05), 'a low D under them');
  const holds = (x, level) => x.kind === 'Gain' && x.gain.calls.some((c) => c[0] === 'set' && c[1] === level && Math.abs(c[2] - (on.a.t + 2)) < 1e-9);
  assert.equal(on.nodes.filter((x) => holds(x, 0.015)).length, 8, 'every string holds its peak until time returns, two seconds on');
  assert.equal(on.nodes.filter((x) => holds(x, 0.03)).length, 1, 'and so does the low D');
  assert.ok(saws.every((x) => x.stopAt - x.frequency.calls[0][2] > 2.4), 'and rings a little past it');
  assert.ok(secsOn > 2.4 && secsOn < 3, `${secsOn} s`);
  noLeak(on.a, on.nodes, secsOn);
  const off = fakeVoice(ARCHIVE);
  const secsOff = WORLD.bulletOff(off.a);
  assert.equal(oscillators(off.nodes).filter((x) => x.type === 'sawtooth').length, 8, 'the same chord');
  assert.ok(!off.nodes.some((x) => x.kind === 'Gain' && x.gain.calls.some((c) => c[0] === 'set' && c[1] === 0.015)), 'nothing held: it falls straight away');
  assert.ok(off.nodes.some((x) => x.kind === 'BiquadFilter' && x.frequency.calls.some((c) => c[0] === 'exp' && c[1] === 400)), 'with the filter closing on it');
  assert.ok(secsOff > 1 && secsOff < 2, `${secsOff} s`);
  noLeak(off.a, off.nodes, secsOff);
});

test("every other world's blink and bullet time are still Code Rain's: a glitch, a swoop down and a swoop up", () => {
  const kinds = (nodes, kind) => nodes.filter((x) => x.kind === kind).length;
  for (const look of LOOKS) {
    const kit = kitFor(look.music);
    if (kit.style === 'archive') continue;
    const w = `w${look.world}`;
    const blink = fakeVoice(kit);
    assert.equal(WORLD.teleport(blink.a, { x: 960 }), 0.25, w);
    assert.deepEqual(starts(blink.nodes).sort((p, q) => p - q), [300, 2100], w);
    assert.deepEqual(oscillators(blink.nodes).map((x) => x.type), ['square', 'square'], w);
    assert.deepEqual([kinds(blink.nodes, 'BufferSource'), kinds(blink.nodes, 'WaveShaper')], [1, 1], w);
    const on = fakeVoice(kit);
    assert.equal(WORLD.bulletOn(on.a), 1.1, w);
    assert.deepEqual(starts(on.nodes), [440], w);
    assert.equal(kinds(on.nodes, 'BufferSource'), 2, w);
    assert.ok(!on.nodes.some((x) => x.kind === 'Gain' && x.gain.calls.length > 3), `${w}: no held level`);
    const off = fakeVoice(kit);
    assert.equal(WORLD.bulletOff(off.a), 0.6, w);
    assert.deepEqual(starts(off.nodes), [82], w);
    assert.deepEqual(oscillators(off.nodes).map((x) => x.type), ['sawtooth'], w);
  }
});

test('a tone holds its peak for `hold` seconds before it falls, and without a hold it falls at once', () => {
  const made = (o) => {
    const { a, nodes } = fakeVoice(ARCHIVE);
    tone(a, { f0: 220, peak: 0.1, attack: 0.5, dur: 0.4, ...o });
    return { gain: nodes.find((x) => x.kind === 'Gain').gain.calls, osc: nodes.find((x) => x.kind === 'Oscillator') };
  };
  const plain = made({});
  assert.deepEqual(plain.gain.map((c) => c[0]), ['set', 'exp', 'exp'], 'rise, then fall');
  assert.ok(Math.abs(plain.osc.stopAt - 1.95) < 1e-9);
  const held = made({ hold: 1 });
  assert.deepEqual(held.gain.map((c) => c[0]), ['set', 'exp', 'set', 'exp'], 'rise, hold, fall');
  assert.ok(Math.abs(held.gain[2][2] - 2.5) < 1e-9 && Math.abs(held.gain[3][2] - 2.9) < 1e-9, 'the fall starts after the hold');
  assert.ok(Math.abs(held.osc.stopAt - 2.95) < 1e-9, 'the oscillator stops after the fall');
});
