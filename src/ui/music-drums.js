// The hits of the music loops' drum line (sound-data.js STYLES[style].music.drum, one letter a step),
// and the voices that ride on it. A hit is (a, t, n) -> void: n = { deg, shift, step } is the lead's note
// of that step (deg, shifted by the progression, null on a rest), the progression's shift of it and the
// loop's step count, for the hits that follow the tune (the music box, the bass).
import { tone, hiss, fm, noteHz, bell } from './audio-kit.js';

export const DRUM = {
  k: (a, t) => tone(a, { t, f0: 150, f1: 44, dur: 0.18, peak: 0.26 }),
  t: (a, t) => {
    tone(a, { t, f0: 115, f1: 48, dur: 0.42, peak: 0.3 });
    hiss(a, { t, type: 'lowpass', f0: 500, dur: 0.08, peak: 0.08 });
  },
  h: (a, t) => hiss(a, { t, type: 'highpass', f0: 8000, dur: 0.03, peak: 0.03 }),
  s: (a, t) => {
    hiss(a, { t, type: 'bandpass', f0: 1700, q: 0.8, dur: 0.12, peak: 0.08 });
    tone(a, { t, f0: 210, f1: 150, dur: 0.05, peak: 0.05 });
  },
  b: (a, t) => { // a low bell struck on the root, and the clapper's tick
    bell(a, { t, index: 1.8, dur: [2.2, 2.6, 1.4], peak: [0.1, 0.1, 0.035] });
    hiss(a, { t, type: 'highpass', f0: 3600, dur: 0.03, peak: 0.03 });
  },
  p: (a, t) => { // a soft timpani: a round thump that sags a fifth
    const f = noteHz(a.kit, 0, 2);
    tone(a, { t, f0: f * 1.5, f1: f, dur: 0.55, peak: 0.16 });
    hiss(a, { t, type: 'lowpass', f0: 320, dur: 0.07, peak: 0.05 });
  },
  c: (a, t) => { // a choir swelling in: a chord over the root (third, fifth, ninth), each note two detuned sawtooth voices
    for (const d of [2, 4, 8]) {
      for (const detune of [-6, 7]) tone(a, { type: 'sawtooth', t, f0: noteHz(a.kit, d, 3), detune, attack: 1.1, dur: 2.2, peak: 0.022, cut: 1000 });
    }
  },
  j: (a, t) => { // sleigh bells: bright rattles tumbling over each other, and a thin ring that hangs
    [0, 0.03, 0.055, 0.1, 0.13].forEach((d, i) => hiss(a, { t: t + d, type: 'bandpass', f0: [7200, 5600, 8400, 6400, 7800][i], q: 6, dur: 0.1, peak: 0.03 }));
    fm(a, { t, f0: 3300, ratio: 2.76, index: 1.2, dur: 0.6, peak: 0.02 });
  },
  f: (a, t) => { // a soft frame drum: a round thump on the skin, the palm's slap on top
    tone(a, { t, f0: 132, f1: 84, dur: 0.3, peak: 0.18 });
    hiss(a, { t, type: 'bandpass', f0: 1500, q: 0.9, dur: 0.06, peak: 0.07 });
  },
  z: (a, t, n) => { // a plucked bass on the chord's root, then its octave: a round body and a string snapping off the lowpass
    const f = noteHz(a.kit, n.shift + (n.step % 4 === 2 ? 0 : 7), 2);
    tone(a, { t, f0: f, f1: f * 0.99, dur: 0.3, peak: 0.13 });
    tone(a, { t, type: 'sawtooth', f0: f, dur: 0.22, peak: 0.08, cut: 1900, cut1: 240 });
  },
  m: (a, t, n) => { // a music box: a thin bell on the step's own note, an octave over the harp, ringing out
    if (n.deg != null) fm(a, { t, f0: noteHz(a.kit, n.deg, 5), ratio: 4.2, index: 1.8, dur: 1.1, peak: 0.045, cut: 7000 });
  },
  v: (a, t) => { // strings bowing a chord in: root, third, fifth and octave, each two detuned sawtooth voices, the bow opening the filter
    for (const d of [0, 2, 4, 7]) {
      for (const detune of [-8, 9]) tone(a, { type: 'sawtooth', t, f0: noteHz(a.kit, d, 3), detune, attack: 0.9, dur: 1.7, peak: 0.035, cut: 600, cut1: 2200 });
    }
  },
};
