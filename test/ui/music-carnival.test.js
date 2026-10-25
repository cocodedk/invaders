import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { STYLES, kitFor } from '../../src/ui/sound-data.js';
import { fakeAudio } from './audio-kit.js';

// Ember Carnival's music entry (looks/w14.js repeats it; sounds.test.js pins that).
const LOOK = { music: { mood: 'carnival', root: 'A#', scale: 'mixolydian', bpm: 156 } };
const STEP = 60 / 156 / 2;
const MIXOLYDIAN = [10, 0, 2, 3, 5, 7, 8]; // B flat C D E flat F G A flat, as pitch classes
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const pitchClass = (n) => (Math.round(12 * Math.log2(first(n) / 440)) + 69) % 12;
const long = (n) => n.stopAt - startOf(n) > 0.2;
const tubas = (osc) => osc.filter((n) => n.type === 'sine' && n.frequency.calls.length > 1 && n.frequency.calls[1][1] === n.frequency.calls[0][1] * 0.98);

// One 12-step pass: two bars of three beats, two steps a beat.
const pass = () => {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOK);
  fillLoop(c, 0.1 + 12 * STEP - 0.01);
  return { nodes, c, osc: nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator') };
};
const bands = (nodes, hz) => nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'bandpass' && n.frequency.calls[0][1] === hz);

test("Ember Carnival's loop is a waltz: two bars of three beats at 156 bpm, a fast triple time the sequencer plays with no change but the step count", () => {
  const { c } = pass();
  assert.deepEqual([c.kit.style, c.kit.bpm, c.kit.root, c.m.div], ['carnival', 156, 10, 2]);
  assert.equal(c.m.seq.length, 12, 'two bars of six steps');
  assert.equal(c.m.drum.length, 12);
  assert.equal(c.m.seq.length % (3 * c.m.div), 0, 'whole bars of three beats');
  assert.equal(kitFor(LOOK.music).scale.length, 7);
});

test("the calliope holds each note, then lets it go: nine square notes in B flat mixolydian, with the flat seventh in the tune", () => {
  const { nodes, osc } = pass();
  const lead = osc.filter((n) => n.type === 'square' && n.frequency.calls.length && long(n));
  assert.equal(lead.length, 9, 'nine notes and three rests');
  assert.ok(Math.abs(first(lead[0]) - 932.33) < 0.05, 'the tune opens on B flat 5');
  assert.ok(lead.every((n) => MIXOLYDIAN.includes(pitchClass(n))), 'every note is in the scale');
  assert.ok(lead.some((n) => pitchClass(n) === 8), 'A flat, the flat seventh, is in the tune');
  assert.ok(lead.every((n) => pitchClass(n) !== 9), 'and never the natural seventh');
  const held = nodes.ctx.nodes.filter((n) => n.kind === 'Gain' && n.gain.calls.length === 4 && n.gain.calls[2][0] === 'set');
  assert.equal(held.length, 9, 'the level is held, then falls: not a pluck');
  assert.ok(held.every((n) => n.gain.calls[2][1] === n.gain.calls[1][1] && n.gain.calls[2][2] - n.gain.calls[1][2] > 0.1), 'held for over a tenth of a second');
  assert.ok(lead.every((n) => stepOf(n) % 12 !== 1 && stepOf(n) % 12 !== 7 && stepOf(n) % 12 !== 11), 'resting where the glockenspiel and the roll are');
});

test("the whole chord progression stays in B flat mixolydian: the tune moves with the chords to G and E flat, never out of the scale", () => {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOK);
  fillLoop(c, 0.1 + 12 * 8 * STEP - 0.01); // eight passes: the four chords, two passes each
  const lead = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator' && n.type === 'square' && n.frequency.calls.length && long(n));
  assert.equal(lead.length, 72);
  assert.ok(lead.every((n) => MIXOLYDIAN.includes(pitchClass(n))));
  const tuba = tubas(nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator'));
  const roots = [...new Set(tuba.filter((n) => stepOf(n) % 12 === 0).map((n) => Math.round(first(n))))];
  assert.deepEqual(roots, [117, 196, 156], 'the tuba on B flat 2, G3 and E flat 3');
});

test('oom-pah-pah: a tuba on the downbeat of each bar (the chord\'s fifth on the second), the band organ\'s chord on beats two and three', () => {
  const { osc } = pass();
  const tuba = tubas(osc);
  assert.deepEqual(tuba.map(stepOf), [0, 6]);
  assert.deepEqual(tuba.map((n) => Math.round(first(n) * 10) / 10), [116.5, 174.6], 'B flat 2, then its fifth, F3');
  const blats = osc.filter((n) => n.type === 'sawtooth' && n.frequency.calls.length);
  assert.deepEqual(blats.map(stepOf), [0, 6], 'with a sawtooth blat on each');
  const stabs = osc.filter((n) => n.type === 'square' && n.frequency.calls.length && !long(n));
  assert.equal(stabs.length, 12, 'four chords of three voices');
  assert.deepEqual([...new Set(stabs.map(stepOf))], [2, 4, 8, 10], 'on the second and third beat of each bar');
  assert.deepEqual([...new Set(stabs.map((n) => Math.round(first(n))))].sort((p, q) => p - q), [233, 294, 349], 'B flat, D and F');
});

test('a glockenspiel rings the chord\'s fifth after the first downbeat and its octave after the second, over a snare and cymbal march that rolls out of every second bar', () => {
  const { nodes, osc } = pass();
  const carriers = osc.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency)));
  const bells = carriers.filter((n) => first(n) > 1000);
  assert.deepEqual(bells.map(stepOf), [1, 7]);
  assert.deepEqual(bells.map((n) => Math.round(first(n))), [1397, 1865], 'F6, then B flat 6');
  assert.ok(bells.every((n) => osc.some((m) => Math.abs(first(m) / first(n) - 3.51) < 1e-6)), 'each with an inharmonic partner: a bar of metal');
  assert.equal(bands(nodes, 2000).length, 4, 'a snare tap under each of the four chords');
  assert.equal(bands(nodes, 1700).length, 3, 'and light taps between them');
  assert.equal(bands(nodes, 1900).length, 6, 'and a roll of six into the next downbeat');
  const crash = nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'highpass' && n.frequency.calls[0][1] === 6500);
  assert.equal(crash.length, 1, 'a cymbal crashes on the first downbeat only');
  assert.equal(nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'highpass' && n.frequency.calls[0][1] === 8000).length, 2, 'and a hat ticks on each downbeat');
});

test("Ember Carnival's drone is a quiet bellows under the tune, and the tune is the loudest voice", () => {
  const m = STYLES.carnival.music;
  assert.ok(m.drone.gain < m.lead.gain / 2, 'the drone sits well under the lead');
  assert.equal(m.lead.wave, 'square');
});
