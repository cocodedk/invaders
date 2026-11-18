// World 20, Midnight Press, the carrier (see w20.js): THE LATE EDITION, a newspaper folded into a sailor's hat and come alive, columns of
// type down its sides and a vermilion headline bar across its brim, paper eyes peering over a bundle of fresh sheets tied with string
// (the prize it carries). Its corners flap on each beat. Lights: the lamp's catch on the fold and the headline glowing.
import { path, ink, lin, rgba, shade, mix, line, both, INKY, PAPER, PAPER_SHADE, SPOT, inked, paperEye, textLines, wet, spot } from './w20-kit.js';

export function carrier(b, l, f, c) {
  const flap = f ? 4 : -2;
  const bundle = [-24, 10, 48, 26]; // the tied bundle under the hat: x, y, w, h
  for (let i = 0; i < 4; i++) { // the sheets of the bundle, fanned
    const [x, y, w, h] = bundle;
    path(b, [[x + i, y + i * 2], [x + w - i, y + i * 2 - 1], [x + w - i + 2, y + h - 6 + i * 2], [x + i - 2, y + h - 6 + i * 2]]);
    ink(b, lin(b, 0, y, 0, y + h, [[0, PAPER], [1, PAPER_SHADE]]), 1.6);
  }
  textLines(b, bundle[0] + 5, bundle[1] + 6, bundle[2] - 10, 3, 5, 3, INKY, 0.5);
  path(b, [[-2, bundle[1]], [-2, bundle[1] + bundle[3]]], true); // the string
  line(b, SPOT, 2);
  path(b, [[bundle[0], bundle[1] + 12], [bundle[0] + bundle[2], bundle[1] + 12]], true);
  line(b, SPOT, 2);
  path(b, [[-8, bundle[1] - 2], [-2, bundle[1] + 3], [4, bundle[1] - 2]], true); // the bow
  line(b, SPOT, 2);
  const hat = [[-44, -4 + flap], [0, -40], [44, -4 - flap], [36, 6], [-36, 6]]; // the folded hat
  path(b, hat);
  ink(b, inked(b, c, -44, -40, 44, 6), 2.8);
  b.save();
  path(b, hat);
  b.clip();
  textLines(b, -32, -14, 26, 3, 4, 7, INKY, 0.4);
  textLines(b, 8, -14, 26, 3, 4, 9, INKY, 0.4);
  path(b, [[0, -40], [-18, 6], [18, 6]]); // the middle fold, in shade
  b.fillStyle = rgba(mix(c, INKY, 0.5), 0.35);
  b.fill();
  b.restore();
  path(b, [[-40, -6], [40, -6], [36, 6], [-36, 6]]); // the brim, folded up, with the headline bar
  ink(b, lin(b, 0, -6, 0, 6, [[0, shade(c, 0.3)], [1, mix(c, INKY, 0.25)]]), 2);
  path(b, [[-30, -3], [30, -3], [28, 3], [-28, 3]]);
  ink(b, SPOT, 1);
  both((s) => paperEye(b, l, s * 12, -20, 5.6, 0, 0.7));
  path(b, [[0, -40], [0, -24]], true);
  line(b, rgba('#ffffff', 0.4), 1.4);
  both((s) => { // the hat's corners, the flap of a page
    path(b, [[s * 44, -4 - s * flap], [s * 47, -10 - s * flap], [s * 40, -8 - s * flap]]);
    ink(b, shade(c, 0.2), 1.4);
  });
  wet(l, -14, -26, 9, 3, -0.7, 0.3);
  spot(l, 0, 0, 3, 0.4 + f * 0.1);
  spot(l, -2, bundle[1] + 12, 1.8, 0.3);
}
