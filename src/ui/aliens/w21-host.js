// World 21, Golden Isle, the grunt and the gunner (see w21.js). THE MASKED SOLDIER, a foot soldier of the host in a deep green mask
// under a tiered gold crown, flared gold wings at his shoulders, a vermilion tunic with a woven border and a spear he lifts on each beat;
// and THE DEMON ARCHER, fanged, in black and vermilion, a curved bow held level below him with an arrow nocked at the ship, drawn on
// one beat and loosed on the other. Lights: the eyes burning, the gold catching the dusk, the arrow's point.
import { path, ink, lin, rgba, shade, mix, line, ellipse, circle, both, GOLD, GOLD_D, GOLD_P, VERMILION, GREEN, BLACK, gilt, lacquer, glint,
  petals, trim, mask } from './w21-kit.js';

// Flared shoulder wings, curling up like a dancer's, at (±x, y), r long.
function wings(b, l, x, y, r) {
  both((s) => {
    b.beginPath();
    b.moveTo(s * (x - r * 0.4), y + r * 0.3);
    b.quadraticCurveTo(s * (x + r * 0.2), y - r * 0.3, s * (x + r), y - r * 0.55);
    b.quadraticCurveTo(s * (x + r * 0.8), y + r * 0.1, s * (x + r * 0.55), y + r * 0.55);
    b.closePath();
    ink(b, gilt(b, s * x, y - r, s * (x + r), y + r), 1.6);
    petals(b, s * x, y + r * 0.35, r * 0.5, 3, VERMILION, s > 0 ? -0.2 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.2, 0.8);
    glint(l, s * (x + r * 0.7), y - r * 0.4, 2.2, 0.4);
  });
}

// A tunic from the shoulders at y0 to a flared hem at y1, w wide at the hem, in c, a woven border at the hem and a gold collar.
function tunic(b, l, y0, y1, w, c) {
  path(b, [[-12, y0], [12, y0], [w / 2, y1], [-w / 2, y1]]);
  ink(b, lacquer(b, c, -w / 2, y0, w / 2, y1), 2);
  trim(b, -w / 2 + 2, w / 2 - 2, y1 - 3, 5);
  petals(b, 0, y0 - 1, 9, 7, GOLD, 0.15, Math.PI - 0.15, 0.8); // the collar, petals hanging on the chest
  trim(b, -11, 11, (y0 + y1) / 2 + 2, 3.4, GREEN); // the sash
  glint(l, -6, y0 + 4, 2, 0.3);
}

// The legs: two black-clad legs with gold anklets, standing apart by stance.
function legs(b, y0, y1, stance) {
  both((s) => {
    const x = s * (6 + stance);
    path(b, [[x - 3.5, y0], [x + 3.5, y0], [x + 3 + s * stance, y1], [x - 3 + s * stance, y1]]);
    ink(b, BLACK, 1.4);
    ellipse(b, x + s * stance, y1 - 3, 4.2, 1.8);
    ink(b, GOLD, 0.8);
  });
}

export function grunt(b, l, f, c) {
  legs(b, 28, 44, f ? 2 : 0);
  wings(b, l, 12, 2, 14);
  tunic(b, l, 0, 31, 36, VERMILION);
  b.save(); // the spear, upright on beat 0, lowered at the ship on beat 1
  b.translate(22, 16);
  b.rotate(f ? 0.3 : 0);
  l.save();
  l.translate(22, 16);
  l.rotate(f ? 0.3 : 0);
  path(b, [[0, 28], [0, -50]], true);
  line(b, BLACK, 3.6);
  path(b, [[0, 28], [0, -50]], true);
  line(b, GOLD_D, 1.8);
  path(b, [[0, -62], [3.6, -51], [0, -46], [-3.6, -51]]);
  ink(b, lin(b, -4, 0, 4, 0, [[0, '#d8d0c0'], [0.5, '#fffaf0'], [1, '#7a7060']]), 1.2);
  path(b, [[-4, -46], [4, -46]], true);
  line(b, VERMILION, 2.4);
  glint(l, 0, -58, 2.4, 0.5);
  b.restore();
  l.restore();
  path(b, [[12, 8], [20, 14], [22, 20]], true); // the arm gripping it
  line(b, BLACK, 4.4);
  circle(b, 22, 18, 3.2);
  ink(b, lacquer(b, c, 18, 14, 26, 22), 1);
  mask(b, l, 0, -12, 0.62, GREEN, { tiers: 3, crownH: 34, look: f ? 0.6 : -0.3 });
}

// The recurved bow held level below the archer, its grip at (0, gy), its string at sy (drawn back or loosed).
function bow(b, l, gy, sy, drawn) {
  const tip = [36, gy - 14];
  b.beginPath();
  b.moveTo(-tip[0] - 3, tip[1] + 4);
  b.quadraticCurveTo(-tip[0] + 2, tip[1] - 2, -tip[0] + 8, tip[1] + 1);
  b.quadraticCurveTo(-18, gy + 6, 0, gy);
  b.quadraticCurveTo(18, gy + 6, tip[0] - 8, tip[1] + 1);
  b.quadraticCurveTo(tip[0] - 2, tip[1] - 2, tip[0] + 3, tip[1] + 4);
  line(b, BLACK, 5);
  b.stroke();
  line(b, GOLD, 2.4);
  path(b, [[-tip[0] + 6, tip[1] + 1], [0, sy], [tip[0] - 6, tip[1] + 1]], true);
  line(b, rgba(GOLD_P, 0.9), 1);
  path(b, [[0, sy - 2], [0, gy + 14]], true); // the arrow
  line(b, BLACK, 2.6);
  path(b, [[0, sy - 2], [0, gy + 14]], true);
  line(b, '#c89a50', 1.2);
  path(b, [[0, gy + 22], [3.4, gy + 13], [-3.4, gy + 13]]);
  ink(b, '#efe6d0', 1);
  both((s) => { path(b, [[0, sy], [s * 3.4, sy - 5], [s * 1, sy + 2]]); ink(b, VERMILION, 0.6); }); // fletching
  circle(b, 0, gy, 3.4);
  ink(b, GOLD_D, 1);
  glint(l, 0, gy + 17, 2, drawn ? 0.75 : 0.45);
  glint(l, -tip[0] + 6, tip[1], 1.8, 0.35);
}

export function gunner(b, l, f, c) {
  const drawn = f === 0;
  wings(b, l, 10, -4, 12);
  path(b, [[-12, -8], [12, -8], [16, 22], [-16, 22]]); // the black and vermilion breast
  ink(b, lacquer(b, mix(c, BLACK, 0.45), -16, -8, 16, 22), 2);
  path(b, [[-6, -8], [6, -8], [8, 22], [-8, 22]]);
  b.fillStyle = lacquer(b, c, -8, -8, 8, 22);
  b.fill();
  trim(b, -15, 15, 18, 4.4);
  petals(b, 0, -9, 8, 6, GOLD, 0.2, Math.PI - 0.2, 0.7);
  bow(b, l, 24, drawn ? 4 : 14, drawn);
  both((s) => { // the arms: one holds the bow out, one draws the string
    const hand = s < 0 ? [-2, 22] : [2, drawn ? 4 : 14];
    path(b, [[s * 12, -2], [s * 18, 12], hand], true);
    line(b, BLACK, 4.6);
    path(b, [[s * 12, -2], [s * 18, 12], hand], true);
    line(b, shade(c, -0.2), 2.4);
    circle(b, s * 17, 10, 2.6);
    ink(b, GOLD, 0.8);
  });
  mask(b, l, 0, -22, 0.54, mix(GREEN, BLACK, 0.25), { tiers: 2, crownH: 26, mood: drawn ? 1 : 0, look: 0 });
  glint(l, -8, 4, 1.8, 0.3);
}
