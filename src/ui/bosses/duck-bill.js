// The Dowager Duck's bill (World 19, Rubber Regatta; bosses/duck*.js): the huge orange bill in the middle of her face, seen end on, a weak point.
// A broad rounded paddle (duck-shape.js BILL, holding the part's box) of glossy orange rubber: the upper mandible's top lit pale where it turns
// toward the light, two nostrils on it, and the mouth's line right across from corner to corner, turned down at the ends in a pout; under it the
// lower mandible, a shade deeper, tucked back. She quacks at the ship from it. The lights are the rubber's gloss, hottest on the upper mandible: it
// is a weak point and shines out. Part coordinates (the bill's centre is the origin); its top stays under TOP.
//   bill(b, l, p)   lipY(x) the mouth's line
import { PAL, rubber, rubberFill, shine, glint, drop, blob, inked, path, line, ellipse, rgba } from './duck-kit.js';
import { BILL, supPts } from './duck-shape.js';

const OUT = supPts(BILL);
export const lipY = (x) => 12 + 18 * (x / BILL.a) ** 4 - 4 * (1 - (x / BILL.a) ** 2); // a gentle bow across, its corners pulled down
const XS = Array.from({ length: 43 }, (_, i) => -BILL.a - 2 + i * ((BILL.a + 2) / 21));

export function bill(b, l) {
  b.save();
  rubber(b, OUT, PAL.orange, { lw: 0, dark: PAL.orangeD, light: PAL.orangeL, ly: -0.8 });
  b.save();
  blob(b, OUT);
  b.clip();
  path(b, [...XS.map((x) => [x, lipY(x)]), [BILL.a + 4, BILL.b + 4], [-BILL.a - 4, BILL.b + 4]]); // the lower mandible, a shade deeper
  b.fillStyle = rubberFill(b, 0, 46, BILL.a, 22, PAL.orangeD, { ly: -1, light: PAL.orange, dark: '#8a3008' });
  b.fill();
  ellipse(b, 0, -BILL.b + 10, BILL.a * 0.8, 22); // the top of the upper mandible, turned to the light
  b.fillStyle = rubberFill(b, 0, -BILL.b + 10, BILL.a * 0.8, 22, PAL.orangeL, { light: '#ffe2c0', dark: PAL.orange, ly: -0.2 });
  b.fill();
  path(b, XS.map((x) => [x, lipY(x) + 5]), true); // the shade under the upper mandible's lip
  line(b, rgba('#5a1a04', 0.35), 7);
  b.restore();
  for (const s of [-1, 1]) {
    ellipse(b, s * 22, -30, 7, 4, s * 0.3);
    b.fillStyle = PAL.orangeD;
    b.fill();
    ellipse(b, s * 22, -31, 4, 1.8, s * 0.3);
    b.fillStyle = PAL.mouth;
    b.fill();
  }
  path(b, XS.map((x) => [x, lipY(x)]), true);
  line(b, PAL.pupil, 4.4);
  blob(b, OUT);
  inked(b, 4.5);
  glint(b, -46, -32, 18, 5.5, 0.85, -0.12);
  drop(b, 60, -16, 4, PAL.orange);
  b.restore();
  shine(l, -40, -30, 46, 14, 0.82, -0.1);
  shine(l, 44, -34, 20, 7, 0.4, 0.15);
  shine(l, -36, 34, 28, 6, 0.3);
  shine(l, 46, 30, 12, 4, 0.22);
}
