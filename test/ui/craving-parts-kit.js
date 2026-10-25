import { installCanvas, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// What the Craving's throne-and-parts tests share (craving-parts.test.js: the art and its geometry; line-cap-craving-p.test.js: the
// context state): stand-in canvases, the boss's definition and look, its module, and the stage a painter is measured on. Part
// painters are measured the way the boss cache calls them: on a body and a lights context, centred on the part's rect.
installCanvas(64);
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
const { BOSS_ART } = await import('../../src/ui/bosses/bake.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

export const look = LOOKS[16];
export const def = BOSS_DEFS.find((d) => d.kind === 'craving');
export const art = BOSS_ART.craving;
export const S = { def, pal: look.palette.boss, look, W: def.size.w + 120, H: def.size.h + 120, pad: 60 };
export const HUD = -158; // the highest anything may reach, in boss coordinates (the HUD is above)
export const PAD = def.size.w / 2 + 60;
export const f = (n) => Math.round(n);
export const part = (id) => def.parts.find((p) => p.id === id);
export const margin = (id) => art.margins?.[id] ?? art.margin ?? 34;
export const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke', 'drawImage'].includes(k)).length;
export const painter = (id) => {
  const base = id.replace(/[LR]$/, '');
  return art.parts[id] ?? art.parts[base];
};

// One part painted on a tracker pair; the bounds are in the part's own coordinates.
export function paint(id) {
  const b = tracker();
  const l = tracker();
  painter(id)(b.ctx, l.ctx, part(id), S);
  return { b: b.bounds, l: l.bounds };
}

// How bright a painter's lights are at their hottest: every colour it sets or puts in a gradient, as alpha x its brightest channel
// (0..1). A weak point blazes (white-gold at 0.8 and more); the armour carries only dull embers.
export function peak(id) {
  const seen = [];
  const take = (c) => {
    if (typeof c === 'string') seen.push(c);
    else if (c?.stops) seen.push(...c.stops);
  };
  const grad = () => ({ stops: [], addColorStop(at, c) { this.stops.push(c); } });
  const state = {};
  const ctx = new Proxy(state, {
    get: (o, k) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? grad : k === 'save' || k === 'restore' ? () => {} : k in o ? o[k] : () => ctx),
    set: (o, k, v) => { if (k === 'fillStyle' || k === 'strokeStyle') take(v); o[k] = v; return true; },
  });
  painter(id)(sink, ctx, part(id), S);
  let max = 0;
  for (const c of seen) {
    const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(c);
    const [r, g, b, a] = m ? [+m[1], +m[2], +m[3], +m[4]] : /^#[0-9a-f]{6}$/i.test(c) ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1] : [0, 0, 0, 0];
    max = Math.max(max, (a * Math.max(r, g, b)) / 255);
  }
  return max;
}
