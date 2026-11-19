// The great vulture of the epic (the owner's cast, 2026-11-19), king of the birds, gliding high over the sea, seen from below with its
// wings wide and its head turned to look ahead (it faces right), painted in full colour (isle-paint.js): dark umber flight feathers in
// layered rows (secondaries, long fingered primaries with gaps between them, tawny coverts over their roots), each with a darker shaft,
// the sunset warming their tips from below; a cream-gold ruff, a pale head with a hooked gold beak and a steady eye, a small gold crown
// and a gold necklace with a red stone, a fanned tail and talons tucked. Baked once per light and drawn rotated by its bank; nothing on
// the brow (C3).
import { rgba, mix } from './sprites.js';
import { PAL } from './isle-kit.js';
import { glint } from './aliens/w21-kit.js';
import { figure, paint, lit, orb, shape, limb, band, crest, line, poly, dot, PAINT } from './isle-paint.js';

export const VULTURE = { w: 380, h: 170, bank: -0.07 }; // its box, and how far it banks in its glide
const GLINT = 2.2; // a gold glint's size
const V = { flight: '#52281c', dark: '#3c2220', tawny: '#8a4e2e', tan: '#a8683a', cream: '#d8b87a', skin: '#e0bc92', beak: '#e8922c', deep: '#b0601c', eye: '#f2b836', pupil: '#1a0c10', red: '#c4303a', horn: '#4a2c24', leg: '#d2b088' };
const RAD = Math.PI / 180;
const night = (a) => rgba(PAINT.night, a);

// One feather from its root (x, y) pointing at the angle a, len long and wid wide, in c, with its shaft down the middle.
function feather(g, [x, y], a, len, wid, c, u, shaft = 0.5) {
  const [ca, sa] = [Math.cos(a), Math.sin(a)];
  const P = (t, k) => [x + ca * t * len - sa * k * wid, y + sa * t * len + ca * k * wid];
  shape(g, [P(0, -0.36), P(0.45, -0.56), P(0.9, -0.44), P(1.14, 0), P(0.9, 0.44), P(0.45, 0.56), P(0, 0.36)]);
  paint(g, lit(g, c, ...P(0.5, 0), Math.max(len * 0.55, wid), u), 0.9);
  line(g, [P(0.06, 0), P(0.92, 0)], night(shaft), 0.9);
}

// One wing out to the side s (-1 left, 1 right), laid from the back: the secondaries, the long primaries spread like fingers, the rows of
// coverts over their roots, the arm along the leading edge with a gold armlet at the wrist.
function wing(g, s, u) {
  const X = (d) => 190 + s * d;
  const A = (a) => (s > 0 ? a : Math.PI - a);
  for (let i = 7; i >= 0; i--) feather(g, [X(24 + i * 10), 80 - i * 1.5], A((100 - i * 4) * RAD), 38 - i * 0.6, 15, V.flight, u);
  const [lens, tips] = [[62, 74, 80, 82, 82, 76, 64], (i) => (17 - i * 8.5) * RAD];
  for (let i = 0; i < 7; i++) feather(g, [X(92 + i * 2), 70 - i * 3], A(tips(i)), lens[i], 10.5, i % 2 ? V.flight : mix(V.flight, V.dark, 0.35), u);
  for (let i = 7; i >= 0; i--) feather(g, [X(24 + i * 10), 70 - i * 1.5], A((100 - i * 4) * RAD), 25, 14, V.tawny, u, 0.35);
  for (let i = 0; i < 5; i++) feather(g, [X(96 + i * 3), 64 - i * 3], A(tips(i + 1)), 34 - i, 11, V.tawny, u, 0.35);
  shape(g, [[X(8), 74], [X(8), 60], [X(36), 48], [X(70), 40], [X(104), 36], [X(110), 46], [X(80), 54], [X(44), 62]]); // the arm along the leading edge
  paint(g, lit(g, V.flight, X(60), 50, 40, u));
  for (let i = 10; i >= 0; i--) feather(g, [X(14 + i * 9), 64 - i * 2.4], A((94 - i * 3) * RAD), 17, 12, V.tan, u, 0.3);
  for (let i = 11; i >= 0; i--) feather(g, [X(12 + i * 8), 59 - i * 2.2], A((90 - i * 2) * RAD), 11, 10, mix(V.tan, V.cream, 0.15), u, 0.25); // the small coverts
  band(g, X(100), 43, 12, 6.5, s * 1.2, PAL.gold, u);
}

// The tail's fan, the tucked legs and their talons.
function tail(g, u) {
  for (const i of [0, 6, 1, 5, 2, 4, 3]) feather(g, [190 + (i - 3) * 2.5, 110], (90 + (i - 3) * 10) * RAD, 52, 14, i % 2 ? V.flight : mix(V.flight, V.dark, 0.3), u);
  for (const s of [-1, 1]) {
    limb(g, [[190 + s * 8, 108], [190 + s * 10, 122]], [9, 7], V.leg, u);
    for (const k of [-1, 0, 1]) poly(g, [[190 + s * 10 + k * 2.6 - 1.3, 122], [190 + s * 10 + k * 2.6 + 1.3, 122], [190 + s * 10 + k * 3.4, 130]], V.beak, 0.6); // a talon
  }
}

// The body from below, the neck, the ruff and the necklace.
function body(g, u) {
  shape(g, [[190, 56], [208, 64], [212, 84], [206, 106], [190, 124], [174, 106], [168, 84], [172, 64]]);
  paint(g, orb(g, V.tawny, 190, 90, 36, u));
  for (let r = 0; r < 4; r++) { // its feathering, in scallops
    for (let i = 0; i < 4 - (r > 2 ? 1 : 0); i++) {
      const [x, y] = [180 + i * 8 + (r % 2) * 4 + (r > 2 ? 4 : 0), 88 + r * 9];
      g.beginPath();
      g.moveTo(x - 4.5, y);
      g.quadraticCurveTo(x, y + 8, x + 4.5, y);
      g.strokeStyle = night(0.3);
      g.lineWidth = 1;
      g.stroke();
    }
  }
  limb(g, [[191, 62], [194, 54], [197, 48]], [17, 14, 12], V.skin, u); // the neck, short and strong
  for (const y of [52, 56]) line(g, [[189, y], [194, y + 2], [200, y]], night(0.25), 1); // its folds
  for (let i = 0; i < 11; i++) { // the ruff
    const a = (-12 + i * 20.4) * RAD;
    feather(g, [190 + Math.cos(a) * 7, 58 + Math.sin(a) * 3.5], a, 21, 10, V.cream, u, 0.3);
  }
  const chain = [[174, 60], [180, 69], [190, 73], [200, 69], [206, 60]];
  line(g, chain, night(0.9), 3.6);
  line(g, chain, PAL.gold, 2.2);
  for (const [x, y] of chain) dot(g, x, y, 1.8, PAL.goldPale);
  poly(g, [[190, 71], [195, 76], [190, 82], [185, 76]], lit(g, PAL.gold, 190, 76, 7, u), 0.9);
  dot(g, 190, 76, 2.6, V.red); // the red stone
  dot(g, 189.2, 75, 0.8, '#ffd0c0');
}

// The head in profile toward the right: the skull, the hooked beak, the fierce eye under its brow, the small gold crown. It is drawn in
// its own frame (x ahead, y down, k px a unit) around (hx, hy) so it can be sized as one.
function head(g, u, [hx, hy, k]) {
  const p = (x, y) => [hx + x * k, hy + y * k];
  const at = ([x, y]) => p(x, y);
  shape(g, [[-9, -1], [-6, -9], [2, -12], [9, -9], [12, -3], [9, 4], [2, 8], [-6, 6]].map(at)); // the skull
  paint(g, orb(g, V.skin, hx, hy, 13 * k, u));
  g.beginPath(); // the upper beak, hooked over the lower
  g.moveTo(...p(8, -8));
  g.quadraticCurveTo(...p(18, -11), ...p(23, -3));
  g.quadraticCurveTo(...p(25, 4), ...p(21, 12));
  g.quadraticCurveTo(...p(19.4, 5), ...p(13, 3.6));
  g.lineTo(...p(8, 3));
  g.closePath();
  paint(g, lit(g, V.beak, ...at([17, 0]), 12 * k, u), 0.9);
  shape(g, [[9, 3], [17, 3.2], [19, 6.4], [11, 7.4]].map(at)); // the lower beak
  paint(g, lit(g, V.deep, ...at([15, 5.5]), 5 * k, u), 0.7);
  dot(g, ...at([9.5, -6.2]), 2.6 * k, V.deep); // the cere
  line(g, [at([10, -6.4]), at([13, -5.4])], night(0.7), 0.9);
  g.beginPath(); // the eye, steady
  g.moveTo(...p(-1.5, -3));
  g.quadraticCurveTo(...p(4.5, -7), ...p(10, -2.4));
  g.quadraticCurveTo(...p(4.5, 0.2), ...p(-1.5, -3));
  paint(g, V.eye, 0.5);
  dot(g, ...at([5.6, -3]), 2 * k, V.pupil);
  dot(g, ...at([3, 1.4]), 3.2 * k, rgba('#c8806c', 0.3)); // the flush of bare skin under the eye
  line(g, [at([-3.5, -8]), at([4, -7.4]), at([11, -3.6])], V.horn, 2.4); // the heavy brow
  line(g, [at([-4, 1]), at([1, 3.5])], night(0.35), 1); // the fold of the cheek
  const gold = lit(g, PAL.gold, ...at([0, -11]), 8 * k, u);
  poly(g, [[-8, -7], [6, -11.6], [6.4, -14.6], [-8.4, -10]].map(at), gold, 0.8); // the crown's band and petals
  crest(g, ...at([-8.2, -8.6]), ...at([6.2, -13.1]), 4, 7 * k, PAL.gold, u);
}

function draw(g, u) {
  wing(g, -1, u);
  wing(g, 1, u);
  tail(g, u);
  body(g, u);
  head(g, u, [202, 38, 1.25]);
  return [[199, 15], [226, 48], [190, 76]]; // where the gold catches the light
}

const baked = new Map(); // by the angle of the light (in the banked figure's own frame): the baked figure and its glints
const bake = (light) => {
  const key = light.toFixed(3);
  if (!baked.has(key)) {
    let glints = [];
    baked.set(key, { c: figure(VULTURE.w, VULTURE.h, (b, u) => { glints = draw(b, u); }, light), glints });
  }
  return baked.get(key);
};

export function vulture(g, x, y, light) {
  const { w, h, bank } = VULTURE;
  const { c, glints } = bake(light - bank);
  g.save();
  g.translate(x + w / 2, y + h / 2);
  g.rotate(bank);
  g.drawImage(c, -w / 2, -h / 2);
  for (const [gx, gy] of glints) glint(g, gx - w / 2, gy - h / 2, GLINT, 0.5);
  g.globalCompositeOperation = 'source-over'; // the glints' light ends here
  g.restore();
}
