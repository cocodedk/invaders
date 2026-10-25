import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { STYLES, kitFor } from '../../src/ui/sound-data.js';
import { fakeAudio } from './audio-kit.js';

// Lantern Deep's music entry (looks/w15.js repeats it; sounds.test.js pins that).
const LOOK = { music: { mood: 'abyss', root: 'F#', scale: 'pentatonic', bpm: 54 } };
const STEP = 60 / 54 / 4; // a sixteenth of a beat at 54 bpm
const PENTATONIC = [6, 9, 11, 1, 4]; // F sharp A B C sharp E, as pitch classes
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const near = (x, y, tol = 0.05) => Math.abs(x - y) < tol;
const secs = (n) => n.stopAt - startOf(n);

// `passes` passes of the 32-step sequence (two bars of four beats), sorted into the loop's voices.
function play(passes = 1) {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOK);
  fillLoop(c, 0.1 + 32 * passes * STEP - 0.01);
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const carriers = osc.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency))); // the FM tones: what a modulator drives
  const played = osc.filter((n) => n.frequency.calls.length);
  return {
    nodes, c, osc, carriers,
    whale: played.filter((n) => n.type === 'sine' && secs(n) > 3 && !carriers.includes(n)),
    lub: played.filter((n) => near(first(n), 111) && near(n.frequency.calls[1][1], 46.25)),
    dub: played.filter((n) => near(first(n), 134.1) && near(n.frequency.calls[1][1], 55.5)),
    harp: carriers.filter((n) => secs(n) > 1),
    pad: played.filter((n) => n.type === 'triangle'),
  };
}
const envOf = (n) => { // the gain that shapes an oscillator's note, past its lowpass if it has one
  const next = [...n.out][0];
  return next.kind === 'BiquadFilter' ? [...next.out][0] : next;
};

test("Lantern Deep's loop is slow: two bars of four beats in sixteenth-note steps at 54 bpm, on the five notes of F sharp minor pentatonic", () => {
  const { c } = play();
  assert.deepEqual([c.kit.style, c.kit.bpm, c.kit.root, c.m.div], ['abyss', 54, 6, 4]);
  assert.equal(c.kit.scale.length, 5);
  assert.equal(c.m.seq.length, 32, 'two bars of sixteen steps');
  assert.equal(c.m.drum.length, 32);
  assert.equal(c.m.seq.length % (4 * c.m.div), 0, 'whole bars of four beats');
  assert.ok(!/[kths]/.test(c.m.drum), 'no kick, no hat, no snare: a heart, a harp and a pad');
});

test("the whale's call is four long sine notes that swell in over a second and slide on to the next note, so the line never stops moving", () => {
  const { whale } = play();
  assert.deepEqual(whale.map(stepOf), [0, 10, 16, 26]);
  assert.deepEqual(whale.map((n) => Math.round(first(n) * 10) / 10), [370, 493.9, 554.4, 440], 'F4 sharp, B4, C sharp 5, A4');
  whale.forEach((n, i) => {
    assert.ok(near(n.frequency.calls[1][1], first(whale[(i + 1) % 4])), `note ${i} slides to where the next one begins`);
    assert.ok(n.frequency.calls[1][1] !== first(n), `note ${i} moves`);
    assert.ok(secs(n) > 3.5 && secs(n) < 4, `${secs(n)} s: it rings across the next note`);
    const env = envOf(n).gain.calls;
    assert.ok(near(env[1][2] - env[0][2], 4 * STEP, 1e-9) && env[1][2] - env[0][2] > 1, 'four steps to swell in, over a second');
    assert.equal(env[1][1], STYLES.abyss.music.lead.gain);
  });
  assert.ok(whale.every((n) => PENTATONIC.includes(pitchClass(first(n)))));
});

test("a giant's heart beats on the first and third beat of each bar: a lub on the root, and a lighter dub a sixteenth later", () => {
  const { lub, dub } = play();
  assert.deepEqual(lub.map(stepOf), [0, 8, 16, 24]);
  assert.deepEqual(dub.map(stepOf), [1, 9, 17, 25]);
  assert.ok(lub.every((n) => near(first(n) / 1.2, 92.5, 0.1)), 'on F sharp 2, sagging an octave');
  assert.ok(envOf(lub[0]).gain.calls[1][1] > envOf(dub[0]).gain.calls[1][1] * 1.5, 'the dub is lighter');
  assert.ok(lub.every((n) => n.type === 'sine' && secs(n) < 0.4), 'a thump, not a note');
});

test('a harp plucks nine chord notes in two bars, each with a whole-number FM partner so it rings like a string, never twice the same run', () => {
  const { harp, osc } = play();
  assert.deepEqual(harp.map(stepOf), [4, 6, 10, 12, 14, 20, 26, 28, 30]);
  assert.ok(harp.every((n) => PENTATONIC.includes(pitchClass(first(n)))));
  assert.ok(harp.every((n) => first(n) > 360 && first(n) < 760), 'around F sharp 4 to F sharp 5');
  assert.ok(harp.every((n) => osc.some((m) => near(first(m), first(n) * 3, 1e-6))), 'a partner at three times');
  assert.ok(harp.every((n) => secs(n) > 1.4), 'ringing long in the deep');
  const run = (bar) => harp.filter((n) => stepOf(n) >= bar * 16 && stepOf(n) < bar * 16 + 16).map((n) => Math.round(first(n)));
  assert.notDeepEqual(run(0), run(1), 'the second bar plays another figure');
});

test('a low pad swells in on each bar: the chord root, fourth and fifth, each two detuned triangle voices, bowed in over a second', () => {
  const { pad, nodes } = play();
  assert.deepEqual(pad.map(stepOf), [2, 2, 2, 2, 2, 2, 18, 18, 18, 18, 18, 18]);
  assert.deepEqual([...new Set(pad.map((n) => Math.round(first(n) * 10) / 10))], [185, 246.9, 277.2], 'F sharp 3, B3 and C sharp 4');
  assert.ok(pad.some((n) => n.detune.value < 0) && pad.some((n) => n.detune.value > 0), 'detuned both ways');
  assert.ok(pad.every((n) => secs(n) > 3.5), 'each rings across the bar');
  assert.ok(pad.every((n) => near(envOf(n).gain.calls[1][2] - envOf(n).gain.calls[0][2], 1.2, 1e-9)), 'swelling in over 1.2 s');
  const soft = nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'lowpass' && first(n) === 700);
  assert.equal(soft.length, 12, 'through a lowpass at 700 Hz');
});

test('the whole chord progression stays on the five notes: the pad and the tune move to F sharp an octave up and to C sharp, never off the scale', () => {
  const { c, whale, harp, pad } = play(8); // eight passes: the four chords, two passes each
  assert.equal(c.m.seq.length * 8, 256);
  assert.equal(whale.length, 32);
  assert.equal(harp.length, 72);
  assert.equal(pad.length, 96);
  assert.ok([...whale, ...harp, ...pad].every((n) => PENTATONIC.includes(pitchClass(first(n)))));
  const roots = Array.from({ length: 16 }, (_, bar) => Math.min(...pad.filter((n) => stepOf(n) === bar * 16 + 2).map((n) => Math.round(first(n)))));
  assert.deepEqual(roots, [...Array(8).fill(185), ...Array(4).fill(370), ...Array(4).fill(277)], 'F sharp 3, an octave up, then C sharp 4');
  assert.ok(Math.max(...whale.flatMap((n) => [first(n), n.frequency.calls[1][1]])) < 1200, 'the call stays under the harp\'s top');
});

test("Lantern Deep's drone is a quiet sub under the call, the call is the loudest voice, and the loop is wet with the tape echo", () => {
  const { nodes, c } = play();
  const m = STYLES.abyss.music;
  assert.ok(m.drone.gain < m.lead.gain / 8, 'the drone sits far under the lead');
  assert.deepEqual([m.drone.wave, m.lead.wave], ['sine', 'sine']);
  assert.ok(kitFor(LOOK.music).wet > 0.3, 'wet enough for the echo');
  const echo = nodes.ctx.nodes.filter((n) => n.kind === 'Delay');
  assert.equal(echo.length, 1);
  assert.ok(near(echo[0].delayTime.value, (60 / 54) * 0.75, 1e-9), 'a dotted eighth: three quarters of a beat');
  assert.ok(c.sources.length > 0);
});
