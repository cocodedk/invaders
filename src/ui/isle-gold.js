// The golds of the island city (parallax-isle-city.js, isle-palace.js, isle-summit.js), painted like the sample palace the owner
// approved (2026-11-19: "yes paint it all"): every face shaded violet on its left and lit toward the low sun on its right, gilded on its
// lit edge, arches glowing with lamplight, eaves sweeping up into flame finials with their undersides lit warm from below. A palette is
// the golds mixed toward the dusk by k, so the terraces higher up the mountain, and farther off, sink into the evening (atmospheric
// perspective) and the city stays under the sprites' gold. Paint-time only.
import { lin, rgba, mix, shade } from './sprites.js';
import { paint, lit, shape, line, poly, crest, PAINT } from './isle-paint.js';

// The golds: edge light, body, deep, stone, the lamplight in arches (bright and deep), an unlit arch, the dusk they sink into.
export const GOLD = { lit: '#ffe39a', gold: '#e8ac3c', deep: '#8a5418', stone: '#d8a24a', lamp: '#ffc864', lampDeep: '#b8501c', dark: '#2a1220', dusk: '#4a2014' };

// The city's colours sunk k toward a deep warm brown, round a body gold of its own (base): darker but still gold, not grey, and its
// thin gilded edges sunk least, so they still catch the sun.
export const palette = (k, base = GOLD.gold) => ({
  lit: mix(GOLD.lit, GOLD.dusk, k * 0.5), gold: mix(base, GOLD.dusk, k), deep: mix(GOLD.deep, GOLD.dusk, k * 0.6), stone: mix(GOLD.stone, GOLD.dusk, k),
  lamp: mix(GOLD.lamp, GOLD.dusk, k * 0.4), lampDeep: mix(GOLD.lampDeep, GOLD.dusk, k * 0.4), dark: GOLD.dark, k,
});

// A face from (x0, y0) to (x1, y1) in c: violet toward the left, lit toward the sun on the right, gilded along its right edge and top.
export function face(g, x0, y0, x1, y1, c, P) {
  g.fillStyle = lin(g, x0, 0, x1, 0, [[0, mix(c, PAINT.shadow, 0.35)], [0.6, c], [1, shade(c, 0.18)]]);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = rgba(PAINT.night, 0.7);
  g.lineWidth = 1;
  g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  if (x1 - x0 > 6) line(g, [[x1 - 1, y0 + 1], [x1 - 1, y1 - 1]], rgba(P.lit, 0.8), 1.2);
  line(g, [[x0 + 1, y0 + 0.5], [x1 - 1, y0 + 0.5]], rgba(P.lit, 0.55), 1);
}

// An arch from x, w wide, its foot at y, h tall: glowing with lamplight, or dark.
export function arch(g, x, y, w, h, on, P) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - h + w / 2);
  g.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0);
  g.lineTo(x + w, y);
  g.closePath();
  paint(g, on ? lin(g, 0, y, 0, y - h, [[0, P.lamp], [1, P.lampDeep]]) : P.dark, w > 5 ? 0.8 : 0);
}

// A row of n arches across x0..x1 with their feet at y, h tall, lit by chance (rng below p).
export function arcade(g, x0, x1, y, h, n, rng, p, P) {
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) arch(g, x0 + step * (i + 0.2), y, step * 0.6, h, rng() < p, P);
}

// An eave w wide at x whose ends sweep up into flame finials, its foot at y, th thick: its roof gold, its underside lit warm from below,
// its edge gilded brightest toward the sun.
export function eave(g, x, y, w, th, u, P) {
  const [l, r] = [x - w / 2, x + w / 2];
  shape(g, [[l - th * 0.9, y - th * 1.2], [l - th * 0.3, y - th * 0.15], [l + th, y], [r - th, y], [r + th * 0.3, y - th * 0.15], [r + th * 0.9, y - th * 1.2], [r - w * 0.12, y - th * 1.5], [l + w * 0.12, y - th * 1.5]]);
  paint(g, lit(g, P.gold, x, y - th, w * 0.5, u), th > 3 ? PAINT.line : 0.6);
  line(g, [[l - th * 0.4, y - th * 0.25], [l + th, y + 0.5], [r - th, y + 0.5], [r + th * 0.4, y - th * 0.25]], rgba(P.lamp, 0.85), Math.max(1, th * 0.35));
  g.strokeStyle = lin(g, l, 0, r, 0, [[0, rgba(P.lit, 0.25)], [1, P.lit]]);
  g.lineWidth = th > 3 ? 1.4 : 1;
  g.beginPath();
  g.moveTo(l - th * 0.9, y - th * 1.2);
  g.lineTo(l + w * 0.12, y - th * 1.5);
  g.lineTo(r - w * 0.12, y - th * 1.5);
  g.lineTo(r + th * 0.9, y - th * 1.2);
  g.stroke();
  for (const s of [-1, 1]) poly(g, [[x + s * (w / 2 + th * 0.9), y - th * 1.2], [x + s * (w / 2 + th * 1.3), y - th * 2.3], [x + s * (w / 2 + th * 0.5), y - th * 1.4]], P.lit, th > 3 ? 0.8 : 0);
}

// A swelling dome on (x, y), w wide, drawn to a point, a crest of petals round its foot and a needle on top.
export function dome(g, x, y, w, u, P) {
  shape(g, [[x - w * 0.5, y], [x - w * 0.56, y - w * 0.45], [x - w * 0.2, y - w * 0.85], [x, y - w * 1.1], [x + w * 0.2, y - w * 0.85], [x + w * 0.56, y - w * 0.45], [x + w * 0.5, y]]);
  paint(g, lit(g, P.gold, x, y - w * 0.5, w * 0.6, u), w > 14 ? PAINT.line : 0.7);
  if (w > 10) crest(g, x - w * 0.48, y, x + w * 0.48, y, Math.max(3, Math.round(w / 7)), w * 0.14, P.gold, u);
  line(g, [[x, y - w * 1.1], [x, y - w * 1.4]], P.lit, w > 14 ? 1.4 : 1);
}

// A domed kiosk on base at x, w wide: a face with two arches, a dome over it.
export function kiosk(g, x, base, w, u, P) {
  face(g, x - w / 2, base - w * 0.8, x + w / 2, base, P.gold, P);
  for (let i = 0; i < 2; i++) arch(g, x - w / 2 + w * (0.12 + i * 0.44), base - 1, w * 0.32, w * 0.6, i === 1, P);
  dome(g, x, base - w * 0.8, w * 1.1, u, P);
}

// A curved spire on (x, y) rising to top, sw half-wide at its foot: banded gold under a ribbed crown, a pot and a needle to tip.
export function spire(g, x, y, top, tip, sw, u, P) {
  shape(g, [[x - sw, y], [x - sw * 1.02, y - (y - top) * 0.45], [x - sw * 0.5, top], [x + sw * 0.5, top], [x + sw * 1.02, y - (y - top) * 0.45], [x + sw, y]]);
  paint(g, lit(g, P.gold, x, (y + top) / 2, sw * 1.4, u), sw > 6 ? PAINT.line : 0.7);
  for (let k = 1; k < 6; k++) {
    const by = y - ((y - top) * k) / 6;
    const bw = sw * (1 - (k / 6) ** 2 * 0.5);
    line(g, [[x - bw, by], [x + bw, by]], rgba(k % 2 ? P.lit : P.deep, 0.7), sw > 6 ? 1.2 : 0.8);
  }
  g.beginPath();
  g.ellipse(x, top - sw * 0.15, sw * 0.62, Math.max(1.5, sw * 0.22), 0, 0, Math.PI * 2);
  paint(g, lit(g, P.gold, x, top, sw * 0.6, u), 0.8);
  line(g, [[x, top - sw * 0.3], [x, tip]], P.lit, sw > 6 ? 1.4 : 1);
}
