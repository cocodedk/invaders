// The Dowager Duck's belly (World 19, Rubber Regatta; bosses/duck*.js): her round yellow tum, a weak point, swelling out of the body below the
// chin (duck-shape.js BELLY, holding the part's box with the chin over its top). It takes the body's own moulding (the same fill, laid where the body is), so that the two
// read as one piece of rubber, with a paler cream patch on the front of the tum, the shade of its curve along the bottom and a fine crease where it
// rounds under into the foam. From the hover on the live pass lays a plaster over it (duck-sprites.js): she has sprung a leak. The lights are the
// gloss of a swelling: a broad sheen on its upper left and a rim of light round its lower edge, hot enough to shine as a weak point; on the body,
// the bathroom's window reflected in the tum and beads of bathwater (duck-kit.js pane, drop). Part
// coordinates (the belly's centre is the origin).
//   belly(b, l, p)
import { PAL, PART, rubberFill, blob, rad, rgba, path, line, shine, pane, drop } from './duck-kit.js';
import { BELLY, BELLY_OUT, BODY } from './duck-shape.js';

const OUT = BELLY_OUT;
const LOW = OUT.filter(([, y]) => y > 18);

export function belly(b, l) {
  const [dx, dy] = [BODY.x - PART.belly.x, BODY.y - PART.belly.y]; // the body's centre in the belly's frame
  b.save();
  blob(b, OUT);
  b.fillStyle = rubberFill(b, dx, dy, BODY.a, BODY.b, PAL.yellow, { dark: PAL.yellowDD });
  b.fill();
  b.save();
  blob(b, OUT);
  b.clip();
  b.fillStyle = rad(b, -6, -2, 0, 110, [[0, rgba(PAL.cream, 0.62)], [0.55, rgba(PAL.cream, 0.3)], [1, rgba(PAL.cream, 0)]], -30, -18);
  b.fillRect(-BELLY.a, -BELLY.b, BELLY.a * 2, BELLY.b * 2);
  b.fillStyle = rad(b, 0, 70, 0, 120, [[0, rgba(PAL.yellowDD, 0.35)], [1, rgba(PAL.yellowDD, 0)]]);
  b.fillRect(-BELLY.a, -BELLY.b, BELLY.a * 2, BELLY.b * 2);
  b.restore();
  path(b, LOW, true); // the curve of the tum: a shade, then a fine crease
  line(b, rgba(PAL.yellowDD, 0.45), 8);
  path(b, LOW, true);
  line(b, rgba('#7a3a08', 0.75), 3);
  pane(b, -64, -22, 44, 30, 0.62, 0.32); // the window, in the gloss of her tum
  for (const [x, y, r] of [[54, -8, 6], [86, 16, 4], [-26, 30, 4.6], [20, 8, 3]]) drop(b, x, y, r, PAL.yellow);
  b.restore();
  shine(l, -52, -30, 62, 26, 0.7, -0.3);
  shine(l, 70, 30, 30, 14, 0.3, 0.4);
  for (const [x, y] of LOW.filter(([x], i) => i % 6 === 3 && Math.abs(x) < 118)) shine(l, x, y - 4, 16, 5, 0.3);
}
