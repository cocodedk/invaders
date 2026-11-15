// What World 19's (Rubber Regatta) cast and playfield tests share (aliens-bath, bath-bodies, bath-shots): the look as the game has it, a
// painter runner, a context that keeps what a painter may change, colour maths, and canvases that remember what was drawn into them (so a
// sprite baked mid-fight can be counted and a baked sprite read back). Import this before anything under src/ui: it installs the canvases.
import { readFileSync } from 'node:fs';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { toRgb } from './smogal-kit.js';

installCanvas(64);
export const made = []; // every canvas made: { width, height, T (a tracker of what was drawn), strokes ([style, width] of each stroke), fills }
const stand = document.createElement;
document.createElement = (...a) => {
  const T = tracker();
  const [strokes, fills] = [[], []];
  const ctx = new Proxy(T.ctx, {
    get: (o, k) => (k === 'stroke' ? () => strokes.push([o.strokeStyle, o.lineWidth]) : k === 'fill' || k === 'fillRect' ? () => fills.push(o.fillStyle) : o[k]),
    set: (o, k, v) => ((o[k] = v), true),
  });
  const c = { ...stand(...a), getContext: () => ctx, T, strokes, fills };
  made.push(c);
  return c;
};
const { LOOKS } = await import('../../src/ui/looks/index.js');
export const look = LOOKS[18];
export const ROLES = ['grunt', 'diver', 'gunner', 'armored', 'carrier'];
export const colourOf = (role) => look.palette.alien[role];
export { recorder, sink, tracker, toRgb, LOOKS };

// Paint one role on one beat into two fresh contexts (recorders by default, trackers for bounds); dizzy into one.
export function paint(art, role, f, make = recorder) {
  const [b, l] = [make(), make()];
  art[role](b.ctx, l.ctx, f, colourOf(role));
  return { b, l };
}
export function dizzy(art, role, make = recorder) {
  const g = make();
  art.dizzy[role](g.ctx, colourOf(role));
  return g;
}

export const lit = ({ calls }) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;
export const text = ({ calls }) => calls.map((c) => c.map((a) => (typeof a === 'number' || typeof a === 'string' ? a : '~')).join(',')).join(';');

// Every colour a painter hands to its contexts that shows (alpha over 0.25): fill and stroke styles and gradient stops.
export function colours(run) {
  const seen = [];
  const spy = () => new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : /^create(Linear|Radial)Gradient$/.test(k) ? () => ({ addColorStop: (_, c) => seen.push(c) }) : () => sink),
    set: (o, k, v) => {
      if ((k === 'fillStyle' || k === 'strokeStyle') && typeof v === 'string') seen.push(v);
      o[k] = v;
      return true;
    },
  });
  run(spy, spy);
  return seen.filter((c) => {
    const a = /^rgba\([^)]*,\s*([\d.]+)\)$/.exec(c);
    return a ? +a[1] > 0.25 : c.startsWith('#');
  });
}
export const far = (a, b) => Math.hypot(...toRgb(a).map((v, i) => v - toRgb(b)[i]));

// A context that keeps what a painter may change, with a real save and restore, and hands everything else to the sink.
export function stateful() {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  const ctx = new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
  return { ctx, state, stack };
}

// The sprite rules over files of src/ui: under 200 lines, no shadow blur, no dice, no clock.
export function fileRules(assert, names) {
  for (const name of names) {
    const src = readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
}
