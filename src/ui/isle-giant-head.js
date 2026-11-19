// The sleeping giant's head (isle-giant.js), painted as the demon host's masks are (aliens/w21-kit.js), with the colours and the small
// painters his body shares: so he reads at once as one of the host, not as any revered figure (the owner's runner, 2026-11-19).
import { rgba, mix } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './isle-kit.js';
import { GREEN, BLACK, IVORY, VERMILION } from './aliens/w21-kit.js';
import { paint, lit, orb, shape, line, poly, dot, PAINT } from './isle-paint.js';

// The host's own colours (aliens/w21-kit.js): his skin the deep green of their masks, sunk toward black for his bulk, the mask's green on
// his face, its black and ivory; and the rock, shrubs, cloth, iron, the red of his stones and lips and the ember of the dusk on him.
export const K = { skin: mix(GREEN, BLACK, 0.3), mask: GREEN, black: BLACK, hair: BLACK, ivory: IVORY, lips: '#7a1a20', rock: '#5c5072', green: '#2c4a3a', cloth: '#b82c38', iron: '#5c5870', jewel: VERMILION, ember: '#ff9448' };

// An ellipse at (x, y), rx by ry, turned a, shaded like a rounded form in c.
export function blob(g, x, y, rx, ry, a, c, u, w = PAINT.line) {
  g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU);
  paint(g, orb(g, c, x, y, Math.max(rx, ry), u), w);
}
// A ring of gold over a night line: an earring, the mace's band.
export function ring(g, x, y, rx, ry, a, w = 2.2) {
  for (const [s, k] of [[rgba(PAINT.night, 0.9), w + 1.6], [PAL.gold, w]]) { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU); g.strokeStyle = s; g.lineWidth = k; g.stroke(); }
}
// His head, turned on its side on the arm, drawn upright in its own frame and tilted, painted as the host's masks are (aliens/w21-kit.js
// mask): the ivory ridge scalloped round the jaw, black sweeps round the eyes, closed, a heavy curled brow and moustache, tusks rising from
// the jaw, a gilded nose, and the host's stepped crown with its flared ear pieces (crownOf). Returns the glints.
export function head(g, v) {
  const [cx, cy, a] = [70, 65, -0.5];
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const at = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
  const w = [v[0] * c + v[1] * s, -v[0] * s + v[1] * c];
  g.save(); g.translate(cx, cy); g.rotate(a);
  shape(g, [[-23, -16], [-26, 8], [-19, 30], [-8, 36], [12, 31], [23, 12], [23, -14], [0, -26]]); // his hair, long on the pillow
  paint(g, lit(g, K.hair, -6, 8, 30, w), 0.9);
  for (const sx of [-1, 1]) { blob(g, sx * 20.5, 1, 4.5, 8, 0, K.skin, w, 0.8); ring(g, sx * 21.5, 11, 5, 5, 0); dot(g, sx * 21.5, 17.5, 2.2, K.jewel); } // the ears: a heavy gold ring and a red drop
  g.beginPath(); // the ivory ridge round the jaw
  for (let i = 0; i <= 12; i++) g.lineTo(Math.cos(0.1 * Math.PI + (i / 12) * 0.8 * Math.PI) * (i % 2 ? 24 : 27) * 0.92, 3 + Math.sin(0.1 * Math.PI + (i / 12) * 0.8 * Math.PI) * (i % 2 ? 24 : 27));
  paint(g, lit(g, K.ivory, 0, 16, 26, w), 0.9);
  blob(g, 0, 0, 18.5, 22, 0, K.mask, w); // the face
  for (const sx of [-1, 1]) {
    poly(g, [[sx * 3, -5], [sx * 10, -10.5], [sx * 20, -13.5], [sx * 15.5, -3.5], [sx * 6, -2.4]], K.black, 0); // the black sweep
    poly(g, [[sx * 5, -5.2], [sx * 10, -7.8], [sx * 14.5, -6.8], [sx * 11, -3.6]], lit(g, K.mask, sx * 10, -6, 6, w), 0); // the lid, closed
    line(g, [[sx * 5, -4.8], [sx * 10.5, -3.6], [sx * 14.5, -6.4]], PAL.goldDeep, 0.9); // its lashes, gilded, turned down in sleep
    line(g, [[sx * 2, -11], [sx * 9, -17], [sx * 16, -16.5], [sx * 20, -14], [sx * 19, -19]], K.black, 3.8); // the heavy brow, curling up
    line(g, [[0, 4.5], [sx * 8, 3.4], [sx * 12, 7.5], [sx * 13.5, 3.8], [sx * 11.5, 2.4]], K.black, 2.2); // the moustache, curled
    poly(g, [[sx * 6.2, 13.6], [sx * 9.4, 13.2], [sx * 10.6, 4]], lit(g, K.ivory, sx * 8.5, 9, 7, w), 0.8); // a tusk, rising from the jaw outside the lips
  }
  poly(g, [[0, -4.5], [-2.2, 3.4], [2.2, 3.4]], PAL.gold, 0.6); // the nose, gilded
  line(g, [[-6.5, 12.2], [-3, 10.8], [0, 10.6], [3, 10.8], [6.5, 12.2]], K.lips, 2); // the mouth, shut in sleep, grim at its corners
  const crown = crownOf(g, 0, -17, 42, 36, w);
  g.restore();
  return [...crown.map(([x, y]) => at(x, y)), at(21.5, 11), at(-21.5, 11)];
}

// The host's stepped crown (aliens/w21-kit.js crown), its band on y, w wide, rising h: ear pieces flaring out and down, a band with red
// beads (none over the brow), three tiers each narrower like a temple tower, a short spire. Returns its glints.
function crownOf(g, x, y, w, h, u) {
  const band = h * 0.22;
  const gold = (cx, cy, r) => lit(g, mix(PAL.gold, PAL.goldDeep, 0.25), cx, cy, r, u);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(x + s * w * 0.42, y - band);
    g.quadraticCurveTo(x + s * w * 0.8, y - band * 1.6, x + s * w * 0.72, y + band * 1.5);
    g.quadraticCurveTo(x + s * w * 0.6, y + band * 0.2, x + s * w * 0.42, y);
    paint(g, gold(x + s * w * 0.6, y, w * 0.3), 0.9);
  }
  poly(g, [[x - w / 2, y], [x + w / 2, y], [x + w * 0.46, y - band], [x - w * 0.46, y - band]], gold(x, y - band / 2, w / 2), 0.9);
  for (const k of [-0.34, -0.18, 0.18, 0.34]) dot(g, x + k * w, y - band / 2, band * 0.2, K.jewel);
  let [ww, yy] = [w * 0.82, y - band];
  const step = ((h - band) * 0.62) / 3;
  const glints = [];
  for (let t = 0; t < 3; t++, [ww, yy] = [ww * 0.74, yy - step]) {
    poly(g, [[x - ww / 2, yy], [x + ww / 2, yy], [x + ww * 0.37, yy - step], [x - ww * 0.37, yy - step]], gold(x, yy - step / 2, ww / 2), 0.8);
    for (let i = -2; i <= 2; i++) dot(g, x + i * ww * 0.15, yy - step * 0.5, step * 0.16, PAL.goldPale);
    glints.push([x - ww / 2 + 1, yy - 1]);
  }
  poly(g, [[x - ww / 2, yy], [x - ww * 0.15, yy - (h - band) * 0.25], [x, y - h], [x + ww * 0.15, yy - (h - band) * 0.25], [x + ww / 2, yy]], gold(x, yy, ww), 0.8);
  return [...glints, [x, y - h]];
}
