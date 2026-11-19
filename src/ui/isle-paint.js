// How Golden Isle's backdrop paints its cast in full colour (the owner, 2026-11-19: "needs a lot more polishing"), the way Sunset Armada
// paints its ships (parallax-armada-ships.js): every part is filled with a gradient running from the warm light of the low sun to a violet
// shadow and lined thin in night violet, ornament goes over it, the whole figure is outlined in night violet and its edges toward the sun
// are rimmed in warm cream. Each figure is baked once on its own canvas and drawn into the sky or a layer: nothing here runs per frame.
import { makeCanvas, lin, rad, rgba, shade, mix } from './sprites.js';
import { TAU } from '../core/math.js';

// The line and outline (night violet, px), the sunlight and the shadow mixed into a part's fill, the rim of sunlight (colour, px, alpha).
export const PAINT = { night: '#1a0c28', line: 1.2, outline: 1.6, sun: '#ffe2a8', shadow: '#4a2a5a', rim: '#fff0c8', rimW: 2.4, rimA: 0.75 };

// The unit vector toward the sun, from its angle.
export const toward = (a) => [Math.cos(a), Math.sin(a)];

// A fill for a part of colour c round (x, y), r across: warm on its side toward the sun (u), sunk violet on the far side.
export const lit = (g, c, x, y, r, [ux, uy]) => lin(g, x + ux * r, y + uy * r, x - ux * r, y - uy * r, [
  [0, mix(shade(c, 0.25), PAINT.sun, 0.3)], [0.4, c], [1, mix(c, PAINT.shadow, 0.55)],
]);

// Fill the current path, then line it in night violet, w px.
export function paint(g, fill, w = PAINT.line) {
  g.fillStyle = fill;
  g.fill();
  if (!w) return;
  g.strokeStyle = rgba(PAINT.night, 0.85);
  g.lineWidth = w;
  g.stroke();
}

// A polyline through pts in c, w px.
export function line(g, pts, c, w) {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
  g.strokeStyle = c;
  g.lineWidth = w;
  g.stroke();
}

// A closed polygon through pts, filled and lined.
export function poly(g, pts, fill, w = PAINT.line) {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
  g.closePath();
  paint(g, fill, w);
}

// A disc at (x, y), r across, in c, unlined.
export function dot(g, x, y, r, c) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  paint(g, c, 0);
}

// Through the points P, smoothed: a curve to each point's midpoint with the next.
function through(g, P, start = false) {
  if (start) g.moveTo(...P[0]);
  else g.lineTo(...P[0]);
  for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(...P[i], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
  g.lineTo(...P[P.length - 1]);
}

// A closed smooth path through P: a cloth, a face.
export function shape(g, P) {
  g.beginPath();
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  g.moveTo(...m(P[P.length - 1], P[0]));
  for (let i = 0; i < P.length; i++) g.quadraticCurveTo(...P[i], ...m(P[i], P[(i + 1) % P.length]));
  g.closePath();
}

// One piece along the joints pts, ws wide at each and round at both ends (a limb, a tail, a ribbon), so it fills and lines with no seam.
export function tube(g, pts, ws) {
  const n = pts.map((_, i) => {
    const [a, b] = [pts[Math.max(0, i - 1)], pts[Math.min(pts.length - 1, i + 1)]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  });
  const side = (s) => pts.map(([x, y], i) => [x + (s * n[i][0] * ws[i]) / 2, y + (s * n[i][1] * ws[i]) / 2]);
  const ang = (i, s) => Math.atan2(s * n[i][1], s * n[i][0]);
  const e = pts.length - 1;
  g.beginPath();
  through(g, side(1), true);
  g.arc(...pts[e], ws[e] / 2, ang(e, 1), ang(e, -1), true);
  through(g, side(-1).reverse());
  g.arc(...pts[0], ws[0] / 2, ang(0, -1), ang(0, 1), true);
  g.closePath();
}

// Shading round a form: lit warm toward the sun, its colour, sinking violet on the far side with a little light bounced back at the edge.
const form = (c) => [[0, mix(shade(c, 0.3), PAINT.sun, 0.35)], [0.3, c], [0.78, mix(c, PAINT.shadow, 0.5)], [1, mix(c, PAINT.shadow, 0.3)]];

// A limb along pts, ws wide, in colour c, shaded across its width like a rounded form lit from u.
export function limb(g, pts, ws, c, u) {
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const s = Math.sign(-(b[1] - a[1]) * u[0] + (b[0] - a[0]) * u[1]) || 1;
  const [nx, ny] = [(-s * (b[1] - a[1])) / l, (s * (b[0] - a[0])) / l];
  const [mx, my] = [pts.reduce((t, p) => t + p[0], 0) / pts.length, pts.reduce((t, p) => t + p[1], 0) / pts.length];
  const r = Math.max(...ws) / 2;
  tube(g, pts, ws);
  paint(g, lin(g, mx + nx * r, my + ny * r, mx - nx * r, my - ny * r, form(c)));
}

// A fill for a round form of colour c at (x, y), r across: its light toward the sun, its shadow round the far side.
export const orb = (g, c, x, y, r, [ux, uy]) => rad(g, x, y, r * 0.05, r * 1.05, form(c), x + ux * r * 0.5, y + uy * r * 0.5);

// A crest of n petals of gold (c) standing h tall along the edge (x0, y0)..(x1, y1), on its left as it runs (the top, running right).
export function crest(g, x0, y0, x1, y1, n, h, c, u) {
  const [dx, dy] = [(x1 - x0) / n, (y1 - y0) / n];
  const l = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [(dy / l) * h, (-dx / l) * h];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = [x0 + dx * i, y0 + dy * i];
    g.beginPath();
    g.moveTo(ax, ay);
    g.quadraticCurveTo(ax + nx * 0.7, ay + ny * 0.7, ax + dx / 2 + nx, ay + dy / 2 + ny);
    g.quadraticCurveTo(ax + dx + nx * 0.7, ay + dy + ny * 0.7, ax + dx, ay + dy);
    g.closePath();
    paint(g, lit(g, c, ax + dx / 2, ay + dy / 2, h, u), 0.7);
  }
}

// A band of gold across a limb at (x, y), w long and t thick, turned a: an armlet, a bracelet, an anklet.
export function band(g, x, y, w, t, a, gold, u) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.beginPath();
  g.ellipse(0, 0, w / 2, t / 2, 0, 0, TAU);
  paint(g, lit(g, gold, 0, 0, w / 2, u), 0.8);
  g.restore();
}

// Bake a figure w x h: draw(g, u) paints its parts (u: toward the sun, from the angle light); the outline goes round it and the rim of
// sunlight along its edges toward the sun (the figure less itself moved away from the sun). Returns the canvas.
export function figure(w, h, draw, light) {
  const u = toward(light);
  const art = makeCanvas(w, h);
  const a = art.getContext('2d');
  a.lineCap = 'round';
  a.lineJoin = 'round';
  draw(a, u);
  const rim = makeCanvas(w, h);
  const r = rim.getContext('2d');
  r.drawImage(art, 0, 0);
  r.globalCompositeOperation = 'destination-out';
  r.drawImage(art, -u[0] * PAINT.rimW, -u[1] * PAINT.rimW);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = PAINT.rim;
  r.fillRect(0, 0, w, h);
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  for (let k = 0; k < 8; k++) g.drawImage(art, Math.cos((k * TAU) / 8) * PAINT.outline, Math.sin((k * TAU) / 8) * PAINT.outline);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = rgba(PAINT.night, 0.9);
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(art, 0, 0);
  g.globalAlpha = PAINT.rimA;
  g.drawImage(rim, 0, 0);
  g.globalAlpha = 1;
  return c;
}
