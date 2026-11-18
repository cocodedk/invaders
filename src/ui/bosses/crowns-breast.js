// The Ten-Crowned King's breastplate and heart (World 21, Golden Isle; see crowns.js). The breastplate is gilded cuirass, two domed
// pectorals ringed with lotus petals, a woven border at its neck, scales of gold down to its hem; it is armour, and once every head is down
// it splits open, its fissures burning crimson (cracks.js). The heart lies behind its left dome: while the plate holds, a gold lotus
// medallion there with a crimson glow seeping round its rim; when the last phase opens it, the medallion is torn away and the heart
// glows through the broken gold. Lights: the gold, and the heart's fire.
import { path, ink, lin, rad, line, rgba, shade, mix, ellipse, circle, both, GOLD, GOLD_D, GOLD_P, GREEN, BLACK, gilt, glint, petals, trim,
  PAL, PART, glow } from './crowns-kit.js';

const PLATE = [[-96, -62], [96, -62], [100, -20], [82, 34], [42, 60], [0, 66], [-42, 60], [-82, 34], [-100, -20]];
const DOME = { x: PART.heart.x - PART.breast.x, y: PART.heart.y - PART.breast.y, r: 34 }; // the domes sit where the heart is, mirrored

export function breast(b, l) {
  path(b, PLATE);
  ink(b, gilt(b, -100, -62, 100, 66), 3.4);
  b.save();
  path(b, PLATE);
  b.clip();
  for (let row = 0; row < 3; row++) { // the scales of gold toward the hem
    for (let x = -100 + (row % 2) * 9; x < 100; x += 18) {
      b.beginPath();
      b.arc(x, 30 + row * 12, 9, 0, Math.PI);
      line(b, rgba(GOLD_D, 0.9), 1.4);
    }
  }
  b.restore();
  both((s) => {
    const x = s * Math.abs(DOME.x);
    ellipse(b, x, DOME.y, DOME.r, DOME.r * 0.86);
    ink(b, rad(b, x - 10, DOME.y - 12, 2, DOME.r, [[0, GOLD_P], [0.5, GOLD], [1, GOLD_D]]), 2);
    petals(b, x, DOME.y, DOME.r + 6, 12, GOLD, 0, Math.PI * 2, 0.8);
    ellipse(b, x, DOME.y, DOME.r * 0.7, DOME.r * 0.6);
    ink(b, rad(b, x - 6, DOME.y - 8, 2, DOME.r, [[0, GOLD_P], [0.6, GOLD], [1, GOLD_D]]), 1.4);
    glint(l, x - 12, DOME.y - 12, 5, 0.55);
  });
  path(b, [[0, -56], [0, 60]], true); // the ridge down the middle
  line(b, GOLD_D, 3);
  trim(b, -94, 94, -55, 12, GREEN);
  glint(l, 60, 40, 3.4, 0.35);
  glint(l, -20, -40, 3, 0.35);
}

// The heart while the plate holds: a gold lotus medallion, a crimson glow seeping round its rim.
export function heart(b, l) {
  petals(b, 0, 0, 36, 10, GOLD, 0, Math.PI * 2, 1);
  circle(b, 0, 0, 22);
  ink(b, rad(b, -6, -6, 2, 24, [[0, GOLD_P], [0.5, GOLD], [1, GOLD_D]]), 2);
  circle(b, 0, 0, 10);
  ink(b, rad(b, -2, -2, 1, 10, [[0, PAL.redL], [1, mix(PAL.red, BLACK, 0.4)]]), 1.4);
  glow(l, 0, 0, 34, PAL.red, 0.22);
  glint(l, -8, -10, 3.4, 0.5);
}

// The heart laid bare: the medallion torn away, smooth broken gold round a hole, and in it the heart, a molten ember-red gem burning
// slowly from within, cracks running out from it into the plate.
export function heartOpen(b, l) {
  const rim = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    rim.push([Math.cos(a) * (30 + (i % 3) * 2.5), Math.sin(a) * (30 + (i % 3) * 2.5)]);
  }
  path(b, rim);
  ink(b, gilt(b, -34, -34, 34, 34), 2.4);
  circle(b, 0, 0, 24);
  b.fillStyle = '#1a0608';
  b.fill();
  const gem = Array.from({ length: 8 }, (_, i) => [Math.cos((i + 0.5) * Math.PI / 4) * 19, Math.sin((i + 0.5) * Math.PI / 4) * 19]);
  path(b, gem); // the gem, cut in facets
  ink(b, rad(b, -4, -5, 1, 22, [[0, '#ffd2a0'], [0.3, PAL.ember], [0.65, PAL.red], [1, mix(PAL.red, BLACK, 0.55)]]), 1.6);
  const table = gem.map(([x, y]) => [x * 0.5 - 1.5, y * 0.5 - 2]);
  path(b, table);
  ink(b, rad(b, -3, -4, 1, 11, [[0, '#ffe6c8'], [0.6, PAL.redL], [1, PAL.red]]), 1);
  gem.forEach(([x, y], i) => { // the facets from the table to the girdle
    path(b, [table[i], [x, y]], true);
    line(b, rgba(mix(PAL.red, BLACK, 0.5), 0.7), 1);
  });
  for (const [a, r] of [[0.4, 34], [2.2, 36], [3.6, 34], [5.0, 36]]) { // cracks running out into the plate
    const crack = [[Math.cos(a) * 30, Math.sin(a) * 30], [Math.cos(a + 0.1) * r, Math.sin(a + 0.1) * r], [Math.cos(a - 0.05) * (r + 8), Math.sin(a - 0.05) * (r + 8)]];
    path(b, crack, true);
    line(b, BLACK, 2.4);
    path(l, crack.slice(0, 2), true);
    line(l, rgba(PAL.redL, 0.7), 1.4);
  }
  glow(l, 0, 0, 60, PAL.red, 0.45);
  glow(l, -2, -3, 16, PAL.ember, 0.6);
  glint(l, -6, -7, 3.4, 0.6);
}
