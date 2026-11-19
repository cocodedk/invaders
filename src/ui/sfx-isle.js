// The turn of world 21's returning arrow (core/quiver.js): a short struck chime on the world's scale, pitched by where
// across the field the arrow turns, low on the left to high on the right over TURN_BANDS notes, so a row of turns plays
// a run. Short and quiet (like the pearls' tick, sfx-deep.js): turns come many a second while the fire button is held.
import { fm, hiss, noteHz } from './audio-kit.js';
import { WIDTH } from '../core/kinds.js';

export const TURN_BANDS = 8; // scale degrees across the field, the root to the root an octave up on a seven-note scale
export const TURN_OCTAVE = 5;

// The scale degree of a turn at x: 0 at the left edge (or past it, or with no x), TURN_BANDS - 1 at the right.
export const turnDegree = (x) => Math.min(TURN_BANDS - 1, Math.max(0, Math.floor(((x ?? 0) / WIDTH) * TURN_BANDS)));

export const ISLE = {
  arrowTurn(a, o) { // a struck chime: a bright metal tine and a tick of its strike
    fm(a, { f0: noteHz(a.kit, turnDegree(o.x), TURN_OCTAVE), ratio: 2.76, index: 0.9, dur: 0.18, peak: 0.06, cut: 7000 });
    hiss(a, { type: 'highpass', f0: 7000, dur: 0.012, peak: 0.04 });
    return 0.24;
  },
};
