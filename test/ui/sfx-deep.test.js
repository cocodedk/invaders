import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEEP, bloop, deepBand, wellBand, WELL_SPAN } from '../../src/ui/sfx-deep.js';
import { WORLD } from '../../src/ui/sfx-world.js';
import { ON, POWER } from '../../src/ui/sfx-power.js';
import { SFX } from '../../src/ui/sfx.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { WELL } from '../../src/core/kinds.js';
import { COOLDOWN } from '../../src/core/ship.js';
import { gunTicks, TICK } from '../core/world-kit.js';
import { installAudio, fakeVoice } from './audio-kit.js';

const KIT = kitFor({ mood: 'abyss', root: 'F#', scale: 'pentatonic', bpm: 54 });
const PENTATONIC = [6, 9, 11, 1, 4]; // F sharp A B C sharp E
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const start = (x) => x.frequency.calls[0][1];
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const gainPeaks = (nodes) => nodes.filter((x) => x.kind === 'Gain' && x.gain.calls.length === 3).map((x) => x.gain.calls[1][1]);
const filters = (nodes, type) => nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === type);
// The carrier of the one FM tone (its modulator sits at a whole or inharmonic multiple of its pitch).
const carrier = (osc) => osc.find((c) => osc.some((m) => m !== c && [3, 3.51].some((r) => Math.abs(start(m) / start(c) - r) < 1e-9)));
// The FM tone's pitch, from a patch called with `o`.
function pitch(patch, o) {
  const { a, nodes } = fakeVoice(KIT);
  patch(a, o);
  return start(carrier(oscillators(nodes)));
}

test('a pearl wiping a bullet ticks like glass: a short inharmonic ring on a note of the scale and a hair of noise, soft and over in a fifth of a second', () => {
  const { a, nodes } = fakeVoice(KIT);
  const secs = DEEP.pearlBlock(a, { x: 960 });
  assert.equal(oscillators(nodes).length, 2, 'one FM tone: the carrier and its modulator');
  const osc = oscillators(nodes);
  const car = carrier(osc);
  assert.ok(osc.some((m) => Math.abs(start(m) / start(car) - 3.51) < 1e-9), 'a glassy partner');
  assert.ok(PENTATONIC.includes(pitchClass(start(car))));
  assert.deepEqual(filters(nodes, 'highpass').map((x) => x.frequency.calls[0][1]), [7500], 'the tick of noise');
  assert.ok(gainPeaks(nodes).every((p) => p <= 0.1), `soft: ${gainPeaks(nodes)}`);
  assert.ok(secs > 0.15 && secs < 0.3, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('the tick is higher the further right the pearl is, a note of the scale in each of seven bands from F sharp 5 to A 6, at any x', () => {
  const pitches = [100, 400, 700, 1000, 1300, 1600, 1900].map((x) => pitch(DEEP.pearlBlock, { x }));
  for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1], `x step ${i}: ${pitches}`);
  assert.ok(pitches.every((f) => PENTATONIC.includes(pitchClass(f))));
  assert.ok(Math.abs(pitches[0] - 739.99) < 0.05 && Math.abs(pitches[6] - 1760) < 0.05, 'F sharp 5 on the left, A 6 on the right');
  assert.equal(new Set([10, 100, 200, 270].map((x) => pitch(DEEP.pearlBlock, { x }))).size, 1, 'a band is one note');
  assert.equal(pitch(DEEP.pearlBlock, { x: -50 }), pitches[0], 'left of the screen is the lowest');
  assert.equal(pitch(DEEP.pearlBlock, { x: 4000 }), pitches[6], 'right of it the highest');
  assert.equal(pitch(DEEP.pearlBlock, {}), pitches[0], 'a tick without an x still sounds');
  assert.deepEqual([0, 274, 275, 960, 1919, 1920, 9999].map(deepBand), [0, 0, 1, 3, 6, 6, 6]);
});

test('a pearl striking an alien plucks a string an octave under the tick: a whole-number FM partner, a click of noise, on the same scale', () => {
  const { a, nodes } = fakeVoice(KIT);
  const secs = DEEP.pearlHit(a, { x: 960 });
  const osc = oscillators(nodes);
  assert.equal(osc.length, 2);
  const car = carrier(osc);
  assert.ok(osc.some((m) => Math.abs(start(m) / start(car) - 3) < 1e-9), 'a whole-number partner: a string');
  assert.ok(PENTATONIC.includes(pitchClass(start(car))));
  assert.equal(filters(nodes, 'bandpass').filter((x) => x.frequency.calls[0][1] === 2600 && x.Q.value === 2).length, 1, 'with a click');
  for (const x of [100, 960, 1900]) assert.ok(Math.abs(pitch(DEEP.pearlBlock, { x }) / pitch(DEEP.pearlHit, { x }) - 2) < 1e-9, `x ${x}: an octave under`);
  assert.ok(gainPeaks(nodes).every((p) => p <= 0.12), `light: ${gainPeaks(nodes)}`);
  assert.ok(secs > 0.2 && secs < 0.4, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('the trident adds a watery zip to the shot: a sweep of noise rising through the band and a bubbling chirp an octave up, quiet and brief', () => {
  const { a, nodes } = fakeVoice(KIT);
  const secs = DEEP.tridentZip(a, { x: 960 });
  const sweep = filters(nodes, 'bandpass')[0];
  assert.deepEqual([sweep.frequency.calls[0][1], sweep.frequency.calls[1][1]], [500, 3400], 'noise sweeping up');
  const chirp = oscillators(nodes).find((x) => x.frequency.calls.length);
  assert.ok(Math.abs(chirp.frequency.calls[1][1] / start(chirp) - 2) < 1e-9, 'rising an octave');
  assert.ok(PENTATONIC.includes(pitchClass(start(chirp))), 'from a note of the scale');
  const bubbles = oscillators(nodes).find((x) => x.frequency.value === 34);
  assert.ok(bubbles, 'a fast wobble on the pitch: bubbles');
  assert.ok(gainPeaks(nodes).every((p) => p <= 0.13), `under the shot's drum hit: ${gainPeaks(nodes)}`);
  assert.ok(secs > 0.1 && secs < 0.3, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('in Lantern Deep the maelstrom drinks a bullet with a glassy bloop: a bubble rising into a note of the scale, a ring after it and a pop', () => {
  const { a, nodes } = fakeVoice(KIT);
  const secs = WORLD.absorb(a, { x: WELL.x });
  const bubble = oscillators(nodes).find((x) => x.frequency.calls.length && x.frequency.calls[1][1] > start(x));
  assert.ok(Math.abs(start(bubble) / bubble.frequency.calls[1][1] - 0.6) < 1e-9, 'rising by two fifths');
  assert.ok(PENTATONIC.includes(pitchClass(bubble.frequency.calls[1][1])), 'it ends on a note of the scale');
  const ring = carrier(oscillators(nodes).filter((x) => x !== bubble));
  assert.ok(Math.abs(start(ring) / bubble.frequency.calls[1][1] - 2) < 1e-9, 'a glassy ring an octave over it');
  assert.deepEqual(filters(nodes, 'highpass').map((x) => x.frequency.calls[0][1]), [5200], 'and a pop');
  assert.ok(!oscillators(nodes).some((x) => x.frequency.calls[1]?.[1] === 26), 'not the well\'s dark thoom');
  assert.ok(gainPeaks(nodes).every((p) => p <= 0.1), `${gainPeaks(nodes)}`);
  assert.ok(secs > 0.4 && secs < 0.8, `${secs} s`);
  noLeak(a, nodes, secs);
  assert.equal(SFX.absorb, WORLD.absorb, 'it is the well\'s own sound, branched on the world');
});

test('the bloop is pitched by where the bullet is drunk: seven bands across the 112 px round the well, a bullet from the left lower than one from the right', () => {
  const note = (x) => {
    const { a, nodes } = fakeVoice(KIT);
    bloop(a, { x });
    return oscillators(nodes).find((s) => s.frequency.calls.length && s.frequency.calls[1][1] > start(s)).frequency.calls[1][1];
  };
  const xs = [-48, -32, -16, 0, 16, 32, 48].map((d) => WELL.x + d);
  const pitches = xs.map(note);
  for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1], `x step ${i}: ${pitches}`);
  assert.ok(Math.abs(pitches[0] - 369.99) < 0.05 && Math.abs(pitches[6] - 880) < 0.05, 'F sharp 4 on the left, A 5 on the right');
  assert.equal(note(WELL.x - 1000), pitches[0], 'a bullet far to the left is the lowest');
  assert.equal(note(WELL.x + 1000), pitches[6], 'far to the right the highest');
  assert.equal(note(undefined), pitches[3], 'without an x it sounds from the middle');
  assert.deepEqual(xs.map(wellBand), [0, 1, 2, 3, 4, 5, 6]);
  assert.ok(WELL_SPAN >= 40, 'wider than the 40 px the well swallows within');
});

test("every world before the deep drinks a bullet with the well's dark falling thoom, as it did", () => {
  assert.ok(LOOKS.length >= 14);
  for (const look of LOOKS) {
    const kit = kitFor(look.music);
    if (kit.style === 'abyss') continue;
    const { a, nodes } = fakeVoice(kit);
    assert.equal(WORLD.absorb(a, { x: 940 }), 0.9, `w${look.world}`);
    const osc = oscillators(nodes);
    assert.equal(osc.length, 1, `w${look.world}`);
    assert.deepEqual(osc[0].frequency.calls.map((c) => c[1]), [330, 26], `w${look.world}`);
    assert.equal(nodes.filter((x) => x.kind === 'BufferSource').length, 1, `w${look.world}: the one dull hiss`);
  }
});

test('the pearls switch on with a glass chime of three notes climbing the scale, the trident with a bright ring of three metal partners, each quiet and short', () => {
  const run = (kind, kit = KIT) => {
    const { a, nodes } = fakeVoice(kit);
    ON[kind](a);
    return { a, nodes, osc: oscillators(nodes) };
  };
  const partnered = (osc, ratio) => osc.filter((x) => osc.some((m) => m !== x && Math.abs(start(m) / start(x) - ratio) < 1e-9));
  const pearls = run('pearls');
  assert.equal(pearls.osc.length, 6, 'three FM tones');
  const notes = partnered(pearls.osc, 3.51).map(start);
  assert.equal(notes.length, 3);
  assert.deepEqual(notes, notes.toSorted((p, q) => p - q), 'climbing');
  assert.ok(notes.every((f) => PENTATONIC.includes(pitchClass(f))));
  const trident = run('trident');
  const rings = partnered(trident.osc, 2.76);
  assert.equal(trident.osc.length, 6, 'three FM tones');
  assert.equal(rings.length, 3);
  assert.ok(rings.every((x) => PENTATONIC.includes(pitchClass(start(x)))));
  assert.equal(filters(trident.nodes, 'highpass').length, 1, 'struck with a shing of noise');
  for (const r of [pearls, trident]) {
    for (const s of r.nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt > r.a.t && s.stopAt <= r.a.t + 0.9, 'a source left running');
    assert.ok(Math.max(...gainPeaks(r.nodes)) <= 0.22, `${gainPeaks(r.nodes)}`);
  }
  for (const look of LOOKS) {
    for (const kind of ['pearls', 'trident']) assert.ok(run(kind, kitFor(look.music)).osc.length > 0, `w${look.world} ${kind}`);
  }
  assert.equal(new Set(Object.values(ON)).size, Object.keys(ON).length, 'one patch per power, none shared');
  const switchedOn = fakeVoice(KIT);
  assert.equal(POWER.powerOn(switchedOn.a, { kind: 'pearls' }), 0.6);
  assert.equal(oscillators(switchedOn.nodes).length, 6, 'powerOn plays the power\'s own patch, not the spread fan');
});

test('the patches are reachable by name', () => {
  for (const name of ['pearlBlock', 'pearlHit', 'tridentZip']) assert.equal(SFX[name], DEEP[name], name);
});

test('the pearls and the zip are thinned like the ship\'s own shot: a cluster in one tick sounds once, the base fire rate sounds shot by shot', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); // the voices' clean-up timers need not run
  installAudio({ currentTime: 10 });
  const { unlockAudio, play, audioStats, audioNodes } = await import('../../src/ui/audio.js');
  unlockAudio();
  const { ctx } = audioNodes();
  const burst = (name, count, every, o = {}) => {
    const before = audioStats().played;
    for (let i = 0; i < count; i++) {
      ctx.currentTime += every;
      play(name, { x: 100 + i * 40, ...o });
    }
    return audioStats().played - before;
  };
  for (const name of ['pearlBlock', 'pearlHit', 'tridentZip', 'absorb']) assert.equal(burst(name, 30, 0), 1, `${name}: a cluster in one tick`);
  ctx.currentTime += 5;
  assert.equal(burst('pearlBlock', 20, 0.05), 10, 'blocks closer than 0.06 s are thinned to every other one');
  assert.equal(burst('pearlBlock', 20, 0.08), 20, 'and sound one by one at a slower rate');
  assert.equal(burst('pearlHit', 20, 0.05), 10, 'plucks closer than 0.07 s too');
  assert.equal(burst('pearlHit', 20, 0.09), 20);
  assert.equal(burst('tridentZip', 20, gunTicks(COOLDOWN) * TICK), 20, 'the trident fires at the base rate: every shot zips');
  assert.equal(burst('tridentZip', 20, 0.05), 10, 'a faster rate is thinned');
  assert.equal(burst('absorb', 20, 0.06), 10, 'the maelstrom is thinned like the well: 0.1 s');
  assert.equal(burst('absorb', 20, 0.12), 20);
  assert.ok(audioStats().voices <= 12, `${audioStats().voices} voices ringing`);
  assert.equal(audioStats().failed, 0, audioStats().error);
});
