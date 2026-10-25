import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { STYLES, SCALES, kitFor } from '../../src/ui/sound-data.js';
import { fakeAudio } from './audio-kit.js';

// Ash to Air's music entry (looks/w17.js repeats it; sounds-breath.test.js pins that).
const LOOK = { music: { mood: 'breath', root: 'D#', scale: 'harmonicmajor', bpm: 140 } };
const STEP = 60 / 140 / 4; // a sixteenth note at 140 bpm
const HARMONIC_MAJOR = [3, 5, 7, 8, 10, 11, 2]; // D sharp F G G sharp A sharp B D, as pitch classes
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const near = (x, y, tol = 0.05) => Math.abs(x - y) < tol;
const next = (n) => [...n.out][0];
const cutOf = (n) => (next(n).kind === 'BiquadFilter' ? next(n).frequency.calls[0][1] : null); // the lowpass an oscillator sounds through
const envOf = (n) => (next(n).kind === 'BiquadFilter' ? [...next(n).out][0] : next(n)).gain.calls;
const peakOf = (n) => envOf(n)[1][1];
const sagsTo = (n, hz) => near(n.frequency.calls[1][1], hz);
const hz2 = (hz) => Math.round(hz * 100) / 100;

// `passes` passes of the 64-step sequence (four bars of sixteen sixteenths), sorted into the loop's voices.
function play(passes = 1) {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOK);
  fillLoop(c, 0.1 + 64 * passes * STEP - 0.01);
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const played = osc.filter((n) => n.frequency.calls.length);
  const saws = played.filter((n) => n.type === 'sawtooth');
  const lead = saws.filter((n) => cutOf(n) === 3600);
  const bandpass = (f0, f1) => nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'bandpass' && n.frequency.calls[0]?.[1] === f0 && n.frequency.calls[1]?.[1] === f1);
  return {
    nodes, c, osc, played,
    voice: lead.filter((n) => !n.detune.value && near(peakOf(n), 0.075, 1e-9)),
    twin: lead.filter((n) => n.detune.value === 6),
    over: lead.filter((n) => !n.detune.value && near(peakOf(n), 0.075 * 0.12, 1e-9)),
    lub: played.filter((n) => n.type === 'sine' && near(first(n), 140) && sagsTo(n, 46)),
    dub: played.filter((n) => n.type === 'sine' && near(first(n), 180) && sagsTo(n, 64)),
    bassSaw: saws.filter((n) => cutOf(n) === 1300),
    bassSine: played.filter((n) => n.type === 'sine' && first(n) < 300 && n.frequency.calls[1][1] === first(n)),
    exhale: bandpass(3400, 700),
    inhale: bandpass(500, 3600),
    gasp: bandpass(900, 3800),
  };
}
const stepOfFilter = (f) => Math.round((f.frequency.calls[0][2] - 0.1) / STEP);

test("Ash to Air's loop is a driving 4/4: four bars of sixteen sixteenth-note steps at 140 beats a minute, in D sharp harmonic major", () => {
  const { c } = play();
  assert.deepEqual([c.kit.style, c.kit.bpm, c.kit.root, c.m.div], ['breath', 140, 3, 4]);
  assert.deepEqual(c.kit.scale, SCALES.harmonicmajor);
  assert.deepEqual(SCALES.harmonicmajor, [0, 2, 4, 5, 7, 8, 11], 'the major with a flat sixth');
  assert.equal(c.m.seq.length, 64);
  assert.equal(c.m.drum.length, 64);
  assert.equal(c.m.seq.length % (4 * c.m.div), 0, 'whole bars of four beats');
  const cycle = c.m.seq.length * 8 * STEP;
  assert.ok(cycle > 50 && cycle < 60, `the four chords go round in ${cycle} s`);
});

test('a supersaw lead soars: it climbs from the fifth over the root, past the tonic, to the high fifth, sighs on the flat sixth and comes home by the leading tone', () => {
  const { voice } = play();
  const line = voice.toSorted((p, q) => startOf(p) - startOf(q));
  assert.deepEqual(line.map(stepOf), [0, 3, 6, 9, 12, 16, 20, 24, 28, 32, 35, 38, 41, 44, 48, 51, 54, 57]);
  assert.deepEqual(line.map((n) => hz2(first(n))), [
    466.16, 622.25, 698.46, 783.99, 698.46, // B flat, E flat, F, G, F: the first bar rises
    622.25, 493.88, 466.16, 622.25, // down to B (the flat sixth) and a semitone to B flat, then up a fourth
    622.25, 783.99, 932.33, 830.61, 783.99, // the third bar climbs to the high B flat and falls
    698.46, 622.25, 587.33, 622.25, // F, E flat, D (the leading tone), home
  ]);
  assert.ok(line.every((n) => n.type === 'sawtooth' && HARMONIC_MAJOR.includes(pitchClass(first(n)))), 'all on the scale');
  assert.equal(pitchClass(first(line[0])), 10, 'it starts on the fifth');
  assert.equal(pitchClass(first(line.at(-1))), 3, 'and ends on the tonic');
  assert.ok(Math.max(...line.map(first)) < 1000 && Math.min(...line.map(first)) > 440, 'in the voice range of a lead, B flat 4 to B flat 5');
});

test('each lead note swells in over half a step, holds two steps and dies away over four; a twin six cents sharp and a thin octave sound with it', () => {
  const { voice, twin, over } = play();
  for (const n of voice) {
    const env = envOf(n);
    assert.deepEqual(env.map((c) => c[0]), ['set', 'exp', 'set', 'exp'], 'rise, hold, fall');
    assert.ok(near(env[1][2] - env[0][2], 0.5 * STEP, 1e-9), 'a quick swell');
    assert.ok(near(env[2][2] - env[1][2], 2 * STEP, 1e-9), 'held');
    assert.ok(near(env[3][2] - env[2][2], 4 * STEP, 1e-9), 'then released');
    assert.equal(env[1][1], STYLES.breath.music.lead.gain);
    assert.ok(n.stopAt - startOf(n) < 0.8, 'a note, not a pad');
  }
  assert.equal(twin.length, voice.length);
  assert.equal(over.length, voice.length);
  for (const n of voice) {
    const t = twin.find((m) => stepOf(m) === stepOf(n));
    assert.equal(first(t), first(n), 'the same pitch, six cents sharp');
    assert.ok(near(peakOf(t) / peakOf(n), 0.8, 1e-9));
    const o = over.find((m) => stepOf(m) === stepOf(n));
    assert.ok(near(first(o), first(n) * 2, 1e-9), 'an octave up');
  }
  assert.equal(STYLES.breath.music.lead.cut1, undefined, 'the lead\'s filter stays put');
});

test('the heart races: a lub that sags on every beat and a lighter, higher dub an eighth after it, sixteen of each a pass', () => {
  const { lub, dub } = play();
  assert.deepEqual(lub.map(stepOf), Array.from({ length: 16 }, (_, i) => i * 4));
  assert.deepEqual(dub.map(stepOf), Array.from({ length: 16 }, (_, i) => i * 4 + 2));
  assert.ok(first(dub[0]) > first(lub[0]), 'the dub is higher');
  assert.ok(peakOf(dub[0]) < peakOf(lub[0]), 'and lighter');
  assert.ok(lub.every((n) => near(n.stopAt - startOf(n), 0.27, 0.01)), 'a thump, not a tone');
  for (const bar of [0, 1, 2, 3]) assert.equal(lub.filter((n) => stepOf(n) >= bar * 16 && stepOf(n) < bar * 16 + 16).length, 4, `bar ${bar + 1}`);
});

test('a bass pulses with it: the chord\'s root under every lub and its octave under every dub, a plucked sawtooth over a sine, the filter closing on each', () => {
  const { bassSaw, bassSine, nodes } = play();
  const sorted = (list) => list.toSorted((p, q) => startOf(p) - startOf(q));
  assert.equal(bassSaw.length, 32, 'every eighth of the pass');
  assert.equal(bassSine.length, 32);
  assert.deepEqual(sorted(bassSaw).map(stepOf), Array.from({ length: 32 }, (_, i) => i * 2));
  for (const list of [bassSaw, bassSine]) {
    assert.deepEqual([...new Set(sorted(list).filter((_, i) => i % 2 === 0).map((n) => hz2(first(n))))], [77.78], 'D sharp 2 on the beats');
    assert.deepEqual([...new Set(sorted(list).filter((_, i) => i % 2 === 1).map((n) => hz2(first(n))))], [155.56], 'D sharp 3 between them');
    assert.ok(list.every((n) => n.stopAt - startOf(n) < 0.3), 'short and detached');
  }
  const closing = nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.Q.value === 2 && n.frequency.calls[0][1] === 1300);
  assert.equal(closing.length, 32);
  assert.ok(closing.every((f) => f.frequency.calls[1][1] === 260), 'a pluck: the filter closes to 260 Hz');
  assert.ok(Math.max(...bassSine.map(peakOf)) < 0.1, 'under the kick');
});

test('breath is the percussion: an exhale falling away after each downbeat, an inhale swelling through the last beat and a half of three bars, two gasps to close the fourth', () => {
  const { exhale, inhale, gasp, nodes, c } = play();
  assert.deepEqual(exhale.map(stepOf), [1, 17, 33, 49], 'a sixteenth after the downbeat of each bar');
  assert.deepEqual(inhale.map(stepOf), [9, 25, 41], 'after the third beat\'s lub, in the first three bars');
  assert.deepEqual(gasp.map(stepOf), [61, 63]);
  assert.ok(exhale.every((f) => near(f.frequency.calls[1][2] - f.frequency.calls[0][2], 60 / 140 * 1.2 + 0.03, 1e-9)), 'it lasts a beat and a fifth');
  for (const f of inhale) {
    const end = 0.1 + (stepOfFilter(f) + 7) * STEP;
    assert.ok(near(f.frequency.calls[1][2], end, 1e-9), 'the swell ends on the next downbeat');
  }
  assert.equal(nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'highpass').length, 3, 'a breath of air over each inhale');
  const bar4 = c.m.drum.slice(48);
  assert.ok(!bar4.includes('I') && bar4.includes('i'), 'the last bar swaps the long inhale for gasps');
  assert.equal(c.m.drum.slice(0, 48).includes('i'), false);
});

test('the levels: the kick is the loudest tone, the lead sits over the bass, and the breath is noise, which the filters thin to a hush', () => {
  const { lub, voice, bassSine, bassSaw, played, nodes } = play();
  const tonePeaks = played.filter((n) => n.frequency.calls.length).map(peakOf);
  assert.equal(Math.max(...tonePeaks), peakOf(lub[0]), 'the lub is the loudest tone');
  assert.ok(peakOf(voice[0]) > Math.max(...[...bassSine, ...bassSaw].map(peakOf)) * 0.7, 'the lead is not buried by the bass');
  const noise = nodes.ctx.nodes.filter((n) => n.kind === 'BufferSource').length;
  assert.ok(noise >= 16 + 4 * 2 + 3 * 2 + 2, `${noise} breaths of noise, a thump under every lub among them`);
  const gains = nodes.ctx.nodes.filter((n) => n.kind === 'Gain' && n.gain.calls.length >= 3).map((n) => n.gain.calls[1][1]);
  assert.ok(Math.max(...gains) <= 0.45, `${Math.max(...gains)}`);
});

test('the whole progression stays in the scale and shifts the chord every two passes: D sharp for four, then the flat sixth, then the fourth', () => {
  const { voice, bassSine, lub } = play(8);
  assert.equal(voice.length, 144);
  assert.ok(voice.every((n) => HARMONIC_MAJOR.includes(pitchClass(first(n)))), 'never off the scale');
  const roots = bassSine.toSorted((p, q) => startOf(p) - startOf(q)).filter((_, i) => i % 2 === 0).map((n) => hz2(first(n)));
  assert.equal(roots.length, 128);
  assert.deepEqual(roots, [...Array(64).fill(77.78), ...Array(32).fill(123.47), ...Array(32).fill(103.83)], 'D sharp 2 for four passes, then B 2, then G sharp 2');
  assert.equal(lub.length, 128, 'sixteen lubs a pass: the heart never skips');
  const top = Math.max(...voice.map(first));
  assert.ok(near(top, 1567.98, 0.01), `the lift of the third chord reaches G6, ${top} Hz`);
});

test('the drone is a quiet sawtooth under it all, and the loop is wet with the dotted-eighth echo of a trance lead', () => {
  const { nodes } = play();
  const m = STYLES.breath.music;
  assert.ok(m.drone.gain < m.lead.gain / 4, 'the drone sits far under the lead');
  assert.deepEqual([m.drone.wave, m.lead.wave], ['sawtooth', 'sawtooth']);
  assert.ok(kitFor(LOOK.music).wet > 0.3, 'wet enough for the echo');
  const echo = nodes.ctx.nodes.filter((n) => n.kind === 'Delay');
  assert.equal(echo.length, 1);
  assert.ok(near(echo[0].delayTime.value, (60 / 140) * 0.75, 1e-9), 'three quarters of a beat');
  assert.ok(m.vol > 0.7 && m.vol < 0.85, `${m.vol}: trimmed so the loop measures -26.4 dB offline, like the others`);
});
