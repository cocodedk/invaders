// The hits of Midnight Press's loop (STYLES.press in sound-styles-2.js, one letter a step, a step a sixteenth of a beat): a
// newsroom racing its deadline, a typist hammering a typewriter over the press's beat (the owner found the old slow pulse gloomy
// and sad and asked for more beats, a typewriter and action, 2026-11-20). A hit is (a, t, n) -> void (music-drums.js).
//   X  the stamp: a punchy kick with a click on top, the bass plucked under it on the chord's root
//   U  the bass alone on the chord's fifth, a key struck over it
//   Z  the press's slam on two and four: the platen's crack (a snare's rattle) and an iron clank under it
//   Q  a typewriter key: the typebar's click on the platen and its thock, each key a little different
//   F  the end of the line: the margin bell, then the carriage's ratchet zipping back (the next stamp is its thud)
// All play dry, past any echo (a.dry), so each lands once.
import { tone, hiss, fm, noteHz } from './audio-kit.js';

const dry = (a) => ({ ...a, out: a.dry ?? a.out });

// The bass for each shift of the progression (music.js PROGRESSION), [root, fifth] as low degrees of the lydian dominant: D2 and
// A2 at home, B1 and F sharp 2 on the sixth (B minor), E2 and B2 under the raised fourth, so the tune's G sharp, B and D over it
// make an E7, bright, where its own root would make a diminished chord.
export const BASS = { 0: [0, 4], 5: [-2, 2], 3: [1, 5] };
export const BASS_OCT = 2;
export const PLUCK = { dur: 0.22, peak: 0.12, saw: 0.06, sawDur: 0.15, cut: 1700, cut1: 240 }; // a round body, a sawtooth string snapping off the lowpass
export const KICK = { f0: 170, f1: 45, dur: 0.2, peak: 0.3, click: 0.06, clickHz: 2400, clickDur: 0.012 };
// A key: its click's band (Hz, one per key in turn, so a run of keys never repeats one sound), q, length and level, and the
// typebar's thock under it (Hz, falling to half, its length and level).
export const KEY = { hz: [3400, 4100, 3700, 4600, 3200, 3900, 4300], q: 1.6, dur: 0.014, peak: 0.22, thock: 620, thockDur: 0.03, thockPeak: 0.07 };
export const SLAM = { crack: 1800, q: 0.9, dur: 0.13, peak: 0.24, iron: 190, ratio: 1.41, index: 2, ironDur: 0.12, ironPeak: 0.13 };
export const BELL = { oct: 6, ratio: 2.76, index: 1.4, dur: 0.9, peak: 0.06, cut: 9000 }; // the margin bell, high on the root
// The carriage flying back `after` s past the bell: `clicks` ratchet teeth over `span` s, their band falling from hz[0] to hz[1].
export const RETURN = { after: 0.1, clicks: 9, span: 0.22, hz: [5200, 2600], q: 4, dur: 0.006, peak: 0.07 };

function bass(a, t, n, which) {
  const f = noteHz(a.kit, (BASS[n.shift] ?? [n.shift, n.shift + 4])[which], BASS_OCT);
  tone(a, { t, f0: f, dur: PLUCK.dur, peak: PLUCK.peak });
  tone(a, { t, type: 'sawtooth', f0: f, dur: PLUCK.sawDur, peak: PLUCK.saw, cut: PLUCK.cut, cut1: PLUCK.cut1 });
}

function key(a, t, step) {
  hiss(a, { t, type: 'bandpass', f0: KEY.hz[step % KEY.hz.length], q: KEY.q, dur: KEY.dur, peak: KEY.peak });
  tone(a, { t, f0: KEY.thock, f1: KEY.thock / 2, dur: KEY.thockDur, peak: KEY.thockPeak });
}

function stamp(w, t, n) {
  const a = dry(w);
  tone(a, { t, f0: KICK.f0, f1: KICK.f1, dur: KICK.dur, peak: KICK.peak });
  hiss(a, { t, type: 'lowpass', f0: KICK.clickHz, dur: KICK.clickDur, peak: KICK.click });
  bass(a, t, n, 0);
}

function fifth(w, t, n) {
  const a = dry(w);
  bass(a, t, n, 1);
  key(a, t, n.step);
}

function slam(w, t) {
  const a = dry(w);
  hiss(a, { t, type: 'bandpass', f0: SLAM.crack, q: SLAM.q, dur: SLAM.dur, peak: SLAM.peak });
  fm(a, { t, f0: SLAM.iron, ratio: SLAM.ratio, index: SLAM.index, dur: SLAM.ironDur, peak: SLAM.ironPeak });
}

function carriage(w, t) {
  const a = dry(w);
  fm(a, { t, f0: noteHz(a.kit, 0, BELL.oct), ratio: BELL.ratio, index: BELL.index, dur: BELL.dur, peak: BELL.peak, cut: BELL.cut });
  const [hi, lo] = RETURN.hz;
  for (let i = 0; i < RETURN.clicks; i++) {
    const k = i / (RETURN.clicks - 1);
    hiss(a, { t: t + RETURN.after + RETURN.span * k, type: 'bandpass', f0: hi * (lo / hi) ** k, q: RETURN.q, dur: RETURN.dur, peak: RETURN.peak });
  }
}

export const PRESS_HITS = { X: stamp, U: fifth, Z: slam, Q: (w, t, n) => key(dry(w), t, n.step), F: carriage };
