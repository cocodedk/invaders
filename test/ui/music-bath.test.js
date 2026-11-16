import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { ANSWER, BASS, KALIMBA, KICK } from '../../src/ui/music-bath.js';
import { fakeAudio } from './audio-kit.js';
import w19 from '../../src/ui/looks/w19.js';

// Rubber Regatta's music entry, read from its look (looks/w19.js; sounds-bath.test.js checks its mood, root and scale).
const LOOK = { music: w19.music };
const BPM = LOOK.music.bpm;
const STEP = 60 / BPM / STYLES.bath.music.div; // a sixteenth note
const F_SUNNY = [5, 7, 9, 10, 0, 2]; // F, G, A, B flat, C, D: the notes of the scale as pitch classes
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const hz2 = (hz) => Math.round(hz * 100) / 100;
const next = (n) => [...n.out][0];
const cutOf = (n) => (next(n).kind === 'BiquadFilter' ? next(n).frequency.calls[0][1] : null); // the lowpass an oscillator sounds through
const envOf = (n) => (next(n).kind === 'BiquadFilter' ? [...next(n).out][0] : next(n)).gain.calls;
const sorted = (list) => list.toSorted((p, q) => startOf(p) - startOf(q));
const lenOf = (n) => n.stopAt - startOf(n);

// `passes` passes of the 64-step sequence (four bars of sixteen sixteenths), sorted into the loop's voices.
function play(passes = 1) {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOK);
  fillLoop(c, 0.1 + 64 * passes * STEP - 0.01);
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const played = osc.filter((n) => n.frequency.calls.length);
  const carriers = played.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency))); // what an FM modulator drives
  const ratioOf = (n) => { // a carrier's modulator, over the carrier
    const depth = nodes.ctx.nodes.find((g) => g.out.has(n.frequency));
    return hz2(first(osc.find((m) => m.out.has(depth))) / first(n));
  };
  const plain = played.filter((n) => n.type === 'sine' && !carriers.includes(n) && !osc.some((m) => m.out.has(n.frequency)) && cutOf(n) === null);
  return {
    nodes, c, played, ratioOf,
    lead: sorted(carriers.filter((n) => cutOf(n) === STYLES.bath.music.lead.cut)),
    kalimba: sorted(carriers.filter((n) => cutOf(n) === KALIMBA.cut)),
    kick: sorted(plain.filter((n) => first(n) === KICK.f0 && n.frequency.calls[1][1] === KICK.f1)),
    bass: sorted(played.filter((n) => n.type === 'triangle' && cutOf(n) === 1500)),
    wood: sorted(plain.filter((n) => first(n) > 600 && lenOf(n) < 0.15)),
    noise: nodes.ctx.nodes.filter((n) => n.kind === 'BufferSource'),
  };
}
// Steps of every bar of the pass: each of `steps` (0..15) in bars one to four.
const bars = (steps) => [0, 1, 2, 3].flatMap((bar) => steps.map((s) => bar * 16 + s));

test("Rubber Regatta's loop is a sunny bounce: four bars of sixteenth-note steps at the look's tempo, in F on a six-note major with no leading tone", () => {
  const { c } = play();
  assert.deepEqual([c.kit.style, c.kit.bpm, c.kit.root, c.m.div], ['bath', BPM, NOTES.F, 4], 'a step is a sixteenth: bars() below counts sixteen to a bar');
  assert.deepEqual(SCALES.sunny, [0, 2, 4, 5, 7, 9], 'the major without its seventh: nothing pulls');
  assert.deepEqual(c.kit.scale, SCALES.sunny);
  assert.equal(c.m.seq.length, 64);
  assert.equal(c.m.drum.length, 64);
  const cycle = c.m.seq.length * 8 * STEP;
  assert.ok(cycle > 60 && cycle < 75, `the four chords go round in ${cycle} s`);
});

test('a marimba bounces up the chord and back in bars one and three, with rests, and settles home', () => {
  const { lead } = play();
  assert.deepEqual(lead.map(stepOf), [0, 3, 6, 8, 10, 12, 16, 32, 35, 38, 40, 42, 44, 48, 60]);
  assert.deepEqual(lead.map((n) => hz2(first(n))), [
    349.23, 440, 523.25, 587.33, 523.25, 440, 523.25, // F A C D C A, landing on C
    392, 466.16, 587.33, 698.46, 587.33, 466.16, 440, 349.23, // G B flat D F D B flat, A, and home to F
  ]);
  assert.ok(lead.every((n) => F_SUNNY.includes(pitchClass(first(n)))), 'all on the scale');
  const gaps = lead.slice(1).map((n, i) => stepOf(n) - stepOf(lead[i]));
  assert.ok(Math.min(...gaps) >= 2, 'never two notes in a row');
  assert.ok(STYLES.bath.music.seq.filter((d) => d === null).length > 48, 'far more rests than notes');
});

test("each marimba note is struck and dies fast: an FM tone on the bar's tuned overtone (4, two octaves up), no swell, no hold, no twin, no sawtooth", () => {
  const { lead, ratioOf } = play();
  const L = STYLES.bath.music.lead;
  assert.deepEqual([L.wave, L.fm.ratio], ['sine', 4]);
  assert.ok(L.bow === undefined && L.hold === undefined && L.attack === undefined && L.glide === undefined && L.cut1 === undefined);
  for (const n of lead) {
    const env = envOf(n);
    assert.deepEqual(env.map((x) => x[0]), ['set', 'exp', 'exp'], 'strike and fall');
    assert.ok(env[1][2] - env[0][2] < 0.01, 'it strikes at once');
    assert.ok(env[2][2] - env[1][2] < 0.8, 'and is gone within a beat and a half');
    assert.equal(ratioOf(n), 4);
  }
});

test("a lazy two-beat bounce, not world 17's four on the floor: a kick on one and three only, a woodblock on every off-beat, a clap on four, nothing on beat two", () => {
  const { kick, wood } = play();
  const drum = STYLES.bath.music.drum;
  assert.deepEqual(kick.map(stepOf), bars([0, 8]), 'a kick on beats one and three of every bar');
  assert.ok(kick.length < 16, 'not a kick on every beat');
  assert.notEqual(drum, STYLES.breath.music.drum);
  for (const step of bars([4, 12])) assert.ok(!/[KCB]/.test(drum[step]), `no kick on beat ${(step % 16) / 4 + 1} (step ${step})`);
  for (const step of bars([4])) assert.ok(!/[BWS]/.test(drum[step]), 'beat two is left open: the bounce is lazy');
  for (const step of bars([12])) assert.equal(drum[step], 'S', 'a light clap on four');
  assert.deepEqual(wood.map(stepOf), bars([2, 6, 10, 14]), 'a woodblock on every off-beat');
  assert.deepEqual(wood.slice(0, 4).map((n) => hz2(first(n))), [1046.5, 698.46, 1046.5, 698.46], 'high (C) after one and three, low (F) after two and four');
  assert.ok(wood.every((n) => lenOf(n) < 0.15 && envOf(n)[1][2] - envOf(n)[0][2] < 0.01), 'a tok, struck and gone');
  const beat = [...drum].filter((ch) => /[BWS]/.test(ch)).length;
  assert.equal(beat, 28, 'seven hits a bar');
  assert.ok(beat < drum.length / 2, 'nowhere near a pulse on every eighth');
});

test('the bass is plucked with the kick: the root on one, the fifth on three, low; the chords move it to D and A, then B flat and F', () => {
  const { bass } = play(8);
  assert.equal(bass.length, 8 * 8, 'two a bar');
  assert.deepEqual(bass.slice(0, 8).map(stepOf), bars([0, 8]));
  const pass = (p) => bass.slice(p * 8, p * 8 + 2).map((n) => hz2(first(n)));
  assert.deepEqual(pass(0), [87.31, 65.41], 'F2, then C2 under it');
  assert.deepEqual(pass(4), [73.42, 110], 'D2, A2');
  assert.deepEqual(pass(6), [116.54, 87.31], 'B flat 2, F2');
  assert.deepEqual(BASS[0], [0, -2]);
  assert.ok(bass.every((n) => F_SUNNY.includes(pitchClass(first(n))) && lenOf(n) < 0.35), 'on the scale, and a pluck, not a drone');
});

test('a kalimba answers the marimba in the gaps of bars two and four: a tine an octave over it, on the scale, while the marimba rests', () => {
  const { kalimba, lead, ratioOf } = play();
  assert.deepEqual(kalimba.map(stepOf), Object.keys(ANSWER).map(Number));
  assert.deepEqual(kalimba.map((n) => hz2(first(n))), [1174.66, 1046.5, 880, 932.33, 880, 783.99], 'D C A, then B flat A G into the home F');
  assert.ok(kalimba.every((n) => F_SUNNY.includes(pitchClass(first(n))) && ratioOf(n) === KALIMBA.ratio));
  for (const k of kalimba) assert.ok(!lead.some((n) => Math.abs(stepOf(n) - stepOf(k)) < 2), `the marimba rests at step ${stepOf(k)}`);
  assert.ok(kalimba.every((n) => Math.floor(stepOf(n) / 16) % 2 === 1), 'bars two and four only');
});

test('calm in timbre: no sawtooth and nothing detuned, no noise swelling in, every noise short; the drone is a very quiet triangle', () => {
  const { played, noise, nodes } = play();
  assert.equal(played.filter((n) => n.type === 'sawtooth').length, 0, 'no saws');
  assert.ok(played.every((n) => n.detune.value === 0), 'no detuned twins');
  assert.ok(noise.length > 0);
  for (const s of noise) {
    const env = [...next(s).out][0].gain.calls; // each source's filter, then its envelope
    assert.ok(env[1][2] - env[0][2] <= 0.004, 'no swell');
    assert.ok(env[2][2] - env[0][2] <= 0.15, 'gone within a tenth and a half of a second');
  }
  const m = STYLES.bath.music;
  assert.equal(m.drone.wave, 'triangle');
  assert.ok(m.drone.gain < m.lead.gain / 10);
  assert.ok(m.vol > 0.8 && m.vol < 1.1, `${m.vol}: trimmed so the loop measures -26.4 dB offline, like the others`);
  assert.equal(nodes.ctx.nodes.filter((n) => n.kind === 'Delay').length, 1, 'wet enough for the echo');
});

test('the beat plays dry, past the echo; the marimba and the kalimba ring through it', () => {
  const { c, kick, bass, wood, lead, kalimba, noise } = play();
  const route = (n) => { // following its first connection, a voice meets the echo's input or goes past it to the bus
    for (let x = n, i = 0; x && i < 12; x = [...x.out][0], i++) {
      if (x === c.a.out) return 'echo';
      if (x === c.bus) return 'dry';
    }
    return null;
  };
  for (const [name, list] of [['kick', kick], ['bass', bass], ['wood', wood], ['noise', noise]]) {
    assert.ok(list.length > 0, name);
    for (const n of list) assert.equal(route(n), 'dry', `${name} plays dry`);
  }
  for (const n of [...lead, ...kalimba]) assert.equal(route(n), 'echo');
});

test("the drum letters are Rubber Regatta's alone (B W S L), and no other style plays them", () => {
  assert.match(STYLES.bath.music.drum, /^[BWSL.]+$/);
  for (const [name, s] of Object.entries(STYLES)) {
    if (name !== 'bath') assert.ok(!/[BWSL]/.test(s.music.drum), `${name} does not play Rubber Regatta's letters`);
  }
  assert.equal(kitFor(LOOK.music).style, 'bath');
});
