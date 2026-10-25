// What World 17's mid and near layers, ambient and ground flourish tests share (smogenv2-*.test.js): the look as the game has it,
// a stand-in context that keeps the state a painter may change (re-exported), canvases that follow what is drawn into them (so a
// sprite's extent can be read and a sprite baked mid-fight counted), colour maths, and the list of this worker's source files
// for the sprite rules. Import this before anything under src/ui: it installs the canvases.
import { readdirSync } from 'node:fs';
import { installCanvas } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { rgb } from '../../src/ui/sprites.js';
export { stateful } from './glass-env-kit.js';

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
export const look = { world: 17, ...w17 };
export { tracker };

// A hex colour's hue (degrees, -1 for a grey), saturation and lightness (0..1).
export function hsl(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const [hi, lo] = [Math.max(r, g, b), Math.min(r, g, b)];
  const l = (hi + lo) / 2;
  if (hi === lo) return { h: -1, s: 0, l };
  const d = hi - lo;
  const h = (hi === r ? ((g - b) / d + 6) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return { h, s: d / (1 - Math.abs(2 * l - 1)), l };
}

// The bullets are hot magenta (#ff3fd2): hues 290-345 that are saturated and not dark.
export const magentaish = (hex) => {
  const { h, s, l } = hsl(hex);
  return h >= 290 && h <= 345 && s > 0.45 && l > 0.3;
};

export const parse = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : typeof c === 'string' && c.startsWith('rgba(') ? '#' + c.slice(5, -1).split(',').slice(0, 3).map((v) => Math.round(Number(v)).toString(16).padStart(2, '0')).join('') : null);

// This worker's source files in src/ui.
export function myFiles() {
  const dir = new URL('../../src/ui/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^(parallax-smog-(kit|pal|mid|near)|flourish-smog-ground|ambient-9)/.test(n));
  return { dir, names };
}
