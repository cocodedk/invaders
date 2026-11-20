import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { DRUM } from '../../src/ui/music-drums.js';
import { PRESS_HITS, BASS, BASS_OCT, KICK, KEY, SLAM, BELL, RETURN, PLUCK } from '../../src/ui/music-press.js';
import { noteHz } from '../../src/ui/audio-kit.js';
import { fakeAudio } from './audio-kit.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w20 from '../../src/ui/looks/w20.js';

// Midnight Press's music (looks/w20.js): a newsroom racing its deadline, a typewriter over the press's beat, on a scale no other
// world uses (the owner found the old slow pulse gloomy and sad and asked for more beats, a typewriter and action, 2026-11-20).
const MUSIC = w20.music;
const M = STYLES.press.music;
const KIT = kitFor(MUSIC);
const STEP = 60 / MUSIC.bpm / M.div;
const PASS = M.seq.length;
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const next = (n) => [...n.out][0];
const cutOf = (n) => (next(n)?.kind === 'BiquadFilter' ? next(n).frequency.calls[0][1] : null);
const sorted = (list) => list.toSorted((p, q) => startOf(p) - startOf(q));
const bars = (steps) => [0, 1, 2, 3].flatMap((bar) => steps.map((s) => bar * 16 + s));
const close = (p, q) => Math.abs(p - q) < 0.01;

// `passes` passes of the 64-step tune, sorted into the loop's voices.
function play(passes = 1) {
  const nodes = fakeAudio();
  const c = startLoop(nodes, { music: MUSIC });
  fillLoop(c, 0.1 + PASS * passes * STEP - 0.01);
  const all = nodes.ctx.nodes;
  const played = all.filter((n) => n.kind === 'Oscillator' && n.frequency.calls.length);
  const carriers = played.filter((n) => all.some((g) => g.out.has(n.frequency)));
  const band = (hz) => sorted(all.filter((n) => n.kind === 'BiquadFilter' && n.type === 'bandpass' && hz.includes(n.frequency.calls[0]?.[1])));
  return {
    c, all,
    lead: sorted(carriers.filter((n) => cutOf(n) === M.lead.cut)),
    bell: sorted(carriers.filter((n) => cutOf(n) === BELL.cut)),
    iron: sorted(carriers.filter((n) => first(n) === SLAM.iron)),
    kick: sorted(played.filter((n) => first(n) === KICK.f0 && n.frequency.calls[1][1] === KICK.f1)),
    bass: sorted(played.filter((n) => n.type === 'sawtooth' && cutOf(n) === PLUCK.cut)),
    keys: band(KEY.hz), crack: band([SLAM.crack]),
    teeth: all.filter((n) => n.kind === 'BiquadFilter' && n.type === 'bandpass' && n.Q.value === RETURN.q),
  };
}

test("world 20's music mood is its own: the look's entry gives the press style, no other style's mood", () => {
  assert.deepEqual([KIT.style, KIT.root, KIT.bpm], ['press', NOTES[MUSIC.root], MUSIC.bpm]);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'press') assert.notEqual(s.mood, MUSIC.mood, name);
  for (const look of LOOKS.filter((l) => l.music !== MUSIC)) assert.notEqual(kitFor(look.music).style, 'press', `world ${look.world}`);
});

test('its scale is one no other world uses', () => {
  assert.deepEqual(KIT.scale, SCALES.night);
  for (const [name, scale] of Object.entries(SCALES)) if (name !== MUSIC.scale) assert.notDeepEqual(scale, SCALES.night, name);
  for (const look of LOOKS.filter((l) => l.music !== MUSIC)) assert.notEqual(look.music.scale, MUSIC.scale, `world ${look.world}`);
});

test('nothing gloomy: a major key with no flat second or minor third, at a dance tempo, four bars of sixteenths to a pass', () => {
  assert.ok(SCALES.night.includes(4) && !SCALES.night.includes(1) && !SCALES.night.includes(3), 'a major third, no flat second');
  assert.ok(MUSIC.bpm >= 120, 'a dance tempo, not a slow pulse');
  assert.equal(M.div, 4);
  assert.equal(M.drum.length, PASS);
  assert.ok(STYLES.press.wet <= 0.3, 'no tape echo: every hit lands once');
});

test("the press's beat: a stamp on one and three of every bar, the slam on two and four, the keys rattling between with rests", () => {
  const { kick, crack, iron, keys } = play();
  for (const s of bars([0, 8])) assert.ok(kick.some((n) => stepOf(n) === s), `a stamp at step ${s}`);
  assert.ok(kick.length < PASS / 4, 'not a kick on every beat: not world 17\'s four on the floor');
  assert.deepEqual(crack.map(stepOf), bars([4, 12]), 'the slam on the backbeat of every bar');
  assert.deepEqual(iron.map(stepOf), crack.map(stepOf), 'an iron clank under each slam');
  for (let bar = 0; bar < 4; bar++) {
    const line = M.drum.slice(bar * 16, bar * 16 + 16);
    assert.ok(line.includes('.'), `bar ${bar + 1} has rests`);
    assert.ok(keys.filter((n) => Math.floor(stepOf(n) / 16) === bar).length >= 5, `a typist at work in bar ${bar + 1}`);
  }
});

test("each key is struck and gone, at a lower peak than the stamp, and no two keys running sound the same", () => {
  const { keys, all } = play();
  for (const f of keys) {
    const src = all.find((s) => s.kind === 'BufferSource' && s.out.has(f));
    assert.ok(src.stopAt - startOf(f) < STEP, 'gone within its step');
  }
  const bands = keys.map((n) => n.frequency.calls[0][1]);
  for (let i = 1; i < bands.length; i++) if (stepOf(keys[i]) - stepOf(keys[i - 1]) === 1) assert.notEqual(bands[i], bands[i - 1]);
  assert.ok(KEY.peak < KICK.peak && KEY.dur < STEP / 4, 'a click, under the stamp');
});

test('the bass plucks the chord: its root under the stamp, its fifth under a key; under the raised fourth it is E, a major third under the chord, so the chord is an E7', () => {
  const { bass, c } = play(8);
  const drum = (n) => M.drum[stepOf(n) % PASS];
  const bassHz = (shift, which) => noteHz(c.kit, BASS[shift][which], BASS_OCT);
  for (const [p, shift] of [[0, 0], [4, 5], [6, 3]]) {
    const pass = bass.filter((n) => Math.floor(stepOf(n) / PASS) === p);
    assert.ok(pass.length > 0);
    for (const n of pass) assert.ok(close(first(n), bassHz(shift, drum(n) === 'X' ? 0 : 1)), `pass ${p} step ${stepOf(n)}`);
  }
  const fourth = noteHz(KIT, 3, 3); // the tune's chord over the third shift starts on the raised fourth (G sharp in D)
  assert.equal((pitchClass(fourth) - pitchClass(bassHz(3, 0)) + 12) % 12, 4, 'a major third under it');
  assert.equal(pitchClass(bassHz(3, 0)), (NOTES[MUSIC.root] + SCALES.night[1]) % 12, 'E');
});

test('at the end of each pass the margin bell rings, the carriage ratchets back before the next stamp, and nothing else plays under it', () => {
  const { bell, teeth, kick } = play();
  assert.equal(bell.length, 1, 'once a pass');
  const at = stepOf(bell[0]);
  assert.ok(at > PASS - 16, 'in the last bar');
  assert.ok(close(first(bell[0]), noteHz(KIT, 0, BELL.oct)), 'high on the root');
  assert.equal(teeth.length, RETURN.clicks);
  const times = teeth.map((n) => n.frequency.calls[0][2]).sort((p, q) => p - q);
  const hz = teeth.toSorted((p, q) => p.frequency.calls[0][2] - q.frequency.calls[0][2]).map((n) => n.frequency.calls[0][1]);
  assert.ok(times[0] > startOf(bell[0]), 'after the bell');
  assert.ok(times.at(-1) < 0.1 + PASS * STEP, 'back before the next stamp');
  assert.ok(hz.every((f, i) => i === 0 || f < hz[i - 1]), 'the ratchet falls in pitch');
  assert.match(M.drum.slice(at + 1), /^\.+$/, 'rests after the bell');
  assert.ok(kick.every((n) => stepOf(n) < at), 'no stamp under the return');
});

test('a punchy stab plays the tune: one FM tone on a whole ratio a note, on the scale, with more rests than notes', () => {
  const { lead } = play();
  assert.equal(lead.length, M.seq.filter((d) => d !== null).length);
  assert.ok(Number.isInteger(M.lead.fm.ratio), 'a whole ratio: a tone, not a clang');
  const scale = SCALES.night.map((s) => (s + NOTES[MUSIC.root]) % 12);
  for (const n of lead) assert.ok(scale.includes(pitchClass(first(n))), 'on the scale');
  assert.ok(M.seq.filter((d) => d === null).length > PASS / 2);
});

test("its letters are its own: in the drum table as they are, and in no other world's drum line", () => {
  for (const [k, hit] of Object.entries(PRESS_HITS)) assert.equal(DRUM[k], hit, k);
  const mine = new RegExp(`[${Object.keys(PRESS_HITS).join('')}]`);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'press') assert.ok(!mine.test(s.music.drum), `${name} plays none of them`);
  assert.match(M.drum, new RegExp(`^[${Object.keys(PRESS_HITS).join('')}.]+$`), 'and it plays only its own');
});
