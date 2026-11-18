// World 21, Golden Isle, the armored and the carrier (see w21.js). THE GILDED GIANT, a towering warrior of the host in gilded plate,
// a lotus boss on his breast, tusks rising from a deep green mask under a heavy crown, a great ribbed mace he lifts on one beat and
// lets fall on the other; and THE CHARIOT, a small flying chariot of the host, its gilded car hung with woven borders under a stepped
// tower of a canopy, a brass lamp burning inside, spoked wheels turning and pennants streaming. Lights: gold, the lamp, the wheels' rims.
import { path, ink, lin, rgba, shade, mix, line, ellipse, circle, both, bloom, GOLD, GOLD_D, GOLD_P, VERMILION, GREEN, BLACK, gilt, lacquer,
  glint, petals, trim, mask, crown } from './w21-kit.js';

// The great mace, its grip at the origin, rising h to a ribbed head.
function mace(b, l, h) {
  path(b, [[0, 8], [0, -h]], true);
  line(b, BLACK, 5);
  path(b, [[0, 8], [0, -h]], true);
  line(b, GOLD_D, 2.6);
  ellipse(b, 0, -h - 6, 8, 10);
  ink(b, gilt(b, -8, -h - 16, 8, -h + 4), 1.6);
  for (const x of [-4, 0, 4]) {
    path(b, [[x, -h - 15], [x * 1.2, -h + 3]], true);
    line(b, GOLD_D, 1.2);
  }
  path(b, [[-3, -h - 15], [0, -h - 21], [3, -h - 15]]);
  ink(b, GOLD, 1);
  glint(l, -3, -h - 10, 2.6, 0.55);
}

export function armored(b, l, f, c) {
  const up = f === 0;
  both((s) => { // pillar legs in gilded greaves
    path(b, [[s * 6, 24], [s * 18, 24], [s * 19, 44], [s * 5, 44]]);
    ink(b, lacquer(b, c, s * 5, 24, s * 19, 44), 1.8);
    trim(b, s > 0 ? 6 : -18, s > 0 ? 18 : -6, 36, 3.4, GREEN);
  });
  path(b, [[-26, 18], [26, 18], [22, 30], [-22, 30]]); // the kilt of plates
  ink(b, lacquer(b, VERMILION, -26, 18, 26, 30), 1.8);
  trim(b, -24, 24, 27, 4);
  both((s) => { // huge arms, the left braced on the hip, the right on the mace
    path(b, [[s * 22, -10], [s * 36, 0], [s * 34, s > 0 ? (up ? -6 : 10) : 18], [s * 26, s > 0 ? (up ? -4 : 12) : 16], [s * 24, 4]]);
    ink(b, lacquer(b, mix(c, BLACK, 0.3), s * 22, -10, s * 36, 18), 1.8);
    ellipse(b, s * 30, -6, 9, 7);
    ink(b, gilt(b, s * 22, -14, s * 38, 0), 1.6);
  });
  path(b, [[-24, -14], [24, -14], [26, 6], [18, 20], [-18, 20], [-26, 6]]); // the gilded breastplate
  ink(b, gilt(b, -24, -14, 24, 20), 2.2);
  path(b, [[0, -12], [0, 18]], true);
  line(b, rgba(GOLD_D, 0.8), 1.2);
  petals(b, 0, 3, 11, 8, VERMILION, 0, Math.PI * 2, 0.8); // the lotus boss
  circle(b, 0, 3, 4.4);
  ink(b, gilt(b, -4, -1, 4, 7), 1);
  trim(b, -24, 24, -12, 4.4, GREEN);
  b.save();
  l.save();
  for (const g of [b, l]) g.translate(32, up ? 0 : 10);
  mace(b, l, up ? 22 : 16);
  b.restore();
  l.restore();
  mask(b, l, 0, -20, 0.54, GREEN, { tiers: 2, crownH: 28, mood: up ? 1 : 0 });
  both((s) => { // the tusks rising from the jaw
    path(b, [[s * 4, -15], [s * 6.5, -16], [s * 8.5, -23]]);
    ink(b, '#fff6e0', 0.8);
  });
  glint(l, -14, -8, 3, 0.45);
  glint(l, 14, 14, 2.2, 0.35);
}

// A spoked wheel at (x, y), r across, its spokes turned by a.
function wheel(b, l, x, y, r, a) {
  ellipse(b, x, y, r * 0.55, r);
  ink(b, gilt(b, x - r, y - r, x + r, y + r), 1.8);
  ellipse(b, x, y, r * 0.38, r * 0.72);
  b.fillStyle = mix(VERMILION, BLACK, 0.4);
  b.fill();
  for (let i = 0; i < 6; i++) {
    const k = a + (i * Math.PI) / 6;
    path(b, [[x, y], [x + Math.cos(k) * r * 0.38, y + Math.sin(k) * r * 0.72]], true);
    line(b, GOLD, 1.2);
  }
  circle(b, x, y, 2);
  ink(b, GOLD_P, 0.6);
  glint(l, x - r * 0.3, y - r * 0.6, 1.8, 0.4);
}

export function carrier(b, l, f, c) {
  const flap = f ? 4 : -3;
  for (const [x, w] of [[-14, 9], [0, 12], [14, 9]]) bloom(l, x, 34, w, VERMILION, 0.35); // it flies on fire under the car
  both((s) => { // the pennants streaming from the canopy
    path(b, [[s * 18, -22], [s * 38, -26 + flap], [s * 30, -20], [s * 40, -14 - flap], [s * 18, -16]]);
    ink(b, lacquer(b, s > 0 ? VERMILION : GREEN, s * 18, -26, s * 40, -14), 1.2);
  });
  both((s) => { // the canopy's slim pillars
    path(b, [[s * 16, -14], [s * 16, 6]], true);
    line(b, BLACK, 3.4);
    path(b, [[s * 16, -14], [s * 16, 6]], true);
    line(b, GOLD, 1.6);
  });
  path(b, [[-4, 6], [4, 6], [2, 2], [-2, 2]]); // the brass oil lamp burning inside: its foot, its bowl and spout, its flame
  ink(b, GOLD_D, 1);
  b.beginPath();
  b.moveTo(-9, -2);
  b.quadraticCurveTo(-6, 4, 2, 3);
  b.lineTo(10, -1);
  b.lineTo(4, -3);
  b.closePath();
  ink(b, lin(b, -9, -3, 9, 4, [[0, GOLD_P], [1, GOLD_D]]), 1.2);
  b.beginPath();
  b.moveTo(8, -2);
  b.quadraticCurveTo(11, -8, 8, -13);
  b.quadraticCurveTo(6, -7, 8, -2);
  ink(b, '#ffd27a', 0.8);
  bloom(l, 8, -7, 14, '#ffb347', 0.55 + f * 0.1);
  glint(l, 8, -9, 2.2, 0.7);
  path(b, [[-22, -14], [22, -14], [18, -18], [-18, -18]]); // the canopy's eaves
  ink(b, gilt(b, -22, -18, 22, -14), 1.4);
  crown(b, l, 0, -15, 44, 24, 3); // the stepped tower of the canopy
  path(b, [[-30, 4], [30, 4], [26, 22], [-26, 22]]); // the car
  ink(b, lacquer(b, c, -30, 4, 30, 22), 2.2);
  trim(b, -29, 29, 8, 5);
  petals(b, 0, 22, 9, 9, GOLD, 0, Math.PI, 0.8);
  for (const x of [-18, -6, 6, 18]) {
    circle(b, x, 15, 2.4);
    ink(b, gilt(b, x - 2, 13, x + 2, 17), 0.8);
  }
  wheel(b, l, -30, 20, 13, f ? 0.5 : 0);
  wheel(b, l, 30, 20, 13, f ? 0.5 : 0);
  glint(l, -20, 6, 2.2, 0.4);
  glint(l, 20, 6, 2.2, 0.4);
  path(b, [[-28, 5], [28, 5]], true);
  line(b, rgba('#ffffff', 0.35), 1);
}
