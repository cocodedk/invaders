import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { startLoop, fillLoop, stopLoop } from '../../src/ui/music.js';
import { fakeAudio } from './audio-kit.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w21 from '../../src/ui/looks/w21.js';

// Golden Isle's music (looks/w21.js, read directly until the look is listed): a drone and a plucked string over deep drums, on a
// scale no other world uses.
const MUSIC = w21.music;
const STEP = 60 / MUSIC.bpm / STYLES.isle.music.div;
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;

test("world 21's music mood is its own: the look's entry gives the isle style, no other style's mood", () => {
  const kit = kitFor(MUSIC);
  assert.deepEqual([kit.style, kit.root, kit.bpm], ['isle', NOTES[MUSIC.root], MUSIC.bpm]);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'isle') assert.notEqual(s.mood, MUSIC.mood, name);
  for (const look of LOOKS.filter((l) => l.music !== MUSIC)) assert.notEqual(kitFor(look.music).style, 'isle', `world ${look.world}`);
});

test('its scale, the double harmonic major, is one no other world uses', () => {
  const kit = kitFor(MUSIC);
  assert.deepEqual(kit.scale, SCALES.doubleharmonic);
  for (const [name, scale] of Object.entries(SCALES)) if (name !== MUSIC.scale) assert.notDeepEqual(scale, SCALES.doubleharmonic, name);
  for (const look of LOOKS.filter((l) => l.music !== MUSIC)) assert.notEqual(look.music.scale, MUSIC.scale, `world ${look.world}`);
});

test('calm struck tones over deep drums: a drone on the root and fifth, a plucked string, and only timpani, taiko, kick and bass', () => {
  const m = STYLES.isle.music;
  assert.ok(m.drone.fifth, 'the drone holds the root and the fifth');
  assert.ok(Number.isInteger(m.lead.fm?.ratio), 'the lead is a string plucked on a whole FM ratio');
  for (const key of ['hold', 'attack', 'glide', 'bow', 'cut1']) assert.equal(m.lead[key], undefined, `struck and ringing out: no ${key}`);
  assert.match(m.drum, /^[ptkz.]+$/, 'deep drums alone: no bell, no choir, no hiss of cymbals');
  const bar = 4 * m.div;
  for (let i = 0; i < m.drum.length; i += bar) assert.equal(m.drum[i], 'p', `the tuned timpani opens the bar at step ${i}`);
  assert.ok(STYLES.isle.wet <= 0.3, 'no tape echo: the drums land once');
});

test('the loop plays its plucked tune on the double harmonic major, and as the shared checks hold every loop to', () => {
  const m = STYLES.isle.music;
  const nodes = fakeAudio();
  const c = startLoop(nodes, { music: MUSIC });
  fillLoop(c, 0.1 + m.seq.length * STEP - 0.01); // one pass
  const scale = SCALES.doubleharmonic.map((s) => (s + NOTES[MUSIC.root]) % 12);
  const notes = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator' && n.frequency.calls.length && n.type === 'sine');
  const lead = notes.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency))); // the FM carriers: the plucked string
  assert.equal(lead.length, m.seq.filter((d) => d !== null).length, 'one pluck a note of the tune');
  for (const n of lead) assert.ok(scale.includes(pitchClass(n.frequency.calls[0][1])), 'on the double harmonic major');
  const filters = nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'lowpass' && n.Q.value === 1.5);
  assert.ok(filters.length > 0 && filters.every((n) => n.frequency.calls.length === 1), "a lead note's filter stays put");
  assert.ok(nodes.ctx.nodes.every((n) => n.kind !== 'Gain' || n.gain.calls[2]?.[0] !== 'set'), 'no note holds its level');
  const slides = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator' && n.frequency.calls.length === 2 && n.frequency.calls[1][1] !== n.frequency.calls[0][1]);
  assert.ok(slides.every((n) => n.stopAt - n.frequency.calls[0][2] < 1), 'no long note slides');
  stopLoop(c);
});
