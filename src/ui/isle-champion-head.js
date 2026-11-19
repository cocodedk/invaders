// The champion's head (isle-champion.js), in profile toward the city: tawny fur, a pale muzzle with a strong jaw, a steady eye under a
// heavy brow, a ruff along the jaw, a gold earring with a red drop, and a tiered gold crown, each tier crested with gold petals, a lotus
// bud on top and a flare over the ear; its red stones are set behind, none on the brow (C3). Painted with isle-paint.js.
import { PAL } from './isle-kit.js';
import { rgba } from './sprites.js';
import { paint, lit, orb, shape, crest, line, poly, dot, PAINT } from './isle-paint.js';

// His colours: fur, the paler fur, the muzzle, the dark of his ears and soles, the cloth, the sash, the eye, its white, the red stones.
export const C = { fur: '#c8722e', pale: '#eeb066', face: '#ecbf92', dark: '#9a5a3e', cloth: '#c22a30', sash: '#f0a422', eye: '#3a1c10', white: '#f6eedc', jewel: '#d8402a' };

export function head(g, u) {
  g.beginPath();
  g.ellipse(204, 236, 30, 29, 0, 0, Math.PI * 2);
  paint(g, orb(g, C.fur, 204, 236, 32, u));
  shape(g, [[222, 214], [244, 220], [234, 227], [248, 236], [232, 241]]); // the fur at the back of his head
  paint(g, lit(g, C.fur, 234, 228, 14, u), 0.8);
  for (let i = 0; i < 7; i++) { // its texture, combed back
    const a = -2.4 + i * 0.34;
    line(g, [[204 + Math.cos(a) * 18, 236 + Math.sin(a) * 18], [204 + Math.cos(a + 0.12) * 27, 236 + Math.sin(a + 0.12) * 27]], rgba(PAINT.night, 0.28), 1.2);
  }
  shape(g, [[176, 268], [184, 286], [193, 274], [203, 289], [209, 272], [223, 279], [221, 257], [200, 262]]); // the ruff along his jaw
  paint(g, lit(g, C.pale, 200, 272, 20, u), 0.8);
  shape(g, [[193, 214], [177, 216], [168, 224], [168, 232], [159, 238], [150, 245], [148, 251], [151, 257], [163, 259], [155, 264], [163, 273], [182, 275], [199, 265], [203, 244], [201, 224]]); // his face in profile
  paint(g, lit(g, C.face, 172, 252, 36, u));
  line(g, [[168, 263], [181, 268], [193, 262]], rgba(C.dark, 0.55), 1.4); // the strong jaw
  line(g, [[150, 251], [153, 256]], rgba(C.dark, 0.6), 1); // the lip's line
  line(g, [[151, 257.5], [167, 258.5]], C.eye, 1.5); // the mouth, firm
  line(g, [[150, 248.5], [154, 247]], C.eye, 1.5); // the nostril
  g.beginPath(); // the eye, steady, looking ahead
  g.moveTo(173, 233);
  g.quadraticCurveTo(180, 227.5, 187.5, 232);
  g.quadraticCurveTo(180, 235.8, 173, 233);
  paint(g, C.white, 0.6);
  dot(g, 177.5, 232, 2.9, '#7a3c18');
  dot(g, 177, 232, 1.6, C.eye);
  dot(g, 176.4, 231, 0.8, '#ffffff');
  line(g, [[172, 232.5], [180, 227.8], [188.5, 231.5]], C.eye, 1.8); // the lid
  line(g, [[168, 225], [180, 221.5], [192, 222.5]], C.eye, 3.2); // the heavy brow
  line(g, [[176, 237.5], [184, 237]], rgba(C.dark, 0.5), 1); // under the eye
  g.beginPath();
  g.ellipse(214, 242, 6.5, 8.5, 0, 0, Math.PI * 2); // the ear
  paint(g, lit(g, C.dark, 214, 242, 8, u));
  g.beginPath();
  g.ellipse(215, 243, 3.4, 5.4, 0, 0, Math.PI * 2);
  paint(g, '#d88a7a', 0);
  g.beginPath(); // the earring, a red drop under it
  g.arc(215, 257, 6, 0, Math.PI * 2);
  g.strokeStyle = PAINT.night;
  g.lineWidth = 4;
  g.stroke();
  g.strokeStyle = PAL.gold;
  g.lineWidth = 2.4;
  g.stroke();
  g.beginPath();
  g.arc(215, 264, 2.6, 0, Math.PI * 2);
  paint(g, C.jewel, 0.8);
  crown(g, u);
  return [[203, 160], [215, 251]]; // where the gold catches the light
}

// The tiered crown: its band, a flare over the ear, three tiers each crested with petals, a lotus bud on top.
function crown(g, u) {
  const gold = (x, y, r) => lit(g, PAL.gold, x, y, r, u);
  poly(g, [[226, 211], [242, 204], [249, 216], [243, 231], [234, 228], [237, 218]], gold(240, 218, 14)); // the flare over the ear
  poly(g, [[176, 217], [228, 210], [230, 222], [179, 227]], gold(204, 218, 26));
  for (const [x, y] of [[206, 220], [218, 218]]) dot(g, x, y, 2, C.jewel);
  for (const [x0, x1, y, h, n] of [[181, 225, 215, 11, 5], [186, 220, 199, 9, 4], [191, 215, 185, 8, 3]]) {
    const dy = (x1 - x0) * 0.13; // the head leans forward, so every tier rises to the right
    poly(g, [[x0, y], [x1, y - dy], [x1 - 3, y - dy - h], [x0 + 3, y - h]], gold((x0 + x1) / 2, y - h / 2, (x1 - x0) / 2));
    crest(g, x0 + 3, y - h, x1 - 3, y - dy - h, n, h * 0.8, PAL.gold, u);
    line(g, [[x0 + 2, y - h * 0.45], [x1 - 2, y - dy - h * 0.45]], rgba(PAL.goldPale, 0.8), 1);
    dot(g, (x0 + x1) / 2 + 6, y - dy / 2 - h * 0.6, 1.8, C.jewel);
  }
  shape(g, [[197, 181], [210, 179], [209, 170], [203, 157], [198, 169]]); // the lotus bud
  paint(g, gold(203, 170, 12), 1);
}
