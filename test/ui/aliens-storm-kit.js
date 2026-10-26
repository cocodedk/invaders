// What World 18's (Anvil Sky) alien tests share: the look, a painter runner and a few measurements.
import w18 from '../../src/ui/looks/w18.js';
import { recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { toRgb } from './smogal-kit.js';

export const look = { world: 18, ...w18 };
export const ROLES = ['grunt', 'diver', 'gunner', 'armored', 'carrier'];
export const colourOf = (role) => look.palette.alien[role];
export { recorder, sink, tracker, toRgb };

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
