// The near layer of Midnight Press (pressfloor): the hall's floor of dark boards and, standing on it, type cases with their rows of
// drawers, ink rollers on their stands with a wet vermilion shine (out.lights) and stacks of cut paper; low on the right, tacked over all
// of it, the colophon (parallax-press-colophon.js).
import { H, rgba, lin, shade } from './sprites.js';
import { PAL, MARGIN } from './press-kit.js';
import { colophon, SHEET } from './parallax-press-colophon.js';

export const BOARDS = 150; // the floor's top in the layer (300 tall: frame 930)

function typeCase(g, x, L) {
  g.fillStyle = L.color;
  g.fillRect(x, BOARDS - 110, 130, 110);
  g.fillStyle = rgba(PAL.paperShade, 0.18);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) g.fillRect(x + 10 + c * 58, BOARDS - 100 + r * 26, 52, 2);
}

function roller(g, x, L, rng, out) {
  g.fillStyle = L.color;
  g.fillRect(x + 10, BOARDS - 60, 8, 60);
  g.fillRect(x + 122, BOARDS - 60, 8, 60);
  g.fillStyle = lin(g, 0, BOARDS - 84, 0, BOARDS - 48, [[0, shade(PAL.ink, 0.25)], [0.4, PAL.ink], [1, PAL.ink]]);
  g.fillRect(x, BOARDS - 84, 140, 36);
  g.fillStyle = rgba(PAL.vermilion, 0.55);
  g.fillRect(x + 4, BOARDS - 78, 132, 3);
  out.lights.push({ x: x + 70, y: BOARDS - 76, r: 20, color: PAL.vermilion, mode: 'pulse', ph: rng(), a: 0.2 });
}

function stack(g, x, L, rng) {
  const n = 3 + Math.floor(rng() * 4);
  for (let k = 0; k < n; k++) {
    g.fillStyle = k % 2 ? L.color : shade(L.color, 0.08);
    g.fillRect(x + (rng() - 0.5) * 8, BOARDS - (k + 1) * 18, 110, 18);
  }
}

export function pressfloor(g, w, h, rng, L, out) {
  g.save();
  g.fillStyle = lin(g, 0, BOARDS, 0, h, [[0, shade(L.color, 0.12)], [1, L.color]]);
  g.fillRect(0, BOARDS, w, h - BOARDS);
  g.fillStyle = rgba(PAL.ink, 0.6);
  for (let y = BOARDS + 22; y < h; y += 26) g.fillRect(0, y, w, 2); // the boards
  const props = [typeCase, roller, stack];
  for (let x = 20 + rng() * 60, i = 0; x < w; x += 230 + rng() * 120, i++) props[i % props.length](g, x, L, rng, out);
  colophon(g, SHEET.x + MARGIN, SHEET.y - (H - h));
  g.restore();
}
