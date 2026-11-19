// The monkey host of Golden Isle's backdrop (the owner's cast, 2026-11-19), painted in full colour like the champion: broad-chested
// warriors of tawny fur and pale chest, a headband and a loincloth each (red, saffron, green, ochre), gold armlets and anklets, tail
// curled high, building and crossing the causeway with grey-violet boulders and massed on the near shore with a spear, a pennant and a
// war drum; all face right, toward the island and the low sun. Painted with isle-paint.js, each baked ONCE (cached by key), laid at many sizes.
import { mix, lin, rgba } from './sprites.js';
import { PAL } from './isle-kit.js';
import { glint } from './aliens/w21-kit.js';
import { figure, paint, lit, orb, shape, tube, limb, band, line, poly, dot, PAINT } from './isle-paint.js';
import { foot } from './isle-champion.js';
import { C } from './isle-champion-head.js';

export const HOST = { w: 100, h: 150, foot: 146, light: -0.15 }; // a pose's box, the feet's line in it, the light's angle (the low sun, right)

const M = { fur: '#bc682c', pale: C.pale, face: C.face, dark: C.dark, eye: C.eye, white: C.white, wood: '#4a2a22', bronze: '#d89a3a', glint: 1.4 };
const CLOTH = { red: ['#b8262e', PAL.gold, '#b8262e'], saffron: ['#d89a2a', PAL.crimson, '#d89a2a'], green: ['#2c7048', PAL.gold, '#2c7048'], ochre: ['#a8802e', '#c4303a', '#7a2a30'] }; // cloth, its trim, the headband
const far = (c) => mix(c, PAINT.shadow, 0.2);
const ang = ([x0, y0], [x1, y1]) => Math.atan2(y1 - y0, x1 - x0);
const TAU = Math.PI * 2;

// Each pose: hip, chest, head, the far and near leg and arm as joint chains, the tail, the loincloth, a load [x, y, rx, ry] (a boulder;
// rockFirst puts it behind the head) or a spear [tip, butt].
export const POSES = {
  carry: { hip: [46, 100], chest: [52, 74], head: [66, 60], legs: [[[44, 100], [32, 119], [28, 141]], [[50, 100], [62, 118], [64, 141]]], arms: [[[56, 68], [60, 52], [66, 40]], [[50, 68], [42, 52], [47, 40]]], tail: [[42, 98], [26, 104], [13, 90], [12, 68], [20, 54]], cloth: 'red', load: [54, 25, 27, 17] },
  shoulder: { hip: [44, 100], chest: [50, 74], head: [64, 62], legs: [[[42, 100], [30, 119], [24, 141]], [[48, 100], [62, 118], [66, 141]]], arms: [[[52, 72], [64, 86], [70, 100]], [[48, 72], [36, 76], [28, 56]]], tail: [[40, 98], [24, 106], [12, 92], [12, 72], [20, 60]], cloth: 'saffron', load: [40, 47, 22, 16], rockFirst: true },
  heave: { hip: [32, 106], chest: [50, 90], head: [66, 80], legs: [[[30, 106], [18, 124], [12, 141]], [[36, 106], [50, 124], [48, 141]]], arms: [[[52, 88], [62, 100], [70, 112]], [[56, 90], [66, 102], [74, 114]]], tail: [[28, 104], [16, 100], [11, 84], [16, 70], [26, 66]], cloth: 'ochre', load: [82, 125, 15, 18] },
  stand: { hip: [46, 100], chest: [49, 72], head: [54, 52], legs: [[[44, 100], [38, 120], [34, 141]], [[48, 100], [56, 120], [58, 141]]], arms: [[[44, 70], [36, 86], [40, 100]], [[56, 70], [68, 82], [78, 70]]], tail: [[42, 98], [24, 104], [12, 88], [12, 66], [24, 54]], cloth: 'green', spear: [[80, 4], [77, 144]] },
};

// A boulder round (x, y): a rough eight-sided stone, grey-violet, its top warm in the sun, its underside dark, a pale edge on the lit side.
function rock(g, [x, y, rx, ry]) {
  const P = [1, 0.84, 0.95, 0.8, 1, 0.88, 0.82, 0.96].map((k, i) => [x + Math.cos((i / 8) * TAU + 0.2) * rx * k, y + Math.sin((i / 8) * TAU + 0.2) * ry * k]);
  poly(g, P, lin(g, x, y - ry, x, y + ry, [[0, '#c4ac98'], [0.3, '#847490'], [1, '#382e4a']]), 1.3);
  poly(g, [P[3], P[4], [x - rx * 0.2, y + ry * 0.2]], rgba(PAINT.night, 0.2), 0.5); // its facets
  poly(g, [P[1], P[2], P[3], [x + rx * 0.1, y + ry * 0.4]], rgba(PAINT.night, 0.16), 0.5);
  line(g, [P[6], P[7], P[0]], rgba(PAINT.sun, 0.8), 1.4);
}

function spear(g, [[tx, ty], [bx, by]], u) {
  tube(g, [[tx - 0.4, ty + 18], [bx, by]], [3.6, 3.6]);
  paint(g, lit(g, M.wood, tx, 80, 3, u));
  poly(g, [[tx, ty], [tx + 5, ty + 11], [tx + 3.4, ty + 20], [tx - 3.4, ty + 20], [tx - 5, ty + 11]], lit(g, M.bronze, tx, ty + 10, 8, u), 1);
  band(g, tx - 0.4, ty + 21, 8, 3.4, 0, PAL.gold, u);
  for (const [dx, dy] of [[-4, 26], [4, 26], [0, 30]]) tube(g, [[tx + dx * 0.4, ty + 22], [tx + dx, ty + dy]], [3, 2]), paint(g, lit(g, PAL.crimson, tx, ty + 26, 5, u), 0.6); // its red tassel
}

function arm(g, [s, e, h], c, gold, u) {
  limb(g, [s, e, h], [15, 13, 11], c, u);
  band(g, (s[0] + e[0]) / 2, (s[1] + e[1]) / 2, 16, 5, ang(s, e) + Math.PI / 2, gold, u);
  g.beginPath();
  g.arc(h[0], h[1], 6.4, 0, TAU);
  paint(g, orb(g, c, h[0], h[1], 7, u), 0.9);
}

function leg(g, [h, k, a], c, sole, gold, u) {
  foot(g, a[0] - 1, a[1], 18, 0.05, sole, u);
  limb(g, [h, k, a], [25, 20, 13], c, u);
  band(g, a[0], a[1] - 5, 14, 4, ang(k, a) + Math.PI / 2, gold, u);
}

// The loincloth from the hip, its hem swallow-tailed and trimmed, and the belt with its red stone.
function cloth(g, [hx, hy], [fill, trim], u) {
  const hem = [[hx - 14, hy + 8], [hx - 10, hy + 18], [hx - 3, hy + 27], [hx + 4, hy + 20], [hx + 13, hy + 26], [hx + 17, hy + 10]];
  poly(g, [[hx - 13, hy - 6], [hx + 14, hy - 6], ...hem.reverse()], lit(g, fill, hx, hy + 10, 20, u));
  for (const [c, w] of [[PAINT.night, 4], [trim, 2.2]]) line(g, hem, c, w);
  line(g, [[hx + 4, hy], [hx + 4, hy + 20]], rgba(PAINT.night, 0.35), 1);
  tube(g, [[hx - 13, hy - 5], [hx + 15, hy - 6]], [6, 6]);
  paint(g, lit(g, PAL.gold, hx, hy - 5, 16, u), 0.9);
  dot(g, hx + 11, hy - 5.5, 2.1, '#c22a30');
}

// The head in profile: skull, ear, pale muzzle, brow, eye and the headband knotted behind with its ends streaming back.
function face(g, [x, y], band, u) {
  for (const [dy, ey, w] of [[4, 8, 5], [2, -2, 4]]) { // the band's ends, streaming back
    tube(g, [[x - 14, y + dy], [x - 24, y + ey]], [w, 2.6]);
    paint(g, lit(g, band, x - 18, y + dy, 6, u), 0.7);
  }
  g.beginPath();
  g.ellipse(x, y, 11.5, 11, 0, 0, TAU);
  paint(g, orb(g, M.fur, x, y, 12.5, u));
  g.beginPath();
  g.ellipse(x - 6, y + 2, 4.2, 5, 0, 0, TAU);
  paint(g, lit(g, M.dark, x - 6, y + 2, 5, u), 0.8);
  shape(g, [[x + 2, y - 3], [x + 10, y - 4], [x + 18, y], [x + 20.5, y + 5.5], [x + 16, y + 10.5], [x + 7, y + 11], [x + 1, y + 7]]);
  paint(g, lit(g, M.face, x + 10, y + 4, 12, u));
  dot(g, x + 19, y + 3, 1.7, M.eye);
  line(g, [[x + 17, y + 8], [x + 9, y + 8.4]], rgba(M.dark, 0.9), 1);
  tube(g, [[x + 1, y - 4.6], [x + 12, y - 4.2]], [4.4, 3.6]);
  paint(g, lit(g, M.dark, x + 6, y - 4, 7, u), 0.7);
  g.beginPath();
  g.ellipse(x + 9, y - 0.4, 2.7, 1.9, 0, 0, TAU);
  paint(g, M.white, 0.5);
  dot(g, x + 9.8, y - 0.3, 1.3, M.eye);
  tube(g, [[x - 11, y - 1], [x - 3, y - 7.5], [x + 8, y - 6.6]], [5, 5, 4.6]);
  paint(g, lit(g, band, x, y - 6, 10, u), 0.9);
  line(g, [[x - 9, y - 3], [x - 3, y - 8.6], [x + 7, y - 8]], rgba(PAL.gold, 0.9), 1);
  dot(g, x - 11, y - 1.4, 2.4, PAL.gold);
}

function monkey(g, p, u) {
  const [[hx, hy], [cx, cy]] = [p.hip, p.chest];
  const [fill, trim, headband] = CLOTH[p.cloth];
  limb(g, p.tail, [11, 12, 11, 9, 6], far(M.fur), u);
  leg(g, p.legs[0], far(M.fur), far(M.dark), PAL.goldDeep, u);
  arm(g, p.arms[0], far(M.fur), PAL.goldDeep, u);
  limb(g, [p.chest, p.head], [19, 16], M.fur, u); // the neck, behind the chest
  tube(g, [p.hip, p.chest], [30, 38]);
  paint(g, orb(g, M.fur, (hx + cx) / 2, (hy + cy) / 2, 28, u));
  shape(g, [[cx + 3, cy - 12], [cx + 13, cy - 10], [cx + 18, cy], [cx + 16, cy + 14], [cx + 8, cy + 20], [cx + 2, cy + 10], [cx + 1, cy - 2]]);
  paint(g, lit(g, '#f2c496', cx + 12, cy, 16, u), 0.5); // the pale chest
  for (const [dx, dy] of [[-8, 4], [-3, 10], [-10, 14], [-4, 20]]) line(g, [[cx + dx, cy + dy], [cx + dx + 4, cy + dy + 5]], rgba(PAINT.night, 0.25), 1); // the fur, combed
  if (p.rockFirst) rock(g, p.load);
  leg(g, p.legs[1], M.fur, M.dark, PAL.gold, u);
  cloth(g, p.hip, [fill, trim], u);
  face(g, p.head, headband, u);
  if (p.spear) spear(g, p.spear, u);
  if (p.load && !p.rockFirst) rock(g, p.load);
  arm(g, p.arms[1], M.fur, PAL.gold, u);
}

const baked = new Map(); // each figure baked once, by key
const bake = (key, w, h, draw, light = HOST.light) => baked.get(key) ?? (baked.set(key, figure(w, h, draw, light)), baked.get(key));

// Lay a baked figure with its box's top left at (x, y), w by h; the glints (box coordinates, from the box k) go on over it.
function lay(g, c, x, y, w, h, glints = []) {
  g.save();
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, x, y, w, h);
  for (const [gx, gy, r] of glints) glint(g, x + (gx * w) / c.width, y + (gy * h) / c.height, r, 0.5);
  g.restore();
  g.globalCompositeOperation = 'source-over'; // the glints' light ends here, whatever restored it
}

export const hostSprite = (pose) => bake('islehost-' + pose, HOST.w, HOST.h, (g, u) => monkey(g, POSES[pose], u));

// A warrior of the host, the pose's feet standing on (x, y), tall px high.
export function warrior(g, pose, x, y, tall) {
  const k = tall / HOST.foot;
  lay(g, hostSprite(pose), x - (HOST.w / 2) * k, y - HOST.foot * k, HOST.w * k, HOST.h * k, pose === 'stand' && tall >= 60 ? [[POSES.stand.spear[0][0], 12, M.glint]] : []);
}

export const BANNER = { w: 120, h: 240, pole: 12 }; // a banner's box and its pole's x in it: a long swallow-tailed pennant streaming right, no device on it
const banner = () => bake('islebanner', BANNER.w, BANNER.h, (g, u) => {
  const edge = [[14, 20], [60, 12], [92, 30], [117, 22], [97, 49], [117, 76], [90, 72], [58, 88], [14, 78]]; // the pennant, a swallow tail at its end
  tube(g, [[12, 8], [12, 236]], [7.5, 7.5]);
  paint(g, lit(g, '#2a1618', 12, 120, 4, u));
  poly(g, [[12, 237], [9.4, 231], [14.6, 231]], PAL.goldDeep, 0.8);
  for (const y of [22, 80]) band(g, 12, y, 11, 5, 0, PAL.gold, u);
  shape(g, edge);
  paint(g, lit(g, '#b8262e', 66, 46, 60, u));
  for (const [a, b] of [[[34, 18], [32, 80]], [[62, 16], [60, 84]]]) line(g, [a, [(a[0] + b[0]) / 2 + 3, 46], b], rgba(PAINT.night, 0.22), 1.2); // folds
  for (const pts of [[[14, 21], [60, 13], [92, 31], [116, 22]], [[14, 77], [58, 87], [90, 71], [116, 76]]]) { line(g, pts, PAINT.night, 4.6); line(g, pts, PAL.gold, 3); } // its gold border
  for (let x = 22; x < 88; x += 5) { // the fringe: gold tassels hanging from the lower border
    const y = 82 + (x - 14) * 0.07;
    tube(g, [[x, y], [x - 0.6, y + 7]], [2.6, 1.6]);
    paint(g, lit(g, PAL.gold, x, y + 3, 5, u), 0.5);
  }
  shape(g, [[12, 11], [16.5, 7], [15, 4], [12, 2.6], [9, 4], [7.5, 7]]);
  paint(g, orb(g, PAL.gold, 12, 6, 7, u), 0.9);
  poly(g, [[12, 2], [15, 9], [9, 9]], lit(g, PAL.goldPale, 12, 5, 6, u), 0.8);
});

export function standard(g, x, y, tall) {
  const k = tall / BANNER.h;
  lay(g, banner(), x - BANNER.pole * k, y - BANNER.h * k, BANNER.w * k, BANNER.h * k, tall >= 120 ? [[12, 3, 2.2], [104, 25, 1.4]] : []);
}

export const DRUM = { w: 150, h: 150 }; // a war drum on its stand and the warrior who beats it
const barrel = [[72, 71], [100, 64], [128, 71], [131, 92], [128, 113], [100, 120], [72, 113], [68, 92]];
const drum = () => bake('isledrum', DRUM.w, DRUM.h, (g, u) => {
  for (const [a, b] of [[[76, 144], [90, 108]], [[124, 144], [110, 108]]]) { limb(g, [a, b], [8, 7], M.wood, u); band(g, a[0] + (b[0] - a[0]) * 0.2, a[1] + (b[1] - a[1]) * 0.2, 11, 4, 0.3, PAL.gold, u); }
  tube(g, [[82, 128], [118, 128]], [4, 4]);
  paint(g, lit(g, M.wood, 100, 128, 20, u), 0.8);
  shape(g, barrel); // the barrel in red lacquer, gold bands across it
  paint(g, orb(g, '#b2262e', 102, 92, 40, u));
  g.save();
  shape(g, barrel);
  g.clip();
  for (const x of [84, 116]) { g.fillStyle = lit(g, PAL.gold, x, 92, 40, u); g.fillRect(x - 4, 60, 8, 64); g.strokeStyle = rgba(PAINT.night, 0.7); g.lineWidth = 1; g.strokeRect(x - 4, 60, 8, 64); }
  g.restore();
  g.beginPath(); // its taut head toward the drummer, rimmed in gold and studded
  g.ellipse(70, 92, 9, 23, 0, 0, TAU);
  paint(g, lit(g, '#e6d0a8', 70, 92, 24, u), 1);
  g.strokeStyle = PAL.gold;
  g.lineWidth = 2.4;
  g.stroke();
  for (let i = 0; i < 8; i++) dot(g, 70 + Math.cos(i * 0.785) * 9, 92 + Math.sin(i * 0.785) * 23, 1.2, PAL.goldPale);
  tube(g, [[100, 120], [100, 134]], [5, 3]); // a tassel from it
  paint(g, lit(g, PAL.crimson, 100, 128, 6, u), 0.7);
  monkey(g, { hip: [36, 100], chest: [40, 72], head: [48, 55], legs: [[[34, 100], [26, 121], [22, 141]], [[40, 100], [48, 121], [50, 141]]], arms: [[[40, 70], [52, 80], [62, 84]], [[46, 70], [58, 50], [60, 34]]], tail: [[32, 98], [18, 104], [8, 90], [8, 70], [16, 58]], cloth: 'saffron' }, u);
  for (const [a, b] of [[[62, 84], [74, 74]], [[60, 34], [72, 14]]]) { tube(g, [a, b], [3, 2.4]); paint(g, lit(g, M.wood, a[0], a[1], 6, u), 0.7); dot(g, b[0], b[1], 2.4, PAL.gold); } // the sticks
});

export function wardrum(g, x, y, tall) {
  const k = tall / DRUM.h;
  lay(g, drum(), x - (DRUM.w / 2) * k, y - DRUM.h * k, DRUM.w * k, DRUM.h * k, tall >= 80 ? [[84, 80, 1.6], [116, 80, 1.6], [72, 12, 1.6]] : []);
}
