import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS } from '../../src/ui/sfx-boss.js';
import { UI } from '../../src/ui/sfx-ui.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

const GLASS = kitFor({ mood: 'glass', root: 'B', scale: 'melodic', bpm: 63 });
const MELODIC = [11, 1, 2, 4, 6, 8, 10]; // B C sharp D E F sharp G sharp A sharp
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const near = (x, y, tol = 1e-6) => Math.abs(x - y) < tol;
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const start = (x) => x.frequency.calls[0][1];
const when = (x) => x.frequency.calls[0][2];
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const swell = (nodes, osc) => nodes[nodes.indexOf(osc) + 1].gain.calls; // the envelope tone() makes right after its oscillator: floor, peak, floor
const near1 = (osc, f) => osc.filter((x) => x.frequency.calls.length && near(start(x), f, 0.01));
const roar = (o = { phase: 1 }) => {
  const { a, nodes } = fakeVoice(GLASS);
  const secs = BOSS.phase(a, o); // a phase 1 roar lasts 1.4 s
  return { a, nodes, secs, osc: oscillators(nodes) };
};

test("the Vesper Moth's roar tolls a great bell twice, the second softer and shorter: a strike on B2 with a bronze partner, its hum an octave under and its minor third", () => {
  const { a, nodes, osc, secs } = roar();
  const strikes = near1(osc, 123.47).filter((x) => osc.some((m) => near(start(m), 123.47 * 2.41, 0.01) && when(m) === when(x)));
  assert.equal(strikes.length, 2, 'two tolls');
  assert.ok(near(when(strikes[0]), a.t, 1e-9));
  assert.ok(near(when(strikes[1]) - a.t, 1.4 * 0.4, 1e-9), 'the second a little under half the roar later');
  const [loud, soft] = strikes.map((x) => swell(nodes, x)[1][1]);
  assert.ok(soft < loud && near(soft / loud, 0.7, 1e-9), `${loud} then ${soft}`);
  const rings = strikes.map((x) => swell(nodes, x)[2][2] - when(x));
  assert.ok(rings[1] < rings[0] && rings[0] > 1.5, `the first rings ${rings[0]} s, the second ${rings[1]} s`);
  assert.ok(near1(osc, 61.74).filter((x) => x.type === 'sine').length >= 2, 'the hum an octave under, twice');
  assert.equal(near1(osc, 123.47 * 1.19).length, 2, 'and the minor third over the strike');
  assert.equal(nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'highpass' && x.frequency.calls[0][1] === 3600).length, 2, "a clapper's tick on each toll");
  noLeak(a, nodes, secs);
});

test('under it an organ cluster swells in: adjacent notes of the scale (B C sharp D E), each two detuned sawtooth voices through a filter that opens, over a sub pedal', () => {
  const { osc, nodes } = roar();
  const organ = osc.filter((x) => x.type === 'sawtooth');
  assert.equal(organ.length, 8, 'four notes, two voices each');
  assert.deepEqual([...new Set(organ.map((x) => Math.round(start(x) * 100) / 100))], [246.94, 277.18, 293.66, 329.63], 'B3 C sharp 4 D4 E4: a cluster of seconds');
  assert.ok(organ.some((x) => x.detune.value < 0) && organ.some((x) => x.detune.value > 0), 'detuned both ways');
  const env = swell(nodes, organ[0]);
  assert.ok(env[1][2] - env[0][2] > 0.9, `swelling in over most of the roar: ${env[1][2] - env[0][2]} s`);
  const gate = nodes[nodes.indexOf(organ[0]) + 2];
  assert.equal(gate.type, 'lowpass');
  assert.deepEqual([gate.frequency.calls[0][1], gate.frequency.calls[1][1]], [500, 2400], 'the pipes open up');
  const pedal = near1(osc, 61.74).find((x) => x.type === 'sine' && swell(nodes, x)[1][2] - swell(nodes, x)[0][2] > 0.8);
  assert.ok(pedal, 'a pedal on B1 swelling in under the cluster');
  assert.ok(MELODIC.includes(pitchClass(start(pedal))));
});

test('the last roar has a bigger cluster and a longer toll, and the death scream plays it too', () => {
  const clusterOf = (play) => {
    const { a, nodes } = fakeVoice(GLASS);
    const secs = play(a);
    noLeak(a, nodes, secs);
    return oscillators(nodes).filter((x) => x.type === 'sawtooth' && x.frequency.calls[0][1] > 200 && x.frequency.calls[0][1] < 400).length;
  };
  assert.equal(clusterOf((a) => BOSS.phase(a, { phase: 1 })), 8, 'phase 1: four notes');
  assert.equal(clusterOf((a) => BOSS.phase(a, { phase: 2 })), 10, 'phase 2: five');
  assert.equal(clusterOf((a) => BOSS.bossDeath(a)), 10, 'the death scream: five');
});

test("the roar has no growl and no waveshaper, and no tone sits under the monster's roar of world 9, the lowest of all", () => {
  for (const o of [{ phase: 1 }, { phase: 2 }]) {
    const { osc, nodes } = roar(o);
    assert.equal(nodes.filter((x) => x.kind === 'WaveShaper').length, 0, 'not the crushed roar of the others');
    assert.ok(!nodes.some((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass' && x.frequency.calls[0][1] >= 380 && x.frequency.calls[0][1] <= 580), 'no growl of square-shaken noise');
    assert.ok(Math.min(...osc.filter((x) => x.frequency.calls.length).map(start)) > 55, 'the hum and pedal are 62 Hz');
  }
});

test("no other world's roar is a bell: every one still runs through the waveshaper's crush and the growl", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'glass')) {
    for (const play of [(a) => BOSS.phase(a, { phase: 1 }), (a) => BOSS.bossDeath(a)]) {
      const { a, nodes } = fakeVoice(kitFor(look.music));
      play(a);
      assert.equal(nodes.filter((x) => x.kind === 'WaveShaper').length, 1, `w${look.world}`);
      assert.ok(nodes.some((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass' && x.frequency.calls[0][1] >= 380), `w${look.world}: the growl`);
    }
  }
});

test("the glass stingers are a harmonica on the scale: a pure sine a note, bowed in, a twin five cents sharp beating against it and a thin octave over", () => {
  const { a, nodes } = fakeVoice(GLASS);
  const secs = UI.cleared(a, {}); // seven notes and the low root
  const osc = oscillators(nodes);
  assert.ok(osc.every((x) => x.type === undefined || x.type === 'sine'), 'pure: no sawtooth and no square (an FM modulator keeps the default)');
  const twins = osc.filter((x) => x.detune.value === 5);
  assert.equal(twins.length, 7, 'a twin on each of the seven notes');
  const notes = twins.map(start);
  assert.ok(near(notes[0], 493.88, 0.05), 'the run starts on B4');
  assert.ok(notes.every((f) => MELODIC.includes(pitchClass(f))));
  const octave = osc.filter((x) => swell(nodes, x)[1][1] < 0.012);
  assert.equal(octave.length, 7, 'and a thin partial over each');
  assert.ok(octave.every((x) => notes.some((f) => near(start(x), f * 2, 1e-9))), 'an octave up');
  assert.ok(near(swell(nodes, twins[0])[1][2] - swell(nodes, twins[0])[0][2], 0.06, 1e-9), 'bowed in: a slower attack than a plucked note');
  assert.equal(nodes.filter((x) => x.kind === 'BiquadFilter').length, 1, "only the swell's own hiss is filtered: no horn to open, no breath");
  noLeak(a, nodes, secs);
  for (const name of ['waveClear', 'failed', 'start']) {
    const stinger = fakeVoice(GLASS);
    UI[name](stinger.a, {});
    assert.ok(oscillators(stinger.nodes).some((x) => x.detune.value === 5), `${name} is bowed too`);
  }
});

test("no other world's stinger has a twin five cents sharp", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'glass')) {
    for (const name of ['cleared', 'waveClear', 'failed', 'start']) {
      const stinger = fakeVoice(kitFor(look.music));
      UI[name](stinger.a, {});
      assert.equal(oscillators(stinger.nodes).filter((x) => x.detune.value === 5).length, 0, `w${look.world} ${name}`);
    }
  }
});
