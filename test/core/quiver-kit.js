import { createWorld } from '../../src/core/world.js';
import { bolt } from '../../src/core/ship.js';
import { level, wave, step, at, input, holdAlien } from './world-kit.js';

// Shared by the quiver tests (world 21's twist, R73: the returning arrow).
// A ship shot that reaches HUD_BOTTOM turns back once, toward its quiver point.
export const w21 = (extra = {}) => level([wave(), wave()], 0, { world: 21, twist: 'quiver', free: true, ...extra });

// A quiet world 21 on the first tick of play, with one alien held far up on the left that cannot be killed.
export function start(lv = w21()) {
  const w = createWorld(lv);
  w.scale.fireMult = 0;
  while (w.state === 'intro') step(w);
  holdAlien(w, 100, 200, 1e6);
  return w;
}

// One shot fired from (x, 1000): the ship pulls the trigger once and the shot is returned.
export function fireOne(w, x = 960) {
  step(w, 1, input({ fire: true, target: { x, y: 1000 } }));
  return w.shots.at(-1);
}

// A shot placed by hand, turned already unless `o` says otherwise.
export const arrow = (w, x, y, vx, vy, o = {}) => {
  const s = { ...bolt(x, y, vx, vy), turned: true, ...o };
  w.shots.push(s);
  return s;
};

// Step with `inp(tick)` until `done()`; throws past `limit` ticks.
export function until(w, done, inp = () => at(960, 1000), limit = 600) {
  for (let i = 0; i < limit; i++) {
    if (done()) return i;
    step(w, 1, inp(i));
  }
  throw new Error('never happened');
}
