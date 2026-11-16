import { level, wave, playing, holdAlien, step, drain, ofType } from './world-kit.js';
import { BODY_R } from '../../src/core/tumble.js';
import { BANKS } from '../../src/core/bonk.js';

// Shared by the bonk tests (world 19's twist, R71: dizzy bodies the ship bats).
export const BONK_EVENTS = ['whack', 'bonk', 'bank', 'strike', 'plop', 'fizzle'];
export const w19 = (extra = {}) => level([wave(), wave()], 0, { world: 19, twist: 'bonk', free: true, ...extra });

// A quiet world 19 past its intro, with one alien held far up on the left that cannot be killed (so no wave
// ends) and a ship that cannot be hurt, parked at (960, 1000); the events of the intro are drained.
export function arena(extra) {
  const w = playing(w19(extra));
  holdAlien(w, 100, 200, 1e6);
  w.ship.invuln = Infinity;
  return w;
}

// A body placed by hand: dizzy and at rest unless `o` says otherwise.
export function bodyAt(w, x, y, o = {}) {
  const b = { id: 800 + w.twist.bodies.length, role: 'grunt', x, y, vx: 0, vy: 0, r: BODY_R, fly: false, link: 0, banks: 0, bonks: 0, daze: 0, t: 0, ...o };
  w.twist.bodies.push(b);
  return b;
}

// A body batted already: flying at (vx, vy) with a launch's banks.
export const flyer = (w, x, y, vx, vy, o = {}) => bodyAt(w, x, y, { vx, vy, fly: true, banks: BANKS, ...o });

// Step one tick at a time, draining events, until `type` comes out: the ticks stepped and that tick's events.
export function until(w, type, limit = 10) {
  for (let n = 1; n <= limit * 60; n++) {
    step(w);
    const events = drain(w);
    if (ofType(events, type).length) return { ticks: n, events };
  }
  throw new Error(`no ${type} in ${limit} s`);
}

// Step `ticks` ticks and return every event of them.
export function collect(w, ticks) {
  const out = [];
  for (let i = 0; i < ticks; i++) {
    step(w);
    out.push(...drain(w));
  }
  return out;
}
