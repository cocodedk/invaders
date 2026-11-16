// The Dowager Duck's armbands (World 19, Rubber Regatta; bosses/duck*.js): a striped inflatable armband round each stubby wing, her side armour,
// painted as the left one and mirrored for the right. Seen from the front, the band is a fat swollen cylinder lying along the wing (duck-shape.js
// BAND, holding the part's box): stripes of coral and cream run round it, a welded seam parts its two chambers, the shade of the curve lies along
// its bottom and its open ends show as darker rims, the inner one against her body and the outer one where the wing's tip comes out. A valve with
// its stopper stands on the front. The lights are the vinyl's long gloss along the top, kept low: it is armour. The ducklings come out from under
// them (the core). Part coordinates (the band's centre is the origin).
//   band(b, l, p)
import { PAL, blob, inked, shine, glint, drop, lin, rgba, line, path, ellipse, rubber } from './duck-kit.js';
import { BAND, supPts } from './duck-shape.js';

const OUT = supPts(BAND);
const STRIPES = 6;

export function band(b, l) {
  const { a, b: h } = BAND;
  b.save();
  b.save();
  blob(b, OUT);
  b.clip();
  for (let i = 0; i < STRIPES; i++) {
    const x0 = -a + (2 * a * i) / STRIPES;
    b.fillStyle = i % 2 ? PAL.cream : PAL.coral;
    b.fillRect(x0, -h, (2 * a) / STRIPES + 0.5, 2 * h);
  }
  b.fillStyle = lin(b, 0, -h, 0, h, [[0, rgba('#ffffff', 0.4)], [0.22, rgba('#ffffff', 0.08)], [0.5, rgba('#000000', 0)], [0.8, rgba('#7a1020', 0.22)], [1, rgba('#4a0a18', 0.5)]]);
  b.fillRect(-a, -h, 2 * a, 2 * h);
  for (const s of [-1, 1]) { // the open ends, rims turned toward her body and toward the wing tip
    ellipse(b, s * (a - 6), 0, 14, h - 4);
    b.fillStyle = rgba(PAL.coralD, 0.55);
    b.fill();
    ellipse(b, s * (a - 6), 0, 14, h - 4);
    line(b, rgba('#4a0a18', 0.5), 2.4);
  }
  path(b, [[0, -h], [0, h]], true); // the weld between the chambers
  line(b, rgba('#4a0a18', 0.55), 4);
  path(b, [[3, -h], [3, h]], true);
  line(b, rgba('#ffffff', 0.4), 1.6);
  b.restore();
  blob(b, OUT);
  inked(b, 4.5);
  b.save();
  b.translate(-40, -h + 18); // the valve and its stopper
  rubber(b, [[-8, 10], [-8, -6], [8, -6], [8, 10]], PAL.cream, { lw: 2.6 });
  ellipse(b, 0, -7, 11, 5);
  b.fillStyle = PAL.coral;
  b.fill();
  inked(b, 2.6);
  b.restore();
  glint(b, -20, -h + 16, 46, 6, 0.75, 0);
  glint(b, 58, -h + 20, 12, 4, 0.6, 0);
  drop(b, 34, 10, 4.6, PAL.coral);
  drop(b, -62, 26, 3, PAL.cream);
  b.restore();
  shine(l, -10, -h + 20, 76, 12, 0.5);
  shine(l, 50, h - 18, 30, 6, 0.14);
}
