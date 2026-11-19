// The sleeping giant of the epic (the owner's cast, 2026-11-19), the demon king's colossal brother who sleeps for months, lying on his right side on a
// small rocky islet to the right of the setting sun, painted in full colour (isle-paint.js) and plainly one of the demon host: their deep green
// skin, his face their painted mask (black sweeps round the closed eyes, a heavy curled brow, tusks, the ivory ridge round the jaw) under their
// stepped crown with its flared ear pieces (nothing on his brow, C3). His head on the left pillowed on his folded arm on a boulder, gold earrings,
// armlets and necklace, a red-and-gold cloth at his hips, his knees drawn up, the gold-bound iron mace by him. Baked once per light.
import { rgba, mix, lin, hash, makeCanvas } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './isle-kit.js';
import { glint } from './aliens/w21-kit.js';
import { K, blob, ring, head } from './isle-giant-head.js';
import { figure, paint, lit, orb, shape, tube, limb, line, poly, dot, PAINT } from './isle-paint.js';
export const GIANT = { w: 460, h: 130 }; // his box (its bottom is the waterline)
const GLINT = 2; // a glint's radius
const night = (a) => rgba(PAINT.night, a);
const cache = new Map();

// Warm light along the top of the part just painted (its path is still current) and a violet sink under it, clipped to the part.
function wash(g, top, bot, a = 0.4) {
  g.save(); g.clip();
  for (const [y0, y1, c0, c1] of [[top, top + 24, rgba(K.ember, a), rgba(K.ember, 0)], [bot - 26, bot, rgba('#2a1450', 0), rgba('#2a1450', 0.5)]]) { g.fillStyle = lin(g, 0, y0, 0, y1, [[0, c0], [1, c1]]); g.fillRect(0, y0, GIANT.w, y1 - y0); }
  g.restore();
}
// The dusk sky's warm light along every upper edge of the figure: its alpha shifted down, what still shows at its top kept, filled ember.
function topLight(g) {
  const { width: w, height: h } = g.canvas;
  for (const [d, a] of [[5, 0.22], [2.2, 0.55]]) {
    const q = makeCanvas(w, h).getContext('2d');
    q.drawImage(g.canvas, 0, 0); q.globalCompositeOperation = 'destination-out'; q.drawImage(g.canvas, 0, d);
    q.globalCompositeOperation = 'source-in'; q.fillStyle = rgba(K.ember, a); q.fillRect(0, 0, w, h);
    g.drawImage(q.canvas, 0, 0);
  }
}
// A gold cuff round a limb at (x, y), wd across, the limb running at a.
function cuff(g, x, y, wd, a, v) {
  const [nx, ny] = [(-Math.sin(a) * wd) / 2, (Math.cos(a) * wd) / 2];
  tube(g, [[x + nx, y + ny], [x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5], [x - nx, y - ny]], [5, 6.5, 5]);
  paint(g, lit(g, PAL.gold, x, y, wd / 2, v), 0.8);
}
// The islet behind him: a low rock hill with the boulder that pillows his head and big stones at both ends.
function rock(g, u) {
  shape(g, [[5, 124], [8, 108], [20, 94], [40, 88], [90, 92], [200, 94], [330, 96], [400, 98], [434, 102], [450, 114], [455, 124], [400, 128], [230, 129], [60, 128]]);
  paint(g, lit(g, K.rock, 230, 108, 240, u));
  shape(g, [[16, 100], [20, 78], [34, 66], [54, 62], [72, 70], [80, 88], [70, 104], [40, 108]]); // the boulder
  paint(g, orb(g, K.rock, 46, 84, 38, u));
  for (const [x, y, rx, ry] of [[25, 114, 21, 15], [441, 106, 15, 20], [424, 116, 14, 11]]) blob(g, x, y, rx, ry, 0.2, K.rock, u);
}
// The front of the slope, lying over his lower flank: warm rock with plates of stone laid on it, a few shrubs, the foam at its foot.
function bank(g, u) {
  shape(g, [[6, 112], [40, 102], [86, 105], [134, 99], [190, 103], [246, 100], [300, 105], [352, 103], [402, 107], [434, 114], [455, 124], [452, 128], [380, 130], [200, 130], [60, 130], [8, 126]]);
  paint(g, lit(g, K.rock, 230, 116, 250, u));
  wash(g, 98, 130, 0.3);
  for (let i = 0; i < 26; i++) { // plates of stone
    const [x, y, k] = [6 + hash(i) * 420, 104 + hash(i + 26) * 18, hash(i + 52)];
    const fill = lin(g, x, 0, x + 30, 0, [[0, mix(K.rock, PAINT.sun, 0.1 + 0.16 * k)], [1, mix(K.rock, PAINT.shadow, 0.25 + 0.25 * hash(i + 78) + (y - 104) / 60)]]);
    poly(g, [[x, y + 2], [x + 8 + k * 8, y - 3 + k * 3], [x + 20 + k * 14, y + k * 4], [x + 18 + k * 12, y + 9 + k * 5], [x + 4, y + 10 + k * 3]], fill, 0.9);
  }
  for (const [x, y] of [[14, 108], [232, 102], [372, 104]]) for (let i = 0; i < 7; i++) blob(g, x + (hash(i + x) - 0.5) * 20, y - hash(i + 3) * 6, 5 + hash(i + 9) * 4, 4 + hash(i + 7) * 3, 0, K.green, u, 0.8); // shrubs
  for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(4 + i * 11.4, 126.5 + Math.sin(i * 1.3) * 1.6, 7 + hash(i) * 4, 1.9, 0, 0, TAU); g.fillStyle = rgba('#fff0d8', 0.3 + hash(i + 7) * 0.22); g.fill(); } // the foam
}
// The great iron mace lying along the slope, its spiked head at the left, gold bands on its haft, a gold ball at its end. Returns the glints.
function mace(g, u, v) {
  const [hx, hy] = [104, 106];
  limb(g, [[120, 112], [200, 112], [276, 109], [322, 108]], [11, 9, 9, 10], K.iron, v);
  blob(g, 328, 108, 7, 7, 0, PAL.gold, u, 0.9);
  blob(g, hx, hy, 15, 15, 0, K.iron, v);
  ring(g, hx, hy, 15.5, 5, 0.6);
  for (let i = 0; i < 8; i++) { // the spikes, gold at their tips
    const p = (r, d) => [hx + Math.cos(i * (Math.PI / 4) + 0.2 + d) * r, hy + Math.sin(i * (Math.PI / 4) + 0.2 + d) * r];
    poly(g, [p(12, -0.3), p(23, 0), p(12, 0.3)], lit(g, K.iron, hx, hy, 24, v), 0.8);
    dot(g, ...p(21.5, 0), 1.6, PAL.gold);
  }
  for (const x of [128, 170, 232, 296]) cuff(g, x, 111 - (x - 128) / 70, 11, 0, v);
  return [[hx - 2, hy - 20], [hx + 14, hy + 4], [296, 109]];
}
// A bare foot with its ankle at (x, y), k long: heel, arch and toes.
function sole(g, x, y, k, c, v) {
  const at = ([px, py]) => [x + px * k, y + py * k];
  shape(g, [[-0.2, -0.3], [0.3, -0.26], [0.75, -0.12], [1, 0.05], [1, 0.3], [0.8, 0.4], [0.2, 0.42], [-0.25, 0.3]].map(at));
  paint(g, lit(g, c, x + k / 2, y, k, v));
  for (const q of [0.1, 0.2, 0.3]) line(g, [at([0.84, q]), at([1, q - 0.02])], night(0.5), 1);
}
function legs(g, v) {
  limb(g, [[316, 90], [362, 82], [406, 72]], [36, 32, 28], K.skin, v); // the far leg, under
  limb(g, [[406, 74], [424, 88], [432, 103]], [28, 22, 16], mix(K.skin, PAINT.shadow, 0.2), v);
  sole(g, 430, 104, 26, mix(K.skin, PAINT.shadow, 0.15), v);
  shape(g, [[308, 52], [346, 38], [376, 28], [396, 32], [404, 46], [414, 64], [430, 82], [438, 94], [428, 103], [410, 97], [398, 82], [386, 70], [362, 76], [330, 88], [306, 88]]); // the near leg
  paint(g, orb(g, K.skin, 370, 62, 62, v));
  for (const p of [[[372, 36], [380, 44], [391, 40]], [[392, 62], [403, 72]], [[340, 52], [352, 60], [366, 58]]]) line(g, p, night(0.4), 1.1); // the kneecap, calf, thigh
  sole(g, 420, 90, 32, K.skin, v);
  cuff(g, 421, 86, 16, 0.94, v);
}
function trunk(g, v) {
  shape(g, [[98, 76], [100, 52], [116, 36], [146, 26], [176, 24], [204, 32], [224, 40], [246, 32], [268, 30], [290, 40], [304, 50], [328, 48], [340, 62], [338, 94], [300, 101], [200, 102], [110, 101], [94, 90]]);
  paint(g, orb(g, K.skin, 190, 70, 120, v));
  wash(g, 24, 100, 0.4);
  blob(g, 152, 48, 30, 17, -0.12, mix(K.skin, K.mask, 0.6), v, 0); // the pectoral, lit
  for (const [p, a] of [[[[108, 50], [130, 40], [152, 34]], 0.3], [[[122, 62], [146, 70], [172, 64], [184, 50]], 0.5], [[[200, 44], [212, 58]], 0.3], [[[218, 46], [230, 60]], 0.3], [[[240, 50], [258, 60], [276, 54]], 0.35]]) line(g, p, night(a), 1.3); // ribs, belly
  limb(g, [[84, 78], [108, 70]], [26, 30], K.skin, v); // his neck
  blob(g, 116, 62, 19, 22, 0.3, K.skin, v); // his shoulder
  line(g, [[132, 46], [136, 62], [128, 76]], night(0.4), 1.2);
}
function cloth(g, u) {
  shape(g, [[286, 58], [318, 52], [346, 62], [352, 92], [336, 104], [312, 99], [290, 94], [280, 76]]);
  paint(g, lit(g, K.cloth, 318, 80, 50, u));
  for (const [x, y] of [[306, 78], [330, 74], [312, 90], [334, 88]]) poly(g, [[x, y - 3], [x + 2.4, y], [x, y + 3], [x - 2.4, y]], PAL.gold, 0);
  for (const [c, w] of [[night(0.9), 5], [PAL.gold, 3]]) line(g, [[290, 94], [312, 99], [336, 104], [352, 92]], c, w); // the gold hem
  tube(g, [[282, 62], [316, 56], [346, 64]], [9, 9, 9]); // the belt, set with red stones
  paint(g, lit(g, PAL.gold, 316, 58, 30, u), 0.9);
  for (const x of [296, 316, 336]) dot(g, x, 58 + (x === 316 ? 0 : 2), 2.2, K.jewel);
}
function pillow(g, v) { // the folded arm under his head: a heavy roll on the boulder, the fist curled
  limb(g, [[48, 92], [76, 86], [104, 84], [120, 82]], [24, 28, 28, 24], K.skin, v);
  cuff(g, 98, 85, 30, 0, v);
  blob(g, 44, 91, 13, 12, 0, K.skin, v);
  for (const k of [-7, -2, 3]) line(g, [[36, 91 + k], [46, 93 + k]], night(0.5), 1.1);
}
function arm(g, v) { // his left arm laid along his flank with the hand on the cloth, gold armlet and bracelet, the necklace over his chest
  limb(g, [[124, 62], [148, 76], [180, 85], [220, 87], [262, 84]], [34, 30, 24, 21, 19], K.skin, v);
  cuff(g, 142, 71, 32, 0.53, v);
  cuff(g, 238, 86, 22, 0.05, v);
  blob(g, 278, 84, 14, 10, 0.1, K.skin, v);
  for (let i = 0; i < 9; i++) dot(g, 98 + i * 5.4, 56 + 20 * Math.sin((i / 8) * Math.PI) - i * 0.3, 2.1, PAL.gold);
  dot(g, 119, 78, 2.4, K.jewel);
}

function draw(g, u) {
  const k = Math.hypot(u[0] * 0.55, u[1] - 1);
  const v = [(u[0] * 0.55) / k, (u[1] - 1) / k]; // the dusk sky's light as well as the sun's: from above and the sun's side
  rock(g, u);
  pillow(g, v);
  legs(g, v);
  trunk(g, v);
  cloth(g, u);
  arm(g, v);
  const crown = head(g, v);
  bank(g, u);
  const gold = mace(g, u, v);
  topLight(g);
  return [...crown, ...gold];
}

// Paint the islet and the sleeping giant on it with the box's bottom left at (x, base), lit from the angle light (toward the sun); baked once
// per light, the gold glinting over the outline.
export function giant(g, x, base, light) {
  let glints = [];
  if (!cache.has(light)) cache.set(light, { c: figure(GIANT.w, GIANT.h, (b, u) => { glints = draw(b, u); }, light), glints });
  const y0 = base - GIANT.h;
  g.drawImage(cache.get(light).c, x, y0);
  for (const [gx, gy] of cache.get(light).glints) glint(g, x + gx, y0 + gy, GLINT, 0.5);
  g.globalCompositeOperation = 'source-over'; // the glints' light ends here, whatever restored it
}
