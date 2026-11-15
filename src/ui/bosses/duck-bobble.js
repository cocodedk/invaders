// The Dowager Duck's bobble (World 19, Rubber Regatta; bosses/duck*.js): the fluffy pompom on the front of her shower cap, its armour. A ball
// of rose wool (duck-shape.js BOBBLE, holding the part's box) ringed with tufts that stand out of it, their outline drawn before any is
// filled so that only the outer edge stays, and combed through with short strands, pale where the light falls from the upper left. It is the
// only art of hers that may slip under the HUD, at the top of her orbit. The lights are a soft sheen on the wool, kept low: it is armour.
// Part coordinates (the bobble's centre is the origin).
//   bobble(b, l, p)
import { PAL, rng, rubberFill, shine, rgba, line, circle, TAU } from './duck-kit.js';
import { BOBBLE, supPts } from './duck-shape.js';

const BALL = supPts(BOBBLE, 30);
const TUFTS = BALL.map(([x, y], i) => [x * 1.02, y * 1.04, 10 + 4 * ((i * 7) % 5) / 4]);

export function bobble(b, l) {
  b.save();
  for (const [x, y, r] of TUFTS) {
    circle(b, x, y, r);
    line(b, '#4a1530', 7);
  }
  const fill = rubberFill(b, 0, 0, BOBBLE.a + 8, BOBBLE.b + 8, PAL.roseL, { dark: PAL.roseD, light: PAL.cream, lx: -0.45, ly: -0.6 });
  for (const [x, y, r] of TUFTS) {
    circle(b, x, y, r);
    b.fillStyle = fill;
    b.fill();
  }
  b.beginPath();
  BALL.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y)));
  b.closePath();
  b.fillStyle = fill;
  b.fill();
  const R = rng(23);
  for (let k = 0; k < 90; k++) { // strands combed out from the middle
    const [a, d] = [R() * TAU, Math.sqrt(R())];
    const [x, y] = [Math.cos(a) * BOBBLE.a * d * 0.95, Math.sin(a) * BOBBLE.b * d * 0.95];
    const lit = x + y * 1.4 < -10;
    b.beginPath();
    b.moveTo(x, y);
    b.quadraticCurveTo(x + Math.cos(a + 0.6) * 6, y + Math.sin(a + 0.6) * 6, x + Math.cos(a) * 10, y + Math.sin(a) * 9);
    line(b, lit ? rgba('#ffffff', 0.55) : rgba(PAL.roseD, 0.45), 2);
  }
  b.restore();
  shine(l, -20, -18, 34, 18, 0.34, -0.3);
  shine(l, 24, 12, 14, 8, 0.14);
}
