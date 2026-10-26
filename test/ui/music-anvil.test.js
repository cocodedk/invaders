import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { fakeAudio } from './audio-kit.js';

// Anvil Sky's music entry (looks/w18.js repeats it; sounds-anvil.test.js pins that).
const LOOK = { music: { mood: 'anvil', root: 'G#', scale: 'bright', bpm: 108 } };
const STEP = 60 / 108 / 4; // a sixteenth note at 108 bpm
const A_FLAT_PENTATONIC = [8, 10, 0, 3, 5]; // G sharp, A sharp, C, D sharp, F: the notes of the scale as pitch classes
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const hz2 = (hz) => Math.round(hz * 100) / 100;
const next = (n) => [...n.out][0];
const cutOf = (n) => (next(n).kind === 'BiquadFilter' ? next(n).frequency.calls[0][1] : null); // the lowpass an oscillator sounds through
const envOf = (n) => (next(n).kind === 'BiquadFilter' ? [...next(n).out][0] : next(n)).gain.calls;
const sorted = (list) => list.toSorted((p, q) => startOf(p) - startOf(q));

// `passes` passes of the 64-step sequence (four bars of sixteen sixteenths), sorted into the loop's voices.
function play(passes = 1) {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOK);
  fillLoop(c, 0.1 + 64 * passes * STEP - 0.01);
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const played = osc.filter((n) => n.frequency.calls.length);
  const carriers = played.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency))); // what an FM modulator drives
  const ratioOf = (n) => { // a carrier's modulator, over the carrier: the oscillator that feeds the gain that feeds its frequency
    const depth = nodes.ctx.nodes.find((g) => g.out.has(n.frequency));
    return hz2(first(osc.find((m) => m.out.has(depth))) / first(n));
  };
  return {
    nodes, c, osc, played, ratioOf,
    lead: sorted(carriers.filter((n) => cutOf(n) === 4200)),
    anvil: sorted(carriers.filter((n) => cutOf(n) === 7000)),
    kick: sorted(played.filter((n) => n.type === 'sine' && first(n) === 135 && n.frequency.calls[1][1] === 42)),
    bass: sorted(played.filter((n) => n.type === 'triangle' && cutOf(n) === 1400)),
    tom: sorted(played.filter((n) => n.type === 'sine' && Math.abs(first(n) / n.frequency.calls[1][1] - 1.5) < 1e-9)),
    pad: sorted(played.filter((n) => n.type === 'triangle' && cutOf(n) === 800)),
    noise: nodes.ctx.nodes.filter((n) => n.kind === 'BufferSource'),
  };
}

test("Anvil Sky's loop is a stormy half-time rock beat: four bars of sixteenth-note steps at 108 beats a minute, in A flat major pentatonic", () => {
  const { c } = play();
  assert.deepEqual([c.kit.style, c.kit.bpm, c.kit.root, c.m.div], ['anvil', 108, NOTES['G#'], 4]);
  assert.deepEqual(c.kit.scale, SCALES.bright);
  assert.deepEqual(SCALES.bright, [0, 2, 4, 7, 9], 'the major pentatonic');
  assert.equal(c.m.seq.length, 64);
  assert.equal(c.m.drum.length, 64);
  assert.equal(c.m.seq.length % (4 * c.m.div), 0, 'whole bars of four beats');
  const cycle = c.m.seq.length * 8 * STEP;
  assert.ok(cycle > 60 && cycle < 75, `the four chords go round in ${cycle} s`);
});

test('struck iron sings the tune: it climbs from the root to the octave, leaps to the fifth above, answers and settles home, with rests', () => {
  const { lead } = play();
  assert.deepEqual(lead.map(stepOf), [0, 3, 6, 10, 12, 16, 22, 24, 28, 32, 35, 38, 40, 44, 48, 52, 56, 58, 60]);
  assert.deepEqual(lead.map((n) => hz2(first(n))), [
    207.65, 261.63, 311.13, 349.23, 311.13, // G sharp 3, C, D sharp, F, D sharp: the first bar climbs and turns
    415.3, 349.23, 311.13, 261.63, // up to G sharp 4 (the octave), then down by steps
    261.63, 311.13, 349.23, 415.3, 523.25, // the answer climbs again, to C 5
    466.16, 415.3, 311.13, 261.63, 207.65, // and comes down home
  ]);
  assert.ok(lead.every((n) => A_FLAT_PENTATONIC.includes(pitchClass(first(n)))), 'all on the scale');
  assert.equal(pitchClass(first(lead[0])), 8, 'it starts on the root');
  assert.equal(pitchClass(first(lead.at(-1))), 8, 'and ends there');
  const gaps = lead.slice(1).map((n, i) => stepOf(n) - stepOf(lead[i]));
  assert.ok(Math.min(...gaps) >= 2, 'never two notes in a row: the tune breathes');
  assert.ok(lead.length <= 20, `${lead.length} notes in 64 steps`);
});

test('each note is struck and rings out: an FM tone on an iron bar\'s ratio (2.76), no swell, no hold, no detuned twin, no sawtooth', () => {
  const { lead, ratioOf } = play();
  const L = STYLES.anvil.music.lead;
  assert.deepEqual([L.wave, L.fm.ratio], ['sine', 2.76]);
  assert.ok(L.bow === undefined && L.hold === undefined && L.attack === undefined && L.glide === undefined && L.cut1 === undefined);
  for (const n of lead) {
    const env = envOf(n);
    assert.deepEqual(env.map((c) => c[0]), ['set', 'exp', 'exp'], 'strike and fall, nothing held');
    assert.ok(env[1][2] - env[0][2] < 0.01, 'it strikes at once');
    assert.ok(Math.abs(env[2][2] - env[1][2] - 6 * STEP) < 1e-9, 'and rings six steps');
    assert.equal(env[1][1], L.gain);
    assert.equal(n.type, 'sine');
    assert.equal(ratioOf(n), 2.76, 'its modulator sits at the bar\'s partner');
  }
});

test('a heavy half-time beat: a kick on every downbeat and the "and of 3", an extra one in the second and third bars, an anvil on two and four', () => {
  const { kick, anvil } = play();
  assert.deepEqual(kick.map(stepOf), [0, 10, 16, 22, 26, 32, 38, 42, 48]);
  assert.deepEqual(anvil.map(stepOf), [4, 12, 20, 28, 36, 44, 52, 60], 'the backbeat of every bar');
  assert.ok(kick.length < 16, 'not a kick on every beat');
  assert.deepEqual(anvil.map((n) => hz2(first(n))), [830.61, 1244.51, 830.61, 1244.51, 830.61, 1244.51, 830.61, 1244.51], 'the root on beat two, the fifth on four');
  assert.ok(anvil.every((n) => A_FLAT_PENTATONIC.includes(pitchClass(first(n)))));
  assert.ok(anvil.every((n) => n.stopAt - startOf(n) > 0.4 && n.stopAt - startOf(n) < 0.7), 'it rings about half a second');
  assert.ok(anvil.every((n) => envOf(n)[1][1] <= 0.1 && envOf(n)[1][2] - envOf(n)[0][2] < 0.01), 'a struck bar, not a swell');
});

test('the bass is plucked with the kick: the root on the downbeat, the fifth on the "and of 3"; thunder toms fill the end of bars two and four', () => {
  const { bass, tom } = play();
  assert.deepEqual(bass.map(stepOf), [0, 10, 16, 22, 26, 32, 38, 42, 48]);
  assert.deepEqual(bass.map((n) => hz2(first(n))), [103.83, 155.56, 103.83, 103.83, 155.56, 103.83, 103.83, 155.56, 103.83], 'G sharp 2, D sharp 3');
  assert.ok(bass.every((n) => n.stopAt - startOf(n) < 0.35), 'a pluck, not a drone');
  assert.deepEqual(tom.map(stepOf), [31, 58, 59, 62, 63]);
  assert.deepEqual(tom.map((n) => Math.round(first(n))), [174, 252, 226, 202, 174], 'a fill falls through the bar');
  assert.ok(tom.every((n) => n.stopAt - startOf(n) < 0.45), 'short and round');
});

test('a pad swells in just after the downbeat of the first and third bars: root, fifth and octave, two soft detuned triangles each', () => {
  const { pad } = play();
  assert.equal(pad.length, 12);
  assert.deepEqual([...new Set(pad.map(stepOf))], [1, 33]);
  assert.deepEqual([...new Set(pad.map((n) => hz2(first(n))))].sort((p, q) => p - q), [207.65, 311.13, 415.3]);
  assert.ok(pad.some((n) => n.detune.value < 0) && pad.some((n) => n.detune.value > 0), 'detuned both ways');
  assert.ok(pad.every((n) => envOf(n)[1][1] <= 0.03), 'quiet');
});

test('the beat\'s noise is short and quiet, never percussion on its own: a click on the kick, a tick on the anvil, a puff on each tom', () => {
  const { noise, kick, anvil, tom } = play();
  assert.equal(noise.length, kick.length + anvil.length + tom.length);
  for (const env of noise.map((s) => [...[...s.out][0].out][0].gain.calls)) { // each source's filter, then its envelope
    assert.ok(env[1][2] - env[0][2] <= 0.004, 'no swell');
    assert.ok(env[2][2] - env[0][2] <= 0.03, 'gone within thirty milliseconds');
    assert.ok(env[1][1] <= 0.05);
  }
});

test('the progression stays on the scale: home twice, up an octave, then to the fifth; the beat keeps its register through the octave', () => {
  const { lead, bass, kick } = play(8);
  assert.equal(lead.length, 19 * 8);
  assert.ok(lead.every((n) => A_FLAT_PENTATONIC.includes(pitchClass(first(n)))), 'never off the scale');
  const perPass = lead.length / 8;
  const range = (pass) => lead.slice(pass * perPass, (pass + 1) * perPass).map(first);
  assert.equal(hz2(Math.min(...range(0))), 207.65);
  assert.equal(hz2(Math.min(...range(4))), 415.3, 'passes five and six are an octave up');
  assert.equal(hz2(Math.max(...range(4))), 1046.5);
  assert.equal(hz2(Math.min(...range(6))), 311.13, 'passes seven and eight start on the fifth');
  const roots = (pass) => new Set(bass.slice(pass * 9, (pass + 1) * 9).map((n) => hz2(first(n))));
  assert.deepEqual([...roots(0)], [103.83, 155.56]);
  assert.deepEqual([...roots(4)], [103.83, 155.56], 'the bass stays low while the tune lifts');
  assert.deepEqual([...roots(6)], [155.56, 233.08], 'and follows the fifth: D sharp, A sharp');
  assert.equal(kick.length, 72, 'nine kicks a pass');
});

test('the drone is a very quiet triangle under it all, and the loop is wet enough for the echo, which only the lead and the pad go through', () => {
  const { nodes, c, kick, bass, anvil, tom, lead, pad } = play();
  const m = STYLES.anvil.music;
  assert.ok(m.drone.gain < m.lead.gain / 6);
  assert.equal(m.drone.wave, 'triangle');
  assert.ok(kitFor(LOOK.music).wet > 0.3, 'wet enough for the echo');
  const echo = nodes.ctx.nodes.filter((n) => n.kind === 'Delay');
  assert.equal(echo.length, 1);
  assert.ok(Math.abs(echo[0].delayTime.value - (60 / 108) * 0.75) < 1e-9, 'three quarters of a beat');
  assert.ok(m.vol > 0.7 && m.vol < 1, `${m.vol}: trimmed so the loop measures -26.4 dB offline, like the others`);
  const route = (n) => { // following its first connection, a voice meets the echo's input or goes past it to the bus
    for (let x = n, i = 0; x && i < 12; x = [...x.out][0], i++) {
      if (x === c.a.out) return 'echo';
      if (x === c.bus) return 'dry';
    }
    return null;
  };
  for (const [name, list] of [['kick', kick], ['bass', bass], ['anvil', anvil], ['tom', tom]]) {
    assert.ok(list.length > 0, name);
    for (const n of list) assert.equal(route(n), 'dry', `${name} plays dry`);
  }
  for (const n of [...lead, ...pad]) assert.equal(route(n), 'echo');
});

test("the drum letters are Anvil Sky's alone (H A T P), none of the loud-noise percussion the user dislikes, and no other style plays them", () => {
  assert.match(STYLES.anvil.music.drum, /^[HPAT.]+$/);
  for (const [name, s] of Object.entries(STYLES)) {
    if (name !== 'anvil') assert.ok(!/[HATP]/.test(s.music.drum), `${name} does not play Anvil Sky's letters`);
  }
  const drum = STYLES.anvil.music.drum;
  assert.equal([...drum].filter((ch) => ch !== '.').length, 24, 'a hit on 24 of 64 steps: nowhere near every eighth note');
  for (let bar = 0; bar < 4; bar++) assert.equal(drum[bar * 16], 'H', `a heavy kick opens bar ${bar + 1}`);
  for (const step of [4, 12]) for (let bar = 0; bar < 4; bar++) assert.equal(drum[bar * 16 + step], 'A', `the anvil on the backbeat of bar ${bar + 1}`);
});
