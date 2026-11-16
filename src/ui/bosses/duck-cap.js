// The Dowager Duck's shower cap (World 19, Rubber Regatta; bosses/duck*.js, laid by duck-hull.js): a baggy rose dome, wider than her head and
// puffed out at the sides, sprinkled with cream polka dots, gathered into folds that run down from the crown, and edged with a frilly ruffle in
// two tiers on an elastic band across her brow and down over her ears to the armbands. Its crown is held under TOP (duck-shape.js CAP); the
// bobble, a part, sits in front of it. The lights are a broad sheen on the dome's upper left (the cap is plastic) and the ruffle's catch-light.
//   cap(b, l)   on the hull's body and lights layers, boss coordinates
import { PAL, rng, rubber, shine, blob, inked, rgba, line, path, ellipse } from './duck-kit.js';
import { CAP, FRILL, capTop, frillY } from './duck-shape.js';

// The dots: a jittered lattice inside the cap, each squashed a little where the dome turns away (near the crown and the sides).
function dots(b) {
  const R = rng(19);
  for (let y = -166; y < -70; y += 24) {
    for (let x = -250; x <= 250; x += 34) {
      const [px, py] = [x + (((y + 166) / 24) % 2) * 17 + (R() - 0.5) * 8, y + (R() - 0.5) * 6];
      if (py < capTop(px) + 5 || py > frillY(px) - 4) continue;
      const turn = Math.min(1, Math.abs(px) / 240);
      ellipse(b, px, py, 9 * (1 - 0.35 * turn), 7.4, 0);
      b.fillStyle = PAL.cream;
      b.fill();
    }
  }
}

// Gathers: soft folds from the crown fanning down to the ruffle.
function folds(b) {
  for (let i = -4; i <= 4; i++) {
    if (!i) continue;
    const x1 = i * 52;
    path(b, [[i * 12, -174], [i * 34, (capTop(i * 34) + frillY(i * 34)) / 2], [x1, frillY(x1) - 2]], true);
    line(b, rgba(PAL.roseD, 0.45), 3.4);
    path(b, [[i * 12 + 4, -174], [i * 34 + 4, (capTop(i * 34) + frillY(i * 34)) / 2], [x1 + 4, frillY(x1) - 4]], true);
    line(b, rgba(PAL.roseL, 0.5), 2);
  }
}

// One tier of the ruffle: a scallop hanging from each stretch of the band, dy below it, rx x ry, with a pleat line down it (and, lace, a hole).
function tier(b, dy, rx, ry, fill, lace) {
  for (let i = 0; i < FRILL.length - 1; i++) {
    const [[x0, y0], [x1, y1]] = [FRILL[i], FRILL[i + 1]];
    const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2 + dy];
    b.beginPath();
    b.ellipse(cx, cy, rx, ry, Math.atan2(y1 - y0, x1 - x0), 0, Math.PI);
    b.closePath();
    b.fillStyle = fill(i);
    b.fill();
    line(b, PAL.roseD, 1.8);
    path(b, [[cx, cy + 1], [cx, cy + ry * 0.7]], true);
    line(b, rgba(PAL.roseD, 0.4), 1.3);
    if (lace) {
      ellipse(b, cx, cy + ry * 0.78, 1.8, 1.8);
      b.fillStyle = rgba(PAL.roseD, 0.55);
      b.fill();
    }
  }
}

// The ruffle: two tiers hanging from the band, deep cream lace behind and a shorter rose frill in front, and the band's rose edge over them.
function ruffle(b, l) {
  const n = FRILL.length;
  tier(b, 5, 12, 19, (i) => (i % 2 ? PAL.cream : PAL.creamD), true);
  tier(b, 1, 11, 11, (i) => (i % 2 ? PAL.roseL : PAL.rose), false);
  path(b, FRILL, true);
  line(b, PAL.roseD, 6);
  path(b, FRILL, true);
  line(b, PAL.roseL, 2.2);
  for (let i = 2; i < n - 2; i += 4) shine(l, FRILL[i][0], FRILL[i][1] + 5, 6, 3, 0.5);
}

export function cap(b, l) {
  b.save();
  rubber(b, CAP, PAL.rose, { lw: 0, dark: PAL.roseD, light: PAL.roseL });
  b.save();
  blob(b, CAP);
  b.clip();
  dots(b);
  folds(b);
  path(b, FRILL.map(([x, y]) => [x, y - 8]), true); // the dome turning under, in shade, above the band
  line(b, rgba(PAL.roseD, 0.32), 16);
  b.restore();
  blob(b, CAP);
  inked(b, 4.5);
  ruffle(b, l);
  b.restore();
  shine(l, -120, -150, 70, 14, 0.5, -0.12);
  shine(l, 150, -138, 30, 8, 0.32, 0.3);
}
