// The hits of Rubber Regatta's loop (STYLES.bath in sound-styles-2.js, one letter a step, a step a sixteenth of a beat): a
// lazy two-beat bounce under a marimba, and the kalimba that answers it. A hit is (a, t, n) -> void (music-drums.js).
//   B  a soft round kick on one and three, the bass plucked under it: the chord's root on one, its fifth on three
//   W  a woodblock on an off-beat: high (the scale's fifth) after one and three, low (its root) after two and four
//   S  a light clap on four: three hands a hair apart and a short room, with no kick under it
//   L  the kalimba's answer in bars two and four: a tine plucked an octave over the marimba, its note from ANSWER
// B, W and S play dry, past the world's echo (a.dry), so each hit lands once; the kalimba rings through it like the marimba.
import { tone, hiss, fm, noteHz } from './audio-kit.js';

const dry = (a) => ({ ...a, out: a.dry ?? a.out });
const PASS = 64; // steps in a pass of the tune: four bars of sixteen
// The bass for each shift of the progression (music.js PROGRESSION), [root, fifth] as low degrees:
// F2 and C2 at home, D2 and A2 on the sixth, B flat 2 and F2 on the fourth.
export const BASS = { 0: [0, -2], 5: [-1, 2], 3: [3, 0] };
export const ANSWER = { 20: 5, 23: 4, 25: 2, 52: 3, 55: 2, 57: 1 }; // the kalimba: a step of the pass -> its degree over the chord
export const KALIMBA = { ratio: 5.4, index: 0.8, dur: 0.9, peak: 0.1, cut: 7000 }; // a tine's inharmonic partner, struck and ringing out
export const KICK = { f0: 118, f1: 50, dur: 0.22, peak: 0.24 }; // soft and round: no click on top

// A woodblock's tok: a short hollow tone on a note of the scale and the stick's click (sfx-bath.js strikes it too).
export function woodblock(a, t, f, peak) {
  tone(a, { t, f0: f, dur: 0.06, peak });
  hiss(a, { t, type: 'bandpass', f0: f * 3, q: 2, dur: 0.008, peak: peak / 2 });
}

function kick(w, t, n) {
  const a = dry(w);
  tone(a, { t, ...KICK });
  const [root, fifth] = BASS[n.shift] ?? [n.shift, n.shift];
  const f = noteHz(a.kit, n.step % 16 === 8 ? fifth : root, 2);
  tone(a, { t, f0: f, dur: 0.32, peak: 0.1 });
  tone(a, { t, type: 'triangle', f0: f, dur: 0.24, peak: 0.05, cut: 1500, cut1: 260 });
}

const block = (w, t, n) => woodblock(dry(w), t, noteHz(w.kit, n.step % 8 === 2 ? 4 : 0, 5), 0.13);

function clap(w, t) {
  const a = dry(w);
  for (const d of [0, 0.012, 0.024]) hiss(a, { t: t + d, type: 'bandpass', f0: 1800, q: 1.4, dur: 0.01, peak: 0.3 });
  hiss(a, { t: t + 0.034, type: 'bandpass', f0: 1500, q: 1, dur: 0.1, peak: 0.2 });
}

function kalimba(a, t, n) {
  const d = ANSWER[n.step % PASS];
  if (d != null) fm(a, { t, f0: noteHz(a.kit, n.shift + d, 5), ...KALIMBA });
}

export const BATH_HITS = { B: kick, W: block, S: clap, L: kalimba };
