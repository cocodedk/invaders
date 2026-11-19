// The champion of the monkey host (the owner's cast, 2026-11-19), painted in full colour like the king and the aliens: leaping out of
// the sunset toward the island city with the mountain of healing herbs raised on one hand behind him (isle-mount.js), the gold mace in
// the other, his tail, saffron scarf and red sash streaming. Tawny fur, a vermilion cloth with a gold hem and a jewelled belt, gold
// armlets, anklets and necklace; his head and crown are isle-champion-head.js. Lit warm from the low sun below him and violet on his far
// side (isle-paint.js); baked once into the sky (sky-bodies-13.js), the herbs glowing and the gold glinting over him.
import { glow, addGlow, mix, rgba } from './sprites.js';
import { PAL } from './isle-kit.js';
import { glint } from './aliens/w21-kit.js';
import { figure, paint, lit, orb, shape, tube, limb, band, line, poly, PAINT } from './isle-paint.js';
import { mount, MOUNT } from './isle-mount.js';
import { head, C } from './isle-champion-head.js';

export const CHAMPION = { w: 440, h: 480, mount: [330, 160, 210, 140], herb: 9, glint: 2.6 }; // his box; the mountain's middle, foot, width, height; a herb's glow; a glint
const far = (c) => mix(c, PAINT.shadow, 0.2); // a limb on his far side

// A foot from its ankle (x, y), len long, pointing at the angle a: heel, sole and toes.
export function foot(g, x, y, len, a, c, u) {
  const [ca, sa] = [Math.cos(a) * len, Math.sin(a) * len];
  const at = ([px, py]) => [x + px * ca - py * sa, y + px * sa + py * ca];
  shape(g, [[-0.12, -0.2], [0.5, -0.16], [0.86, -0.18], [1.02, -0.07], [0.96, 0.06], [0.7, 0.14], [0.3, 0.19], [-0.14, 0.14]].map(at));
  paint(g, lit(g, c, x + ca / 2, y + sa / 2, len, u));
  for (const k of [-0.06, 0.04]) line(g, [at([0.74, k]), at([0.94, k + 0.01])], rgba(PAINT.night, 0.45), 1);
}

// A ribbon of cloth along the spine pts, ws wide, in c, a gold stripe along its upper edge and folds across it.
export function ribbon(g, pts, ws, c, u) {
  tube(g, pts, ws);
  paint(g, lit(g, c, ...pts[2], 60, u));
  line(g, pts.map(([x, y], i) => [x, y - ws[i] * 0.3]), rgba(PAL.gold, 0.85), 1.6);
  for (const [x, y] of pts.slice(1, -1)) line(g, [[x - 3, y - 6], [x + 3, y + 6]], rgba(PAINT.night, 0.35), 1);
}

function back(g, u) {
  ribbon(g, [[250, 274], [290, 262], [330, 272], [372, 254], [408, 262], [436, 248]], [14, 18, 18, 16, 12, 4], C.sash, u); // the scarf
  ribbon(g, [[322, 342], [350, 352], [378, 346], [404, 360], [426, 356]], [12, 14, 12, 10, 3], C.cloth, u); // the sash's end
  limb(g, [[314, 352], [352, 350], [386, 324], [398, 284], [388, 250], [400, 224], [420, 218], [430, 230]], [17, 16, 14, 12, 10, 9, 8, 6], C.fur, u); // the tail
  foot(g, 392, 404, 32, -0.05, far(C.dark), u);
  limb(g, [[304, 354], [328, 374], [350, 390], [374, 400], [394, 404]], [40, 34, 22, 20, 12], far(C.fur), u); // the far leg, trailing
  band(g, 388, 403, 14, 6, 1.6, PAL.gold, u);
  limb(g, [[246, 284], [272, 262], [296, 244], [312, 216], [326, 194]], [30, 28, 22, 20, 16], far(C.fur), u); // the arm raised under the mountain
  band(g, 276, 260, 28, 8, 0.8, PAL.gold, u);
  band(g, 322, 202, 20, 6, 0.5, PAL.gold, u);
}

function body(g, u) {
  shape(g, [[232, 266], [262, 276], [290, 304], [312, 332], [318, 352], [292, 370], [270, 352], [246, 332], [222, 314], [214, 292], [220, 272]]);
  paint(g, orb(g, C.fur, 262, 320, 56, u));
  shape(g, [[218, 296], [230, 318], [250, 336], [272, 352], [268, 336], [252, 318], [236, 300]]); // the paler chest
  paint(g, lit(g, C.pale, 246, 324, 28, u), 0.6);
  line(g, [[224, 304], [236, 306], [246, 300]], rgba(PAINT.night, 0.3), 1.2);
  shape(g, [[276, 336], [300, 328], [324, 334], [338, 352], [360, 380], [340, 378], [322, 394], [300, 388], [282, 372], [272, 352]]); // the cloth
  paint(g, lit(g, C.cloth, 312, 360, 50, u));
  for (const [x, y] of [[296, 350], [312, 346], [306, 366], [322, 362], [318, 380], [336, 370]]) poly(g, [[x, y - 3], [x + 2.4, y], [x, y + 3], [x - 2.4, y]], PAL.gold, 0); // its gold flowers
  line(g, [[300, 388], [322, 394], [340, 378], [360, 380]], PAINT.night, 5);
  line(g, [[300, 388], [322, 394], [340, 378], [360, 380]], PAL.gold, 3); // its gold hem
  line(g, [[302, 346], [318, 384]], rgba(PAINT.night, 0.4), 1.2);
  tube(g, [[272, 340], [300, 331], [328, 338]], [10, 10, 10]); // the jewelled belt
  paint(g, lit(g, PAL.gold, 300, 336, 28, u), 0.9);
  for (const x of [284, 300, 316]) {
    poly(g, [[x, 343], [x + 3, 350], [x - 3, 350]], PAL.gold, 0.6); // a gold drop hanging from it
    g.beginPath();
    g.arc(x, 335 - (x === 300 ? 1 : 0), 2.6, 0, Math.PI * 2);
    paint(g, C.jewel, 0.6);
  }
  foot(g, 316, 431, 34, 0.3, C.dark, u);
  limb(g, [[290, 358], [279, 384], [272, 400], [290, 420], [318, 432]], [44, 38, 27, 22, 13], C.fur, u); // the near leg, bent
  band(g, 314, 430, 15, 6, 2.0, PAL.gold, u);
  limb(g, [[230, 286], [214, 262]], [28, 26], C.fur, u); // the neck
}

// The near arm with the mace held forward and down: a fluted gold head on a gilt haft, a lotus finial and spike at its end; the
// necklace over all. Returns where the gold catches the light.
function mace(g, u) {
  limb(g, [[238, 296], [226, 316], [214, 334], [200, 344], [188, 350]], [28, 26, 22, 19, 16], C.fur, u);
  band(g, 228, 312, 26, 8, 0.55, PAL.gold, u);
  band(g, 198, 346, 18, 6, 1.0, PAL.gold, u);
  limb(g, [[214, 320], [160, 372]], [7, 7], PAL.goldDeep, u);
  for (const t of [0.15, 0.6]) band(g, 214 - 54 * t, 320 + 52 * t, 10, 4, 0.8, PAL.gold, u);
  tube(g, [[134, 398], [120, 413]], [10, 1.5]);
  paint(g, lit(g, PAL.gold, 128, 405, 10, u));
  g.beginPath();
  g.arc(146, 386, 23, 0, Math.PI * 2);
  paint(g, orb(g, PAL.gold, 146, 386, 24, u));
  for (const k of [0.35, 0.7]) {
    g.beginPath();
    g.ellipse(146, 386, 23, 23 * k, 2.38, 0, Math.PI * 2);
    g.strokeStyle = rgba(PAINT.night, 0.35);
    g.lineWidth = 1.2;
    g.stroke();
  }
  tube(g, [[156, 371], [164, 379]], [16, 16]); // its collar
  paint(g, lit(g, PAL.goldDeep, 160, 375, 10, u));
  g.beginPath();
  g.arc(186, 350, 10, 0, Math.PI * 2); // his fist round the haft
  paint(g, orb(g, C.fur, 186, 350, 11, u));
  for (const k of [-4, 0, 4]) line(g, [[181 + k * 0.3, 344 + k], [188 + k * 0.3, 347 + k]], rgba(PAINT.night, 0.45), 1);
  for (let i = 0; i < 9; i++) { // the necklace, gold beads to a lotus pendant set with a red stone
    const t = i / 8;
    g.beginPath();
    g.arc(222 + t * 30 - 7 * Math.sin(t * Math.PI), 276 + t * 28 + 7 * Math.sin(t * Math.PI), 2.4, 0, Math.PI * 2);
    paint(g, PAL.gold, 0.6);
  }
  poly(g, [[228, 300], [236, 296], [240, 306], [232, 312]], lit(g, PAL.gold, 234, 304, 8, u), 0.8);
  g.beginPath();
  g.arc(234, 304, 2.2, 0, Math.PI * 2);
  paint(g, C.jewel, 0);
  return [[138, 378], [228, 312], [276, 260], [300, 333]];
}

function draw(g, u) {
  back(g, u);
  const [mx, my, mw, mh] = CHAMPION.mount;
  const herbs = mount(g, mx, my, mw, mh, u);
  g.beginPath(); // the hand flat under the mountain, its fingers over the rock
  g.ellipse(mx, my + 24, 16, 7, -0.1, 0, Math.PI * 2);
  paint(g, lit(g, C.face, mx, my + 24, 16, u));
  for (const dx of [-12, -4, 5]) limb(g, [[mx + dx, my + 22], [mx + dx - 2, my + 13]], [5, 4], C.face, u);
  body(g, u);
  return { herbs, glints: [...head(g, u), ...mace(g, u)] };
}

// Paint him on g with his box's top left at (x, y), lit from the angle light (toward the sun), at k times his size (baked whole and
// drawn smaller, so his outline and rim shrink with him); the herbs glow and the gold glints over the outline, shrinking more slowly so
// they still catch the eye.
export function champion(g, x, y, light, k = 1) {
  let lights = { herbs: [], glints: [] };
  const art = figure(CHAMPION.w, CHAMPION.h, (b, u) => { lights = draw(b, u); }, light);
  if (k === 1) g.drawImage(art, x, y);
  else {
    g.imageSmoothingQuality = 'high';
    g.drawImage(art, x, y, CHAMPION.w * k, CHAMPION.h * k);
  }
  const s = Math.sqrt(k);
  for (const [hx, hy] of lights.herbs) addGlow(g, glow(MOUNT.herb), x + hx * k, y + hy * k, CHAMPION.herb * s, 0.6);
  for (const [gx, gy] of lights.glints) glint(g, x + gx * k, y + gy * k, CHAMPION.glint * s, 0.5);
}
