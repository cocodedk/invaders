import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { STYLES, SCALES, kitFor } from '../../src/ui/sound-data.js';
import { fakeAudio } from './audio-kit.js';

// Ash to Air's music entry (looks/w17.js repeats it; sounds-breath.test.js pins that).
const LOOK = { music: { mood: 'breath', root: 'D#', scale: 'major', bpm: 122 } };
const STEP = 60 / 122 / 4; // a sixteenth note at 122 bpm
const E_FLAT_MAJOR = [3, 5, 7, 8, 10, 0, 2]; // E flat F G A flat B flat C D, as pitch classes
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const near = (x, y, tol = 0.05) => Math.abs(x - y) < tol;
const next = (n) => [...n.out][0];
const cutOf = (n) => (next(n).kind === 'BiquadFilter' ? next(n).frequency.calls[0][1] : null); // the lowpass an oscillator sounds through
const envOf = (n) => (next(n).kind === 'BiquadFilter' ? [...next(n).out][0] : next(n)).gain.calls;
const peakOf = (n) => envOf(n)[1][1];
const hz2 = (hz) => Math.round(hz * 100) / 100;
const sorted = (list) => list.toSorted((p, q) => startOf(p) - startOf(q));

const filters = (nodes, type, f0) => nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === type && n.frequency.calls[0]?.[1] === f0);

// `passes` passes of the 64-step sequence (four bars of sixteen sixteenths), sorted into the loop's voices.
function play(passes = 1) {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOK);
  fillLoop(c, 0.1 + 64 * passes * STEP - 0.01);
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const played = osc.filter((n) => n.frequency.calls.length);
  const modulated = played.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency))); // what an FM modulator drives
  const saws = played.filter((n) => n.type === 'sawtooth');
  return {
    nodes, c, osc, played,
    lead: sorted(modulated),
    kick: sorted(played.filter((n) => n.type === 'sine' && first(n) === 160 && n.frequency.calls[1][1] === 46)),
    bass: sorted(saws.filter((n) => cutOf(n) === 1600)),
    choir: saws.filter((n) => cutOf(n) === 900),
    choirRoot: played.filter((n) => n.type === 'triangle' && cutOf(n) === 500),
    hats: filters(nodes, 'highpass', 8000),
    open: filters(nodes, 'highpass', 7500),
    hands: filters(nodes, 'bandpass', 1400),
    noise: nodes.ctx.nodes.filter((n) => n.kind === 'BufferSource'),
  };
}
const stepOfFilter = (f) => Math.round((f.frequency.calls[0][2] - 0.1) / STEP);
const beats = (from, every, count) => Array.from({ length: count }, (_, i) => from + i * every);

test("Ash to Air's loop is a clear morning in 4/4: four bars of sixteenth-note steps at 122 beats a minute, in E flat major", () => {
  const { c } = play();
  assert.deepEqual([c.kit.style, c.kit.bpm, c.kit.root, c.m.div], ['breath', 122, 3, 4]);
  assert.deepEqual(c.kit.scale, SCALES.major);
  assert.equal(c.m.seq.length, 64);
  assert.equal(c.m.drum.length, 64);
  assert.equal(c.m.seq.length % (4 * c.m.div), 0, 'whole bars of four beats');
  const cycle = c.m.seq.length * 8 * STEP;
  assert.ok(cycle > 60 && cycle < 66, `the four chords go round in ${cycle} s`);
});

test('an electric piano sings the tune: it rises from the root to the octave, comes down, climbs again and settles home', () => {
  const { lead } = play();
  assert.deepEqual(lead.map(stepOf), [0, 4, 6, 8, 12, 14, 16, 18, 20, 24, 28, 32, 36, 38, 40, 44, 46, 48, 52, 54, 56]);
  assert.deepEqual(lead.map((n) => hz2(first(n))), [
    311.13, 392, 466.16, 622.25, 587.33, 466.16, // E flat, G, B flat, up to the octave, D, B flat: the first bar rises
    466.16, 523.25, 466.16, 392, 349.23, // B flat, C, B flat, G, F: the second comes down
    392, 466.16, 523.25, 622.25, 587.33, 622.25, // the third climbs to the octave again
    466.16, 349.23, 392, 311.13, // B flat, F, G and home
  ]);
  assert.ok(lead.every((n) => E_FLAT_MAJOR.includes(pitchClass(first(n)))), 'all on the scale');
  assert.equal(pitchClass(first(lead[0])), 3, 'it starts on the tonic');
  assert.equal(pitchClass(first(lead.at(-1))), 3, 'and ends there');
});

test('each note is struck and rings out: an FM tone on a whole ratio (a tine, not a bell), no swell, no hold, no detuned twin', () => {
  const { lead, osc } = play();
  const L = STYLES.breath.music.lead;
  assert.deepEqual([L.wave, L.fm.ratio], ['sine', 1]);
  assert.equal(L.bow, undefined);
  for (const n of lead) {
    const env = envOf(n);
    assert.deepEqual(env.map((c) => c[0]), ['set', 'exp', 'exp'], 'strike and fall, nothing held');
    assert.ok(env[1][2] - env[0][2] < 0.01, 'it strikes at once');
    assert.ok(near(env[2][2] - env[1][2], 8 * STEP, 1e-9), 'and rings eight steps');
    assert.equal(env[1][1], L.gain);
    assert.equal(cutOf(n), 3200, 'through a warm lowpass');
    assert.ok(osc.some((m) => m !== n && first(m) === first(n) && m.type !== 'sawtooth'), 'its modulator at the note itself');
  }
});

test('four on the floor: a kick on every beat, a clap on two and four, an open hat with the bass on every off-beat, a tick after each', () => {
  const { kick, hands, open, hats, bass } = play();
  assert.deepEqual(kick.map(stepOf), beats(0, 4, 16));
  assert.deepEqual([...new Set(hands.map(stepOfFilter))], beats(4, 8, 8), 'the claps');
  assert.equal(hands.length, 24, 'three hands to a clap');
  assert.deepEqual(open.map(stepOfFilter), beats(2, 4, 16), 'the open hats');
  assert.deepEqual(hats.map(stepOfFilter), beats(3, 4, 16), 'the ticks');
  assert.deepEqual(bass.map(stepOf), beats(2, 4, 16), 'the bass on the off-beats');
  assert.deepEqual([...new Set(bass.map((n) => hz2(first(n))))], [77.78], 'on E flat 2');
  assert.ok(bass.every((n) => n.stopAt - startOf(n) < 0.2), 'a pluck, not a drone');
});

test('a choir bows the chord in on every second bar: root, third, fifth and octave in two detuned voices each, over a low root', () => {
  const { choir, choirRoot } = play();
  assert.equal(choir.length, 16, 'eight voices, twice a pass');
  assert.deepEqual([...new Set(choir.map(stepOf))], [1, 33]);
  assert.deepEqual([...new Set(choir.map((n) => hz2(first(n))))].sort((p, q) => p - q), [155.56, 196, 233.08, 311.13]);
  assert.ok(choir.some((n) => n.detune.value < 0) && choir.some((n) => n.detune.value > 0), 'detuned both ways');
  assert.deepEqual(choirRoot.map((n) => hz2(first(n))), [77.78, 77.78]);
});

test('the beat\'s noise is short and dry: claps, hats and the kick\'s click strike at once and are gone within a sixth of a second', () => {
  const { noise } = play();
  assert.equal(noise.length, 16 + 16 + 16 + 8 * 4, 'a click a kick, an open hat and a tick an off-beat, four bursts a clap');
  for (const env of noise.map((s) => [...[...s.out][0].out][0].gain.calls)) { // each source's filter, then its envelope
    assert.ok(env[1][2] - env[0][2] <= 0.004, 'no swell');
    assert.ok(env[2][2] - env[0][2] <= 0.15, 'no hiss that lingers');
    assert.ok(env[1][1] <= 0.12);
  }
  assert.match(STYLES.breath.music.drum, /^[KCOhq.]+$/, 'only the beat, the ticks and the choir');
});

test('the progression stays in the scale: home for four passes, then C minor, then A flat, and back home', () => {
  const { lead, bass, kick } = play(8);
  assert.equal(lead.length, 21 * 8);
  assert.ok(lead.every((n) => E_FLAT_MAJOR.includes(pitchClass(first(n)))), 'never off the scale');
  const roots = bass.map((n) => hz2(first(n)));
  assert.deepEqual(roots, [...Array(64).fill(77.78), ...Array(32).fill(130.81), ...Array(32).fill(103.83)], 'E flat 2, then C 3, then A flat 2');
  assert.equal(kick.length, 128, 'the kick never skips');
  assert.ok(near(Math.max(...lead.map(first)), 1046.5, 0.01), 'the top of the tune is C6, over C minor');
});

test('the drone is a quiet triangle under it all, and the loop is wet with a dotted-eighth echo', () => {
  const { nodes } = play();
  const m = STYLES.breath.music;
  assert.ok(m.drone.gain < m.lead.gain / 4, 'the drone sits far under the lead');
  assert.equal(m.drone.wave, 'triangle');
  assert.ok(kitFor(LOOK.music).wet > 0.3, 'wet enough for the echo');
  const echo = nodes.ctx.nodes.filter((n) => n.kind === 'Delay');
  assert.equal(echo.length, 1);
  assert.ok(near(echo[0].delayTime.value, (60 / 122) * 0.75, 1e-9), 'three quarters of a beat');
  assert.ok(m.vol > 0.65 && m.vol < 0.85, `${m.vol}: trimmed so the loop measures -26.4 dB offline, like the others`);
});
