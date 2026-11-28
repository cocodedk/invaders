// Sound patches of the Mirror Flats (world 22, Leg 3; the road style of sfx-road.js: D major, glass and air, soft and plain).
//   lasso         a loop closes: a run of bells climbing the scale, one more for each thing caught (o.count), up to LASSO.bells
//   shardBounce   a shard throws a shot back: a high glassy ping on a degree of the scale
//   flockScatter  the Flock flies apart: a soft rustle of wings, noise only, quieter than the kite's
import { tone, hiss, fm, noteHz } from './audio-kit.js';

export const LASSO = { octave: 5, gap: 0.055, bells: 7, dur: 0.7, peak: 0.07, fade: 0.006 }; // each bell a gap after the last, at most `bells` of them, each a little softer by `fade`
export const PING = { degree: 4, octave: 6, ratio: 5.4, index: 0.5, dur: 0.3, peak: 0.06, tick: 0.02 }; // the shard's ping: its FM bell and the tick of glass under it
export const FLUTTER = { beats: [0, 0.03, 0.07, 0.12, 0.18], pitches: [6200, 5000, 5800, 4400, 5200], dur: 0.05, peak: 0.06, q: 1.2, tail: 0.1 }; // the wings: when each beat starts (s) and its centre (Hz)
export const FLATS_GAP = { lasso: 0.15, shardBounce: 0.07, flockScatter: 0.12 }; // seconds audio.js thins each by

function lasso(a, o) {
  const n = Math.max(1, Math.min(LASSO.bells, 1 + (o.count ?? 0)));
  for (let i = 0; i < n; i++) {
    fm(a, { t: a.t + i * LASSO.gap, f0: noteHz(a.kit, i, LASSO.octave), ratio: 3.51, index: 0.6, dur: LASSO.dur, peak: LASSO.peak - i * LASSO.fade, cut: 7000 });
  }
  return (n - 1) * LASSO.gap + LASSO.dur + 0.1;
}

function shardBounce(a) {
  fm(a, { f0: noteHz(a.kit, PING.degree, PING.octave), ratio: PING.ratio, index: PING.index, dur: PING.dur, peak: PING.peak, cut: 9000 });
  hiss(a, { type: 'highpass', f0: 7000, dur: PING.tick, peak: PING.peak });
  return PING.dur + 0.1;
}

function flockScatter(a) {
  FLUTTER.beats.forEach((d, i) => hiss(a, { t: a.t + d, type: 'bandpass', f0: FLUTTER.pitches[i], q: FLUTTER.q, dur: FLUTTER.dur, peak: FLUTTER.peak }));
  return FLUTTER.beats.at(-1) + FLUTTER.dur + FLUTTER.tail;
}

export const FLATS = { lasso, shardBounce, flockScatter };
