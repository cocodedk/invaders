// Sound patches of Rubber Regatta (world 19, the bath style of sound-data.js: F in the six-note sunny scale). Nothing dies here, it
// is knocked silly: a kill squeaks, and the batting rule (core bonk.js) thwacks, bonks, boings and plops, every note on the scale.
//   kill     a knock-out (every kill in this world): a rubber squeak, one held note (the role picks the voice, x the note: the
//            scale climbs left to right), then the combo's stab climbing the scale; every other world's kill is sfx-kill.js's
//   whack    the ship bats a dizzy body: a dry thwack, a thump on the root, a knock and a crack, held (the slide is the strike's)
//   bonk     a flying body strikes an alien: a woodblock and a marimba note one degree higher for each link of its chain;
//            on the boss a honk (a horn's bulb squeezed) and a deep doink
//   bank     a body bounces off a wall: a boing, a spring's tone wobbling up a fifth
//   strike   STRIKE_AT knock-outs in one chain: a slide whistle up an octave into an arpeggio of the chord
//   plop     a body falls out at the bottom: a water drop, a bloop up an octave onto a note, higher the further right
//   fizzle   a body spent on its last rebound: a brief, quiet raspberry
//   duckRoar, duckDeath  the Dowager Duck: a giant quack and a leak after it, the valve squealing in the last phase; her death
//            one enormous raspberry ending on a tiny squeak                                                         (sfx-boss.js)
// A patch is (a, o) -> seconds (audio-kit.js). The twist's patches are short and quiet beside the ship's shot (peaks 0.12 and under).
import { tone, hiss, fm, wobble, crush, noteHz } from './audio-kit.js';
import { FIGHT } from './sfx-fight.js';
import { woodblock } from './music-bath.js';
import { COMBO_MAX, COMBO_HOT } from '../core/scoring.js';
import { clamp } from '../core/math.js';
import { WIDTH } from '../core/kinds.js';

export const BANDS = 6; // the six degrees of the scale, left to right: a run of knock-outs across the screen plays a phrase
export const bandOf = (x) => clamp(Math.floor(((x ?? 0) / WIDTH) * BANDS), 0, BANDS - 1);
// The squeak's shape: its length (s), its level, the octave its note sits in, and how nasal its reed is (a resonance at twice the note).
export const SQUEAK = { dur: 0.09, peak: 0.09, oct: 6, q: 5 };
// Each role's squeak: [wave, degrees over the note x picks]. The duckling squeaks, the soap squirts a step higher, the frog croaks an
// octave down, the sponge squishes soft and low, the paper boat peeps a fourth up.
export const VOICE = { grunt: ['square', 0], diver: ['triangle', 1], gunner: ['sawtooth', -6], armored: ['sine', -6], carrier: ['square', 3] };
const STAB = { grunt: 0, diver: 4, gunner: 2, armored: 0, carrier: 2 }; // the combo stab's degree by role (octave 5), a step up a combo
export const LINK_TOP = 12; // the bonk climbs a degree a link, up to two octaves
export const BOING = 16; // Hz: how fast the bank's spring wobbles
export const QUACK = 0.55; // s: the Duck's quack
export const RASP = 1.9; // s: her dying raspberry
export const LIPS = 24; // Hz: how fast the raspberry's lips flap (the fizzle's flap faster)
export const VALVE = 13; // Hz: how fast the valve's squeal flutters in her last phase

const reskin = (old, mine) => (a, o) => (a.kit.style === 'bath' ? mine(a, o) : old(a, o));

// A bandpass sweeping f0 -> f1 over dur from a.t, into dest.
function band(a, f0, f1, q, dur, dest) {
  const f = a.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, a.t);
  f.frequency.exponentialRampToValueAtTime(f1, a.t + dur);
  f.connect(dest);
  return f;
}

// A gain a square wave opens and shuts `rate` times a second, for dur from t, into dest: lips flapping.
function flutter(a, rate, t, dur, dest = a.out) {
  const g = a.ctx.createGain();
  g.gain.value = 0.5;
  g.connect(dest);
  wobble(a, g.gain, rate, 0.5, t, dur, 'square');
  return g;
}

// A rubber squeak on degree d of the scale: one held note through a nasal peak, and a puff of squeezed air.
function reed(a, t, wave, d) {
  const f = noteHz(a.kit, d, SQUEAK.oct);
  tone(a, { t, type: wave, f0: f, dur: SQUEAK.dur, peak: SQUEAK.peak, cut: f * 2, q: SQUEAK.q });
  hiss(a, { t, type: 'bandpass', f0: f * 2, q: 3, dur: SQUEAK.dur * 0.6, peak: 0.03 });
}

function squeak(a, o) {
  const [wave, lift] = VOICE[o.role] ?? VOICE.grunt;
  reed(a, a.t, wave, bandOf(o.x) + lift);
  const step = Math.min(COMBO_MAX, o.mult ?? 1) - 1;
  tone(a, { type: 'triangle', f0: noteHz(a.kit, (STAB[o.role] ?? 0) + step, 5), dur: 0.06, peak: 0.04 }); // the stab: always the last tone
  if (step >= COMBO_HOT - 1) hiss(a, { type: 'highpass', f0: 7000, dur: 0.06, peak: 0.04 });
  return 0.2;
}

function whack(a) {
  tone(a, { f0: noteHz(a.kit, 0, 3), dur: 0.07, peak: 0.12 }); // the thump of rubber
  tone(a, { type: 'triangle', f0: noteHz(a.kit, 4, 4), dur: 0.03, peak: 0.05 }); // the bat's knock
  hiss(a, { type: 'bandpass', f0: 1600, q: 1.2, dur: 0.025, peak: 0.1 }); // the crack
  return 0.12;
}

function honk(a) {
  tone(a, { type: 'square', f0: noteHz(a.kit, 4, 3), dur: 0.16, peak: 0.06, cut: 1600, q: 3 }); // the honk, on the fifth
  tone(a, { t: a.t + 0.07, f0: noteHz(a.kit, 1, 2), f1: noteHz(a.kit, 0, 2), dur: 0.32, peak: 0.12 }); // the doink, deep, a step down to the root
  return 0.45;
}

function bonk(a, o) {
  if (o.boss) return honk(a);
  woodblock(a, a.t, noteHz(a.kit, 4, 5), 0.08);
  fm(a, { t: a.t + 0.015, f0: noteHz(a.kit, Math.min(o.link ?? 0, LINK_TOP), 5), ratio: 4, index: 0.9, dur: 0.28, peak: 0.08 });
  return 0.35;
}

function bank(a) {
  const f = noteHz(a.kit, 0, 4);
  const spring = tone(a, { f0: f, f1: noteHz(a.kit, 4, 4), dur: 0.3, peak: 0.1 });
  wobble(a, spring.frequency, BOING, f * 0.08, a.t, 0.3);
  return 0.36;
}

function strike(a) {
  const f = noteHz(a.kit, 0, 4);
  tone(a, { f0: f, f1: f * 2, attack: 0.04, dur: 0.3, peak: 0.08 }); // the slide whistle
  hiss(a, { type: 'bandpass', f0: f * 2, f1: f * 4, q: 2, attack: 0.04, dur: 0.28, peak: 0.02 }); // its breath
  [0, 2, 4, 6].forEach((d, i) => fm(a, { t: a.t + 0.34 + i * 0.07, f0: noteHz(a.kit, d, 5), ratio: 4, index: 0.9, dur: 0.3, peak: 0.08 }));
  return 0.95;
}

function plop(a, o) {
  const f = noteHz(a.kit, bandOf(o.x), 5);
  tone(a, { f0: f / 2, f1: f, dur: 0.07, peak: 0.1 });
  return 0.12;
}

function fizzle(a) {
  const lips = flutter(a, LIPS + 8, a.t, 0.22);
  tone(a, { type: 'sawtooth', f0: noteHz(a.kit, 4, 2), dur: 0.2, peak: 0.06, cut: 900, dest: lips });
  hiss(a, { type: 'bandpass', f0: 1200, q: 1, dur: 0.14, peak: 0.03, dest: lips });
  return 0.28;
}

// The Dowager Duck's roar: a giant's quack, two sawtooth voices sagging from the third to the root (A2 to F2) through the bill's nasal
// band and a crush, a round body under them and the bill's clap on top; then a leak, air hissing out of her, and in the last phase
// the valve's squeal over it. h is the phase (0..2): a harder crush and a louder leak each time.
export function duckRoar(a, h, dur) {
  const dest = crush(a, 2.5 + h);
  const bill = band(a, 1100, 760, 2.5, QUACK, dest);
  const [f0, f1] = [noteHz(a.kit, 2, 2), noteHz(a.kit, 0, 2)];
  for (const detune of [-10, 10]) tone(a, { type: 'sawtooth', f0, f1, attack: 0.04, dur: QUACK, peak: 0.16, detune, dest: bill });
  tone(a, { type: 'sawtooth', f0, f1, attack: 0.04, dur: QUACK, peak: 0.08, cut: 600, dest });
  hiss(a, { type: 'bandpass', f0: 1800, q: 1.5, dur: 0.04, peak: 0.12 });
  const t = a.t + QUACK * 0.8;
  hiss(a, { t, type: 'bandpass', f0: 3400, f1: 3900, q: 1.3, attack: 0.12, dur: dur - QUACK * 0.8, peak: 0.08 + h * 0.03 });
  if (h < 2) return;
  const squeal = tone(a, { t, f0: noteHz(a.kit, 4, 5), attack: 0.1, dur: dur * 0.5, peak: 0.05 });
  wobble(a, squeal.frequency, VALVE, 40, t, dur * 0.5 + 0.1);
}

// Her death: one enormous raspberry, lips flapping on a low sawtooth and its octave sagging from F2 to C2 through a buzzing band and a
// crush, spit hissing in it, and as it runs out a tiny squeak.
export function duckDeath(a) {
  const lips = flutter(a, LIPS, a.t, RASP, band(a, 700, 420, 1.2, RASP, crush(a, 4)));
  const [f0, f1] = [noteHz(a.kit, 0, 2), noteHz(a.kit, 4, 1)];
  tone(a, { type: 'sawtooth', f0, f1, attack: 0.06, dur: RASP, peak: 0.3, dest: lips });
  tone(a, { type: 'sawtooth', f0: f0 * 2, f1: f1 * 2, attack: 0.06, dur: RASP, peak: 0.12, detune: 8, dest: lips });
  hiss(a, { type: 'bandpass', f0: 1500, f1: 900, q: 0.9, attack: 0.05, dur: RASP, peak: 0.12, dest: lips });
  tone(a, { f0, f1, dur: RASP, peak: 0.16 });
  reed(a, a.t + RASP + 0.06, 'square', 0);
  return RASP + 0.4;
}

export const BATH = { kill: reskin(FIGHT.kill, squeak), whack, bonk, bank, strike, plop, fizzle };
