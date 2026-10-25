// What World 16's (Glass Cathedral) alien tests share: the look, a painter runner and a few measurements.
import w16 from '../../src/ui/looks/w16.js';
import { recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';

export const look = { world: 16, ...w16 };
export const ROLES = ['grunt', 'diver', 'gunner', 'armored', 'carrier'];
export const colourOf = (role) => look.palette.alien[role];
export { recorder, sink, tracker };

// Paint one role on one beat into two fresh contexts (recorders by default, trackers for bounds).
export function paint(art, role, f, make = recorder) {
  const [b, l] = [make(), make()];
  art[role](b.ctx, l.ctx, f, colourOf(role));
  return { b, l };
}

// Fills, strokes and rectangles: the calls that put paint or light on the canvas.
export const lit = ({ calls }) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;

// A drawing as text: every call with its numbers and strings (gradients and other objects as ~).
export const text = ({ calls }) => calls.map((c) => c.map((a) => (typeof a === 'number' || typeof a === 'string' ? a : '~')).join(',')).join(';');

// Every colour a painter hands to a context: strings set as fill or stroke style and gradient stops, body and lights alike.
export function colours(art, role, f) {
  const seen = [];
  const spy = () => new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : /^create(Linear|Radial)Gradient$/.test(k) ? () => ({ addColorStop: (_, c) => seen.push(c) }) : () => sink),
    set: (o, k, v) => {
      if ((k === 'fillStyle' || k === 'strokeStyle') && typeof v === 'string') seen.push(v);
      o[k] = v;
      return true;
    },
  });
  art[role](spy(), spy(), f, colourOf(role));
  return seen;
}

// [r, g, b] (0..255) of '#rrggbb' or 'rgba(r,g,b,a)'.
export const toRgb = (c) => {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (m) return [+m[1], +m[2], +m[3]];
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// [hue 0..360, saturation 0..1, value 0..1] of an [r, g, b].
export function hsv([r, g, b]) {
  const [x, y, z] = [r, g, b].map((v) => v / 255);
  const max = Math.max(x, y, z);
  const d = max - Math.min(x, y, z);
  let h = 0;
  if (d) h = max === x ? ((y - z) / d) % 6 : max === y ? (z - x) / d + 2 : (x - y) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}
