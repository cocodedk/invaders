// The Dowager Duck's foam (World 19, Rubber Regatta; bosses/duck*.js): the ring of suds she floats in, heaped bath foam. The heap is laid in three
// passes so that it reads as one soft mass rather than a string of balls: its outline (every lump stroked before any is filled, so only the outer
// edge stays, in a thin lilac line that keeps its shape on the pale waterline as on the green wall), then the lumps, white lit from the upper left
// and lilac-grey underneath, and last a sprinkle of tiny bubbles, one in three with a rim of soap colours, and pale crowns on the highest lumps. The
// back of the ring (FOAM_BACK, duck-shape.js) is laid on the hull, behind her; the crest in front of her waist is a sprite the live pass lays over the
// parts (duck-sprites.js), so that the feet and the squeaker paddle under it.
//   foam(g, lumps, seed)   lumps [[x, y, r], ...] painted back to front in the order given
import { PAL, rng, rgba, rad, line, circle, TAU } from './duck-kit.js';

const SOAP = ['#ff9ad0', '#9ad8ff', '#ffe36a'];

export function foam(g, lumps, seed) {
  g.save();
  for (const [x, y, r] of lumps) {
    circle(g, x, y, r);
    line(g, rgba(PAL.foamDD, 0.85), 3.4);
  }
  for (const [x, y, r] of lumps) {
    circle(g, x, y, r);
    g.fillStyle = rad(g, x, y, 0, r * 1.05, [[0, '#ffffff'], [0.72, PAL.foam], [1, rgba(PAL.foamD, 0.9)]], x - r * 0.3, y - r * 0.55); // soft edges: the lumps run together
    g.fill();
  }
  const R = rng(seed);
  for (const [x, y, r] of lumps) {
    for (let k = 0; k < 2; k++) {
      const [a, d, s] = [R() * TAU, R() * r * 0.7, 1.4 + R() * 3.2];
      const [bx, by] = [x + Math.cos(a) * d, y + Math.sin(a) * d];
      circle(g, bx, by, s);
      line(g, rgba(R() < 0.34 ? SOAP[k % 3] : PAL.foamDD, 0.55), 1);
      circle(g, bx - s * 0.35, by - s * 0.35, s * 0.3);
      g.fillStyle = '#ffffff';
      g.fill();
    }
    circle(g, x - r * 0.25, y - r * 0.4, r * 0.38); // the lump's crown in the light
    g.fillStyle = rad(g, x - r * 0.25, y - r * 0.4, 0, r * 0.38, [[0, rgba('#ffffff', 0.9)], [1, rgba('#ffffff', 0)]]);
    g.fill();
  }
  g.restore();
}
