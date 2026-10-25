import { installCanvas } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// What the Craving's smoke tests share (craving-smoke-puff.test.js: the puff kit; craving-smoke-body.test.js: the figure and its frames;
// craving-smoke-motion.test.js: the clocks; craving-smoke-live.test.js: what is drawn live; craving-smoke-glow.test.js: its lights): stand-in canvases that keep a tracker
// for every canvas made, so a baked sprite's extent can be read back, the boss's definition and look, a boss to draw for, and
// one pass of behind or fx read back through a tracker, standing, as the game does, in 'source-over' (behind) or 'lighter' (fx).
installCanvas(64);
export const canvases = [];
document.createElement = () => {
  const T = tracker();
  canvases.push({ width: 64, height: 64, getContext: () => T.ctx, T });
  return canvases.at(-1);
};
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { behind, fx } = await import('../../src/ui/bosses/craving-fx.js');

export const look = LOOKS[16];
export const def = BOSS_DEFS.find((d) => d.kind === 'craving');
export const HUD = -158; // the highest anything may reach, in boss coordinates (the HUD is above)
export const PAD = def.size.w / 2 + 60;
export const f = (n) => Math.round(n);

export const boss = (phase) => ({ x: 0, y: 0, phase, parts: def.parts.map((p) => ({ ...p, x: p.dx, y: p.dy, max: p.hp })) });
export const without = (b, ...ids) => ({ ...b, parts: b.parts.map((p) => (ids.includes(p.id) ? { ...p, hp: 0 } : p)) });

export function pass(b, t, own = false, since = 0, k = 1) {
  const T = tracker();
  T.ctx.globalCompositeOperation = 'lighter';
  fx(T.ctx, b, t, k, own, since);
  return { ...T, after: T.ctx.globalCompositeOperation };
}
export function under(b, t, since = 0) {
  const T = tracker();
  behind(T.ctx, b, t, since);
  return { ...T, after: T.ctx.globalCompositeOperation };
}
export const sweepT = (b, own, fn) => { for (let t = 3; t < 40; t += 0.29) fn(pass(b, t, own, 0), t); };
export const settle = (b, phase, from = 3, to = 9) => { for (let t = from; t < to; t += 1 / 30) { b.phase = phase; pass(b, t, true); under(b, t); } return to; };
export const near = (calls, p, r) => calls.filter((c) => Math.hypot((c.box[0] + c.box[2]) / 2 - p.x, (c.box[1] + c.box[3]) / 2 - p.y) < r);
