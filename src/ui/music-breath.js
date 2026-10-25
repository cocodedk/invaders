// The hits of Ash to Air's loop (sound-data.js STYLES.breath, one letter a step, a step a sixteenth of a beat): a
// heart racing and a chest fighting for air. A hit is (a, t, n) -> void (music-drums.js).
//   H  the heart's lub, on a beat: a deep thump that sags, and the bass pulsing under it on the chord's root
//   D  the dub an eighth later: lighter and higher, the bass jumping an octave
//   E  an exhale just after the downbeat: breath leaving, its bright edge falling away through a warmer body
//   I  an inhale: breath swelling in through the last beat and a half of the bar, stopped dead on the downbeat
//   i  a gasp: a short, sharp intake
import { tone, hiss, noteHz } from './audio-kit.js';

const beat = (a) => 60 / a.kit.bpm;
const INHALE_STEPS = 7; // from the step after the third beat's lub to the next downbeat

// The bass: a sawtooth plucked through a lowpass that closes, over a sine for the weight, on the chord's root in an octave.
function pulse(a, t, n, oct, k) {
  const f = noteHz(a.kit, n.shift, oct);
  tone(a, { t, type: 'sawtooth', f0: f, dur: 0.17, peak: 0.07 * k, cut: 1300, cut1: 260, q: 2 });
  tone(a, { t, f0: f, dur: 0.2, peak: 0.09 * k });
}

export const BREATH_HITS = {
  H: (a, t, n) => {
    tone(a, { t, f0: 140, f1: 46, dur: 0.22, peak: 0.2 });
    hiss(a, { t, type: 'lowpass', f0: 260, dur: 0.05, peak: 0.07 });
    pulse(a, t, n, 2, 1);
  },
  D: (a, t, n) => {
    tone(a, { t, f0: 180, f1: 64, dur: 0.12, peak: 0.13 });
    pulse(a, t, n, 3, 0.8);
  },
  E: (a, t) => {
    const dur = beat(a) * 1.2;
    hiss(a, { t, type: 'bandpass', f0: 3400, f1: 700, q: 0.7, attack: 0.03, dur, peak: 0.45 });
    hiss(a, { t, type: 'lowpass', f0: 1100, f1: 260, attack: 0.04, dur, peak: 0.22 });
  },
  I: (a, t) => {
    const swell = (beat(a) * INHALE_STEPS) / 4 - 0.03; // it peaks on the downbeat and is gone
    hiss(a, { t, type: 'bandpass', f0: 500, f1: 3600, q: 0.7, attack: swell, dur: 0.03, peak: 0.45 });
    hiss(a, { t, type: 'highpass', f0: 3000, f1: 6000, attack: swell, dur: 0.03, peak: 0.13 });
  },
  i: (a, t) => {
    hiss(a, { t, type: 'bandpass', f0: 900, f1: 3800, q: 0.9, attack: 0.07, dur: 0.02, peak: 0.3 });
  },
};
