// The Night Editor's front arms and pencils (World 20, Midnight Press; see editor.js), each painted as the left one and mirrored for
// the right. An arm (armour) is a thick ink-violet tentacle coming in from the body at its inner side and curling out and up, a row of
// pale suckers under it; a pencil (weak) is an editor's red pencil, hexagonal, sharpened to a vermilion point aimed down at the ship,
// gripped in the coiled tip of an arm (redPencil, which the hull's back arms hold too). Each draws centred on its part's rect and covers it.
import { path, ink, lin, line, rgba, ellipse, PAL, skin, glow, suckers } from './editor-kit.js';

export const PENCIL_R = 11; // a pencil part's half thickness; the back arms hold pencils half as thick

// The left arm: from its root at the inner (right) edge, out to the left, its tip curled up into a spiral.
export function arm(b, l, p) {
  const [w, h] = [p.w, p.h];
  const [x0, x1] = [w / 2 + 10, -w / 2];
  b.beginPath();
  b.moveTo(x0, -h / 2 + 6);
  b.bezierCurveTo(x0 - w * 0.4, -h / 2, x1 + 30, -h / 2 + 20, x1 + 6, -h * 0.1);
  b.bezierCurveTo(x1 - 6, h * 0.12, x1 + 22, h * 0.24, x1 + 30, h * 0.06); // the curled tip
  b.bezierCurveTo(x1 + 36, -h * 0.06, x1 + 22, -h * 0.1, x1 + 20, h * 0.02);
  b.bezierCurveTo(x1 + 40, h * 0.42, x0 - w * 0.4, h / 2, x0, h / 2 - 4);
  b.closePath();
  ink(b, skin(b, x1, -h / 2, x0, h / 2), 4);
  b.save();
  b.clip();
  for (let i = 0; i < 18; i++) { // its mottling
    ellipse(b, x1 + 30 + ((i * 41) % (w - 30)), -h / 2 + 14 + ((i * 23) % (h - 30)), 5 + (i % 3) * 2, 3 + (i % 2) * 2, i);
    b.fillStyle = rgba(i % 2 ? PAL.skinD : PAL.skinL, 0.35);
    b.fill();
  }
  b.fillStyle = lin(b, 0, 0, 0, h / 2, [[0, rgba(PAL.ink, 0)], [1, rgba(PAL.ink, 0.5)]]);
  b.fillRect(x1, 0, x0 - x1, h / 2);
  b.restore();
  const row = [];
  for (let i = 0; i < 7; i++) row.push([x0 - 14 - i * ((w - 24) / 7), h * 0.32 - Math.sin((i / 7) * Math.PI) * 6]);
  suckers(b, l, row, 11);
  b.beginPath(); // the armour plate's edge: a ridge of thick skin along the top
  b.moveTo(x0 - 8, -h / 2 + 12);
  b.bezierCurveTo(x0 - w * 0.4, -h / 2 + 8, x1 + 36, -h / 2 + 26, x1 + 16, -h * 0.08);
  line(b, PAL.skinL, 3);
  l.beginPath();
  l.moveTo(x0 - 12, -h / 2 + 18);
  l.bezierCurveTo(x0 - w * 0.4, -h / 2 + 14, x1 + 40, -h / 2 + 30, x1 + 22, -h * 0.04);
  line(l, rgba('#ffffff', 0.25), 5);
  glow(l, x1 + 26, h * 0.04, 30, PAL.green, 0.1);
}

// An editor's red pencil along the x axis, len long and r thick, its point at +x, a coil of arm round it.
export function redPencil(b, l, len, r) {
  const [x0, x1, tip, lead] = [-len / 2, len / 2 - r * 2.7, len / 2, r * 0.9];
  const thin = r * 0.33;
  path(b, [[x0, -r], [x1, -r], [x1, r], [x0, r]]); // the barrel
  ink(b, lin(b, 0, -r, 0, r, [[0, PAL.redL], [0.35, PAL.red], [0.65, PAL.redD], [1, PAL.red]]), 2.4);
  for (const y of [-r / 3, r / 3]) { // the facets
    path(b, [[x0, y], [x1, y]], true);
    line(b, rgba(PAL.ink, 0.35), 1.2);
  }
  path(b, [[x1, -r], [tip - lead, -thin], [tip - lead, thin], [x1, r]]); // the sharpened wood
  ink(b, lin(b, x1, -r, x1, r, [[0, PAL.paper], [1, PAL.wood]]), 2);
  path(b, [[tip - lead, -thin], [tip, 0], [tip - lead, thin]]); // the red lead
  ink(b, PAL.red, 1.6);
  ellipse(b, x0, 0, r * 0.36, r); // the blunt end, the lead showing in it
  ink(b, PAL.wood, 1.6);
  ellipse(b, x0, 0, thin * 0.45, thin);
  b.fillStyle = PAL.red;
  b.fill();
  for (const [cx, k] of [[-len * 0.09, 1], [len * 0.07, 0.92]]) { // the coil of the arm's tip round it
    ellipse(b, cx, 0, r * 0.8 * k, r * 1.7);
    ink(b, skin(b, cx - r, -r, cx + r, r), 3);
    ellipse(b, cx + 2, r * 0.6, r * 0.3, r * 0.24);
    ink(b, PAL.paper, 1);
  }
  path(l, [[x0 + 6, -r + 3], [x1 - 4, -r + 3]], true);
  line(l, rgba('#ffffff', 0.4), 2.4);
  glow(l, tip, 0, r * 2.4, PAL.red, 0.45);
}

// The left pencil part: lying from its blunt end at the upper left to its point at the lower right, along its box's diagonal.
export function pencil(b, l, p) {
  const [w, h] = [p.w, p.h];
  for (const g of [b, l]) {
    g.save();
    g.rotate(Math.atan2(h, w));
  }
  redPencil(b, l, Math.hypot(w, h) * 0.92, PENCIL_R);
  b.restore();
  l.restore();
  glow(l, w * 0.3, h * 0.3, 18, PAL.redL, 0.2);
}
