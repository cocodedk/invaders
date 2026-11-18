import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { fakeAudio } from './audio-kit.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w20 from '../../src/ui/looks/w20.js';

// Midnight Press's music (looks/w20.js): a night-press mood, a slow mechanical pulse, on a scale no other world uses.
const MUSIC = w20.music;
const STEP = 60 / MUSIC.bpm / STYLES.press.music.div;
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;

test("world 20's music mood is its own: the look's entry gives the press style, no other style's mood", () => {
  const kit = kitFor(MUSIC);
  assert.deepEqual([kit.style, kit.root, kit.bpm], ['press', NOTES[MUSIC.root], MUSIC.bpm]);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'press') assert.notEqual(s.mood, MUSIC.mood, name);
  for (const look of LOOKS) assert.notEqual(kitFor(look.music).style, 'press', `world ${look.world}`);
});

test('its scale is one no other world uses', () => {
  const kit = kitFor(MUSIC);
  assert.deepEqual(kit.scale, SCALES.night);
  for (const [name, scale] of Object.entries(SCALES)) if (name !== MUSIC.scale) assert.notDeepEqual(scale, SCALES.night, name);
  for (const look of LOOKS) assert.notEqual(look.music.scale, MUSIC.scale, `world ${look.world}`);
});

test('a slow mechanical pulse: a hit on every step, a kick or a clank on each beat and a tick between, and the loop plays on its scale', () => {
  const m = STYLES.press.music;
  assert.ok(![...m.drum].includes('.'), 'the press never stops turning');
  for (let i = 0; i < m.drum.length; i += m.div) assert.match(m.drum[i], /[kzs]/, `a beat at step ${i}`);
  for (let i = 1; i < m.drum.length; i += m.div) assert.equal(m.drum[i], 'h', `a tick at step ${i}`);
  const nodes = fakeAudio();
  const c = startLoop(nodes, { music: MUSIC });
  fillLoop(c, 0.1 + m.seq.length * STEP - 0.01); // one pass
  const night = SCALES.night.map((s) => (s + NOTES[MUSIC.root]) % 12);
  const notes = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator' && n.frequency.calls.length && n.type === 'sine');
  assert.ok(notes.length > 0, 'it plays');
  const lead = notes.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency))); // the FM carriers: the struck type metal
  assert.equal(lead.length, m.seq.filter((d) => d !== null).length, 'one clang a note of the tune');
  for (const n of lead) assert.ok(night.includes(pitchClass(n.frequency.calls[0][1])), 'on the night scale');
});
