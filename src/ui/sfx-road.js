// Sound patches of Wanderlight (world 22, the road style of sound-data.js: D major, triangle and sine, soft and plain, pencil on parchment).
//   checkpoint   a lantern is lit: glass chimes struck one after another on the root, third and fifth, with a tick of the strike
//   ability      a gift of colour: a pad blooming on the chord and a spark of an arpeggio over it
//   seedBurst    a seed bursts on the ground: a soft pop jumping up, a drop's bloop after it and a puff of air
//   chip         a bullet is struck and flies on: a tiny dry crack
//   cut          a bullet is broken (in this world only, every other world's cut is sfx-world.js's): the same crack, bigger, with wood in it
//   flutter      a kite is shot down: paper rustling and falling, one rustle further after another; it rides on the kill's own stab (sounds.js)
//   lineScratch  the line's wall is stopped: a dry graphite scrape, short band-passed hiss strokes sweeping down, noise only, quiet
//   brambleSnap  a thorn piece breaks: a high-passed twig crack and a short knock on a degree of the scale
//   respawn      the leg begins again: a soft swell of the chord, low and warm
//   holdBreak    the Grey Gate falls and colour floods the valley: a rush of air swelling open and a wide major chord rung over it, the loudest of them
// A patch is (a, o) -> seconds (audio-kit.js); the pitches are degrees of the world's scale (noteHz), so every note is in key.
import { tone, hiss, fm, noteHz } from './audio-kit.js';
import { WORLD } from './sfx-world.js';

export const CHIME = { degrees: [0, 2, 4], octave: 5, gap: 0.1, dur: 0.9 }; // the lantern's three bells: root, third, fifth, each struck a gap after the last
export const BLOOM = { chord: [0, 2, 4], octave: 4, spark: [0, 2, 4, 7], sparkOctave: 6, sparkGap: 0.07 }; // an ability: the pad's chord, then the spark's arpeggio
export const SWELL = { chord: [0, 4, 7], octave: 3, attack: 0.5 }; // a respawn: root, fifth and octave of the chord swelling in (degree 7 is the root an octave up)
export const CRACK = { chip: 0.45, cut: 1 }; // how big the crack of a struck bullet and of a broken one is (1 is the biggest)
export const RUSTLE = { beats: [0, 0.04, 0.09, 0.15, 0.23, 0.33], pitches: [5600, 4300, 5000, 3400, 3900, 2600] }; // the flutter: when each rustle starts (s) and its centre (Hz)
export const SCRATCH = { strokes: [{ f0: 3600, f1: 1800, at: 0 }, { f0: 3000, f1: 1500, at: 0.04 }, { f0: 2500, f1: 1200, at: 0.08 }], dur: 0.04, peak: 0.05, max: 0.2, q: 1.2, tail: 0.04 }; // the pencil scratch: each stroke's sweep (Hz) and start (s)
export const SNAP = { degree: 4, octave: 4, dur: 0.05, peak: 0.08, crack: { f0: 6000, f1: 3000, dur: 0.025, peak: 0.14 }, tail: 0.05 }; // the twig's knock: a degree of the scale, and the high-passed crack (Hz sweep, s, peak) before it
export const FLOOD = { chord: [0, 2, 4, 7, 9], octave: 4, gap: 0.08, ring: 2, rush: 1.4, top: 11, topOctave: 6, topAt: 0.5, bell: 1.6 }; // the gate's chord, wide and held (ring s), and a bell on top of it

const bellOn = (a, d, octave, t, o = {}) => fm(a, { t, f0: noteHz(a.kit, d, octave), ratio: 3.51, index: 0.7, dur: CHIME.dur, peak: 0.07, cut: 6500, ...o });

function checkpoint(a) {
  CHIME.degrees.forEach((d, i) => bellOn(a, d, CHIME.octave, a.t + i * CHIME.gap, { peak: 0.075 - i * 0.012 }));
  hiss(a, { type: 'bandpass', f0: 5200, q: 1.5, dur: 0.02, peak: 0.05 });
  return CHIME.gap * (CHIME.degrees.length - 1) + CHIME.dur + 0.1;
}

function ability(a) {
  BLOOM.chord.forEach((d) => tone(a, { f0: noteHz(a.kit, d, BLOOM.octave), attack: 0.3, dur: 0.9, peak: 0.05, cut: 2600 }));
  BLOOM.spark.forEach((d, i) => tone(a, { t: a.t + 0.15 + i * BLOOM.sparkGap, f0: noteHz(a.kit, d, BLOOM.sparkOctave), dur: 0.5, peak: 0.035 }));
  return 1.4;
}

function seedBurst(a) {
  const k = a.kit.pitch;
  tone(a, { f0: 240 * k, f1: 640 * k, dur: 0.07, peak: 0.12 });
  hiss(a, { type: 'lowpass', f0: 2600, f1: 500, dur: 0.08, peak: 0.1 });
  tone(a, { t: a.t + 0.05, f0: 900 * k, f1: 500 * k, dur: 0.06, peak: 0.04 });
  return 0.2;
}

// A crack of size k (CRACK): a hiss of air snapping off, and a knock of wood under it, longer and lower for a bigger one.
function crack(a, k) {
  hiss(a, { type: 'highpass', f0: 5200, f1: 2200, dur: 0.03 + 0.02 * k, peak: 0.16 * k });
  tone(a, { type: 'triangle', f0: 520, f1: 230, dur: 0.02 + 0.06 * k, peak: 0.1 * k });
  return 0.04 + 0.1 * k;
}

function flutter(a) {
  RUSTLE.beats.forEach((d, i) => hiss(a, { t: a.t + d, type: 'bandpass', f0: RUSTLE.pitches[i], q: 1.4, dur: 0.04, peak: 0.11 - i * 0.015 }));
  return RUSTLE.beats.at(-1) + 0.15;
}

function lineScratch(a) {
  SCRATCH.strokes.forEach((s) => hiss(a, { t: a.t + s.at, type: 'bandpass', f0: s.f0, f1: s.f1, q: SCRATCH.q, dur: SCRATCH.dur, peak: SCRATCH.peak }));
  return SCRATCH.strokes.at(-1).at + SCRATCH.dur + SCRATCH.tail;
}

function brambleSnap(a) {
  hiss(a, { type: 'highpass', ...SNAP.crack });
  tone(a, { type: 'triangle', f0: noteHz(a.kit, SNAP.degree, SNAP.octave), dur: SNAP.dur, peak: SNAP.peak });
  return SNAP.dur + SNAP.tail;
}

function respawn(a) {
  SWELL.chord.forEach((d) => tone(a, { type: 'triangle', f0: noteHz(a.kit, d, SWELL.octave), attack: SWELL.attack, dur: 0.7, peak: 0.07, cut: 1600 }));
  hiss(a, { type: 'lowpass', f0: 300, f1: 1200, attack: SWELL.attack, dur: 0.6, peak: 0.05 });
  return SWELL.attack + 0.9;
}

function holdBreak(a) {
  hiss(a, { type: 'lowpass', f0: 300, f1: 4200, attack: 0.55, dur: FLOOD.rush, peak: 0.2 });
  FLOOD.chord.forEach((d, i) => {
    const o = { t: a.t + i * FLOOD.gap, f0: noteHz(a.kit, d, FLOOD.octave), attack: 0.1, dur: FLOOD.ring, peak: 0.07, cut: 3800 };
    tone(a, { ...o, type: 'triangle' });
    tone(a, { ...o, detune: 7, peak: 0.03 });
  });
  bellOn(a, FLOOD.top, FLOOD.topOctave, a.t + FLOOD.topAt, { peak: 0.06, dur: FLOOD.bell });
  return Math.max(FLOOD.topAt + FLOOD.bell, (FLOOD.chord.length - 1) * FLOOD.gap + 0.1 + FLOOD.ring) + 0.05;
}

export const ROAD = {
  checkpoint, ability, seedBurst, respawn, holdBreak, flutter, lineScratch, brambleSnap,
  chip: (a) => crack(a, CRACK.chip),
  cut: (a, o) => (a.kit.style === 'road' ? crack(a, CRACK.cut) : WORLD.cut(a, o)),
};
