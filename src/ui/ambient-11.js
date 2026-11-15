// Ambient kinds of Rubber Regatta (same contract as ambient.js): soapbubbles, small soap bubbles rising from the bath and wobbling as
// they go, each an iridescent rim with the room's window reflected in it (flourish-bath-sprites.js soapBubble: new sprites, not world
// 15's); steamwisps, curls of steam rising off the water in front of the taps and fading as they climb; and waterglints, sparkles
// winking on the water along the waterline. All quiet on purpose and none additive (the waterline is pale). Every position is a
// function of the index, the time and the drift, so nothing is simulated and nothing allocated.
import { W, H, hash, wrap, star } from './sprites.js';
import { TAU } from '../core/math.js';
import { soapBubble, wisp } from './flourish-bath-sprites.js';

const SALT = { sky: 0, mid: 3001, front: 7001, screen: 11001 }; // one kind in two phases must not repeat its pattern
export const WISPS = { from: H - 90, climb: 440 }; // frame y a wisp rises from, and how far before it is gone
export const GLINTS = { y0: 790, y1: 900 }; // the band of frame y the glints wink in: the waterline in the near layer's troughs

function soapbubbles(ctx, a, t, drift) {
  const [s0, s1] = a.size;
  const salt = SALT[a.phase] ?? 0;
  const reach = H * (a.maxY ?? 1);
  ctx.globalAlpha = a.alpha;
  for (let i = 0; i < a.n; i++) {
    const k = i * 5 + salt;
    const r = s0 + (s1 - s0) * hash(k + 2);
    const y = wrap(hash(k) * (reach + 120) - t * a.speed * (0.6 + 0.8 * hash(k + 3)), -60, reach + 60);
    const x = wrap(hash(k + 1) * (W + 200) + Math.sin(t * 0.7 + hash(k + 4) * TAU) * 30 + drift * 0.3, -100, W + 100);
    const wob = 1 + 0.07 * Math.sin(t * 3.1 + k);
    ctx.drawImage(soapBubble(a.colors[i % a.colors.length]), x - r * wob, y - r / wob, r * 2 * wob, (r * 2) / wob);
  }
  ctx.globalAlpha = 1;
}

function steamwisps(ctx, a, t, drift) {
  const [s0, s1] = a.size;
  const salt = SALT[a.phase] ?? 0;
  for (let i = 0; i < a.n; i++) {
    const k = i * 5 + salt;
    const life = (t * (a.speed / WISPS.climb) * (0.7 + 0.6 * hash(k + 3)) + hash(k)) % 1;
    const s = s0 + (s1 - s0) * hash(k + 2);
    const x = wrap(hash(k + 1) * (W + 400) + t * 5 + drift * 0.15 + Math.sin(t * 0.3 + k) * 40, -200, W + 200);
    ctx.globalAlpha = a.alpha * Math.sin(Math.PI * life);
    ctx.drawImage(wisp(a.colors[i % a.colors.length]), x - s * 0.3, WISPS.from - life * WISPS.climb - s * 0.5, s * 0.6, s);
  }
  ctx.globalAlpha = 1;
}

function waterglints(ctx, a, t, drift) {
  const [s0, s1] = a.size;
  const salt = SALT[a.phase] ?? 0;
  for (let i = 0; i < a.n; i++) {
    const k = i * 5 + salt;
    const wink = Math.max(0, Math.sin(t * (1.2 + 1.6 * hash(k + 3)) + hash(k + 4) * TAU)) ** 6;
    if (wink < 0.05) continue;
    const s = (s0 + (s1 - s0) * hash(k + 2)) * (0.6 + 0.4 * wink);
    const x = wrap(hash(k + 1) * (W + 200) + drift * 0.25 - t * a.speed, -100, W + 100);
    const y = GLINTS.y0 + hash(k) * (GLINTS.y1 - GLINTS.y0);
    ctx.globalAlpha = a.alpha * wink;
    ctx.drawImage(star(a.colors[i % a.colors.length]), x - s * 3, y - s * 3, s * 6, s * 6);
  }
  ctx.globalAlpha = 1;
}

export const AMBIENT11 = { soapbubbles, steamwisps, waterglints };
