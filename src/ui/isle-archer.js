// The hero's brother (the owner's cast, 2026-11-19), the archer at the head of the host on the near shore, painted in full colour: the
// great bow drawn to his cheek with an arrow nocked and aimed across the sea at the island, the sunset catching his face, the bow and the
// arrow's gold head. Golden skin, long dark hair under a tiered gold crown, a saffron cloth with a red border, a red scarf across his chest
// and streaming behind, a red quiver on his back, gold at his ears, neck, arms and waist. Painted with isle-paint.js and baked once into
// the near layer (parallax-isle-shore.js); he faces right. Nothing on his brow (C3).
import { mix, rgba } from './sprites.js';
import { PAL } from './isle-kit.js';
import { glint } from './aliens/w21-kit.js';
import { figure, paint, lit, orb, shape, tube, limb, band, crest, line, poly, dot, PAINT } from './isle-paint.js';
import { foot, ribbon } from './isle-champion.js';

export const ARCHER = { w: 200, h: 240, foot: 230, glint: 1.8 }; // his box, the line his feet stand on, a glint
const A = { skin: '#e8a860', dark: '#a8643a', cloth: '#eab03a', red: '#c22a30', hair: '#1e1216', wood: '#5a2c1a', string: '#f4e4c0', eye: '#2a140c', white: '#f6eedc' };
const far = (c) => mix(c, PAINT.shadow, 0.2);

function back(g, u) {
  ribbon(g, [[84, 82], [66, 90], [52, 86], [38, 96], [26, 94]], [7, 8, 7, 6, 2], A.red, u); // the scarf streaming behind
  tube(g, [[88, 42], [82, 58], [80, 74], [84, 84]], [14, 14, 11, 6]); // his hair
  paint(g, lit(g, A.hair, 84, 62, 14, u));
  for (const [x, y, a] of [[64, 50, -0.3], [70, 47, 0], [76, 49, 0.3]]) { // the arrows in the quiver, fletched red and white
    tube(g, [[x + 2, y + 14], [x, y]], [2, 2]);
    paint(g, '#c8a060', 0.6);
    poly(g, [[x, y], [x - 3 + a, y + 7], [x + 3 + a, y + 7]], y % 2 ? A.white : A.red, 0.6);
  }
  limb(g, [[72, 62], [62, 116]], [14, 12], A.red, u); // the quiver
  for (const t of [0.1, 0.5, 0.9]) band(g, 72 - 10 * t, 62 + 54 * t, 14, 3.5, 0.18, PAL.gold, u);
  foot(g, 60, 223, 17, 0.05, far(A.dark), u);
  limb(g, [[86, 128], [77, 152], [70, 180], [61, 222]], [25, 21, 15, 10], far(A.skin), u); // the back leg
  band(g, 61, 216, 10, 4, 1.4, PAL.gold, u);
  limb(g, [[98, 80], [114, 78], [128, 75], [142, 72], [152, 70]], [12, 11, 10, 9, 8], far(A.skin), u); // the bow arm, held out
  band(g, 146, 71, 9, 4, 1.4, PAL.gold, u);
}

// The great bow drawn, its string to his cheek, and the arrow nocked on it, aimed a little up at the island.
function bow(g, u) {
  tube(g, [[146, 3], [139, 10], [154, 36], [160, 68], [154, 100], [139, 126], [146, 133]], [3, 4, 6, 8, 6, 4, 3]);
  paint(g, lit(g, A.wood, 152, 68, 40, u));
  for (const [x, y, a] of [[160, 68, 0], [142, 14, 0.9], [142, 122, -0.9]]) band(g, x, y, 9, 4, a, PAL.gold, u);
  line(g, [[140, 8], [100, 64], [140, 128]], rgba(A.string, 0.9), 1);
  dot(g, 157, 70, 5.5, A.skin);
  line(g, [[99, 64.5], [190, 57]], rgba(PAINT.night, 0.8), 3); // the arrow
  line(g, [[99, 64.5], [190, 57]], '#d8b070', 1.5);
  for (const s of [-1, 1]) poly(g, [[100, 64.4], [112, 63.4], [108, 63.7 + s * 5], [98, 64.5 + s * 5]], A.red, 0.6);
  poly(g, [[198, 56.4], [187, 52.6], [189, 57.2], [187, 61.4]], lit(g, PAL.gold, 192, 57, 8, u), 0.8);
}

function body(g, u) {
  foot(g, 126, 223, 18, 0.05, A.dark, u);
  limb(g, [[96, 128], [109, 152], [117, 180], [125, 222]], [26, 22, 15, 10], A.skin, u); // the front leg
  band(g, 126, 216, 10, 4, 1.4, PAL.gold, u);
  shape(g, [[78, 114], [106, 112], [112, 134], [120, 160], [118, 170], [106, 166], [98, 146], [90, 148], [80, 168], [66, 170], [70, 146], [74, 128]]); // the cloth
  paint(g, lit(g, A.cloth, 94, 140, 34, u));
  for (const p of [[[66, 170], [80, 168]], [[106, 166], [118, 170]]]) line(g, p, A.red, 3); // its red border
  for (const [x0, x1] of [[84, 76], [100, 108]]) line(g, [[x0 + 4, 120], [x1, 160]], rgba(PAINT.night, 0.35), 1);
  tube(g, [[92, 120], [94, 152]], [9, 6]); // its front fall
  paint(g, lit(g, mix(A.cloth, A.red, 0.25), 93, 136, 10, u), 0.8);
  shape(g, [[79, 78], [102, 77], [108, 92], [106, 108], [101, 118], [79, 118], [74, 104], [76, 90]]); // the chest
  paint(g, orb(g, A.skin, 92, 98, 24, u));
  line(g, [[88, 96], [96, 99], [103, 95]], rgba(PAINT.night, 0.3), 1);
  ribbon(g, [[82, 82], [92, 96], [102, 112]], [7, 7, 7], A.red, u); // the scarf across it
  tube(g, [[76, 116], [106, 114]], [6, 6]); // the belt, a red stone in it
  paint(g, lit(g, PAL.gold, 92, 115, 16, u), 0.8);
  dot(g, 92, 115, 2, A.red);
  for (let i = 0; i < 7; i++) dot(g, 88 + i * 2.2, 82 + 6 * Math.sin((i / 6) * Math.PI), 1.3, PAL.gold); // the necklace
  limb(g, [[92, 80], [94, 64]], [10, 10], A.skin, u); // the neck
}

function head(g, u) {
  g.beginPath();
  g.ellipse(93, 49, 11, 12.5, 0, 0, Math.PI * 2);
  paint(g, orb(g, A.skin, 93, 49, 13, u));
  shape(g, [[96, 38], [103, 40], [106, 46], [109.5, 52], [107, 54], [108, 57], [105, 59], [105.5, 62], [100, 65], [92, 64], [88, 56]]); // his face
  paint(g, lit(g, A.skin, 100, 52, 12, u));
  shape(g, [[84, 39], [97, 38], [93, 46], [89, 56], [83, 58], [79, 49]]); // his hair under the crown
  paint(g, lit(g, A.hair, 87, 48, 10, u), 0.8);
  g.beginPath(); // the eye, along the arrow
  g.moveTo(100, 49);
  g.quadraticCurveTo(103, 47, 106, 48.6);
  g.quadraticCurveTo(103, 50.4, 100, 49);
  paint(g, A.white, 0.5);
  dot(g, 103.4, 48.7, 1.2, A.eye);
  line(g, [[99.5, 45.6], [103, 44.6], [106.5, 45.4]], A.eye, 1.4); // the brow
  line(g, [[103.5, 59], [106.5, 58.6]], rgba(A.dark, 0.9), 1); // the lips
  g.beginPath(); // the earring
  g.arc(91, 59, 2.6, 0, Math.PI * 2);
  g.strokeStyle = PAL.gold;
  g.lineWidth = 1.4;
  g.stroke();
  const gold = (x, y, r) => lit(g, PAL.gold, x, y, r, u);
  poly(g, [[84, 38], [78, 44], [80, 50], [86, 44]], gold(82, 44, 6), 0.8); // the crown: its flare, band, tiers and bud
  poly(g, [[83, 41], [105, 40], [105, 36], [84, 36]], gold(94, 38, 11), 0.9);
  for (const [x0, x1, y, h, n] of [[85, 103, 36, 6, 4], [87, 101, 30, 5.5, 3], [89, 99, 24.5, 5, 2]]) {
    poly(g, [[x0, y], [x1, y], [x1 - 1.5, y - h], [x0 + 1.5, y - h]], gold((x0 + x1) / 2, y - h / 2, (x1 - x0) / 2), 0.8);
    crest(g, x0 + 1.5, y - h, x1 - 1.5, y - h, n, h * 0.7, PAL.gold, u);
    dot(g, (x0 + x1) / 2 - 3, y - h / 2, 1, A.red);
  }
  shape(g, [[91, 20], [97, 20], [96.5, 15], [94, 9], [91.5, 15]]);
  paint(g, gold(94, 15, 6), 0.8);
}

function draw(g, u) {
  back(g, u);
  bow(g, u);
  body(g, u);
  head(g, u);
  limb(g, [[86, 86], [74, 80], [62, 74]], [13, 12, 11], A.skin, u); // the drawing arm: elbow back, hand at his cheek
  band(g, 74, 80, 10, 4, 2.0, PAL.gold, u);
  limb(g, [[62, 74], [80, 69.5], [97, 65]], [11, 10, 9], A.skin, u);
  band(g, 90, 67, 9, 3.5, 1.3, PAL.gold, u);
  g.beginPath();
  g.arc(100, 65, 5, 0, Math.PI * 2);
  paint(g, orb(g, A.skin, 100, 65, 6, u), 0.9);
  return [[197, 56.5], [94, 10], [146, 3], [146, 133]];
}

// Paint him with his feet at (x, y), tall px high, lit from the angle light; the gold glints over the outline.
export function archer(g, x, y, tall, light) {
  const k = tall / ARCHER.foot;
  let glints = [];
  const c = figure(Math.ceil(ARCHER.w * k), Math.ceil(ARCHER.h * k), (b, u) => { b.scale(k, k); glints = draw(b, u); }, light);
  const [x0, y0] = [x - (ARCHER.w / 2) * k, y - ARCHER.foot * k];
  g.drawImage(c, x0, y0);
  for (const [gx, gy] of glints) glint(g, x0 + gx * k, y0 + gy * k, ARCHER.glint, 0.5);
  g.globalCompositeOperation = 'source-over'; // the glints' light ends here, whatever restored it
}
