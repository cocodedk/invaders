// The walled grove inside the golden city (the owner's cast, 2026-11-19), in full colour: ashoka trees, their dark leaf masses lit warm on
// the sun's side and heavy with red-orange blossom; the captive queen seated on a low stone under the greatest, in saffron with a red
// border and a crimson shawl, her hair down her back, her head bowed, her hands in her lap; the king's masked guards round her with
// spears; gilded walls and a lamplit gate. Painted into the far layer (parallax-isle-city.js); the trees and each figure are baked once.
import { mix, rgba, shade, lin, hash, glow, addGlow } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './isle-kit.js';
import { glint, GREEN as G0, VERMILION as V0, BLACK, IVORY as I0 } from './aliens/w21-kit.js';
import { GOLD, face as gild } from './isle-gold.js';
import { figure, paint, lit, orb, shape, tube, limb, band, crest, line, poly, dot, PAINT } from './isle-paint.js';

// Its width and height; the trees [crown x, height, spread, trunk x]; where the queen sits, the guards (the first two face right, the
// others left, the odd ones nearer) and the wall's height.
export const GROVE = { w: 340, h: 170, trees: [[40, 94, 62, 40], [88, 120, 80, 88], [268, 118, 84, 268], [304, 94, 56, 304], [182, 148, 200, 140]], queen: 184, guards: [64, 114, 254, 302], wall: 54 };
export const LEAVES = { mass: '#285a38', bark: '#6a4a52', bloom: ['#e8552a', '#f0802e', '#c83a2c'], bud: '#ffc070' };
const [LIGHT, KQ, KG, QB, GB] = [-0.07, 0.68, 0.5, [140, 152], [84, 160]]; // toward the sun; the scale of the queen and a guard, their design boxes
const Q = { skin: '#e6a460', saree: '#eeae2a', hem: '#b8262e', shawl: '#b02e3c', hair: '#2a1626', stone: '#8c7a70' };
const GLINTS = [[75.7, 51], [91, 100.5], [73.3, 26.2]]; // where the queen's gold catches the light

const SINK = 0.35; // the guards' colours sunk toward the dusk, so they never read as the live soldiers they dress like
const [GREEN, VERMILION, IVORY] = [G0, V0, I0].map((c) => mix(c, PAINT.shadow, SINK));
const BAKED = new Map(); // each figure once, by key; a flipped one faces left: its geometry mirrored, the sun left where it is
const baked = (key, [w, h], k, draw, flip = false) => BAKED.get(key) ?? BAKED.set(key, figure(Math.ceil(w * k), Math.ceil(h * k), (b, u) => {
  b.scale(k, k);
  if (flip) b.transform(-1, 0, 0, 1, w, 0);
  draw(b, flip ? [-u[0], u[1]] : u);
}, LIGHT)).get(key);
const ball = (g, x, y, r, c, u, w) => { g.beginPath(); g.arc(x, y, r, 0, TAU); paint(g, orb(g, c, x, y, r + 1, u), w); };
const rib = (g, pts, w, fill, lw) => { tube(g, pts, pts.map(() => w)); paint(g, fill, lw); }; // a ribbon of cloth along pts
const edge = (g, pts, c, w, k = 1.4) => { line(g, pts, PAINT.night, w + k); line(g, pts, c, w); }; // a border: a coloured stripe between night lines

// The queen seated, facing right (design box 140 x 152, her stone at its foot).
function queen(g, u) {
  const { skin, saree, hem, shawl, hair, stone } = Q;
  const cloth = (x, y, r, c = saree) => lit(g, c, x, y, r, u);
  shape(g, [[16, 148], [10, 130], [22, 116], [64, 110], [114, 114], [130, 130], [126, 148]]);
  paint(g, cloth(70, 128, 56, stone)); // her seat, a low stone
  limb(g, [[64, 30], [52, 44], [46, 70], [42, 96], [40, 120]], [20, 18, 15, 12, 7], hair, u); // her long hair down her back
  shape(g, [[40, 118], [52, 100], [84, 94], [108, 92], [124, 104], [130, 122], [126, 138], [100, 141], [60, 141], [34, 136], [30, 126]]);
  paint(g, cloth(84, 122, 58)); // the garment over her folded legs
  for (const p of [[[86, 98], [92, 118], [90, 138]], [[64, 108], [60, 124], [62, 138]], [[108, 98], [112, 116], [118, 134]], [[74, 104], [76, 118]]]) line(g, p, rgba(PAINT.night, 0.35), 1.4);
  edge(g, [[33, 135], [60, 140], [100, 140], [127, 135]], hem, 5, 2); // its red border, edged in gold
  line(g, [[33, 133], [60, 138], [100, 138], [127, 133]], PAL.gold, 1.2);
  shape(g, [[46, 112], [42, 90], [48, 68], [58, 56], [74, 54], [84, 66], [84, 88], [94, 106], [80, 118], [56, 120]]);
  paint(g, cloth(66, 88, 36)); // her bodice, its waistband and its red front border
  rib(g, [[44, 108], [66, 106], [90, 104]], 7, cloth(66, 106, 24, hem), 0.8);
  rib(g, [[78, 58], [86, 76], [88, 98]], 4, cloth(84, 80, 20, hem), 0.7);
  limb(g, [[72, 56], [76, 46]], [10, 9], skin, u); // her neck
  shape(g, [[52, 56], [64, 52], [72, 58], [68, 72], [62, 78], [56, 102], [42, 116], [38, 92], [42, 70]]);
  paint(g, cloth(54, 84, 34, shawl)); // her shawl
  line(g, [[52, 57], [41, 74], [39, 92], [43, 114]], PAL.gold, 1.2);
  limb(g, [[62, 64], [64, 86], [82, 98]], [14, 12, 10], saree, u); // her arm: the sleeve, the bare wrist with gold bangles, the hands
  limb(g, [[80, 98], [100, 102]], [8, 7], skin, u);
  for (const x of [88, 94]) band(g, x, 100.5, 9, 4.5, 1.5, PAL.gold, u);
  for (const [x, y, r] of [[103, 101, 5.4], [96, 105, 4.6]]) ball(g, x, y, r, skin, u);
  for (let i = 0; i < 5; i++) dot(g, 77 + i * 2.6, 62 + 5 * Math.sin((i / 4) * Math.PI), 1.3, PAL.gold); // her necklace
  g.save(); // her head, bowed forward from the neck: the dark hair over it, then her face in profile
  g.translate(76, 52);
  g.rotate(0.17);
  g.translate(-76, -52);
  ball(g, 76, 36, 13, hair, u);
  shape(g, [[80, 27], [88, 30], [89.5, 35], [92, 39], [96, 44], [92, 46], [92.5, 49], [90, 51], [88, 56], [80, 57], [73, 52], [72, 42], [74, 32]]);
  paint(g, lit(g, skin, 86, 44, 16, u));
  shape(g, [[68, 38], [66, 26], [76, 17], [88, 21], [92, 29], [84, 26], [78, 29], [75, 40]]);
  paint(g, lit(g, hair, 80, 26, 14, u), 0.8);
  line(g, [[84, 25], [78, 27], [74, 34]], rgba('#8a6aa8', 0.6), 1.2);
  for (const [p, c, w] of [[[[82.5, 38.5], [85.5, 40], [89, 38.5]], PAINT.night, 1.4], [[[82, 34.5], [86, 33.5], [90.5, 35.5]], hair, 1.6], [[[89.5, 50], [92, 49.4]], hem, 1.4]]) line(g, p, c, w); // the lowered eye, the brow, the lips
  ball(g, 75.5, 51, 2.6, PAL.gold, u, 0.7); // her earring, a red drop
  dot(g, 75.5, 55.5, 1.5, shawl);
  poly(g, [[66, 28], [70, 24], [72, 29], [68, 31]], PAL.gold, 0.7); // a gold flower in her hair
  dot(g, 69, 27.5, 1.3, LEAVES.bloom[0]);
  g.restore();
}

// A guard, facing right (design box 84 x 160, feet at 156): the green mask under a tiered gold crown, a vermilion coat with a black
// girdle and gold shoulders, black trousers with a vermilion border, a spear.
function guard(g, u) {
  const lc = (x, y, r, c) => lit(g, c, x, y, r, u);
  rib(g, [[72, 156], [72, 18]], 4, lc(72, 90, 4, '#7a4a3a'));
  poly(g, [[72, 0], [78, 14], [72, 24], [66, 14]], lc(72, 12, 8, PAL.gold), 0.9);
  poly(g, [[69, 25], [75, 25], [75, 36], [70, 36]], lc(72, 30, 6, VERMILION), 0.8);
  limb(g, [[28, 78], [20, 96], [22, 112]], [12, 10, 9], VERMILION, u); // the far arm, hanging
  ball(g, 22, 114, 4.6, GREEN, u);
  shape(g, [[26, 110], [60, 110], [66, 132], [62, 148], [22, 148], [18, 130]]);
  paint(g, lc(42, 130, 30, '#2a1420')); // the trousers, their folds, border and feet
  for (const x of [34, 44, 52]) line(g, [[x, 114], [x - 2, 144]], rgba(PAINT.rim, 0.25), 1.2);
  edge(g, [[20, 144], [42, 146], [64, 144]], VERMILION, 5, 2);
  line(g, [[20, 142], [42, 144], [64, 142]], PAL.gold, 1.2);
  for (const x of [34, 54]) band(g, x, 152, 18, 8, 0, BLACK, u); // its feet
  shape(g, [[28, 76], [58, 74], [64, 92], [60, 112], [28, 112], [24, 94]]);
  paint(g, orb(g, VERMILION, 44, 94, 32, u)); // the coat, a gold sash across it, the girdle
  rib(g, [[30, 78], [44, 92], [58, 104]], 6, lc(44, 92, 16, PAL.goldDeep), 0.7);
  rib(g, [[24, 108], [44, 110], [62, 108]], 9, lc(44, 109, 20, BLACK), 0.8);
  for (const x of [32, 44, 56]) dot(g, x, 109, 1.8, PAL.gold);
  for (const x of [26, 60]) ball(g, x, 78, 8, BLACK, u); // the shoulder plates, black ringed in gold
  for (const x of [26, 60]) band(g, x, 78, 17, 5, 0.3, PAL.gold, u);
  limb(g, [[58, 80], [66, 98], [70, 102]], [11, 9, 8], VERMILION, u); // the near arm on the spear
  band(g, 68, 100, 8, 4, 0.5, PAL.gold, u);
  ball(g, 72, 104, 4.6, GREEN, u);
  limb(g, [[44, 72], [44, 64]], [10, 10], GREEN, u);
  ball(g, 44, 54, 13, GREEN, u); // the mask: black sweeps round the eyes with red eyes in them, curled brows and moustache, a white ridge, fangs
  for (const [s, x] of [[-1, 37], [1, 52]]) {
    poly(g, [[x - 6, 52 - s], [x + 6, 52 + s], [x + 4, 57], [x - 4, 55.5]], BLACK, 0);
    dot(g, x + 0.5, 54.2, 1.5, PAL.crimson);
    line(g, [[x - 6, 48.5 + s], [x, 47.5], [x + 6, 50.5 - s]], BLACK, 1.8);
  }
  line(g, [[33, 61], [38, 68], [45, 70.5], [52, 68], [56, 61]], IVORY, 2.4);
  for (const s of [-1, 1]) line(g, [[44.5 + s * 0.5, 63], [44.5 + s * 7.5, 64], [44.5 + s * 11.5, 61]], BLACK, 2.2);
  line(g, [[38, 66], [50, 66]], BLACK, 1.6);
  for (const x of [40.5, 48]) poly(g, [[x - 1.6, 66], [x + 1.6, 66], [x, 70.5]], IVORY, 0.4);
  const gold = (x, y, r) => lc(x, y, r, PAL.gold);
  poly(g, [[30, 44], [58, 43], [57, 37], [31, 38]], gold(44, 40, 14), 0.9); // the crown: its band and three tiers
  for (const [x0, x1, y, h] of [[33, 55, 37.5, 8], [36, 52, 29.5, 7.5], [39, 49, 22, 7]]) {
    poly(g, [[x0, y], [x1, y - 0.5], [x1 - 2, y - h], [x0 + 2, y - h]], gold((x0 + x1) / 2, y - h / 2, 12), 0.8);
    crest(g, x0 + 2, y - h, x1 - 2, y - h - 0.5, 3, 3.5, PAL.gold, u);
  }
}

// An ashoka tree [crown x, height, spread, trunk x]: a trunk, then dark drooping masses of leaf, each lit warm on its right and set with
// blossom; the greatest has low masses hanging behind the queen.
function tree(g, u, [x, h, sp, tx]) {
  const [gy, bot] = [GROVE.h - 6, h > 140 ? 46 : 56];
  const [cy, rx, ry] = [gy - (h + bot) / 2, sp / 2, (h - bot) / 2];
  limb(g, [[tx, gy], [tx + 1, gy - bot * 0.5], [x - sp * 0.05, cy + ry * 0.3]], [11 * h / 100, 8 * h / 100, 5], LEAVES.bark, u);
  const n = Math.round((sp * (h - bot)) / 900);
  const spots = Array.from({ length: n }, (_, j) => {
    const [a, d] = [j * 2.4 + h, Math.sqrt((j + 0.5) / n)];
    return [x + Math.cos(a) * d * rx * 0.8, cy + Math.sin(a) * d * ry * 0.8, 11 + h * 0.05 + hash(j + h) * 4];
  });
  if (h > 140) for (let j = 0; j < 6; j++) spots.push([x + (j - 2.5) * 30 + 10, gy - 34 + (j % 2) * 8, 17]);
  spots.sort((a, b) => a[1] - b[1]).forEach(([cx, y, r], j) => {
    shape(g, Array.from({ length: 14 }, (_, k) => {
      const [a, rr] = [(k / 14) * TAU, r * (k % 2 ? 0.8 : 1.1) * (1 + 0.12 * hash(j * 31 + k + h))];
      return [cx + Math.cos(a) * rr * 1.1, y + Math.sin(a) * rr * (Math.sin(a) > 0 ? 1.45 : 0.9)];
    }));
    paint(g, orb(g, mix(LEAVES.mass, hash(j + h * 3) < 0.5 ? '#3c7a3a' : '#1c4a4a', 0.3), cx, y, r * 1.2, u), 0.8);
    for (let k = 0; k < 9; k++) { // leaf strokes: warm on the sunny side, violet on the other
      const [lx, ly] = [cx + (hash(j * 17 + k + 5) - 0.5) * r * 1.7, y + (hash(j * 13 + k + 9) - 0.4) * r * 1.5];
      line(g, [[lx, ly], [lx + 2.5, ly + 3.5]], lx > cx ? rgba(mix(LEAVES.mass, PAINT.sun, 0.5), 0.6) : rgba(PAINT.night, 0.3), 1);
    }
  });
  spots.forEach(([cx, y, r], j) => { // the blossom over all of them, in clusters: red-orange, a warm bud catching the sun
    for (let k = 0; k < 5; k++) {
      const [bx, by] = [cx + (hash(j * 7 + k + 1) - 0.4) * r * 1.6, y + (hash(j * 5 + k + 3) - 0.2) * r * 1.5];
      if (Math.abs(bx - GROVE.queen) < 36 && by > 60) continue; // the dark leaf stays calm behind her, so she is the warmest thing here
      for (let f = 0; f < 6; f++) dot(g, bx + (f ? Math.cos(f * 1.05 + k) * 2.3 : 0), by + (f ? Math.sin(f * 1.05 + k) * 2.3 : 0), 1.8, LEAVES.bloom[f % 3]);
      dot(g, bx + 0.7, by - 0.7, 0.9, LEAVES.bud);
    }
  });
}

// A gilded face from x0 to x1 in c, in the city's golds (isle-gold.js).
const face = (g, x0, y0, x1, y1, c) => gild(g, x0, y0, x1, y1, c, GOLD);

// The gatehouse in the low wall: a lit arch under a crenelled top, a lamp burning on each side.
function gate(g, x, base, c) {
  face(g, x, base - 34, x + 36, base, c);
  for (let m = 0; m < 36; m += 12) face(g, x + m, base - 40, x + m + 7, base - 34, c);
  g.beginPath(); // the arch
  g.arc(x + 18, base - 18, 7, Math.PI, 0);
  g.lineTo(x + 25, base);
  g.lineTo(x + 11, base);
  g.closePath();
  paint(g, lin(g, 0, base, 0, base - 25, [[0, GOLD.lamp], [1, GOLD.lampDeep]]), 0.8);
  for (const lx of [x + 3.5, x + 32.5]) addGlow(g, glow(GOLD.lamp), lx, base - 22, 7, 0.9);
}

// The grove with its box's bottom left at (x, base) of the far layer.
export function grove(g, x, base, rng, tone) {
  const { w, h, wall } = GROVE;
  const [floor, gold] = [base - 6, mix(GOLD.gold, PAINT.shadow, 0.3)];
  g.fillStyle = lin(g, 0, base - wall, 0, base, [[0, shade(gold, 0.08)], [1, mix(gold, PAINT.shadow, 0.3)]]); // the back wall, between pilasters, a gilded band along it
  g.fillRect(x, base - wall, w, wall);
  line(g, [[x, base - 30], [x + w, base - 30]], rgba(GOLD.lit, 0.4), 1.2);
  for (let m = 0; m < w; m += 17) face(g, x + m, base - wall - 8, x + m + 10, base - wall, gold); // its merlons
  for (let m = 0; m < w; m += 68) face(g, x + m, base - wall, x + m + 6, base, GOLD.deep);
  g.drawImage(baked('trees', [w, h], 1, (b, u) => GROVE.trees.toSorted((a, c) => a[1] - c[1]).forEach((t) => tree(b, u, t))), x, base - h);
  const [qx, qy] = [x + GROVE.queen - 71 * KQ, floor - 150 * KQ];
  g.drawImage(baked('queen', QB, KQ, queen), qx, qy);
  for (const [lx, ly] of GLINTS) glint(g, qx + lx * KQ, qy + ly * KQ, 1.5, 0.5);
  for (const [i, gx] of GROVE.guards.entries()) {
    const [s, lift, left] = [i % 2 ? 1 : 0.9, i % 2 ? 0 : 3, i > 1];
    const [ox, oy] = [x + gx - (left ? 41 : 43) * KG * s, floor - lift - 156 * KG * s];
    g.drawImage(baked(left ? 'guard-l' : 'guard-r', GB, KG, guard, left), ox, oy, GB[0] * KG * s, GB[1] * KG * s);
    glint(g, ox + (left ? 12 : 72) * KG * s, oy + 8 * KG * s, 1.2, 0.5);
  }
  g.globalCompositeOperation = 'source-over'; // the glints' light ends here
  face(g, x, base - 8, x + w, base, gold); // the terrace's low wall in front, and its gate
  for (let m = 0; m < w; m += 11) if (m > 46 && (m < 134 || m > 228) && GROVE.guards.every((gx) => Math.abs(m + 3 - gx) > 17)) face(g, x + m, base - 12, x + m + 6, base - 8, gold); // its merlons, in the gaps
  gate(g, x + 6, base, gold);
}
