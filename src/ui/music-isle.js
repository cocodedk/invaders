// Golden Isle's instruments (STYLES.isle in sound-styles-2.js; the owner asked for tabla and sitar, 2026-11-19).
//   sitar   the loop's lead (lead.voice 'sitar', music.js): a plucked string through a sharp band sweeping down its harmonics (the
//           buzz of the bridge), its body, the plectrum's wire on the string and the sympathetic strings answering an octave up; a
//           note a short climb over the one before (SITAR.pull semitones at most, one step of the scale's wide seconds) is pulled
//           up into from it, as a sitarist bends the string
//   the drum line's tabla, tuned to the root and left there through the progression (the drone's note), one letter a step:
//     N  na, the treble drum's rim: its note damped by a finger, the overtones ringing     I  tin, its open skin: the note, long
//     G  ge, the bass drum, its pitch swooping up under the heel of the hand              E  ke, the bass drum slapped flat
//     D  dha, ge with na                                                                  J  dhin, ge with tin
//     R  a tirakita run: te, te, ke, na, a beat of four quick strokes into the next stroke
// A hit is (a, t, n) -> void (music-drums.js).
import { tone, hiss, noteHz, semis } from './audio-kit.js';

export const DAYAN = 4; // the octave of the treble drum's root
export const BAYAN = 2; // ...and of the bass drum's
export const SWOOP = 5; // semitones ge climbs as the heel presses the skin
// The treble drum's partials, [harmonic, peak, ring s]: its tuned skin rings whole-number overtones.
export const NA = [[1, 0.025, 0.16], [2, 0.08, 0.32], [3, 0.05, 0.24], [4, 0.03, 0.16]];
export const TIN = [[1, 0.1, 0.55], [2, 0.035, 0.3], [3, 0.012, 0.2]];
export const RUN = 4; // strokes in a tirakita, one a sixteenth of a beat
export const TABLA = 1.4; // the tabla's level against its strokes' own peaks (the owner asked for it louder, 2026-11-19)
export const SITAR = {
  top: 14, low: 3, q: 7, // the bridge's band: from this harmonic down to that one over the note, and how sharp
  buzz: 2.4, body: 1.2, // their shares of the lead's level (the band passes few harmonics at a time, so it takes more)
  wire: 3400, ring: 0.12, // the plectrum's click (Hz), the sympathetic strings' share
  meend: 0.08, pull: 3, // s to pull up into a note, and the widest pull in semitones
};
const BAND_MAX = 9000; // Hz, the highest the bridge's band starts

const root = (a, oct) => noteHz(a.kit, 0, oct);

function ring(a, t, parts, peak = 1) {
  const f = root(a, DAYAN);
  for (const [n, p, dur] of parts) tone(a, { t, f0: f * n, dur, peak: p * peak * TABLA });
}

export function na(a, t, peak = 1) {
  ring(a, t, NA, peak);
  hiss(a, { t, type: 'bandpass', f0: 2600, q: 1.2, dur: 0.012, peak: 0.07 * peak * TABLA });
}

export function tin(a, t) {
  ring(a, t, TIN);
  hiss(a, { t, type: 'bandpass', f0: 1800, q: 1, dur: 0.01, peak: 0.03 * TABLA });
}

function te(a, t) { // the treble drum struck and held: a dull tap
  tone(a, { t, f0: root(a, DAYAN), dur: 0.035, peak: 0.05 * TABLA });
  hiss(a, { t, type: 'bandpass', f0: 1400, q: 1, dur: 0.03, peak: 0.06 * TABLA });
}

export function ge(a, t) {
  const f = root(a, BAYAN);
  tone(a, { t, f0: f, f1: f * semis(SWOOP), dur: 0.55, peak: 0.2 * TABLA });
  tone(a, { t, f0: f * 2, f1: f * 2 * semis(SWOOP), dur: 0.25, peak: 0.035 * TABLA });
  hiss(a, { t, type: 'lowpass', f0: 400, dur: 0.03, peak: 0.05 * TABLA });
}

function ke(a, t) {
  hiss(a, { t, type: 'lowpass', f0: 700, dur: 0.05, peak: 0.1 * TABLA });
  tone(a, { t, f0: 130, f1: 90, dur: 0.05, peak: 0.07 * TABLA });
}

function tirakita(a, t) {
  const gap = 60 / a.kit.bpm / RUN;
  te(a, t);
  te(a, t + gap);
  ke(a, t + 2 * gap);
  na(a, t + 3 * gap, 0.8);
}

export const ISLE_HITS = {
  N: (a, t) => na(a, t), I: tin, G: ge, E: ke, R: tirakita,
  D: (a, t) => (ge(a, t), na(a, t)),
  J: (a, t) => (ge(a, t), tin(a, t)),
};

// The sitar's pluck: o = { t, f0, dur, peak } from music.js, from = the note before (Hz) or undefined.
export function sitar(a, o, from) {
  const { t, f0, dur, peak } = o;
  const band = a.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = SITAR.q;
  band.frequency.setValueAtTime(Math.min(BAND_MAX, f0 * SITAR.top), t);
  band.frequency.exponentialRampToValueAtTime(f0 * SITAR.low, t + dur);
  band.connect(a.out);
  const strings = [
    tone(a, { type: 'sawtooth', t, f0, dur, peak: peak * SITAR.buzz, dest: band }),
    tone(a, { type: 'sawtooth', t, f0, dur: dur * 0.7, peak: peak * SITAR.body, cut: f0 * 6, cut1: f0 * 2 }),
  ];
  if (from && from < f0 && f0 / from <= semis(SITAR.pull)) {
    for (const s of strings) { // the pull up into the note
      s.frequency.cancelScheduledValues(t);
      s.frequency.setValueAtTime(from, t);
      s.frequency.exponentialRampToValueAtTime(f0, t + SITAR.meend);
    }
  }
  hiss(a, { t, type: 'bandpass', f0: SITAR.wire, q: 2, dur: 0.01, peak: peak * 0.5 });
  tone(a, { t, f0: f0 * 2, attack: 0.05, dur: dur * 1.5, peak: peak * SITAR.ring });
}

export const LEADS = { sitar };
