import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLASS, shatter, mend, tinkle, glassBand, MEND } from '../../src/ui/sfx-glass.js';
import { WORLD } from '../../src/ui/sfx-world.js';
import { ON, POWER } from '../../src/ui/sfx-power.js';
import { SFX } from '../../src/ui/sfx.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { installAudio, fakeVoice } from './audio-kit.js';

const KIT = kitFor({ mood: 'glass', root: 'B', scale: 'melodic', bpm: 63 });
const MELODIC = [11, 1, 2, 4, 6, 8, 10]; // B C sharp D E F sharp G sharp A sharp
const XS = [100, 400, 700, 1000, 1300, 1600, 1900]; // one x in each of the seven bands
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const start = (x) => x.frequency.calls[0][1];
const when = (x) => x.frequency.calls[0][2];
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const near = (x, y, tol = 1e-6) => Math.abs(x - y) < tol;
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const gainPeaks = (nodes) => nodes.filter((x) => x.kind === 'Gain' && x.gain.calls.length >= 3).map((x) => x.gain.calls[1][1]);
const filters = (nodes, type) => nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === type);
const envOf = (nodes, osc) => nodes[nodes.indexOf(osc) + 1].gain.calls; // the envelope tone() makes right after its oscillator
// The carrier of an FM tone whose modulator sits at `ratio` times its pitch and starts with it.
const carrier = (osc, ratio) => osc.find((c) => osc.some((m) => m !== c && near(start(m) / start(c), ratio, 1e-9) && when(m) === when(c)));
const run = (patch, o, kit = KIT) => {
  const { a, nodes } = fakeVoice(kit);
  const secs = patch(a, o);
  return { a, nodes, secs, osc: oscillators(nodes) };
};
const climbs = (pitches, what = '') => pitches.forEach((p, i) => i && assert.ok(p > pitches[i - 1], `${what} x step ${i}: ${pitches}`));

test('the twin pings with the ship: a thin glassy ring on a note of the scale, a tick of glass, soft under the shot and over in a quarter second', () => {
  const { a, nodes, secs, osc } = run(GLASS.mirrorShot, { x: 960 });
  assert.equal(osc.length, 2, 'one FM tone: the carrier and its modulator');
  const ring = carrier(osc, 2.32);
  assert.ok(ring, "a wine glass's partner, 2.32 times the pitch");
  assert.ok(MELODIC.includes(pitchClass(start(ring))));
  assert.ok(near(when(ring), a.t + 0.02, 1e-9), "a hair after the ship's shot: a reflection");
  assert.deepEqual(filters(nodes, 'highpass').map((x) => x.frequency.calls[0][1]), [7500], 'the tick');
  assert.ok(gainPeaks(nodes).every((p) => p <= 0.1), `soft: ${gainPeaks(nodes)}`);
  assert.ok(secs > 0.15 && secs < 0.3, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('the ping is higher the further right the twin is, a note in each of seven bands from B5 to A sharp 6, at any x', () => {
  const pitch = (x) => start(carrier(run(GLASS.mirrorShot, { x }).osc, 2.32));
  const pitches = XS.map(pitch);
  climbs(pitches);
  assert.ok(pitches.every((f) => MELODIC.includes(pitchClass(f))));
  assert.ok(near(pitches[0], 987.77, 0.05) && near(pitches[6], 1864.66, 0.05), 'B5 on the left, A sharp 6 on the right');
  assert.equal(pitch(-50), pitches[0], 'left of the screen is the lowest');
  assert.equal(pitch(4000), pitches[6], 'right of it the highest');
  assert.equal(pitch(undefined), pitches[0], 'a ping without an x still sounds');
  assert.deepEqual([0, 274, 275, 960, 1919, 1920, 9999].map(glassBand), [0, 0, 1, 3, 6, 6, 6]);
});

test("a wreck falls with a glass shatter: a bright crack, a stone chip's thud, the pane ringing on a note and five shards raining down the scale", () => {
  const { a, nodes, secs, osc } = run(shatter, { x: 960 });
  assert.deepEqual(filters(nodes, 'highpass').map((x) => [x.frequency.calls[0][1], x.frequency.calls[1][1]]), [[8000, 3600]], 'a crack of noise falling through the highs');
  const thud = osc.filter((x) => x.frequency.calls[0][1] === 190);
  assert.equal(thud.length, 1);
  assert.equal(thud[0].frequency.calls[1][1], 80, 'the chip knocks and sags');
  const ring = carrier(osc, 2.32);
  assert.ok(ring && MELODIC.includes(pitchClass(start(ring))), 'the pane rings on a note of the scale');
  const shards = osc.filter((x) => near(x.frequency.calls[1][1] / start(x), 0.985, 1e-9));
  assert.equal(shards.length, 5);
  assert.ok(shards.every((x) => MELODIC.includes(pitchClass(start(x))) && start(x) > start(ring)), 'above the pane, on the scale');
  assert.deepEqual(shards.map((x) => Math.round((when(x) - a.t) * 1000)), [40, 75, 110, 145, 180], 'one after another');
  assert.ok(gainPeaks(nodes).every((p) => p <= 0.21), `${gainPeaks(nodes)}`);
  assert.ok(secs > 0.5 && secs < 1, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('a wreck that stands up is a reversed shimmer rising to a clink: notes swell in and stop dead as the shards meet, then a bright ring and ticks of glass', () => {
  const { a, nodes, secs, osc } = run(mend, { x: 960 });
  const rising = osc.filter((x) => x.frequency.calls[1][1] > start(x) && near(x.frequency.calls[1][1] / start(x), 1.25, 1e-9));
  assert.equal(rising.length, 6, 'three notes of two voices a few cents apart, each climbing into its note from a major third under');
  assert.deepEqual([...new Set(rising.map((x) => x.detune.value))], [0, 9], 'the pairs beat');
  assert.ok(rising.every((x) => MELODIC.includes(pitchClass(x.frequency.calls[1][1]))), 'on the scale');
  for (const x of rising) {
    const env = envOf(nodes, x);
    assert.ok(near(env[1][2], a.t + MEND, 1e-9), 'every note peaks as the shards meet');
    assert.ok(env[2][2] - env[1][2] < 0.03, 'and stops dead');
  }
  const swish = filters(nodes, 'bandpass')[0];
  assert.deepEqual([swish.frequency.calls[0][1], swish.frequency.calls[1][1]], [1800, 9000], 'a swish of noise sweeping up');
  const clink = carrier(osc, 2.76);
  assert.ok(near(when(clink), a.t + MEND, 1e-9), 'the clink is where the swell ends');
  assert.ok(near(start(clink) / Math.min(...rising.map((x) => x.frequency.calls[1][1])), 2, 1e-9), 'an octave over the lowest note');
  assert.deepEqual(filters(nodes, 'highpass').map((x) => x.frequency.calls[0][1]), [6500, 8000], 'a tick of glass on glass, and a smaller one after it');
  assert.ok(secs > 0.8 && secs < 1.1, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('a wreck shot down tinkles: seven light shards scattering on the scale, further and further apart, and a glint, quieter than the shatter', () => {
  const { a, nodes, secs, osc } = run(tinkle, { x: 960 });
  assert.equal(osc.length, 7);
  assert.ok(osc.every((x) => MELODIC.includes(pitchClass(start(x)))));
  assert.deepEqual(osc.map((x) => Math.round((when(x) - a.t) * 100)), [0, 3, 7, 12, 19, 28, 40]);
  assert.deepEqual(filters(nodes, 'highpass').map((x) => x.frequency.calls[0][1]), [9000], 'a glint');
  assert.ok(Math.max(...gainPeaks(nodes)) <= 0.1, `${gainPeaks(nodes)}`);
  assert.ok(secs > 0.5 && secs < 0.9, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('the mending is pitched by where it happens: all three climb the scale from the left of the screen to the right', () => {
  const picks = [
    ['shatter', shatter, (osc) => start(carrier(osc, 2.32))], // the pane's ring
    ['mend', mend, (osc) => start(carrier(osc, 2.76))], // the clink
    ['tinkle', tinkle, (osc) => Math.min(...osc.map(start))], // the lowest shard
  ];
  for (const [name, patch, pick] of picks) {
    const note = (x) => pick(run(patch, { x }).osc);
    const pitches = XS.map(note);
    climbs(pitches, name);
    assert.ok(pitches.every((f) => MELODIC.includes(pitchClass(f))), name);
    assert.equal(note(-50), pitches[0], `${name}: left of the screen is the lowest`);
    assert.equal(note(4000), pitches[6], `${name}: right of it the highest`);
    assert.ok(note(undefined) > 0, `${name} without an x still sounds`);
  }
});

test("in Glass Cathedral the twist's three events are glass: they are the world's own patches, branched on the style", () => {
  for (const [name, glass] of [['wreck', shatter], ['wreckDown', tinkle], ['reassemble', mend]]) {
    const viaWorld = run(WORLD[name], { x: 700 });
    const direct = run(glass, { x: 700 });
    assert.equal(viaWorld.secs, direct.secs, name);
    assert.deepEqual(viaWorld.osc.map(start), direct.osc.map(start), name);
    assert.equal(SFX[name], WORLD[name], `${name} is reachable by name`);
  }
});

test('every world before it sounds the twist as it did: a machine knocked flat, a clatter when shot down, a ratchet winding up to a clunk', () => {
  assert.ok(LOOKS.length >= 15);
  for (const look of LOOKS) {
    const kit = kitFor(look.music);
    if (kit.style === 'glass') continue;
    const w = `w${look.world}`;
    const wreck = run(WORLD.wreck, { x: 940 }, kit);
    assert.equal(wreck.secs, 0.45, w);
    assert.deepEqual(wreck.osc.map(start).sort((p, q) => p - q), [170, 820, 820 * 2.7], w);
    const down = run(WORLD.wreckDown, { x: 940 }, kit);
    assert.equal(down.secs, 0.5, w);
    assert.deepEqual(down.osc.map(start).sort((p, q) => p - q), [380, 380 * 1.41], w);
    assert.deepEqual(filters(down.nodes, 'lowpass').map((x) => x.frequency.calls[0][1]).sort((p, q) => p - q), [3200, 5000], w);
    const up = run(WORLD.reassemble, { x: 940 }, kit);
    assert.ok(near(up.secs, 0.776, 0.001), w);
    assert.equal(filters(up.nodes, 'highpass').length, 9, `${w}: nine ratchet clicks`);
    assert.deepEqual(up.osc.map((x) => x.type), ['sawtooth', 'sine'], `${w}: a servo whine and a clunk`);
  }
});

test('the mirror switches on with a bowed-glass swell: three notes of the scale swelling in together, each a pair a few cents apart, and a glint', () => {
  const { a, nodes, osc } = run(ON.mirror);
  const swell = osc.filter((x) => envOf(nodes, x).length === 3 && near(envOf(nodes, x)[1][2], a.t + 0.3, 1e-9));
  assert.equal(swell.length, 6, 'three notes, two voices each');
  assert.deepEqual([...new Set(swell.map((x) => x.detune.value))], [0, 5], 'the pairs beat');
  const notes = [...new Set(swell.map(start))].sort((p, q) => p - q);
  assert.equal(notes.length, 3);
  assert.ok(notes.every((f) => MELODIC.includes(pitchClass(f))));
  assert.ok(carrier(osc, 2.32), 'a glassy glint arrives with the twin');
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt > a.t && s.stopAt <= a.t + 0.9, 'a source left running');
  assert.ok(Math.max(...gainPeaks(nodes)) <= 0.22, `${gainPeaks(nodes)}`);
  const switchedOn = fakeVoice(KIT);
  assert.equal(POWER.powerOn(switchedOn.a, { kind: 'mirror' }), 0.6);
  assert.equal(oscillators(switchedOn.nodes).length, 8, "powerOn plays the power's own patch, not the spread fan");
});

test("the twin's ping is reachable by name, and thinned like the escorts' rattle: a cluster in one tick sounds once, the ship's fire rates sound shot by shot", async (t) => {
  assert.equal(SFX.mirrorShot, GLASS.mirrorShot);
  t.mock.timers.enable({ apis: ['setTimeout'] }); // the voices' clean-up timers need not run
  installAudio({ currentTime: 10 });
  const { unlockAudio, play, audioStats, audioNodes } = await import('../../src/ui/audio.js');
  unlockAudio();
  const { ctx } = audioNodes();
  const burst = (name, count, every) => {
    const before = audioStats().played;
    for (let i = 0; i < count; i++) {
      ctx.currentTime += every;
      play(name, { x: 1900 - i * 40 });
    }
    return audioStats().played - before;
  };
  assert.equal(burst('mirrorShot', 30, 0), 1, 'a cluster in one tick');
  ctx.currentTime += 5;
  assert.equal(burst('mirrorShot', 20, 11 / 60), 20, 'the base fire rate (11 ticks a shot): every shot pings');
  assert.equal(burst('mirrorShot', 20, 5 / 60), 10, 'rapid fire (5 ticks) is thinned to every other ping');
  assert.equal(burst('wreck', 3, 0), 3, "the mending is not thinned: no world's wreck ever was");
  assert.ok(audioStats().voices <= 12, `${audioStats().voices} voices ringing`);
  assert.equal(audioStats().failed, 0, audioStats().error);
});
