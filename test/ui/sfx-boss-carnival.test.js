import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS } from '../../src/ui/sfx-boss.js';
import { UI } from '../../src/ui/sfx-ui.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

const CARNIVAL = kitFor({ mood: 'carnival', root: 'A#', scale: 'mixolydian', bpm: 156 });
const MIXOLYDIAN = [10, 0, 2, 3, 5, 7, 8]; // B flat C D E flat F G A flat
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const pipes = (nodes) => oscillators(nodes).filter((x) => x.type === 'square' && Math.abs(x.detune.value) === 9); // the organ chord's detuned voices
const ticks = (nodes) => nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass' && x.Q.value === 6); // the ratchet's clicks

test("the Carousel's roar is an organ chord swelling in on square pipes over a ratchet that is cranked faster and faster", () => {
  assert.equal(CARNIVAL.style, 'carnival');
  const { a, nodes } = fakeVoice(CARNIVAL);
  const secs = BOSS.phase(a, { phase: 1 });
  const chord = pipes(nodes);
  assert.equal(chord.length, 8, 'four notes, each two voices');
  const hz = [...new Set(chord.map((x) => Math.round(x.frequency.calls[0][1])))].sort((p, q) => p - q);
  assert.deepEqual(hz, [233, 294, 349, 415], 'B flat, D, F and A flat: a seventh chord');
  assert.ok(chord.every((x) => MIXOLYDIAN.includes(pitchClass(x.frequency.calls[0][1]))), 'in the scale');
  assert.ok(chord.some((x) => x.detune.value < 0) && chord.some((x) => x.detune.value > 0), 'detuned both ways');
  const swells = nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'lowpass' && x.frequency.calls[0][1] === 500 && x.frequency.calls[1]?.[1] === 2600);
  assert.equal(swells.length, 8, 'each voice opens from 500 to 2600 Hz as it swells');
  const rises = nodes.filter((x) => x.kind === 'Gain' && x.gain.calls.length === 3 && x.gain.calls[1][1] === 0.028);
  assert.ok(rises.every((x) => x.gain.calls[1][2] - x.gain.calls[0][2] > 0.8), 'the chord swells in over most of a second');
  const clicks = ticks(nodes).map((x) => x.frequency.calls[0]);
  assert.ok(clicks.length >= 15, `${clicks.length} clicks`);
  assert.deepEqual([...new Set(clicks.map((c) => c[1]))].sort(), [2300, 3100], 'a pawl over the teeth: two alternating tones');
  const gaps = clicks.slice(1).map((c, i) => c[2] - clicks[i][2]);
  assert.ok(Math.abs(gaps[0] - 0.12) < 1e-9, 'it starts slow');
  assert.ok(gaps.every((g, i) => i === 0 || g <= gaps[i - 1] + 1e-9), 'and never slows down');
  assert.ok(Math.abs(gaps.at(-1) - 0.04) < 1e-9, 'to a rattle');
  noLeak(a, nodes, secs);
  const death = fakeVoice(CARNIVAL);
  const deathSecs = BOSS.bossDeath(death.a);
  assert.equal(pipes(death.nodes).length, 8, 'the last roar plays the organ too');
  assert.ok(ticks(death.nodes).length > clicks.length, 'and cranks for longer');
  noLeak(death.a, death.nodes, deathSecs);
});

test("no other world's roar plays an organ chord or cranks a ratchet", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'carnival')) {
    const roar = fakeVoice(kitFor(look.music));
    BOSS.phase(roar.a, { phase: 1 });
    assert.equal(pipes(roar.nodes).length, 0, `w${look.world}: no organ`);
    assert.equal(ticks(roar.nodes).length, 0, `w${look.world}: no ratchet`);
  }
});

test("the carnival's stingers are a steam whistle on the scale: a pure sine a note, a breath on it, a quick vibrato and the octave ringing over", () => {
  const { a, nodes } = fakeVoice(CARNIVAL);
  const secs = UI.cleared(a, {});
  const osc = oscillators(nodes);
  assert.ok(osc.every((x) => x.type === 'sine'), 'pure: no sawtooth and no square');
  const notes = osc.filter((x) => x.frequency.calls.length && Math.abs(x.frequency.calls[0][1] - 466.16) < 0.05);
  assert.equal(notes.length, 1, 'the run starts on B flat 4');
  const breaths = nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass' && x.Q.value === 3);
  assert.equal(breaths.length, 7, 'a breath of noise on each of the seven notes');
  assert.equal(osc.filter((x) => x.frequency.value === 6.5).length, 7, 'and a vibrato on each');
  assert.ok(osc.some((x) => x.frequency.calls.length && Math.abs(x.frequency.calls[0][1] - 932.33) < 0.05), 'with the octave over it');
  assert.equal(nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'lowpass').length, 0, 'no filter to swell');
  noLeak(a, nodes, secs);
});

test("no other world's stinger breathes or shakes like a whistle", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'carnival')) {
    const stinger = fakeVoice(kitFor(look.music));
    UI.cleared(stinger.a, {});
    assert.equal(oscillators(stinger.nodes).filter((x) => x.frequency.value === 6.5).length, 0, `w${look.world}: no vibrato at 6.5 Hz`);
    assert.equal(stinger.nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass' && x.Q.value === 3).length, 0, `w${look.world}: no breath`);
  }
});
