import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { startLoop, fillLoop } from '../../src/ui/music.js';
import { DRUM } from '../../src/ui/music-drums.js';
import { ROAD_HITS, BASS, BASS_OCT, KICK, PLUCK, CLAP, PAD } from '../../src/ui/music-road.js';
import { noteHz } from '../../src/ui/audio-kit.js';
import { fakeAudio } from './audio-kit.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w22 from '../../src/ui/looks/w22.js';

// Wanderlight's music (looks/w22.js): a quiet journey at dawn through a grey valley that colour comes back to. A plucked lead and a warm
// pad in a major key over a stomp-and-clap bounce, never gloomy (w20's, 2026-11-20) and never a racing pulse or four on the floor (w17's,
// 2026-10-26). Its loudness is matched offline to the other loops (memory/music-loudness.md); node has no OfflineAudioContext, so no test
// here can measure it.
const MUSIC = w22.music;
const M = STYLES.road.music;
const KIT = kitFor(MUSIC);
const STEP = 60 / MUSIC.bpm / M.div;
const PASS = M.seq.length;
const CHORDS = 4; // passes go round in this many chords (music.js PROGRESSION), two passes each
const MAJOR = SCALES.major.map((s) => (s + NOTES[MUSIC.root]) % 12);
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
const startOf = (n) => n.frequency.calls[0][2];
const stepOf = (n) => Math.round((startOf(n) - 0.1) / STEP);
const next = (n) => [...n.out][0];
const filterOf = (n) => (next(n)?.kind === 'BiquadFilter' ? next(n) : null);
const cutOf = (n) => filterOf(n)?.frequency.calls[0][1] ?? null;
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
  const end = (n) => { // where a voice's chain ends: the loop's bus (past the echo) or the echo's input
    let at = n;
    while (at && at !== c.a.dry && at !== c.a.out) at = next(at);
    return at;
  };
  const band = (hz) => sorted(all.filter((n) => n.kind === 'BiquadFilter' && n.type === 'bandpass' && n.frequency.calls[0]?.[1] === hz));
  return {
    c, all, end, played,
    lead: sorted(played.filter((n) => cutOf(n) === M.lead.cut)),
    kick: sorted(played.filter((n) => first(n) === KICK.f0 && n.frequency.calls[1][1] === KICK.f1)),
    bass: sorted(played.filter((n) => n.type === 'triangle' && cutOf(n) === PLUCK.cut)),
    pad: sorted(played.filter((n) => n.type === 'triangle' && cutOf(n) === PAD.cut)),
    hands: band(CLAP.hz), room: band(CLAP.roomHz),
  };
}

test("world 22's music mood is its own: the look's entry gives the road style, no other style's mood, no other look plays it", () => {
  assert.deepEqual([KIT.style, KIT.root, KIT.bpm], ['road', NOTES[MUSIC.root], MUSIC.bpm]);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'road') assert.notEqual(s.mood, MUSIC.mood, name);
  for (const look of LOOKS.filter((l) => l.music !== MUSIC)) {
    assert.notEqual(kitFor(look.music).style, 'road', `world ${look.world}`);
    assert.notEqual(look.music.bpm, MUSIC.bpm, `world ${look.world} has its own tempo`);
  }
});

test('nothing gloomy: a major key with a major third and no flat second or minor third, at a dance tempo, never a racing pulse', () => {
  assert.deepEqual(KIT.scale, SCALES.major);
  assert.ok(KIT.scale.includes(4) && !KIT.scale.includes(1) && !KIT.scale.includes(3), 'a major third, no flat second, no minor third');
  assert.ok(MUSIC.bpm >= 110 && MUSIC.bpm < 130, 'a dance tempo, not a slow pulse and not a race');
  assert.equal(M.div, 4, 'a step is a sixteenth: bars() counts sixteen to a bar');
  assert.equal(M.seq.length, 64);
  assert.equal(M.drum.length, PASS);
  const { kick } = play();
  assert.ok(kick.length <= PASS / 4 + 2 && kick.length >= PASS / 8, `a kick or two a bar, not four on the floor: ${kick.length} in a pass`);
  for (const bar of [0, 1, 2, 3]) {
    const line = M.drum.slice(bar * 16, bar * 16 + 16);
    assert.ok(line.replaceAll('.', '').length <= 8, `bar ${bar + 1} never hits on every eighth: ${line}`);
    assert.ok(line.includes('.'), `bar ${bar + 1} has rests`);
  }
  assert.equal(M.lead.bow, undefined, 'no twin voice beating against the note');
  assert.notEqual(M.lead.wave, 'sawtooth', 'no sawtooth lead');
  const cycle = PASS * CHORDS * 2 * STEP;
  assert.ok(cycle > 55 && cycle < 80, `the four chords go round in ${cycle} s`);
});

test('the beat: a kick with the bass on one and three of every bar, a clap on two and four, the bass pushing on the off-beats, a kick on the "and of three" in bars two and four', () => {
  const { kick, hands, bass } = play();
  for (const s of bars([0, 8])) assert.ok(kick.some((n) => stepOf(n) === s), `a kick at step ${s}`);
  assert.deepEqual([...new Set(kick.map(stepOf))].filter((s) => s % 8 !== 0), [26, 58], 'and one on the "and of three" in bars two and four');
  assert.deepEqual([...new Set(hands.map(stepOf))], bars([4, 12]), 'a clap on the backbeat of every bar, and no other');
  const offBeats = [...new Set(bass.map(stepOf))].filter((s) => s % 8 !== 0 && s % 8 !== 2);
  assert.deepEqual(offBeats, bars([6, 14]), 'the bass alone after two and after four');
});

test('a clap is three hands a hair apart and then a short room', () => {
  const { hands, room } = play();
  assert.equal(CLAP.hands.length, 3);
  assert.equal(hands.length, 8 * CLAP.hands.length, 'two claps a bar, four bars');
  assert.equal(room.length, 8, 'and a room after each');
  const [h0, h1, h2] = hands.slice(0, 3).map(startOf);
  assert.ok(h1 > h0 && h2 > h1 && h2 - h0 < CLAP.room, 'a hair apart, then the room');
  assert.ok(Math.abs(startOf(room[0]) - h0 - CLAP.room) < 1e-9 && CLAP.roomDur < STEP, 'a short one');
});

test('the kick, the bass and the claps play dry, past the echo; only the lead and the pad ring through it', () => {
  const { c, kick, bass, lead, pad, hands, room, end } = play();
  assert.notEqual(c.a.out, c.a.dry, 'there is an echo');
  for (const n of [...kick, ...bass, ...hands, ...room]) assert.equal(end(n), c.a.dry);
  for (const n of [...lead, ...pad]) assert.equal(end(n), c.a.out);
});

test('the bass plucks the chord: its root under a kick, its fifth after two, its root an octave up after four, on every chord of the progression', () => {
  const { bass, c } = play(8);
  const drum = (n) => M.drum[stepOf(n) % PASS];
  const bassHz = (shift, which) => noteHz(c.kit, BASS[shift][which], BASS_OCT);
  for (const [p, shift] of [[0, 0], [4, 5], [6, 3]]) {
    const pass = bass.filter((n) => Math.floor(stepOf(n) / PASS) === p);
    assert.ok(pass.length > 0);
    for (const n of pass) {
      const step = stepOf(n) % 16;
      const want = step === 6 ? bassHz(shift, 1) : step === 14 ? noteHz(c.kit, BASS[shift][0] + 7, BASS_OCT) : bassHz(shift, 0);
      assert.ok(close(first(n), want), `pass ${p} step ${stepOf(n)} (${drum(n)})`);
    }
  }
});

test('a plucked lead plays the tune: an FM tone on a whole ratio, struck at once and dying away, on the scale in every chord, with more rests than notes', () => {
  const { lead } = play(8);
  const L = M.lead;
  assert.ok(Number.isInteger(L.fm.ratio), 'a whole ratio: a string, not a clang');
  assert.equal(L.wave, 'sine');
  assert.ok(L.hold === undefined && L.glide === undefined && L.attack === undefined && L.cut1 === undefined && !L.voice, 'no swell, no hold, no slide');
  assert.ok(L.gain > 0 && L.gain < 0.2);
  assert.equal(lead.length, M.seq.filter((d) => d !== null).length * 8);
  for (const n of lead) {
    assert.ok(MAJOR.includes(pitchClass(first(n))), `on the scale: ${first(n)}`);
    const env = next(filterOf(n));
    assert.ok(env.gain.calls[1][2] - env.gain.calls[0][2] < 0.01, 'struck within 10 ms');
  }
  const first1 = lead.filter((n) => stepOf(n) < PASS);
  const gaps = first1.slice(1).map((n, i) => stepOf(n) - stepOf(first1[i]));
  assert.ok(Math.min(...gaps) >= 2, 'never two notes in a row');
  assert.ok(M.seq.filter((d) => d === null).length > PASS / 2, 'more rests than notes');
});

test('a warm pad swells in just after the downbeat of every second bar: the chord\'s root, fifth and octave, smooth triangles with no twin voice', () => {
  const { pad, c } = play(8);
  assert.deepEqual([...new Set(pad.map((n) => stepOf(n) % PASS))], [1, 33], 'bars one and three');
  assert.ok(PAD.attack >= 0.5, 'it swells, it does not strike');
  assert.equal(pad.length, 2 * PAD.chord.length * 8);
  assert.ok(pad.every((n) => !n.detune.value && MAJOR.includes(pitchClass(first(n)))), 'on the scale, none detuned');
  const chord = pad.filter((n) => stepOf(n) === 1);
  assert.deepEqual(chord.map(first), PAD.chord.map((d) => noteHz(c.kit, d, PAD.oct)), 'the home chord first');
});

test('every pitched voice stays on the major scale through all four chords of the progression', () => {
  const { lead, bass, pad } = play(CHORDS * 2);
  for (const n of [...lead, ...bass, ...pad]) assert.ok(MAJOR.includes(pitchClass(first(n))), `${first(n)} Hz`);
  assert.equal(new Set(bass.map((n) => pitchClass(first(n)))).size > 3, true, 'and the bass does move with the chords');
});

test("its letters are its own: in the drum table as they are, and in no other world's drum line", () => {
  for (const [k, hit] of Object.entries(ROAD_HITS)) assert.equal(DRUM[k], hit, k);
  const mine = new RegExp(`[${Object.keys(ROAD_HITS).join('')}]`);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'road') assert.ok(!mine.test(s.music.drum), `${name} plays none of them`);
  assert.match(M.drum, new RegExp(`^[${Object.keys(ROAD_HITS).join('')}.]+$`), 'and it plays only its own');
});
