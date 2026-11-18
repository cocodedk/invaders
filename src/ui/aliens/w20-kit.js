// What World 20's painters share (w20.js .. w20-*.js): the invaders of the night printing hall are type come alive, in the hall's three
// colours (looks/w20.js, press-kit.js PAL): cream paper, ink black and one vermilion spot colour. Every creature is outlined in ink, its
// body shaded from the role's colour toward ink, and has round paper eyes; what a light layer carries here is the lamp's catch on wet
// ink and the vermilion spot glowing. Nothing is painted per frame: every shape is baked.
import { path, ink, lin, rad, rgba, shade, mix, gloss, bloom, line, ellipse, circle, both, TAU } from './kit.js';
import { hash } from '../sprites.js';
import { tidy } from './w16-kit.js';
import { PAL } from '../press-kit.js';

export { path, ink, lin, rgba, shade, mix, line, ellipse, circle, both, TAU, tidy };

export const PAPER = PAL.paper;
export const INKY = PAL.ink; // the press's ink, a touch warmer than the kit's outline
export const SPOT = PAL.vermilion;
export const PAPER_SHADE = PAL.paperShade;

// A body fill: the colour c lit at the upper left, sinking toward ink at the lower right, over (x0, y0)..(x1, y1).
export const inked = (g, c, x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, shade(c, 0.35)], [0.45, c], [1, mix(c, INKY, 0.55)]]);

// A round paper eye with an ink pupil looking toward (dx, dy) (-1..1) and a glint on the lights layer.
export function paperEye(b, l, x, y, r, dx = 0, dy = 0.3) {
  circle(b, x, y, r);
  ink(b, rad(b, x, y, 0, r, [[0, PAPER], [0.8, PAPER], [1, PAL.paperShade]], x - r * 0.3, y - r * 0.3), 1.6);
  const [px, py] = [x + dx * r * 0.4, y + dy * r * 0.4];
  circle(b, px, py, r * 0.52);
  b.fillStyle = INKY;
  b.fill();
  circle(l, px - r * 0.2, py - r * 0.22, r * 0.18);
  l.fillStyle = '#ffffff';
  l.fill();
}

// An ink splat about (x, y) of radius r: a lumpy blot with droplets thrown round it, the same for a seed.
export function blot(g, x, y, r, seed, c = INKY) {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const k = r * (0.75 + hash(seed * 17 + i) * 0.45);
    pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]);
  }
  path(g, pts);
  g.fillStyle = c;
  g.fill();
  for (let i = 0; i < 4; i++) {
    const a = hash(seed * 29 + i) * TAU;
    circle(g, x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, r * (0.12 + hash(seed * 31 + i) * 0.14));
    g.fill();
  }
}

// Lines of set type across (x, y) w wide: n rows of ink bars, ragged at the right, the same for a seed.
export function textLines(g, x, y, w, n, step, seed, c = INKY, a = 0.75) {
  g.fillStyle = rgba(c, a);
  for (let row = 0; row < n; row++) {
    let cx = x;
    const end = x + w * (row === n - 1 ? 0.6 : 0.9 + hash(seed + row) * 0.1);
    for (let k = 0; cx < end; k++) {
      const word = 3 + hash(seed * 7 + row * 13 + k) * 7;
      g.fillRect(cx, y + row * step, Math.min(word, end - cx), step * 0.45);
      cx += word + 2;
    }
  }
}

// A wet shine on the lights layer: a soft oval and a hard glint at its upper left.
export function wet(l, x, y, rx, ry, rot = 0, a = 0.45) {
  gloss(l, x, y, rx, ry, a, rot);
  ellipse(l, x - rx * 0.3, y - ry * 0.3, Math.max(0.8, rx * 0.2), Math.max(0.6, ry * 0.2), rot);
  l.fillStyle = rgba('#ffffff', Math.min(1, a * 1.8));
  l.fill();
}

// The vermilion spot glowing on the lights layer: a soft bloom and a hot dot.
export function spot(l, x, y, r, a = 0.5) {
  bloom(l, x, y, r * 3, SPOT, a);
  circle(l, x, y, r * 0.5);
  l.fillStyle = rgba(shade(SPOT, 0.6), Math.min(1, a * 1.6));
  l.fill();
}

// Ink legs or tentacle stubs under a body: n of them across w at y, swung by the frame f, len long.
export function legs(b, x, y, w, n, len, f, c = INKY) {
  for (let i = 0; i < n; i++) {
    const lx = x - w / 2 + (w * (i + 0.5)) / n;
    const sw = (i % 2 === f ? 1 : -1) * 4;
    b.beginPath();
    b.moveTo(lx, y);
    b.quadraticCurveTo(lx + sw, y + len * 0.6, lx - sw * 0.5, y + len);
    line(b, c, 3.2);
    circle(b, lx - sw * 0.5, y + len, 2.2);
    b.fillStyle = c;
    b.fill();
  }
}

// A serif bracket: the foot of a letter at (x, y), w wide, as a filled ink slab.
export function serif(g, x, y, w, h = 4) {
  path(g, [[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 2, y - h], [x - w / 2 + 2, y - h]]);
  ink(g, INKY, 1);
}

