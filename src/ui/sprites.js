// Shared drawing helpers: offscreen canvases, colour maths, hashing and cached sprites (from Barrage).
// Glow is never shadowBlur: it is a cached radial-gradient sprite drawn with 'lighter'.
import { clamp } from '../core/math.js';

export const W = 1920;
export const H = 1080;
export const INK = '#0a0c16'; // outlines that keep bright shapes readable on bright skies

// v wrapped into [lo, hi).
export const wrap = (v, lo, hi) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));
export const lighter = (ctx) => { ctx.globalCompositeOperation = 'lighter'; };
export const normal = (ctx) => { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; };

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

const rgbCache = new Map();
// '#rgb' or '#rrggbb' -> [r, g, b]
export function rgb(hex) {
  let v = rgbCache.get(hex);
  if (v) return v;
  let s = hex.slice(1);
  if (s.length === 3) s = s.replace(/./g, (c) => c + c);
  const n = parseInt(s, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  rgbCache.set(hex, v);
  return v;
}

export function rgba(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

const hex2 = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');

// Blend two colours, t 0..1.
export function mix(a, b, t) {
  const x = rgb(a);
  const y = rgb(b);
  return '#' + [0, 1, 2].map((i) => hex2(x[i] + (y[i] - x[i]) * t)).join('');
}

// k > 0 lightens toward white, k < 0 darkens toward black.
export const shade = (hex, k) => (k >= 0 ? mix(hex, '#ffffff', k) : mix(hex, '#000000', -k));

// Integer hash -> [0, 1). Deterministic decoration without Math.random.
export function hash(n) {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const hash2 = (x, y) => hash(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663));

// Smooth value noise in [0, 1) on a lattice of `cell` px.
export function noise2(x, y, cell, seed = 0) {
  const fx = x / cell;
  const fy = y / cell;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  let tx = fx - ix;
  let ty = fy - iy;
  tx = tx * tx * (3 - 2 * tx);
  ty = ty * ty * (3 - 2 * ty);
  const s = seed * 7919;
  const a = hash2(ix + s, iy);
  const b = hash2(ix + 1 + s, iy);
  const c = hash2(ix + s, iy + 1);
  const d = hash2(ix + 1 + s, iy + 1);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

const cache = new Map();
// A sprite painted once and kept: paint(g, w, h) fills a w x h canvas.
export function cached(key, w, h, paint) {
  let c = cache.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    paint(c.getContext('2d'), w, h);
    cache.set(key, c);
  }
  return c;
}

const radial = (stops) => (g, w) => {
  const h = w / 2;
  const gr = g.createRadialGradient(h, h, 0, h, h, h);
  for (const [at, c] of stops) gr.addColorStop(at, c);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, w);
};

// Additive glow blob: hot centre fading out through `color`. Draw with 'lighter'.
export const glow = (color) => cached('g' + color, 64, 64, radial([
  [0, rgba(color, 1)], [0.2, rgba(color, 0.55)], [0.5, rgba(color, 0.16)], [1, rgba(color, 0)],
]));

// Soft-edged disc (smoke, dust, fog, petals of light): opaque middle, feathered rim.
export const soft = (color) => cached('s' + color, 64, 64, radial([
  [0, rgba(color, 1)], [0.45, rgba(color, 0.75)], [1, rgba(color, 0)],
]));

// Four-point twinkle star for sparkles and glints.
export const star = (color) => cached('t' + color, 64, 64, (g) => {
  g.drawImage(glow(color), 16, 16, 32, 32);
  g.fillStyle = rgba(color, 0.9);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r = i % 2 ? 3.8 : 31.4;
    g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  g.fill();
});

// Draw a sprite centred on (x, y) with radius r, additively.
export function addGlow(ctx, sprite, x, y, r, a = 1) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// Rounded rectangle path.
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
