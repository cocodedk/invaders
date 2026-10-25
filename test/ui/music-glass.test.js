import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { STYLES, SCALES, kitFor } from '../../src/ui/sound-data.js';
import { fakeAudio } from './audio-kit.js';

// Glass Cathedral's music entry (looks/w16.js repeats it; sounds-glass.test.js pins that).
const LOOK = { music: { mood: 'glass', root: 'B', scale: 'melodic', bpm: 63 } };
const STEP = 60 / 63 / 3; // an eighth note of 6/8 at 63 dotted-quarter beats a minute
const MELODIC = [11, 1, 2, 4, 6, 8, 10]; // B C sharp D E F sharp G sharp A sharp, as pitch classes
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const near = (x, y, tol = 0.05) => Math.abs(x - y) < tol;
const next = (n) => [...n.out][0];
const cutOf = (n) => (next(n).kind === 'BiquadFilter' ? next(n).frequency.calls[0][1] : null); // the lowpass an oscillator sounds through
const envOf = (n) => (next(n).kind === 'BiquadFilter' ? [...next(n).out][0] : next(n)).gain.calls;
const peakOf = (n) => envOf(n)[1][1];

// `passes` passes of the 24-step sequence (four bars of six eighths), sorted into the loop's voices.
function play(passes = 1) {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOK);
  fillLoop(c, 0.1 + 24 * passes * STEP - 0.01);
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const played = osc.filter((n) => n.frequency.calls.length);
  const carriers = osc.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency))); // the FM tones: what a modulator drives
  const glass = played.filter((n) => cutOf(n) === 4200);
  return {
    nodes, c, osc, carriers,
    voice: glass.filter((n) => !n.detune.value && near(peakOf(n), 0.06, 1e-9)),
    twin: glass.filter((n) => n.detune.value === 3),
    over: glass.filter((n) => !n.detune.value && near(peakOf(n), 0.06 * 0.12, 1e-9)),
    choir: played.filter((n) => n.type === 'sawtooth'),
    bass: played.filter((n) => n.type === 'triangle'),
    bells: carriers.filter((n) => cutOf(n) === 7000),
    drum: played.filter((n) => n.type === 'sine' && near(first(n), 132)),
  };
}

test("Glass Cathedral's loop is a slow 6/8: four bars of six eighth-note steps at 63 dotted-quarter beats, in B melodic minor", () => {
  const { c } = play();
  assert.deepEqual([c.kit.style, c.kit.bpm, c.kit.root, c.m.div], ['glass', 63, 11, 3]);
  assert.deepEqual(c.kit.scale, SCALES.melodic);
  assert.deepEqual(SCALES.melodic, [0, 2, 3, 5, 7, 9, 11], 'a minor third with the sixth and seventh raised');
  assert.equal(c.m.seq.length, 24);
  assert.equal(c.m.drum.length, 24);
  assert.equal(c.m.seq.length % (2 * c.m.div), 0, 'whole bars of two dotted-quarter beats');
  assert.ok(c.m.seq.length * 8 * STEP > 60, 'the four chords take a minute to go round');
});

test('a glass harmonica bows a hymn-like line, a note to a beat or a bar: fifth, third, root, second, third, fifth, then the octave held', () => {
  const { voice } = play();
  const lead = voice.toSorted((p, q) => startOf(p) - startOf(q));
  assert.deepEqual(lead.map(stepOf), [0, 3, 6, 9, 12, 15, 18]);
  assert.deepEqual(lead.map((n) => Math.round(first(n) * 100) / 100), [739.99, 587.33, 493.88, 554.37, 587.33, 739.99, 987.77], 'F sharp 5, D5, B4, C sharp 5, D5, F sharp 5, B5');
  assert.ok(lead.every((n) => n.type === 'sine' && MELODIC.includes(pitchClass(first(n)))), 'pure sines, all in the scale');
});

test('each glass note is bowed: it swells in over two steps, holds its level for two and a half, then dies away over three', () => {
  const { voice } = play();
  for (const n of voice) {
    const env = envOf(n);
    assert.deepEqual(env.map((c) => c[0]), ['set', 'exp', 'set', 'exp'], 'rise, hold, fall');
    assert.ok(near(env[1][2] - env[0][2], 2 * STEP, 1e-9), 'swelling in over 0.63 s: a bow takes hold slowly');
    assert.ok(near(env[2][2] - env[1][2], 2.5 * STEP, 1e-9), 'held');
    assert.ok(near(env[3][2] - env[2][2], 3 * STEP, 1e-9), 'then released');
    assert.equal(env[1][1], STYLES.glass.music.lead.gain);
  }
});

test('and each beats against a twin three cents off, with a thin octave over both: the glass hums and shimmers', () => {
  const { voice, twin, over } = play();
  assert.equal(twin.length, voice.length);
  voice.forEach((n, i) => {
    const t = twin.find((m) => stepOf(m) === stepOf(n));
    assert.equal(first(t), first(n), `note ${i}: the same pitch, three cents sharp`);
    assert.ok(near(peakOf(t) / peakOf(n), 0.8, 1e-9), 'a little softer');
  });
  assert.equal(over.length, 7, 'an octave partial on each note');
  assert.ok(over.every((n) => voice.some((m) => stepOf(m) === stepOf(n) && near(first(n), first(m) * 2, 1e-9))));
  assert.ok(!twin.some((n) => n.type !== 'sine'), 'and nothing but sines');
});

test('a choir bows in on every second bar: the chord root, third, fifth and octave, each two detuned sawtooth voices through a vowel, over a low root', () => {
  const { choir, bass } = play();
  assert.equal(choir.length, 16, 'eight voices, twice');
  assert.deepEqual([...new Set(choir.map(stepOf))], [0, 12]);
  assert.deepEqual([...new Set(choir.map((n) => Math.round(first(n) * 100) / 100))], [246.94, 293.66, 369.99, 493.88], 'B3, D4, F sharp 4, B4');
  assert.ok(choir.some((n) => n.detune.value < 0) && choir.some((n) => n.detune.value > 0), 'detuned both ways');
  const vowel = next(choir[0]);
  assert.deepEqual([vowel.frequency.calls[0][1], vowel.frequency.calls[1][1], vowel.Q.value], [900, 1500, 3], 'a lowpass that rings and opens: ooh to ah');
  const env = envOf(choir[0]);
  assert.ok(near(env[1][2] - env[0][2], 1, 1e-9) && near(env[2][2] - env[1][2], 1.2, 1e-9), 'bowed in over a second, held for another');
  assert.ok(choir.every((n) => n.stopAt - startOf(n) > 3.5), 'it lasts about the two bars');
  assert.deepEqual(bass.map((n) => Math.round(first(n) * 100) / 100), [123.47, 123.47], 'B2 under each');
});

test('tubular bells ring a high root on the second beat of the first bar of a pair and a low fifth on the last eighth of the second, a free bar\'s partner at 2.76', () => {
  const { bells, osc } = play();
  assert.deepEqual(bells.map(stepOf), [3, 11, 15, 23]);
  assert.deepEqual(bells.map((n) => Math.round(first(n) * 100) / 100), [493.88, 369.99, 493.88, 369.99], 'B4 high, F sharp 4 low');
  assert.ok(bells.every((n) => osc.some((m) => near(first(m) / first(n), 2.76, 1e-9) && near(startOf(m), startOf(n), 1e-9))), 'the inharmonic partner of a struck tube');
  assert.ok(bells.every((n) => n.stopAt - startOf(n) > 2.4), 'ringing long');
  assert.ok(bells.every((n) => MELODIC.includes(pitchClass(first(n)))));
});

test('a soft frame drum taps the second bar of each pair, on its first and second beat', () => {
  const { drum } = play();
  assert.deepEqual(drum.map(stepOf), [6, 9, 18, 21]);
  assert.ok(drum.every((n) => near(n.frequency.calls[1][1], 84)), 'a thump that sags');
});

test('the whole progression stays in the scale and shifts the chord every two passes: B, B, G sharp, E, each pass for a choir, bells and the tune', () => {
  const { voice, choir, bass, bells } = play(8); // eight passes: the four chords, two passes each
  assert.equal(voice.length, 56);
  assert.equal(choir.length, 128);
  assert.equal(bells.length, 32);
  assert.ok([...voice, ...choir, ...bells].every((n) => MELODIC.includes(pitchClass(first(n)))), 'never off the scale');
  const roots = bass.map((n) => Math.round(first(n) * 100) / 100);
  assert.deepEqual(roots, [...Array(8).fill(123.47), ...Array(4).fill(207.65), ...Array(4).fill(164.81)], 'B2 for four passes, then G sharp 3, then E3');
});

test('the drone is a quiet sub under the glass, and the loop is wet with the tape echo of a nave', () => {
  const { nodes } = play();
  const m = STYLES.glass.music;
  assert.ok(m.drone.gain < m.lead.gain / 4, 'the drone sits far under the lead');
  assert.deepEqual([m.drone.wave, m.lead.wave], ['sine', 'sine']);
  assert.ok(kitFor(LOOK.music).wet > 0.6, 'wetter than any other loop');
  const echo = nodes.ctx.nodes.filter((n) => n.kind === 'Delay');
  assert.equal(echo.length, 1);
  assert.ok(near(echo[0].delayTime.value, (60 / 63) * 0.75, 1e-9), 'three quarters of a beat');
  assert.ok(echo[0].delayTime.value < 1, 'inside the delay line');
});
