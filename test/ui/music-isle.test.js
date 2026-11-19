import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { startLoop, fillLoop, stopLoop } from '../../src/ui/music.js';
import { DRUM } from '../../src/ui/music-drums.js';
import { ISLE_HITS, LEADS, SITAR, RUN, DAYAN, BAYAN, sitar } from '../../src/ui/music-isle.js';
import { noteHz, semis } from '../../src/ui/audio-kit.js';
import { fakeAudio, fakeVoice } from './audio-kit.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w21 from '../../src/ui/looks/w21.js';

// Golden Isle's music (looks/w21.js): a drone, a sitar and a tabla (music-isle.js; the owner asked for them, 2026-11-19), on a
// scale no other world uses.
const MUSIC = w21.music;
const KIT = kitFor(MUSIC);
const STEP = 60 / MUSIC.bpm / STYLES.isle.music.div;
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const TABLA = Object.keys(ISLE_HITS).join('');
const BASS = 'GDJER'; // the strokes that sound the bass drum
const sources = (nodes) => nodes.filter((n) => n.kind === 'Oscillator' || n.kind === 'BufferSource');
const starts = (nodes) => nodes.filter((n) => n.kind === 'Oscillator').map((n) => n.frequency.calls[0][1]);

test("world 21's music mood is its own: the look's entry gives the isle style, no other style's mood", () => {
  assert.deepEqual([KIT.style, KIT.root, KIT.bpm], ['isle', NOTES[MUSIC.root], MUSIC.bpm]);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'isle') assert.notEqual(s.mood, MUSIC.mood, name);
  for (const look of LOOKS.filter((l) => l.music !== MUSIC)) assert.notEqual(kitFor(look.music).style, 'isle', `world ${look.world}`);
});

test('its scale, the double harmonic major, is one no other world uses', () => {
  assert.deepEqual(KIT.scale, SCALES.doubleharmonic);
  for (const [name, scale] of Object.entries(SCALES)) if (name !== MUSIC.scale) assert.notDeepEqual(scale, SCALES.doubleharmonic, name);
  for (const look of LOOKS.filter((l) => l.music !== MUSIC)) assert.notEqual(look.music.scale, MUSIC.scale, `world ${look.world}`);
});

test('a drone on the root and fifth, a sitar for the lead, a tabla for the drums: teentaal from dha on one, the open bar without the bass after its first dha', () => {
  const m = STYLES.isle.music;
  assert.ok(m.drone.fifth, 'the drone holds the root and the fifth');
  assert.equal(m.lead.voice, 'sitar');
  assert.equal(LEADS.sitar, sitar);
  assert.match(m.drum, new RegExp(`^[${TABLA}.]+$`), 'the tabla alone: no bell, no choir, no hiss of cymbals');
  const bar = 4 * m.div;
  assert.equal(m.drum.length, 4 * bar, 'the sixteen beats of teentaal, a pass');
  assert.equal(m.drum[0], 'D', 'dha on one');
  const open = m.drum.slice(2 * bar + 1, 3 * bar);
  assert.ok(![...open].some((h) => BASS.includes(h)), `the open third bar on the treble drum alone after its first dha: ${open}`);
  assert.ok(STYLES.isle.wet <= 0.3, 'no tape echo: the strokes land once');
});

test("the tabla's letters are its own: in the drum table as they are, and in no other world's drum line or lead", () => {
  for (const [k, hit] of Object.entries(ISLE_HITS)) assert.equal(DRUM[k], hit, k);
  for (const [name, s] of Object.entries(STYLES)) {
    if (name === 'isle') continue;
    assert.ok(![...s.music.drum].some((h) => TABLA.includes(h)), `${name} plays no tabla`);
    assert.equal(s.music.lead.voice, undefined, `${name} keeps its own lead`);
  }
});

test('the tabla is tuned to the root and stays there through the progression, and every source a stroke starts stops', () => {
  const play = (k, shift) => {
    const { a, nodes } = fakeVoice(KIT);
    ISLE_HITS[k](a, a.t, { deg: shift, shift, step: 0 });
    return nodes;
  };
  for (const k of TABLA) {
    const home = play(k, 0);
    assert.deepEqual(starts(play(k, 5)), starts(home), `${k} does not follow the chord`);
    for (const s of sources(home)) assert.ok(s.started && s.stopAt !== null, `${k}: a source left running`);
  }
  for (const [k, oct] of [['N', DAYAN], ['I', DAYAN], ['G', BAYAN]]) {
    assert.ok(Math.abs(Math.min(...starts(play(k, 0))) - noteHz(KIT, 0, oct)) < 1e-6, `${k} sounds the root in octave ${oct}`);
  }
});

test('a tirakita is four strokes a sixteenth note apart', () => {
  const { a, nodes } = fakeVoice(KIT);
  ISLE_HITS.R(a, a.t, { deg: 0, shift: 0, step: 0 });
  const gap = 60 / KIT.bpm / RUN;
  const at = [...new Set(nodes.filter((n) => n.kind === 'Oscillator').map((n) => (n.frequency.calls[0][2] - a.t) / gap))];
  assert.deepEqual(at.map((i) => Math.round(i * 1e6) / 1e6).sort(), [...Array(RUN).keys()]);
});

test('the loop plays its sitar tune on the double harmonic major, pulling up into a note a short climb over the last', () => {
  const m = STYLES.isle.music;
  const nodes = fakeAudio();
  const c = startLoop(nodes, { music: MUSIC });
  fillLoop(c, 0.1 + m.seq.length * STEP - 0.01); // one pass
  const scale = SCALES.doubleharmonic.map((s) => (s + NOTES[MUSIC.root]) % 12);
  const strings = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator' && n.type === 'sawtooth' && n.frequency.calls.length);
  assert.equal(strings.length, 2 * m.seq.filter((d) => d !== null).length, 'a pluck a note of the tune: the buzzing string and its body');
  for (const n of strings) assert.ok(scale.includes(pitchClass(n.frequency.calls[0][1])), 'on the double harmonic major');
  const pulls = strings.filter((n) => n.frequency.calls.some(([k]) => k === 'cancel'));
  assert.ok(pulls.length > 0, 'some notes are pulled up into');
  for (const n of pulls) {
    const [, from, t] = n.frequency.calls.find(([k], i) => k === 'set' && i > 0);
    const [, to, end] = n.frequency.calls.at(-1);
    assert.ok(from < to && to / from <= semis(SITAR.pull) + 1e-9, `up by at most ${SITAR.pull} semitones`);
    assert.ok(Math.abs(end - t - SITAR.meend) < 1e-9, 'over the pull time');
  }
  assert.ok(nodes.ctx.nodes.every((n) => n.kind !== 'Gain' || n.gain.calls[2]?.[0] !== 'set'), 'no note holds its level');
  stopLoop(c);
});
