// What the Glass Cathedral backdrop's tests share (glass-env-*.test.js): colour maths, a context that keeps the state a painter may
// change, and the list of the backdrop's source files for the sprite rules.
import { readdirSync } from 'node:fs';
import { sink } from './dom-kit.js';
import { rgb } from '../../src/ui/sprites.js';

export function contrast(a, b) {
  const lum = (h) => rgb(h).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// The hue of a #rrggbb colour in degrees, or -1 for a grey.
export function hue(h) {
  const [r, g, b] = rgb(h).map((v) => v / 255);
  const [hi, lo] = [Math.max(r, g, b), Math.min(r, g, b)];
  if (hi === lo) return -1;
  const d = hi - lo;
  return (hi === r ? ((g - b) / d + 6) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
}

// The bullets' acid lime and everything near it (yellow-green, hues 60-120) is the enemy's: nothing in the backdrop wears it.
export const limeish = (hex) => {
  const h = hue(hex);
  const [r, g, b] = rgb(hex);
  return h >= 60 && h <= 120 && g > 120 && g - b > 60 && r < 235;
};

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
export function stateful() {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
}

// The files of the backdrop (src/ui): the sprite rules (no shadow blur, dice or clock, under 200 lines) run over every one.
export function backdropFiles() {
  const dir = new URL('../../src/ui/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^(parallax-glass|flourish-glass)/.test(n) || ['sky-bodies-8.js', 'ambient-8.js', 'warm-glass-env.js'].includes(n));
  return { dir, names };
}
