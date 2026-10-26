import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BREATH, RUN, cleanseBand, RISE } from '../../src/ui/sfx-breath.js';
import { SFX } from '../../src/ui/sfx.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { installAudio, fakeVoice } from './audio-kit.js';

const KIT = kitFor({ mood: 'breath', root: 'D#', scale: 'major', bpm: 122 });
const MAJOR_CHORD = [3, 7, 10]; // D sharp, G, A sharp: the first, third and fifth degrees
const PENTATONIC = [3, 5, 7, 10]; // D sharp F G A sharp: the run the ticks climb, no sixth and no leading tone
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
const envOf = (nodes, osc) => nodes[nodes.indexOf(osc) + 1].gain.calls; // the envelope tone() makes right after its oscillator: floor, peak, floor
const run = (patch, o, kit = KIT) => {
  const { a, nodes } = fakeVoice(kit);
  const secs = patch(a, o);
  return { a, nodes, secs, osc: oscillators(nodes) };
};

test('the breath is an inhale: noise rushing up from a deep rumble to a bright rush, swelling to the moment the front tops out and then gone', () => {
  const { a, nodes } = run(BREATH.breath, { dur: 0.8 });
  const [rush] = filters(nodes, 'bandpass');
  assert.deepEqual([rush.frequency.calls[0][1], rush.frequency.calls[1][1]], [220, 2600], 'the pitch of the air climbs');
  const [body] = filters(nodes, 'lowpass').filter((x) => x.frequency.calls[0][1] === 300);
  assert.ok(body && body.frequency.calls[1][1] === 1100, 'with a chest under it');
  const top = a.t + 0.72;
  const swells = nodes.filter((x) => x.kind === 'Gain' && x.gain.calls.length === 3 && near(x.gain.calls[1][2], top, 1e-9));
  assert.ok(swells.length >= 8, `${swells.length} voices all peak as the front tops out, at 90% of its rise`);
  const peaks = swells.map((x) => x.gain.calls[1][1]);
  assert.ok(Math.max(...peaks) <= 0.2, `${peaks}`);
});

test('a sub climbs from the root toward the third under it, and a major chord swells in over the last two thirds of the inhale', () => {
  const { a, nodes, osc } = run(BREATH.breath, { dur: 0.8 });
  const sub = osc.find((x) => x.type === 'sine' && start(x) < 100);
  assert.ok(near(start(sub), 77.78, 0.01), 'D sharp 2');
  assert.ok(near(sub.frequency.calls[1][1] / start(sub), 1.5, 1e-9));
  const chord = osc.filter((x) => x.type === 'triangle');
  assert.equal(chord.length, 5, 'root, third, fifth, octave and the third over it');
  assert.deepEqual(chord.map((x) => pitchClass(start(x))), [3, 7, 10, 3, 7]);
  assert.ok(chord.every((x) => MAJOR_CHORD.includes(pitchClass(start(x)))), 'a major triad on the world\'s first, third and fifth degrees');
  assert.deepEqual(chord.map((x) => Math.round(start(x) * 100) / 100), [311.13, 392, 466.16, 622.25, 783.99], 'D sharp 4 to G5: no note drifts, it blooms in tune');
  for (const x of chord) {
    const env = envOf(nodes, x);
    assert.ok(near(env[1][2], a.t + 0.72, 1e-9), 'every voice is full as the front tops out');
    assert.ok(env[1][2] - env[0][2] > 0.35, 'swelling in over the better part of half a second');
    assert.ok(env[2][2] - env[1][2] > 1, 'then ringing on for over a second: relief');
    assert.ok(when(x) > a.t + 0.2 && when(x) < a.t + 0.35, 'the swell begins a quarter of the way up');
  }
});

test('and it blooms: a shimmer of FM glass over the chord and a breath of air at the top, then a tail of about a second and a quarter', () => {
  const { a, nodes, osc, secs } = run(BREATH.breath, { dur: 0.8 });
  const ring = osc.find((x) => x.type === undefined && start(x) > 4000); // the modulator
  const car = osc.find((x) => x.type === 'sine' && near(start(x) * 3, start(ring), 1e-6));
  assert.ok(car && near(when(car), a.t + 0.72, 1e-9) && near(start(car), 1567.98, 0.01), 'a ratio-3 partner on G6 when the front tops out');
  assert.deepEqual(filters(nodes, 'highpass').map((x) => x.frequency.calls[0][1]), [7000], 'sparkle');
  assert.ok(near(secs, 0.72 + 1.3, 1e-9), `${secs} s`);
  noLeak(a, nodes, secs);
  assert.ok(Math.max(...gainPeaks(nodes)) <= 0.2);
});

test('the swell follows the length of the rise the event reports, and falls back to 0.8 s without one', () => {
  assert.equal(RISE, 0.8);
  const slow = run(BREATH.breath, { dur: 1.6 });
  const fast = run(BREATH.breath, { dur: 0.4 });
  const dflt = run(BREATH.breath, {});
  const topOf = (r) => r.nodes.find((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass').frequency.calls[1][2] - r.a.t;
  assert.ok(near(topOf(fast), 0.4 * 0.9 + 0.12, 1e-9) && near(topOf(slow), 1.6 * 0.9 + 0.12, 1e-9));
  assert.ok(fast.secs < dflt.secs && dflt.secs < slow.secs);
  assert.equal(dflt.secs, run(BREATH.breath, { dur: 0.8 }).secs);
  for (const r of [slow, fast, dflt]) noLeak(r.a, r.nodes, r.secs);
});

test('a cleansed bullet ticks: a chirp up into a note, a glint an octave over it and a puff of air, soft and over in a sixth of a second', () => {
  const { a, nodes, secs, osc } = run(BREATH.cleanse, { x: 960 });
  assert.equal(osc.length, 2);
  const [chirp, glint] = osc;
  assert.ok(chirp.type === 'sine' && near(chirp.frequency.calls[1][1] / start(chirp), 1 / 0.85, 1e-9), 'a chirp up');
  assert.ok(near(start(glint), chirp.frequency.calls[1][1] * 2, 1e-9), 'the glint an octave over where it lands');
  assert.deepEqual(filters(nodes, 'bandpass').map((x) => x.frequency.calls[0][1]), [6500], 'a puff of air');
  assert.ok(Math.max(...gainPeaks(nodes)) <= 0.08, `soft: ${gainPeaks(nodes)}`);
  assert.ok(secs > 0.1 && secs < 0.2, `${secs} s`);
  noLeak(a, nodes, secs);
});

test('the tick is higher the further right the bullet was: seven bands, a major run from D sharp 5 to G6 that cannot clash with the chord, at any x', () => {
  const land = (x) => run(BREATH.cleanse, { x }).osc[0].frequency.calls[1][1];
  const notes = XS.map(land);
  notes.forEach((f, i) => i && assert.ok(f > notes[i - 1], `band ${i}: ${notes}`));
  assert.ok(notes.every((f) => PENTATONIC.includes(pitchClass(f))), `${notes.map(pitchClass)}`);
  assert.ok(near(notes[0], 622.25, 0.01) && near(notes[6], 1567.98, 0.01), 'D sharp 5 on the left, G6 on the right');
  assert.equal(land(-50), notes[0], 'left of the screen is the lowest');
  assert.equal(land(4000), notes[6], 'right of it the highest');
  assert.ok(land(undefined) > 0, 'a tick without an x still sounds');
  assert.deepEqual([0, 274, 275, 960, 1919, 1920, 9999].map(cleanseBand), [0, 0, 1, 3, 6, 6, 6]);
  assert.deepEqual(RUN, [0, 1, 2, 4, 7, 8, 9]);
});

test('every look has the patches: they build in any world and stop everything they start', () => {
  for (const look of LOOKS) {
    for (const [patch, o] of [[BREATH.breath, { dur: 0.8 }], [BREATH.cleanse, { x: 700 }]]) {
      const { a, nodes, secs } = run(patch, o, kitFor(look.music));
      assert.ok(secs > 0.1 && secs < 3, `w${look.world}: ${secs}`);
      noLeak(a, nodes, secs);
    }
  }
  assert.equal(SFX.breath, BREATH.breath);
  assert.equal(SFX.cleanse, BREATH.cleanse);
});

test('the help is never thinned away but the ticks are: a breath sounds even when the voice budget is full, a cluster of ticks in one tick sounds once, a tick every 70 ms is kept', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); // the voices' clean-up timers need not run
  installAudio({ currentTime: 10 });
  const { unlockAudio, play, audioStats, audioNodes } = await import('../../src/ui/audio.js');
  unlockAudio();
  const { ctx } = audioNodes();
  const burst = (name, count, every, o = () => ({})) => {
    const before = audioStats().played;
    for (let i = 0; i < count; i++) {
      ctx.currentTime += every;
      play(name, { x: 1900 - i * 40, ...o(i) });
    }
    return audioStats().played - before;
  };
  assert.equal(burst('cleanse', 30, 0), 1, 'a cluster in one tick');
  ctx.currentTime += 5;
  assert.equal(burst('cleanse', 12, 0.08), 12, 'one every 80 ms: all kept');
  assert.equal(burst('cleanse', 24, 0.035), 12, 'a wipe of dozens in a few ticks is thinned to every other one');
  ctx.currentTime += 5;
  const wiped = burst('cleanse', 60, 0.012); // sixty bullets in 0.72 s, the worst a breath can do
  assert.ok(wiped <= 11, `${wiped} ticks for sixty bullets`);
  ctx.currentTime += 5;
  assert.equal(burst('wreck', 40, 0), 36, 'the voice budget is 36');
  assert.equal(burst('wreck', 1, 0), 0, 'a small sound is dropped when it is full');
  assert.equal(burst('breath', 1, 0, () => ({ dur: 0.8 })), 1, 'the help still sounds');
  assert.equal(audioStats().failed, 0, audioStats().error);
});
