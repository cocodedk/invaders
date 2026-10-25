import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS } from '../../src/ui/sfx-boss.js';
import { UI } from '../../src/ui/sfx-ui.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

const PATCHES = [
  ['phase 1', BOSS.phase, { phase: 1 }], ['phase 2', BOSS.phase, { phase: 2 }], ['bossDeath', BOSS.bossDeath, {}],
  ['waveClear', UI.waveClear, {}], ['cleared', UI.cleared, {}], ['failed', UI.failed, {}], ['start', UI.start, {}],
];

test("the boss's roar and the stingers build in every world's style and stop every source they start", () => {
  for (const look of LOOKS) {
    for (const [name, patch, o] of PATCHES) {
      const { a, nodes } = fakeVoice(kitFor(look.music));
      const secs = patch(a, o);
      assert.ok(secs > 0 && secs < 6, `w${look.world} ${name}: ${secs}`);
      const sources = nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource');
      assert.ok(sources.length > 0, name);
      for (const s of sources) assert.ok(s.started && s.stopAt > a.t && s.stopAt <= a.t + secs + 0.5, `w${look.world} ${name}: a source left running`);
    }
  }
});

test("the monster's roar sits lower than any other world's, so it reads as a bellow, not a siren", () => {
  const floor = (look) => {
    const { a, nodes } = fakeVoice(kitFor(look.music));
    BOSS.phase(a, { phase: 1 });
    return Math.min(...nodes.filter((x) => x.kind === 'Oscillator' && x.frequency.calls.length).map((x) => x.frequency.calls[0][1]));
  };
  const [w9, ...others] = [LOOKS[8], ...LOOKS.slice(0, 8), ...LOOKS.slice(9)].map(floor);
  assert.ok(w9 < 50, `${w9} Hz`);
  assert.ok(others.every((f) => f > w9), 'every other world roars higher');
});

test("the Count's roar is a bell tolled low, with a bat's shriek high over it, and the stingers play on an organ", () => {
  const kit = kitFor(LOOKS[9].music);
  assert.equal(kit.style, 'gothic');
  const { a, nodes } = fakeVoice(kit);
  BOSS.phase(a, { phase: 1 });
  const starts = nodes.filter((x) => x.kind === 'Oscillator' && x.frequency.calls.length).map((x) => x.frequency.calls[0][1]);
  assert.ok(starts.some((f) => f > 120 && f < 160), 'the bell strikes the root of D, an octave and a half under middle C');
  assert.ok(starts.some((f) => f > 70 && f < 80), 'with its hum an octave under');
  assert.ok(starts.some((f) => f >= 2600), 'the shriek');
  const organ = fakeVoice(kit);
  UI.cleared(organ.a, {});
  const types = organ.nodes.filter((x) => x.kind === 'Oscillator').map((x) => x.type);
  assert.ok(types.filter((t) => t === 'sawtooth').length >= 8, 'a sawtooth lead, each note doubled an octave up like an organ stop');
});

test("the wyrm's roar is a glacier cracking under a long keen that falls and shakes, and the stingers ring as glass bells", () => {
  const kit = kitFor({ mood: 'aurora', root: 'E', scale: 'lydian', bpm: 84 });
  assert.equal(kit.style, 'aurora');
  const { a, nodes } = fakeVoice(kit);
  const secs = BOSS.phase(a, { phase: 1 });
  const osc = nodes.filter((x) => x.kind === 'Oscillator');
  const cracks = nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'highpass' && x.frequency.calls[0][1] >= 2700);
  assert.ok(cracks.length >= 4, `${cracks.length} cracks of the ice`);
  const keen = osc.find((x) => x.type === 'triangle' && x.frequency.calls[0][1] > 500);
  assert.ok(keen && keen.frequency.calls[1][1] < 250, 'a high cry that falls');
  assert.ok(osc.some((x) => x.type === 'sine' && x.frequency.value === 6), 'a shake in its voice');
  assert.ok(osc.some((x) => x.type === 'sawtooth' && x.frequency.calls[0][1] < 100), 'the ice creaking low under it');
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
  const bells = fakeVoice(kit);
  UI.cleared(bells.a, {});
  const bell = bells.nodes.filter((x) => x.kind === 'Oscillator');
  assert.ok(bell.every((x) => !x.type || x.type === 'sine'), 'sine bells (an FM modulator keeps the default), no organ or pluck');
  assert.ok(bell.length >= 20, `${bell.length}: each note a sine and an FM ring`);
  assert.ok(bell.some((x) => Math.abs((x.frequency.calls[0]?.[1] ?? 0) - 659.26 * 3.51) < 1), 'the glassy ring is an inharmonic partner of the first note, an octave up');
});

const ARCHIVE = kitFor({ mood: 'archive', root: 'D', scale: 'dorian', bpm: 116 });

test("the Grimoire's roar is a book slammed shut, a boom and a leathery crack, with a rush of pages after it", () => {
  assert.equal(ARCHIVE.style, 'archive');
  const { a, nodes } = fakeVoice(ARCHIVE);
  const secs = BOSS.phase(a, { phase: 1 });
  const osc = nodes.filter((x) => x.kind === 'Oscillator');
  assert.ok(osc.some((x) => x.type === 'sine' && x.frequency.calls[0]?.[1] === 118 && x.frequency.calls[1]?.[1] === 34), 'a boom that falls through the floor');
  assert.ok(nodes.some((x) => x.kind === 'BiquadFilter' && x.type === 'lowpass' && x.frequency.calls[0]?.[1] === 3000), 'the cover cracking');
  const pages = nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass' && x.frequency.calls[0][1] >= 3200);
  assert.equal(pages.length, 10, 'ten leaves flapping, each a short burst of bright noise');
  assert.ok(osc.some((x) => x.type === 'triangle' && x.frequency.calls[0]?.[1] < 100), 'the rumble under it');
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
  const { a: b, nodes: other } = fakeVoice(kitFor(LOOKS[10].music));
  BOSS.phase(b, { phase: 1 });
  assert.ok(!other.some((x) => x.kind === 'Oscillator' && x.frequency.calls[0]?.[1] === 118), "no other world's roar slams a book");
});

test("the archive's stingers are a solo violin: one bowed sawtooth a note, a vibrato that shakes it, and no organ or bell doubling", () => {
  const { a, nodes } = fakeVoice(ARCHIVE);
  const secs = UI.cleared(a, {});
  const osc = nodes.filter((x) => x.kind === 'Oscillator');
  const violin = osc.filter((x) => x.type === 'sawtooth');
  assert.equal(violin.length, 7, 'seven notes, each a single voice');
  assert.ok(Math.abs(violin[0].frequency.calls[0][1] - 293.66) < 0.05, 'the run starts on D4');
  assert.equal(osc.filter((x) => x.frequency.value === 5.4).length, 7, 'a vibrato on each note');
  assert.ok(violin.every((x) => x.detune.value === 0), 'solo, not an ensemble');
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
});

const ARMADA = kitFor({ mood: 'armada', root: 'G', scale: 'major', bpm: 132 });
const salvo = (nodes) => nodes.filter((x) => x.kind === 'Oscillator' && x.frequency.calls[1]?.[1] === 40 && [150, 138, 126, 114].includes(x.frequency.calls[0][1])); // the four booms

test("the Galleon's roar is a cannon salvo, four booms rippling down the deck, with the timbers creaking under the recoil", () => {
  assert.equal(ARMADA.style, 'armada');
  const { a, nodes } = fakeVoice(ARMADA);
  const secs = BOSS.phase(a, { phase: 1 });
  const booms = salvo(nodes);
  assert.deepEqual(booms.map((x) => x.frequency.calls[0][1]), [150, 138, 126, 114], 'each gun a little lower and softer');
  assert.deepEqual(booms.map((x) => Math.round((x.frequency.calls[0][2] - a.t) * 100)), [0, 15, 27, 46], 'staggered');
  assert.equal(nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'lowpass' && x.frequency.calls[0][1] === 2600).length, 4, 'a blast of smoke with each');
  const groan = nodes.filter((x) => x.kind === 'Oscillator' && x.type === 'sawtooth' && x.frequency.calls[0][1] === 134);
  assert.equal(groan.length, 1, 'a beam groaning, falling from 134 to 76 Hz');
  assert.equal(nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'bandpass' && x.Q.value === 10).length, 1, 'and a stick-slip creak of noise');
  assert.equal(nodes.filter((x) => x.kind === 'Oscillator' && x.type === 'square' && x.frequency.value === 14).length, 1, 'which shudders on a square LFO');
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
  const death = fakeVoice(ARMADA);
  const deathSecs = BOSS.bossDeath(death.a);
  assert.equal(salvo(death.nodes).length, 4, 'the last roar fires the salvo too');
  for (const s of death.nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= death.a.t + deathSecs + 0.5, 'a source left running');
});

test("no other world's roar fires a salvo or creaks, and no other world's stinger swells its filter like a horn", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'armada')) {
    const kit = kitFor(look.music);
    const roar = fakeVoice(kit);
    BOSS.phase(roar.a, { phase: 1 });
    assert.equal(salvo(roar.nodes).length, 0, `w${look.world}`);
    assert.ok(!roar.nodes.some((x) => x.kind === 'BiquadFilter' && x.Q.value === 10), `w${look.world}: no creak`);
    const stinger = fakeVoice(kit);
    UI.cleared(stinger.a, {});
    const swell = stinger.nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'lowpass' && x.frequency.calls.length > 1);
    assert.equal(swell.length, 0, `w${look.world}: the filter stays put`);
  }
});

test("the armada's stingers are a pair of horns on the scale: a sawtooth and its detuned double a note, the filter opening as each swells", () => {
  const { a, nodes } = fakeVoice(ARMADA);
  const secs = UI.cleared(a, {});
  const horns = nodes.filter((x) => x.kind === 'Oscillator' && x.type === 'sawtooth');
  assert.equal(horns.length, 14, 'seven notes, each two voices');
  assert.ok(Math.abs(horns[0].frequency.calls[0][1] - 392) < 0.05, 'the run starts on G4');
  assert.ok(horns.some((x) => x.detune.value > 0), 'the double is detuned');
  const swells = nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === 'lowpass' && x.frequency.calls[0][1] === 900 && x.frequency.calls[1]?.[1] === 3400);
  assert.equal(swells.length, 14, 'every horn voice opens from 900 to 3400 Hz');
  assert.equal(nodes.filter((x) => x.kind === 'Oscillator' && x.type === 'sine').length, 1, 'no organ or bell doubling, only the root under the chord');
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
});
