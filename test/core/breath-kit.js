import { level, wave, playing, holdAlien, step, drain, ofType } from './world-kit.js';
import { BREATH_TIME } from '../../src/core/twists-3.js';
import { TICK } from '../../src/core/kinds.js';

// Shared by the breath tests (world 17's twist, R65).
export const RISE_TICKS = Math.round(BREATH_TIME / TICK); // ticks a breath takes to rise: 48
export const w17 = (extra = {}) => level([wave(), wave()], 0, { world: 17, twist: 'breath', ...extra });

// A quiet world 17 past its intro, with one alien far to the left that cannot be killed (so no wave
// ends) and a ship that cannot be hurt; the events of the intro are drained.
export function arena(extra) {
  const w = playing(w17(extra));
  holdAlien(w, 100, 300, 1e6);
  w.ship.invuln = Infinity;
  return w;
}

// Step one tick at a time, draining events, until `type` comes out. Returns the ticks stepped and the
// events of the last tick. Throws after `limit` s.
export function until(w, type, limit = 60) {
  for (let n = 1; n <= limit * 60; n++) {
    step(w);
    const events = drain(w);
    if (ofType(events, type).length) return { ticks: n, events };
  }
  throw new Error(`no ${type} in ${limit} s`);
}

// Columns well clear of the ship, which starts at x 960 and stays there when idle.
export const COLUMNS = [200, 420, 640, 1280, 1500, 1720];
