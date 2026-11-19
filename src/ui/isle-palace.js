// The buildings of the golden city (parallax-isle-city.js), each standing on (x, base), w wide and h tall, in a palette of its own
// (P, isle-gold.js): palace halls under tiered roofs with flame-finialled eaves and a needle spire, domed halls, curved temple towers,
// many-storeyed mansions with kiosks on their roofs, and gate towers over the walls. All in true gold like the summit palaces (the owner
// approved the sample, 2026-11-19): faces violet on the left and lit on the right toward the low sun, gilded edges, lamplight in their
// arches. Paint-time only; rng only chooses which windows are lit.
import { toward } from './isle-paint.js';
import { face, arch, arcade, eave, dome, kiosk, spire, palette } from './isle-gold.js';

export const GOLDS = ['#e8ac3c', '#f0b84a', '#dca038', '#e6b450', '#d89a30']; // the city's body golds, one a building
export const WINDOW = { p: 0.42, light: 0.15 }; // the chance a window is lit; the angle the low sun lights the city from
const U = toward(WINDOW.light);

export function hall(g, x, base, w, h, P, rng) {
  const bh = h * 0.42;
  face(g, x - w / 2, base - bh, x + w / 2, base, P.gold, P);
  arcade(g, x - w / 2 + 2, x + w / 2 - 2, base - 2, bh * 0.62, Math.max(2, Math.round(w / 9)), rng, WINDOW.p, P);
  let [y, rw] = [base - bh, w * 1.04];
  for (let k = 0; k < 3; k++, rw *= 0.7) {
    const th = h * 0.065;
    eave(g, x, y, rw, th, U, P);
    y -= th * 1.5;
    if (k === 2) break;
    face(g, x - rw * 0.3, y - h * 0.05, x + rw * 0.3, y, P.gold, P);
    y -= h * 0.05;
  }
  spire(g, x, y, base - h * 0.88, base - h, Math.max(2, w * 0.07), U, P);
}

export function domed(g, x, base, w, h, P, rng) {
  const bh = h * 0.4;
  face(g, x - w / 2, base - bh, x + w / 2, base, P.gold, P);
  arcade(g, x - w / 2 + 2, x + w / 2 - 2, base - 2, bh * 0.6, Math.max(2, Math.round(w / 9)), rng, WINDOW.p, P);
  dome(g, x, base - bh, w * 0.84, U, P);
}

export function tower(g, x, base, w, h, P) {
  face(g, x - w * 0.56, base - h * 0.08, x + w * 0.56, base, P.stone, P); // its plinth
  spire(g, x, base - h * 0.08, base - h * 0.84, base - h, w / 2, U, P);
}

export function mansion(g, x, base, w, h, P, rng) {
  const bh = h * 0.74;
  face(g, x - w / 2, base - bh, x + w / 2, base, P.gold, P);
  const rows = Math.max(1, Math.floor(bh / 16));
  for (let r = 0; r < rows; r++) {
    const y = base - 3 - (r * (bh - 4)) / rows;
    arcade(g, x - w / 2 + 2, x + w / 2 - 2, y, Math.min(10, (bh / rows) * 0.6), Math.max(2, Math.round(w / 9)), rng, WINDOW.p, P);
    if (r) face(g, x - w / 2 - 2, y + 1, x + w / 2 + 2, y + 3, P.deep, P); // a balcony
  }
  for (const kx of [x - w * 0.34, x + w * 0.34]) kiosk(g, kx, base - bh, w * 0.24, U, P); // kiosks on its roof
}

export function gate(g, x, base, w, h, P) {
  const bh = h * 0.5;
  face(g, x - w / 2, base - bh, x + w / 2, base, P.gold, P);
  arch(g, x - w * 0.18, base, w * 0.36, bh * 0.66, true, P); // the gateway, lamplight inside
  let y = base - bh;
  for (let k = 0; k < 3; k++) { // the stepped tower over it
    const sw = w * (0.92 - k * 0.2);
    face(g, x - sw / 2, y - h * 0.1, x + sw / 2, y, k % 2 ? P.deep : P.gold, P);
    y -= h * 0.1;
  }
  spire(g, x, y, base - h * 0.9, base - h, Math.max(2, w * 0.12), U, P);
}

export const BUILD = { hall, domed, tower, mansion, gate }; // the kinds the city lays out, by name
export { palette };
