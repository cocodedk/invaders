// What the tests of world 17's sky, far layer and sky flourishes share (smogenv1-*.test.js): the look as the game has it, canvases that
// follow what is drawn into them (so a sprite's extent can be read and a sprite baked mid-fight counted), helpers that draw one
// flourish at one healing and time and hand back every drawImage (frame) or every call (rec), colour maths, and the list of this
// worker's source files for the rules. Import this before anything under src/ui: it installs the canvases.
import { readdirSync } from 'node:fs';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { rgb } from '../../src/ui/sprites.js';
export { stateful } from './glass-env-kit.js';
export { tracker, recorder };

installCanvas(64);
export const made = [];
const stand = document.createElement;
document.createElement = (...a) => {
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { default: w17 } = await import('../../src/ui/looks/w17.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
export const look = { world: 17, ...w17 };
export const [W, H] = [1920, 1080];
export const PHASE = { far: [-160, 380], sky: [0, 0] }; // [x0, top] each phase's hook gets (the far layer's, ship at the middle)
export { drawFlourishes };

// An env as the view makes it, at healing h (null: a view without one), time t.
export const env = (names, h, t, quality = 1) => ({
  v: { look: { ...look, flourish: names }, layers: [], cache: {}, heal: h === null ? null : { h } },
  world: { ship: { x: 960 } }, fx: { flashes: [], time: t }, t, quality,
});
export const frame = (name, phase, h, t = 5, quality = 1) => { // every drawImage of one flourish: { img, alpha, comp, args, box }
  const T = tracker();
  drawFlourishes(T.ctx, env([name], h, t, quality), phase, ...PHASE[phase]);
  return T.calls;
};
export const rec = (name, phase, h, t = 5, quality = 1) => { // every call it makes
  const r = recorder();
  drawFlourishes(r.ctx, env([name], h, t, quality), phase, ...PHASE[phase]);
  return r.calls;
};

// A hex colour's hue (degrees, -1 for a grey), saturation and lightness.
export function hsl(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const [hi, lo] = [Math.max(r, g, b), Math.min(r, g, b)];
  const l = (hi + lo) / 2;
  if (hi === lo) return { h: -1, s: 0, l };
  const d = hi - lo;
  const h = (hi === r ? ((g - b) / d + 6) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return { h, s: d / (1 - Math.abs(2 * l - 1)), l };
}

// The bullets are hot magenta (#ff3fd2): hues 290-345, saturated and not dark.
export const magentaish = (hex) => {
  const { h, s, l } = hsl(hex);
  return h >= 290 && h <= 345 && s > 0.45 && l > 0.3;
};

// This worker's source files in src/ui.
export function myFiles() {
  const dir = new URL('../../src/ui/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^(sky-bodies-9|parallax-smog-far|flourish-smog-sky)/.test(n));
  return { dir, names };
}

// A context that notes every colour handed to a fill, a stroke or a gradient stop, and every call, for reading what a painter uses.
export function probe() {
  const colors = [];
  const calls = [];
  const state = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const ctx = new Proxy(state, {
    get: (o, k) => {
      if (k in o) return o[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: (_, c) => colors.push(c) });
      return (...a) => { calls.push([k, ...a]); };
    },
    set: (o, k, v) => { if ((k === 'fillStyle' || k === 'strokeStyle') && typeof v === 'string') colors.push(v); o[k] = v; return true; },
  });
  return { ctx, colors, calls };
}

// '#rrggbb' of a '#rrggbb' or 'rgba(r,g,b,a)' string, or null.
export const hexOf = (c) => {
  if (typeof c !== 'string') return null;
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = /^rgba?\((\d+),(\d+),(\d+)/.exec(c.replace(/\s/g, ''));
  return m ? '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('') : null;
};
