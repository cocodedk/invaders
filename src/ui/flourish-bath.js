// World 19's flourishes (registry; FLOURISH_BATH), all pure functions of t (the spurt, of fx's flashes) drawn from cached sprites
// (flourish-bath-sprites.js) on the timetables of flourish-bath-model.js:
//   bathdrip (far)     a colossal drop gathers on a dolphin's lip beside its waterfall, swells, falls and lands in a crown splash
//   bathspurt (far)    while fx holds a live flash tagged 'strike' (a bonk chain long enough: fx/react-bath.js) both taps gush and spray
//   bathsteamer (mid)  a wooden toy steamer crosses at the back, bobbing and puffing smoke, its hull down in the near layer's foam
//   bathbubble (near)  a giant soap bubble drifts up across the room and pops into a ring of droplets
// None draws additive light: the waterline is pale, and 'lighter' vanishes on it. At half quality the sprays and the smoke are halved.
import { soft, hash } from './sprites.js';
import { clamp, TAU } from '../core/math.js';
import { TAPS, WATER_Y, mouthOf } from './parallax-bath-kit.js';
import { drip, bubble, BUBBLE, steamer, STEAMER, spurt } from './flourish-bath-model.js';
import { DROP, CROWN, SPRAY, JET, PUFF, WAKE, dropSprite, crownSprite, spraySprite, jetSprite, bigBubbleSprite, popRingSprite, steamerSprite } from './flourish-bath-sprites.js';
import { BOAT } from './flourish-bath-steamer.js';

export const LIP = 22; // px beside the waterfall, the way the tap faces, where a drop gathers on the dolphin's lip
export const CROWN_DROPS = 6; // the droplets a crown splash throws
export const RING_DROPS = 12; // the droplets the giant bubble pops into
export const SPRAY_DROPS = 7; // the droplets in each tap's gush
export const PUFFS = 5; // the steamer's smoke puffs
export const SURGE = 0.12; // s a gush takes to reach full strength
export const halved = (n, quality) => (quality < 1 ? Math.ceil(n / 2) : n);

function crown(ctx, x, water, k, quality) {
  const s = 0.55 + 0.6 * Math.sqrt(k);
  ctx.globalAlpha = 1 - k * k;
  ctx.drawImage(crownSprite(), x - (CROWN.w * s) / 2, water - CROWN.base * s, CROWN.w * s, CROWN.h * s);
  const n = halved(CROWN_DROPS, quality);
  for (let i = 0; i < n; i++) {
    const side = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
    const up = (70 + 40 * hash(i + 90)) * 4 * k * (1 - k);
    ctx.drawImage(spraySprite(), x + side * (40 + 60 * k) - SPRAY.w / 2, water - 40 - up, SPRAY.w, SPRAY.h);
  }
  ctx.globalAlpha = 1;
}

function drips(ctx, env, x0, top) {
  const d = drip(env.t);
  if (!d.phase) return;
  const T = TAPS[d.tap];
  const [mx, my] = mouthOf(T);
  const [x, lip, water] = [x0 + mx + T.dir * LIP, top + my, top + WATER_Y];
  if (d.phase === 'splash') return crown(ctx, x, water, d.k, env.quality);
  const s = d.phase === 'swell' ? 0.3 + 0.7 * d.k : 1;
  const [w, h] = [DROP.w * s * 0.8, DROP.h * s * (d.phase === 'fall' ? 1.2 : 0.75 + 0.2 * d.k)];
  const y = d.phase === 'swell' ? lip - 8 : lip - 8 + (water - lip - h * 0.6) * d.k * d.k;
  ctx.drawImage(dropSprite(), x - w / 2, y, w, h);
}

function spurts(ctx, env, x0, top) {
  const s = spurt(env.fx);
  if (s.k <= 0) return;
  const sc = 0.55 + 0.45 * clamp(s.age / SURGE, 0, 1);
  const n = halved(SPRAY_DROPS, env.quality);
  for (const T of TAPS) {
    const [mx, my] = mouthOf(T);
    ctx.save();
    ctx.translate(x0 + mx, top + my);
    ctx.scale(T.dir, 1);
    ctx.globalAlpha = clamp(s.k * 1.6, 0, 1);
    ctx.drawImage(jetSprite(), -JET.ox * sc, -JET.oy * sc, JET.w * sc, JET.h * sc);
    for (let i = 0; i < n; i++) {
      const [px, py] = JET.at(((s.age * 1.3 + i / n) % 1) * 1.15);
      ctx.drawImage(spraySprite(), (px + (hash(i + 70) - 0.5) * 30) * sc - SPRAY.w / 2, (py + (hash(i + 71) - 0.5) * 30) * sc - SPRAY.h / 2, SPRAY.w, SPRAY.h);
    }
    ctx.restore();
  }
}

function boat(ctx, env) {
  const s = steamer(env.t);
  if (!s.on) return;
  const t = env.t;
  const y = STEAMER.y + Math.sin(t * 1.7) * STEAMER.bob;
  const [fx, fy] = [s.x + s.dir * (BOAT.funnel[0] - BOAT.w / 2), y - BOAT.water + BOAT.funnel[1]];
  const n = halved(PUFFS, env.quality);
  for (let i = 0; i < n; i++) { // smoke from the funnel, rising astern, growing and thinning
    const a = (t * 0.45 + i / n) % 1;
    const r = 14 + 40 * a;
    ctx.globalAlpha = 0.85 * (1 - a) ** 0.7;
    ctx.drawImage(soft(PUFF), fx - s.dir * 90 * a - r, fy - 100 * a - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 0.5; // its wake
  ctx.drawImage(soft(WAKE), s.x - s.dir * BOAT.w * 0.55 - 70, y - 8, 140, 18);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(s.x, y);
  ctx.rotate(Math.sin(t * 1.3) * 0.035);
  ctx.scale(s.dir, 1);
  ctx.drawImage(steamerSprite(), -BOAT.w / 2, -BOAT.water);
  ctx.restore();
}

function giant(ctx, env) {
  const b = bubble(env.t);
  if (!b.on) return;
  const r = BUBBLE.r;
  if (!b.popped) {
    const [sx, sy] = [1 + 0.04 * b.wob, 1 - 0.04 * b.wob];
    ctx.globalAlpha = 0.92;
    ctx.drawImage(bigBubbleSprite(), b.x - r * sx, b.y - r * sy, r * 2 * sx, r * 2 * sy);
    ctx.globalAlpha = 1;
    return;
  }
  const rr = r * (1 + 0.5 * b.k);
  ctx.globalAlpha = 0.8 * (1 - b.k);
  ctx.drawImage(popRingSprite(), b.x - rr, b.y - rr, rr * 2, rr * 2);
  ctx.globalAlpha = 1 - b.k;
  const n = halved(RING_DROPS, env.quality);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash(i + 30);
    const d = r * (0.9 + 0.9 * b.k);
    ctx.drawImage(spraySprite(), b.x + Math.cos(a) * d - SPRAY.w / 2, b.y + Math.sin(a) * d + 160 * b.k * b.k - SPRAY.h / 2, SPRAY.w, SPRAY.h);
  }
  ctx.globalAlpha = 1;
}

export const FLOURISH_BATH = { bathbubble: { near: giant }, bathdrip: { far: drips }, bathsteamer: { mid: boat }, bathspurt: { far: spurts } };
