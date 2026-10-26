import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS } from '../../src/ui/sfx-boss.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

// The Squall Ray's roar (sfx-storm.js squallRoar, picked by sfx-boss.js for the anvil style): a thunderclap, a sharp crack
// and then a long rolling rumble, in Anvil Sky's scale (G sharp, a major pentatonic).
const ANVIL = kitFor({ mood: 'anvil', root: 'G#', scale: 'bright', bpm: 108 });
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const near = (x, y, tol = 1e-6) => Math.abs(x - y) < tol;
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const played = (nodes) => oscillators(nodes).filter((x) => x.frequency.calls.length);
const start = (x) => x.frequency.calls[0][1];
const when = (x) => x.frequency.calls[0][2];
const filters = (nodes, type) => nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === type);
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const peak = (nodes, filter) => nodes[nodes.indexOf(filter) + 1].gain.calls[1][1]; // a hiss: its filter, then its envelope
const roar = (o = { phase: 1 }, patch = BOSS.phase) => {
  const { a, nodes } = fakeVoice(ANVIL);
  const secs = patch(a, o); // a phase 1 roar lasts 1.4 s
  return { a, nodes, secs };
};
const rumble = (nodes) => filters(nodes, 'lowpass').filter((x) => x.frequency.calls[0][1] === 520 && x.frequency.calls[1][1] === 70);
const peals = (nodes) => filters(nodes, 'lowpass').filter((x) => [460, 370, 280].includes(x.frequency.calls[0][1]) && x.frequency.calls[1][1] === 70);

test('the roar opens with a crack: a burst of noise falling from 5200 Hz, a crushed band of noise and a tick falling from 2100 Hz, all in the first moments', () => {
  const { a, nodes } = roar();
  const [burst] = filters(nodes, 'highpass').filter((x) => x.frequency.calls[0][1] === 5200);
  assert.ok(burst, 'a highpass burst from 5200 Hz');
  assert.equal(burst.frequency.calls[1][1], 1800);
  assert.ok(near(burst.frequency.calls[0][2], a.t, 1e-9) && burst.frequency.calls[1][2] - a.t < 0.06, 'at the very start and over in a blink');
  const [snap] = filters(nodes, 'bandpass').filter((x) => x.frequency.calls[0][1] === 2600);
  assert.equal(snap.frequency.calls[1][1], 700, 'a snap of noise falling through the band');
  assert.ok(snap.frequency.calls[1][2] - a.t < 0.2);
  const tick = played(nodes).find((x) => x.type === 'triangle' && start(x) === 2100);
  assert.equal(tick.frequency.calls[1][1], 150, 'a tick that falls');
  assert.equal(nodes.filter((x) => x.kind === 'WaveShaper').length, 1, 'the band and the tick go through one crush');
});

test('then the thunder rolls: a sawtooth and a triangle on the root and the fifth of G sharp, noise falling away under them, a long rumble after the crack', () => {
  const { a, nodes, secs } = roar();
  const root = played(nodes).find((x) => x.type === 'sawtooth');
  assert.ok(near(start(root) / root.frequency.calls[1][1], 1.5, 1e-9), 'a sawtooth sagging from a fifth over the root to the root');
  assert.equal(pitchClass(root.frequency.calls[1][1]), 8, 'G sharp');
  assert.ok(near(root.frequency.calls[1][1], 51.91, 0.01), 'G sharp 1');
  const fifth = played(nodes).find((x) => x.type === 'triangle' && near(start(x), 77.78, 0.01));
  assert.equal(pitchClass(start(fifth)), 3, 'a triangle on the fifth, D sharp');
  assert.ok(when(root) > a.t + 0.05 && when(fifth) > a.t + 0.05, 'they follow hard on the crack');
  const [cut] = filters(nodes, 'lowpass').filter((x) => x.frequency.calls[0][1] === 300);
  assert.equal(cut.frequency.calls[1][1], 100, 'the sawtooth is dulled as it sags');
  const [noise] = rumble(nodes);
  assert.ok(noise, 'noise falling from 520 to 70 Hz');
  assert.ok(noise.frequency.calls[1][2] - a.t > 1.3, 'rolling on for the whole roar');
  noLeak(a, nodes, secs);
});

test('its level rolls: one gain every part of the rumble passes through, swung by a slow LFO, faster in each phase', () => {
  const rate = (nodes) => oscillators(nodes).filter((x) => !x.frequency.calls.length && x.frequency.value < 10).map((x) => x.frequency.value);
  assert.deepEqual(rate(roar({ phase: 1 }).nodes), [6.5]);
  assert.deepEqual(rate(roar({ phase: 2 }).nodes), [8]);
  const { nodes } = roar();
  assert.equal(nodes.filter((x) => x.kind === 'Gain' && x.gain.value === 0.6).length, 1, 'the rolling gain');
  assert.equal(nodes.filter((x) => x.kind === 'Gain' && x.gain.value === 0.4).length, 1, 'and the depth the LFO swings it by');
});

test('peal after peal rolls through it, each softer than the one before, one more in the last phase', () => {
  const p1 = roar({ phase: 1 });
  const p2 = roar({ phase: 2 });
  const death = roar({}, BOSS.bossDeath);
  assert.deepEqual([peals(p1.nodes).length, peals(p2.nodes).length, peals(death.nodes).length], [2, 3, 3]);
  const heights = peals(p2.nodes).map((x) => peak(p2.nodes, x));
  assert.ok(heights.every((v, i) => i === 0 || v < heights[i - 1]), `softer each time: ${heights}`);
  const at = peals(p2.nodes).map((x) => x.frequency.calls[0][2]);
  assert.ok(at.every((v, i) => i === 0 || v > at[i - 1]), 'one after another');
  for (const r of [p1, p2, death]) noLeak(r.a, r.nodes, r.secs);
});

test('the last roar is harder: a more crushed crack and a louder snap, and the death scream plays it too', () => {
  const p1 = roar({ phase: 1 });
  const p2 = roar({ phase: 2 });
  const death = roar({}, BOSS.bossDeath);
  const curve = (r) => r.nodes.find((x) => x.kind === 'WaveShaper').curve[700];
  assert.ok(curve(p2) > curve(p1), 'a harder crush');
  assert.equal(curve(death), curve(p2));
  const snap = (r) => peak(r.nodes, filters(r.nodes, 'bandpass').find((x) => x.frequency.calls[0][1] === 2600));
  assert.ok(snap(p2) > snap(p1));
});

test("it is a thunderclap, not a growl: no square-wave shudder, nothing under the root, and above the monster's roar of world 9", () => {
  const monster = (() => {
    const { a, nodes } = fakeVoice(kitFor(LOOKS[8].music));
    BOSS.phase(a, { phase: 1 });
    return Math.min(...played(nodes).map(start));
  })();
  for (const [patch, o] of [[BOSS.phase, { phase: 1 }], [BOSS.phase, { phase: 2 }], [BOSS.bossDeath, {}]]) {
    const { a, nodes } = roar(o, patch);
    assert.equal(oscillators(nodes).filter((x) => x.type === 'square' && !x.frequency.calls.length).length, 0, 'no shaken growl');
    const roared = played(nodes).filter((x) => when(x) < a.t + 0.9); // the death's groan after the scream is every world's
    const lows = roared.flatMap((x) => x.frequency.calls.map((c) => c[1])).filter((f) => f < 100);
    assert.ok(Math.min(...lows) > 51, 'the root is as low as it goes');
    assert.ok(Math.min(...roared.map(start)) > monster + 8, "over world 9's roar floor");
  }
});

test("no other world's roar opens with the highpass crack from 5200 Hz or rolls a rumble from 520 Hz", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'anvil')) {
    for (const play of [(a) => BOSS.phase(a, { phase: 1 }), (a) => BOSS.phase(a, { phase: 2 }), (a) => BOSS.bossDeath(a)]) {
      const r = fakeVoice(kitFor(look.music));
      play(r.a);
      assert.equal(filters(r.nodes, 'highpass').filter((x) => x.frequency.calls[0][1] === 5200).length, 0, `w${look.world}`);
      assert.equal(rumble(r.nodes).length, 0, `w${look.world}: no rolling rumble`);
    }
  }
});
