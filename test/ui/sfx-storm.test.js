import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORM, bandOf, BANDS } from '../../src/ui/sfx-storm.js';
import { ARMADA } from '../../src/ui/sfx-armada.js';
import { SFX } from '../../src/ui/sfx.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

const KIT = kitFor({ mood: 'anvil', root: 'G#', scale: 'bright', bpm: 108 });
const ARMADA_KIT = kitFor({ mood: 'armada', root: 'G', scale: 'major', bpm: 132 });
const A_FLAT_PENTATONIC = [8, 10, 0, 3, 5];
const XS = [100, 500, 900, 1300, 1700]; // one x in each of the five bands
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const start = (x) => x.frequency.calls[0]?.[1] ?? x.frequency.value;
const hz2 = (hz) => Math.round(hz * 100) / 100;
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const envOf = (nodes, osc) => nodes[nodes.indexOf(osc) + 1].gain.calls; // the envelope tone() makes right after its oscillator: floor, peak, floor
const peakOf = (nodes, osc) => envOf(nodes, osc)[1]?.[1]; // an LFO's gain has no envelope
const peaks = (nodes) => nodes.filter((x) => x.kind === 'Gain' && x.gain.calls.length === 3).map((x) => x.gain.calls[1][1]);
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const run = (patch, o = {}, kit = KIT) => {
  const { a, nodes } = fakeVoice(kit);
  const secs = patch(a, o);
  return { a, nodes, secs };
};
// Everything a patch asks of the audio graph, for comparing two patches call for call.
const trace = ({ nodes, secs }) => JSON.stringify([secs, nodes.map((x) => [x.kind, x.type, x.frequency.calls, x.gain.calls, x.detune.calls, x.Q.calls])]);

test('a side shot in Anvil Sky is a short arc zap: a tone falling fast with an FM sizzle and three tiny crackles, quiet beside the ship\'s shot', () => {
  for (const patch of [STORM.cannonL, STORM.cannonR]) {
    const { a, nodes, secs } = run(patch);
    noLeak(a, nodes, secs);
    assert.ok(secs <= 0.2, `${secs} s: short`);
    const osc = oscillators(nodes);
    assert.equal(osc.length, 3, 'a tone, an FM carrier and its modulator');
    assert.ok(osc.every((o) => o.frequency.calls[1][1] < o.frequency.calls[0][1]), 'every one falls');
    assert.equal(nodes.filter((x) => x.kind === 'BufferSource').length, 3, 'three crackles');
    assert.ok(nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass').every((f) => f.Q.value === 4), 'thin bands, not a hiss');
    assert.ok(peaks(nodes).every((p) => p <= 0.11), `light: ${peaks(nodes)}`);
  }
});

test('the left gun sits on the root of the scale and the right a major third above it, so a volley is a dyad of A flat pentatonic', () => {
  const body = (patch) => start(oscillators(run(patch).nodes)[0]);
  const [left, right] = [body(STORM.cannonL), body(STORM.cannonR)];
  assert.ok(Math.abs(right / left - 2 ** (4 / 12)) < 1e-9, `${left} Hz and ${right} Hz`);
  for (const hz of [left / 3, right / 3]) assert.ok(A_FLAT_PENTATONIC.includes(pitchClass(hz)), `${hz} is on the scale`);
  assert.equal(hz2(left / 3), 415.3, 'G sharp 4');
});

test('the guns open with a charge, an anvil struck and a roll of thunder; the anvil is higher the further right the ship is, a note of the scale in each of five bands', () => {
  const strike = (x) => {
    const { a, nodes, secs } = run(STORM.broadsideOn, { x });
    noLeak(a, nodes, secs);
    assert.ok(secs > 1.2 && secs < 1.8, `${secs} s`);
    const carrier = oscillators(nodes).find((o) => peakOf(nodes, o) === 0.1);
    assert.ok(Math.abs(carrier.frequency.calls[0][2] - (a.t + 0.26)) < 1e-9, 'struck as the charge tops out');
    return { hz: start(carrier), nodes };
  };
  assert.equal(BANDS, 5);
  const notes = XS.map((x) => hz2(strike(x).hz));
  assert.deepEqual(notes, [830.61, 932.33, 1046.5, 1244.51, 1396.91], 'G sharp, A sharp, C, D sharp, F in the fifth octave');
  assert.ok(notes.every((hz) => A_FLAT_PENTATONIC.includes(pitchClass(hz))));
  assert.equal(hz2(strike(-50).hz), notes[0]);
  assert.equal(hz2(strike(4000).hz), notes[4]);
  assert.equal(hz2(strike(undefined).hz), notes[0], 'an anvil without an x still rings');
  const { nodes } = strike(960);
  const hz = oscillators(nodes).map((o) => hz2(start(o)));
  assert.ok(hz.includes(77.87) && hz.includes(155.74), 'two low tones of thunder: G sharp 1 a pure fifth up, and an octave over that');
  assert.ok(oscillators(nodes).some((o) => o.type === 'sine' && o.frequency.value === 8), 'whose level rolls at 8 Hz');
  const charge = oscillators(nodes).find((o) => o.type === 'triangle' && start(o) > 300);
  assert.ok(charge.frequency.calls[1][1] / start(charge) === 4, 'the charge climbs two octaves');
  assert.ok(Math.max(...peaks(nodes)) <= 0.12, 'quieter than the ship\'s own shot');
});

test('the arcs die away: a fizzle sliding down two octaves, three fading crackles and a soft iron tick', () => {
  const { a, nodes, secs } = run(STORM.broadsideOff);
  noLeak(a, nodes, secs);
  assert.ok(secs <= 0.6, `${secs} s`);
  const slide = oscillators(nodes).find((o) => o.type === 'sine' && o.frequency.calls[1][1] === start(o) * 0.25);
  assert.ok(slide, 'down two octaves');
  const ticks = nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass').map((f) => f.frequency.calls[0][1]);
  assert.deepEqual(ticks, [3800, 3200, 2600], 'crackles that fall');
  assert.ok(peaks(nodes).every((p) => p <= 0.07), `soft: ${peaks(nodes)}`);
});

test('a backfire is a crack and a snap, then two struck-iron notes of the scale, the second three degrees up (a fifth, bar one minor sixth from C), peak far under the ship\'s shot', () => {
  const notes = (x) => {
    const { a, nodes, secs } = run(SFX.backfire, { x });
    noLeak(a, nodes, secs);
    assert.ok(secs > 0.5 && secs < 1, `${secs} s`);
    const carriers = oscillators(nodes).filter((o) => peakOf(nodes, o) >= 0.07 && o.type === 'sine' && o.frequency.calls[0][2] > a.t);
    return carriers.map(start);
  };
  const expected = [[830.61, 1244.51], [932.33, 1396.91], [1046.5, 1661.22], [1244.51, 1864.66], [1396.91, 2093]];
  XS.forEach((x, i) => {
    const got = notes(x);
    assert.deepEqual(got.map(hz2), expected[i], `band ${i}`);
    assert.ok(got.every((hz) => A_FLAT_PENTATONIC.includes(pitchClass(hz))), 'on the scale');
  });
  const { nodes } = run(SFX.backfire, { x: 960 });
  const p = peaks(nodes);
  assert.ok(Math.max(...p) <= 0.12 && Math.max(...p) >= 0.07, `audible but light: ${p}`);
  assert.ok(nodes.some((x) => x.kind === 'BiquadFilter' && x.type === 'highpass' && x.frequency.calls[0][1] === 5200), 'the crack is a short burst of noise');
  const snap = oscillators(nodes).find((o) => o.type === 'triangle');
  assert.equal(snap.frequency.calls[1][1], 320, 'and a snap falling away');
});

test('a backfire sounds in every world\'s kit, whatever its scale, at any x', () => {
  for (const look of LOOKS) {
    for (const x of [undefined, 0, 960, 1920]) {
      const { a, nodes, secs } = run(SFX.backfire, { x }, kitFor(look.music));
      noLeak(a, nodes, secs);
      for (const o of oscillators(nodes)) assert.ok(Number.isFinite(start(o)) && start(o) > 0, `w${look.world} x ${x}`);
    }
  }
});

test('the side guns of every other world sound exactly as they did: Sunset Armada\'s cannons, bell and ports are called call for call', () => {
  for (const kit of [ARMADA_KIT, kitFor({ mood: 'chiptune march', root: 'E', scale: 'minor', bpm: 120 }), kitFor({ mood: 'breath', root: 'D#', scale: 'major', bpm: 122 })]) {
    for (const name of ['cannonL', 'cannonR', 'broadsideOn', 'broadsideOff']) {
      for (const o of [{}, { x: 1400 }]) assert.equal(trace(run(STORM[name], o, kit)), trace(run(ARMADA[name], o, kit)), `${kit.style} ${name}`);
    }
  }
  for (const name of ['cannonL', 'cannonR', 'broadsideOn', 'broadsideOff']) {
    assert.notEqual(trace(run(STORM[name], { x: 1400 })), trace(run(ARMADA[name], { x: 1400 })), `${name} is the arc guns' own in Anvil Sky`);
    assert.equal(SFX[name], STORM[name], 'the registry plays the storm\'s, which hands every other world the armada\'s');
  }
});
