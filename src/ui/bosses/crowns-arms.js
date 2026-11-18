// The Ten-Crowned King's arm fans (World 21, Golden Isle; see crowns.js): ten forearms a side in a halo round him, each bent up from a
// gold-capped elbow, a jewelled armlet at the wrist, every hand gripping a weapon: swords, maces, bows, axes, spears and shields.
// The left fan is painted; the right is it mirrored.
// The upper arms that reach the fan from his shoulders are the hull's (crowns-hull.js). Lights: the blades and the gold catching the dusk.
import { path, ink, lin, line, rgba, shade, mix, ellipse, circle, GOLD, GOLD_D, GOLD_P, VERMILION, BLACK, gilt, glint, skin, PAL, PART } from './crowns-kit.js';

// The halo: each arm's elbow lies on an arc round the shoulder (in the left fan's own coordinates, its centre at the part's centre),
// its forearm bent up from there to the hand; the hull draws the upper arms from the shoulder to the elbows (crowns-hull.js).
export const SHOULDER = [-165 - PART.armsL.x, -10 - PART.armsL.y]; // the left shoulder, at boss (-165, -10)
const [UPPER, FORE, TOP, LOW, BEND, RAISE] = [280, 88, Math.PI + 0.32, Math.PI - 0.55, 0.3, 0.15];
export const ELBOWS = Array.from({ length: 10 }, (_, i) => {
  const a = TOP + ((LOW - TOP) * i) / 9;
  const [x, y] = [SHOULDER[0] + Math.cos(a) * UPPER, SHOULDER[1] + Math.sin(a) * UPPER];
  const f = a + RAISE + (BEND * i) / 9; // bent up at the elbow, the lower arms more
  return { x, y, a, hx: x + Math.cos(f) * FORE, hy: y + Math.sin(f) * FORE, f };
});
const STEEL = (g, w) => lin(g, 0, -w, 0, w, [[0, '#fffaf0'], [0.45, '#d8d4cc'], [1, '#6c665e']]);
const ORDER = ['sword', 'axe', 'spear', 'bow', 'mace', 'shield', 'spear', 'axe', 'mace', 'sword'];

// The weapons, each held in a fist at the origin and pointing along +x.
const WEAPON = {
  sword(b, l) {
    path(b, [[6, -4], [56, -3], [64, 0], [56, 3], [6, 4]]);
    ink(b, STEEL(b, 4), 1.6);
    path(b, [[4, -9], [8, -9], [8, 9], [4, 9]]);
    ink(b, GOLD, 1.2);
    glint(l, 50, -1, 3, 0.55);
  },
  mace(b, l) {
    path(b, [[0, 0], [42, 0]], true);
    line(b, BLACK, 5);
    path(b, [[0, 0], [42, 0]], true);
    line(b, GOLD_D, 2.6);
    ellipse(b, 50, 0, 11, 9);
    ink(b, gilt(b, 40, -9, 60, 9), 1.6);
    for (const y of [-4, 0, 4]) { path(b, [[41, y], [59, y * 1.1]], true); line(b, GOLD_D, 1.1); }
    glint(l, 47, -4, 3, 0.5);
  },
  axe(b, l) {
    path(b, [[0, 0], [52, 0]], true);
    line(b, BLACK, 4.6);
    path(b, [[0, 0], [52, 0]], true);
    line(b, '#7a4a2a', 2.4);
    b.beginPath();
    b.moveTo(40, -2);
    b.quadraticCurveTo(44, -22, 56, -24);
    b.quadraticCurveTo(52, -10, 56, 2);
    b.lineTo(44, 2);
    b.closePath();
    ink(b, STEEL(b, 12), 1.6);
    glint(l, 54, -18, 3, 0.55);
  },
  spear(b, l) {
    path(b, [[-12, 0], [62, 0]], true);
    line(b, BLACK, 4);
    path(b, [[-12, 0], [62, 0]], true);
    line(b, GOLD_D, 2);
    path(b, [[62, -4], [78, 0], [62, 4], [58, 0]]);
    ink(b, STEEL(b, 4), 1.2);
    path(b, [[57, -5], [57, 5]], true);
    line(b, VERMILION, 3);
    glint(l, 72, 0, 3, 0.55);
  },
  bow(b, l) {
    b.beginPath();
    b.moveTo(12, -34);
    b.quadraticCurveTo(8, -28, 14, -24);
    b.quadraticCurveTo(26, -12, 4, 0);
    b.quadraticCurveTo(26, 12, 14, 24);
    b.quadraticCurveTo(8, 28, 12, 34);
    line(b, BLACK, 5);
    b.stroke();
    line(b, GOLD, 2.4);
    path(b, [[13, -31], [-6, 0], [13, 31]], true);
    line(b, rgba(GOLD_P, 0.9), 1);
    glint(l, 14, -26, 2.4, 0.45);
  },
  shield(b, l) {
    path(b, [[8, -28], [20, -22], [22, 0], [20, 22], [8, 28], [4, 0]]); // a tall shield, curved like a leaf
    ink(b, lin(b, 4, -28, 22, 28, [[0, shade(VERMILION, 0.2)], [1, mix(VERMILION, BLACK, 0.5)]]), 2);
    path(b, [[9, -23], [17, -19], [18, 0], [17, 19], [9, 23], [7, 0]]);
    b.strokeStyle = GOLD;
    b.lineWidth = 2;
    b.stroke();
    ellipse(b, 13, 0, 4, 6);
    ink(b, gilt(b, 9, -6, 17, 6), 1);
    glint(l, 6, -10, 3, 0.45);
  },
};

// One forearm from its elbow (e, from ELBOWS) bent up to the hand, a gold armlet at the wrist, gripping the weapon w.
function forearm(b, l, e, w) {
  const [c, s] = [Math.cos(e.f), Math.sin(e.f)];
  const n = [-s, c];
  const [x0, y0, hx, hy] = [e.x, e.y, e.hx, e.hy];
  path(b, [[x0 + n[0] * 10, y0 + n[1] * 10], [hx + n[0] * 7, hy + n[1] * 7], [hx - n[0] * 7, hy - n[1] * 7], [x0 - n[0] * 10, y0 - n[1] * 10]]);
  ink(b, skin(b, x0, y0 - 10, hx, hy + 10), 2);
  path(l, [[x0 + n[0] * 8, y0 + n[1] * 8], [hx + n[0] * 5, hy + n[1] * 5]], true); // the dusk catching its upper edge
  line(l, rgba(GOLD, 0.45), 2);
  circle(b, x0, y0, 11); // the elbow, capped in gold
  ink(b, gilt(b, x0 - 11, y0 - 11, x0 + 11, y0 + 11), 1.6);
  const [cx, cy] = [hx - c * 16, hy - s * 16]; // the armlet at the wrist
  path(b, [[cx + n[0] * 9, cy + n[1] * 9], [cx + c * 7 + n[0] * 8, cy + s * 7 + n[1] * 8], [cx + c * 7 - n[0] * 8, cy + s * 7 - n[1] * 8], [cx - n[0] * 9, cy - n[1] * 9]]);
  ink(b, gilt(b, cx - 9, cy - 9, cx + 9, cy + 9), 1.4);
  circle(b, cx + c * 3.5, cy + s * 3.5, 2.4);
  b.fillStyle = PAL.red;
  b.fill();
  for (const g of [b, l]) {
    g.save();
    g.translate(hx, hy);
    g.rotate(e.f);
  }
  WEAPON[w](b, l);
  circle(b, 0, 0, 8); // the hand, in a gold-backed gauntlet
  ink(b, lin(b, -8, -8, 8, 8, [[0, GOLD_P], [0.5, GOLD], [1, GOLD_D]]), 1.6);
  circle(b, 1, 1, 4.4);
  b.fillStyle = shade(PAL.skin, 0.2);
  b.fill();
  b.restore();
  l.restore();
  glint(l, cx, cy, 2, 0.35);
  glint(l, x0 - 4, y0 - 4, 2.4, 0.35);
}

export function arms(b, l) {
  ELBOWS.forEach((e, i) => forearm(b, l, e, ORDER[i]));
}
