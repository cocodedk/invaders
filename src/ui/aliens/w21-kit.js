// What World 21's painters share (aliens/w21*.js, and the Ten-Crowned King's, bosses/crowns*.js): the demon king's host painted like a
// masked dance-drama in the isle's gold leaf, vermilion, deep green and black (isle-kit.js PAL). Every figure is outlined in black and
// lacquered from its colour toward black; the faces are painted masks (deep green, black sweeps round the eyes, a white ridge framing
// the jaw, curled brows and moustache, small fangs) under stepped, tiered crowns of gold. Ornament only: gold leaf, lotus petals, textile
// borders, brass; no mark of any kind on a brow. Lights: the catch of gold leaf and the red of the eyes. Nothing is painted per frame.
import { path, ink, lin, rad, rgba, shade, mix, gloss, bloom, line, ellipse, circle, both, TAU } from './kit.js';
import { tidy } from './w16-kit.js';
import { PAL } from '../isle-kit.js';

export { path, ink, lin, rad, rgba, shade, mix, gloss, bloom, line, ellipse, circle, both, TAU, tidy };

export const GOLD = PAL.gold;
export const GOLD_D = PAL.goldDeep;
export const GOLD_P = PAL.goldPale;
export const VERMILION = '#d8402a';
export const GREEN = '#2e6a4a'; // the deep green of the masks (looks/w21.js palette.boss.plate)
export const BLACK = '#140a0e';
export const IVORY = '#f4ead2'; // the white ridge framing a mask's jaw
export const EYE_RED = PAL.crimson;

// Gold leaf over (x0, y0)..(x1, y1): pale where the light catches it, deep in the folds.
export const gilt = (g, x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, GOLD_P], [0.3, GOLD], [0.7, GOLD_D], [1, shade(GOLD, 0.2)]]);
// A lacquered fill: c lit at the upper left, sinking toward black at the lower right.
export const lacquer = (g, c, x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, shade(c, 0.3)], [0.45, c], [1, mix(c, BLACK, 0.6)]]);

// A gold glint on the lights layer: a soft bloom and a four-point star.
export function glint(l, x, y, r, a = 0.6) {
  bloom(l, x, y, r * 2.4, GOLD, a * 0.6);
  path(l, [[x - r, y], [x, y - r * 0.2], [x + r, y], [x, y + r * 0.2]]);
  l.fillStyle = rgba('#ffffff', a);
  l.fill();
  path(l, [[x, y - r], [x + r * 0.2, y], [x, y + r], [x - r * 0.2, y]]);
  l.fill();
}

// A fan of n lotus petals round (x, y), r long, from angle a0 to a1, in c.
export function petals(g, x, y, r, n, c, a0 = Math.PI, a1 = TAU, lw = 1.2) {
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n;
    const [ca, sa] = [Math.cos(a), Math.sin(a)];
    const w = (r * 0.5 * (a1 - a0)) / n + r * 0.12;
    g.beginPath();
    g.moveTo(x - sa * w * 0.3, y + ca * w * 0.3);
    g.quadraticCurveTo(x + ca * r * 0.5 - sa * w, y + sa * r * 0.5 + ca * w, x + ca * r, y + sa * r);
    g.quadraticCurveTo(x + ca * r * 0.5 + sa * w, y + sa * r * 0.5 - ca * w, x + sa * w * 0.3, y - ca * w * 0.3);
    g.closePath();
    ink(g, lin(g, x, y, x + ca * r, y + sa * r, [[0, mix(c, BLACK, 0.35)], [1, shade(c, 0.35)]]), lw);
  }
}

// A woven border across x0..x1 at y, h tall: a red band edged in gold, a zigzag of gold through it.
export function trim(g, x0, x1, y, h, c = VERMILION) {
  g.fillStyle = mix(c, BLACK, 0.15);
  g.fillRect(x0, y - h / 2, x1 - x0, h);
  g.fillStyle = GOLD;
  g.fillRect(x0, y - h / 2, x1 - x0, h * 0.18);
  g.fillRect(x0, y + h / 2 - h * 0.18, x1 - x0, h * 0.18);
  const step = Math.max(3, h * 0.9);
  g.beginPath();
  for (let x = x0, i = 0; x <= x1; x += step / 2, i++) g.lineTo(x, y + (i % 2 ? h * 0.22 : -h * 0.22));
  line(g, GOLD_P, Math.max(0.8, h * 0.12));
}

// A stepped, tiered crown whose band sits at y (the brow line), w wide, rising h to a spire: a band of beads, tiers each narrower than
// the last like a temple tower, flared ear pieces at the band's ends. Lights: glints at the spire and the tiers' corners.
export function crown(b, l, x, y, w, h, tiers = 3) {
  const band = h * 0.22;
  both((s) => { // the flared ear pieces, curling out and down
    b.beginPath();
    b.moveTo(x + s * w * 0.42, y - band);
    b.quadraticCurveTo(x + s * w * 0.78, y - band * 1.6, x + s * w * 0.7, y + band * 1.4);
    b.quadraticCurveTo(x + s * w * 0.6, y + band * 0.2, x + s * w * 0.42, y);
    b.closePath();
    ink(b, gilt(b, x, y - band * 2, x + s * w * 0.7, y + band), 1.2);
  });
  path(b, [[x - w / 2, y], [x + w / 2, y], [x + w * 0.46, y - band], [x - w * 0.46, y - band]]);
  ink(b, gilt(b, x, y - band, x, y), 1.4);
  for (let i = 0; i < 4; i++) { // a row of red beads, none at the middle of the brow
    circle(b, x + (i < 2 ? -1 : 1) * w * (i % 2 ? 0.34 : 0.18), y - band / 2, Math.max(0.8, band * 0.2));
    b.fillStyle = VERMILION;
    b.fill();
  }
  let [ww, yy] = [w * 0.82, y - band];
  const step = (h - band) * 0.62 / tiers;
  for (let t = 0; t < tiers; t++) {
    const nw = ww * 0.74;
    path(b, [[x - ww / 2, yy], [x + ww / 2, yy], [x + nw / 2, yy - step], [x - nw / 2, yy - step]]);
    ink(b, gilt(b, x - ww / 2, yy - step, x + ww / 2, yy), 1.2);
    for (let i = -2; i <= 2; i++) { // a row of gold beads along the ledge
      circle(b, x + i * nw * 0.2, yy - step * 0.5, Math.max(0.6, step * 0.16));
      b.fillStyle = GOLD_P;
      b.fill();
    }
    glint(l, x - ww / 2 + 1, yy - 1, Math.max(1.5, step * 0.4), 0.35);
    [ww, yy] = [nw, yy - step];
  }
  path(b, [[x - ww / 2, yy], [x - ww * 0.15, yy - (h - band) * 0.25], [x, y - h], [x + ww * 0.15, yy - (h - band) * 0.25], [x + ww / 2, yy]]);
  ink(b, gilt(b, x - ww, y - h, x + ww, yy), 1.2);
  glint(l, x, y - h + 1, Math.max(2, w * 0.08), 0.6);
}

// A painted mask at (x, y), s times the unit size (a face 32 wide): the ivory ridge round the jaw, the face in c, black sweeps round the
// almond eyes, curled brows and moustache, red lips with small fangs (mood 1: the mouth open in a roar), a tiered crown on the brow
// (tiers 0: none). look -1..1 turns the pupils. Lights: the eyes burning red.
export function mask(b, l, x, y, s, c = GREEN, { tiers = 3, crownH = 30, mood = 0, look = 0 } = {}) {
  for (const g of [b, l]) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
  }
  b.beginPath(); // the ivory ridge, scalloped round the jaw
  for (let i = 0; i <= 12; i++) {
    const a = 0.1 * Math.PI + (i / 12) * 0.8 * Math.PI;
    const r = i % 2 ? 21 : 23.5;
    b.lineTo(Math.cos(a) * r * 0.92, 2 + Math.sin(a) * r);
  }
  b.closePath();
  ink(b, lin(b, 0, 4, 0, 26, [[0, IVORY], [1, shade(IVORY, -0.25)]]), 1.4);
  ellipse(b, 0, 0, 16, 19);
  ink(b, rad(b, -5, -6, 2, 22, [[0, shade(c, 0.35)], [0.6, c], [1, mix(c, BLACK, 0.5)]]), 1.6);
  both((q) => {
    path(b, [[q * 2.5, -4.5], [q * 9, -8.5], [q * 17, -11.5], [q * 13, -3.5], [q * 5, -2]]); // the black sweep
    b.fillStyle = BLACK;
    b.fill();
    path(b, [[q * 4.5, -4.5], [q * 9, -7], [q * 12.5, -6.5], [q * 9.5, -3.6]]); // the eye
    b.fillStyle = IVORY;
    b.fill();
    circle(b, q * 8.5 + look * 1.6, -5.4, 1.7);
    b.fillStyle = EYE_RED;
    b.fill();
    bloom(l, q * 8.5 + look * 1.6, -5.4, 5, EYE_RED, 0.55);
    b.beginPath(); // the brow, curling up at its end
    b.moveTo(q * 2.5, -9.5);
    b.quadraticCurveTo(q * 9, -14.5, q * 15, -13);
    b.quadraticCurveTo(q * 17.5, -12, q * 16, -15.5);
    line(b, BLACK, 2.4);
    b.beginPath(); // the moustache, curled
    b.moveTo(0, 3.5);
    b.quadraticCurveTo(q * 7, 2.5, q * 10, 6);
    b.quadraticCurveTo(q * 12, 3, q * 10.5, 1.5);
    line(b, BLACK, 1.8);
  });
  path(b, [[0, -4], [-1.6, 2.5], [1.6, 2.5]]); // the nose, gilded
  ink(b, GOLD, 0.6);
  if (mood) {
    ellipse(b, 0, 9, 5.5, 4);
    ink(b, '#3a0a10', 1.2);
  } else {
    ellipse(b, 0, 8.5, 5, 2.2);
    ink(b, VERMILION, 1);
  }
  both((q) => { // the fangs at the corners of the mouth
    path(b, [[q * 3.4, 8.4], [q * 5.4, 8.6], [q * 4.4, mood ? 13 : 12]]);
    ink(b, IVORY, 0.6);
  });
  gloss(l, -6, -9, 5, 3, 0.25, -0.4);
  if (tiers) crown(b, l, 0, -16, 34, crownH, tiers);
  b.restore();
  l.restore();
}
