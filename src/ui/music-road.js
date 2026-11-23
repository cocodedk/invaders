// The hits of Wanderlight's loop (STYLES.road in sound-styles-2.js, one letter a step, a step a sixteenth of a beat): a quiet journey
// at dawn, a plucked lead and a warm pad over a stomp-and-clap bounce that leans forward (the owner found world 20's slow loop gloomy and
// world 17's racing one annoying, and liked a dance beat: music-not-gloomy, w17-music-annoying). A hit is (a, t, n) -> void (music-drums.js).
//   M  a soft, round kick with a click on top on one and three (and on the "and of three" in bars two and four), the bass
//      plucked under it on the chord's root
//   V  a hand clap on two and four: three hands a hair apart, then a short room
//   e  the bass alone on an off-beat: the chord's fifth after two, its root an octave up after four, pushing the beat on
//   Y  a pad swelling in just after the downbeat of every second bar: the chord's root, fifth and octave, smooth triangles
// M, V and e play dry, past the world's echo (a.dry), so each hit lands once; the lead and the pad ring through it.
import { tone, hiss, noteHz } from './audio-kit.js';

const dry = (a) => ({ ...a, out: a.dry ?? a.out });

// The bass for each shift of the progression (music.js PROGRESSION), [root, fifth] as low degrees of the major scale: D2 and A2
// at home, B1 and F sharp 2 on the sixth, G2 and D3 on the fourth.
export const BASS = { 0: [0, 4], 5: [-2, 2], 3: [3, 7] };
export const BASS_OCT = 2;
export const OCTAVE = 7; // degrees to the octave of the major scale
export const KICK = { f0: 150, f1: 46, dur: 0.2, peak: 0.28, click: 0.05, clickHz: 2400, clickDur: 0.012 };
export const PUSH = 1.3; // the bass alone on an off-beat sounds this much louder than under a kick, which has its thump to carry the step
export const PLUCK = { dur: 0.3, peak: 0.11, string: 0.07, stringDur: 0.22, cut: 1500, cut1: 260 }; // a round body, a triangle string closing its lowpass
// A clap: its hands (s after the first), their band (Hz), q, length and level, then the room (s after, band, q, length and level).
export const CLAP = { hands: [0, 0.011, 0.024], hz: 1700, q: 1.3, dur: 0.012, peak: 0.34, room: 0.034, roomHz: 1400, roomQ: 1, roomDur: 0.11, roomPeak: 0.15 };
export const PAD = { chord: [0, 4, 7], oct: 3, attack: 0.9, dur: 3, peak: 0.065, cut: 1100 }; // degrees over the chord's root, from octave 3

function pluck(a, t, f, level = 1) {
  tone(a, { t, f0: f, dur: PLUCK.dur, peak: PLUCK.peak * level });
  tone(a, { t, type: 'triangle', f0: f, dur: PLUCK.stringDur, peak: PLUCK.string * level, cut: PLUCK.cut, cut1: PLUCK.cut1 });
}

const chord = (n) => BASS[n.shift] ?? [n.shift, n.shift + 4];

function kick(w, t, n) {
  const a = dry(w);
  tone(a, { t, f0: KICK.f0, f1: KICK.f1, dur: KICK.dur, peak: KICK.peak });
  hiss(a, { t, type: 'lowpass', f0: KICK.clickHz, dur: KICK.clickDur, peak: KICK.click });
  pluck(a, t, noteHz(a.kit, chord(n)[0], BASS_OCT));
}

function push(w, t, n) {
  const a = dry(w);
  const [root, fifth] = chord(n);
  pluck(a, t, noteHz(a.kit, n.step % 16 === 6 ? fifth : root + OCTAVE, BASS_OCT), PUSH);
}

function clap(w, t) {
  const a = dry(w);
  for (const d of CLAP.hands) hiss(a, { t: t + d, type: 'bandpass', f0: CLAP.hz, q: CLAP.q, dur: CLAP.dur, peak: CLAP.peak });
  hiss(a, { t: t + CLAP.room, type: 'bandpass', f0: CLAP.roomHz, q: CLAP.roomQ, dur: CLAP.roomDur, peak: CLAP.roomPeak });
}

function pad(w, t, n) { // not dry: the pad rings through the echo
  for (const d of PAD.chord) tone(w, { type: 'triangle', t, f0: noteHz(w.kit, n.shift + d, PAD.oct), attack: PAD.attack, dur: PAD.dur, peak: PAD.peak, cut: PAD.cut });
}

export const ROAD_HITS = { M: kick, V: clap, e: push, Y: pad };
