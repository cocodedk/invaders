import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS } from '../../src/ui/sfx-boss.js';
import { UI } from '../../src/ui/sfx-ui.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

const BREATH = kitFor({ mood: 'breath', root: 'D#', scale: 'major', bpm: 104 });
const HARMONIC_MAJOR = [3, 5, 7, 8, 10, 11, 2]; // D sharp F G G sharp A sharp B D
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const near = (x, y, tol = 1e-6) => Math.abs(x - y) < tol;
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const played = (nodes) => oscillators(nodes).filter((x) => x.frequency.calls.length);
const start = (x) => x.frequency.calls[0][1];
const when = (x) => x.frequency.calls[0][2];
const lfos = (nodes, hz, type) => oscillators(nodes).filter((x) => x.frequency.value === hz && (!type || x.type === type));
const filters = (nodes, type, q) => nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === type && (q === undefined || x.Q.value === q));
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const swell = (nodes, osc) => nodes[nodes.indexOf(osc) + 1].gain.calls; // the envelope tone() makes right after its oscillator: floor, peak, floor
const roar = (o = { phase: 1 }, patch = BOSS.phase) => {
  const { a, nodes } = fakeVoice(BREATH);
  const secs = patch(a, o); // a phase 1 roar lasts 1.4 s: 0.53 s of inhale, then the roar
  return { a, nodes, secs };
};
const wheeze = (nodes) => filters(nodes, 'bandpass', 2.2).filter((x) => x.frequency.calls[0][1] === 500 && x.frequency.calls[1][1] === 2800);

test("the Craving's roar begins with a monstrous wheezing inhale: a rattling rush of air climbing through a narrow throat, a thin whistle fluttering over it, a sub swelling in under", () => {
  const { a, nodes, secs } = roar();
  const [rush] = wheeze(nodes);
  assert.ok(rush, 'noise sweeping 500 to 2800 Hz through a narrow band');
  assert.ok(near(rush.frequency.calls[1][2] - a.t, 1.4 * 0.38 * 1.02, 1e-9), 'it is drawn over the first 38% of the roar');
  assert.equal(lfos(nodes, 19, 'square').length, 1, 'with the phlegm rattling in it');
  const whistle = played(nodes).find((x) => x.type === 'sine' && start(x) === 780);
  assert.equal(whistle.frequency.calls[1][1], 1250, 'the whistle climbs');
  assert.equal(lfos(nodes, 11, 'sine').length, 1, 'and flutters');
  const sub = played(nodes).find((x) => x.type === 'sine' && start(x) === 58);
  assert.equal(sub.frequency.calls[1][1], 70);
  const [rise, peak] = swell(nodes, sub);
  assert.ok(peak[2] - rise[2] > 0.4, 'swelling in with the breath');
  assert.ok(peak[1] > swell(nodes, whistle)[1][1], 'the sub is the heavier voice');
  assert.ok(filters(nodes, 'lowpass').some((x) => x.frequency.calls[0][1] === 300 && x.frequency.calls[1][1] === 120), 'and a lung\'s rumble');
  noLeak(a, nodes, secs);
});

test('then it breaks out as a rasp: three crushed sawtooth voices falling together, smoke roughened by a square-wave shudder, and embers crackling as it dies away', () => {
  const { a, nodes } = roar();
  const saws = played(nodes).filter((x) => x.type === 'sawtooth');
  assert.equal(saws.length, 3);
  assert.deepEqual(saws.map((x) => Math.round(start(x))), [106, 159, 213], 'a fifth and an octave over the voice');
  assert.ok(saws.every((x) => near(when(x), a.t + 1.4 * 0.38 * 0.95, 1e-9)), 'the roar breaks out as the breath tops out');
  assert.ok(saws.every((x) => near(x.frequency.calls[1][1] / start(x), 66 / 106, 1e-9)), 'each falling by a minor sixth, together');
  assert.deepEqual(saws.map((x) => x.detune.value), [-11, 0, 11], 'detuned apart');
  assert.equal(nodes.filter((x) => x.kind === 'WaveShaper').length, 1, 'all through one crush');
  assert.equal(lfos(nodes, 36, 'square').length, 1, 'the smoke shudders 36 times a second');
  const smoke = filters(nodes, 'bandpass', 1.2);
  assert.equal(smoke.length, 1);
  assert.deepEqual([smoke[0].frequency.calls[0][1], smoke[0].frequency.calls[1][1]], [1400, 500], 'a rush falling through the throat');
  const embers = filters(nodes, 'highpass').filter((x) => x.frequency.calls[0][1] === 3500);
  assert.equal(embers.length, 5, 'embers crackling: five ticks');
  assert.ok(embers.every((x) => x.frequency.calls[0][2] > saws[0].frequency.calls[0][2]), 'after the roar has broken out');
  assert.ok(embers.every((x, i) => i === 0 || x.frequency.calls[0][2] > embers[i - 1].frequency.calls[0][2]), 'one after another');
});

test('no tone of the roar sits under 56 Hz, over world 9\'s roar floor, at any phase and in the death scream (whose groan after it is every world\'s)', () => {
  const floor = (patch, o) => {
    const { a, nodes } = roar(o, patch);
    return Math.min(...played(nodes).filter((x) => when(x) < a.t + 0.9).flatMap((x) => x.frequency.calls.map((c) => c[1])));
  };
  const monster = (() => {
    const { a, nodes } = fakeVoice(kitFor(LOOKS[8].music));
    BOSS.phase(a, { phase: 1 });
    return Math.min(...played(nodes).map(start));
  })();
  for (const [patch, o] of [[BOSS.phase, { phase: 1 }], [BOSS.phase, { phase: 2 }], [BOSS.bossDeath, {}]]) {
    const f = floor(patch, o);
    assert.ok(f >= 56 && f > monster + 8, `${f} Hz against the monster's ${monster}`);
  }
});

test('the last roar is harsher and longer: higher voices, a faster shudder, one more ember, and the death scream plays it too', () => {
  const p1 = roar({ phase: 1 });
  const p2 = roar({ phase: 2 });
  const death = roar({}, BOSS.bossDeath);
  const voices = (r) => played(r.nodes).filter((x) => x.type === 'sawtooth').map(start);
  assert.ok(voices(p2)[0] > voices(p1)[0] && voices(death)[0] === voices(p2)[0], 'the voice climbs with the phase (h 2 for the death)');
  assert.equal(lfos(p2.nodes, 45, 'square').length, 1, 'shuddering 45 times a second');
  assert.equal(lfos(death.nodes, 45, 'square').length, 1);
  const embers = (r) => filters(r.nodes, 'highpass').filter((x) => x.frequency.calls[0][1] === 3500).length;
  assert.deepEqual([embers(p1), embers(p2), embers(death)], [5, 6, 6]);
  const wheezeEnd = (r) => wheeze(r.nodes)[0].frequency.calls[1][2] - r.a.t;
  assert.ok(wheezeEnd(death) > wheezeEnd(p1), 'a longer inhale before the death scream');
  for (const r of [p1, p2, death]) noLeak(r.a, r.nodes, r.secs);
});

test("no other world's roar wheezes or sweeps a sub tone from 58 Hz", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'breath')) {
    for (const play of [(a) => BOSS.phase(a, { phase: 1 }), (a) => BOSS.phase(a, { phase: 2 }), (a) => BOSS.bossDeath(a)]) {
      const r = fakeVoice(kitFor(look.music));
      play(r.a);
      assert.equal(wheeze(r.nodes).length, 0, `w${look.world}: no wheeze`);
      assert.equal(played(r.nodes).filter((x) => start(x) === 58 && x.frequency.calls[1][1] === 70).length, 0, `w${look.world}: no sub swell`);
    }
  }
});

test('the stingers are a clear flute on the scale: a pure triangle a note with its octave and its twelfth over it as sines, no twin, no shake and no filter, bright and in tune', () => {
  const { a, nodes } = fakeVoice(BREATH);
  const secs = UI.cleared(a, {}); // seven notes and the low root
  const osc = oscillators(nodes);
  const triangles = osc.filter((x) => x.type === 'triangle');
  assert.equal(triangles.length, 7);
  assert.ok(near(start(triangles[0]), 311.13, 0.01), 'the run starts on D sharp 4');
  assert.ok(triangles.every((x) => HARMONIC_MAJOR.includes(pitchClass(start(x)))), 'on the scale');
  for (const n of triangles) {
    const env = swell(nodes, n);
    const octave = osc.find((x) => x.type === 'sine' && near(start(x), start(n) * 2, 1e-9) && near(when(x), when(n), 1e-9));
    const twelfth = osc.find((x) => x.type === 'sine' && near(start(x), start(n) * 3, 1e-9) && near(when(x), when(n), 1e-9));
    assert.ok(octave && twelfth, `${start(n)} Hz has its octave and its twelfth`);
    assert.ok(near(swell(nodes, octave)[1][1] / env[1][1], 0.3, 1e-9) && near(swell(nodes, twelfth)[1][1] / env[1][1], 0.08, 1e-9), 'an octave a third as strong, a twelfth faint');
  }
  assert.ok(osc.every((x) => x.detune.value === 0), 'no twin: clean');
  assert.equal(osc.filter((x) => !x.frequency.calls.length).length, 0, 'and no vibrato');
  assert.equal(nodes.filter((x) => x.kind === 'BiquadFilter').length, 1, "only the swell's own hiss is filtered: no horn to open, no breath");
  const chord = triangles.slice(4).map(start);
  assert.deepEqual(chord.map(pitchClass), [3, 7, 10], 'the held chord is major: D sharp, G and A sharp');
  assert.equal(osc.filter((x) => x.type === 'sine' && start(x) < 100).length, 1, 'the root underneath');
  noLeak(a, nodes, secs);
  for (const name of ['waveClear', 'failed', 'start']) {
    const stinger = fakeVoice(BREATH);
    UI[name](stinger.a, {});
    assert.ok(oscillators(stinger.nodes).some((x) => x.type === 'triangle'), `${name} is the flute too`);
  }
});

test("no other world's stinger is a triangle with a sine twelfth over it", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'breath')) {
    for (const name of ['cleared', 'waveClear', 'failed', 'start']) {
      const stinger = fakeVoice(kitFor(look.music));
      UI[name](stinger.a, {});
      const osc = oscillators(stinger.nodes).filter((x) => x.frequency.calls.length);
      const flutes = osc.filter((x) => x.type === 'sine' && osc.some((m) => m.type === 'triangle' && near(start(x) / start(m), 3, 1e-9)));
      assert.equal(flutes.length, 0, `w${look.world} ${name}`);
    }
  }
});
