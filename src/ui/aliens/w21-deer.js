// World 21, Golden Isle, the diver (see w21.js): THE GOLDEN DEER, a shimmering deer of illusion leaping down at the ship, its coat of
// gold leaf set with pale silver spots, branched antlers tipped with light and a trail of sparks where the illusion frays. Its legs reach
// out on one beat and tuck under it on the other. Lights: the shimmer over the coat, the antler tips and the sparks of its trail.
import { path, ink, lin, rgba, shade, line, ellipse, circle, both, bloom, GOLD, GOLD_D, GOLD_P, BLACK, gilt, glint } from './w21-kit.js';

const SILVER = '#f2efe6';

// A slender leg from (x, y) by the two joints, a black hoof at its end.
function leg(b, x, y, k, fx, fy, hx, hy) {
  b.beginPath();
  b.moveTo(x - k, y);
  b.quadraticCurveTo(fx - 1, fy, hx - 1, hy);
  b.lineTo(hx + 1.6, hy);
  b.quadraticCurveTo(fx + 2, fy, x + k, y);
  b.closePath();
  ink(b, gilt(b, x, y, hx, hy), 1.2);
  ellipse(b, hx + 0.3, hy + 1, 2, 1.6);
  b.fillStyle = BLACK;
  b.fill();
}

// A branched antler from (x, y), leaning by s.
function antler(b, l, x, y, s) {
  const tips = [[x + s * 10, y - 22], [x + s * 2, y - 26], [x + s * 15, y - 14], [x + s * 6, y - 18]];
  path(b, [[x, y], [x + s * 5, y - 12], tips[1]], true);
  line(b, BLACK, 3.6);
  path(b, [[x + s * 3, y - 6], tips[2]], true);
  path(b, [[x + s * 5, y - 12], tips[0]], true);
  b.stroke();
  for (const [w, c] of [[1.8, GOLD]]) {
    path(b, [[x, y], [x + s * 5, y - 12], tips[1]], true);
    line(b, c, w);
    path(b, [[x + s * 3, y - 6], tips[2]], true);
    b.stroke();
    path(b, [[x + s * 5, y - 12], tips[0]], true);
    b.stroke();
  }
  for (const [tx, ty] of tips.slice(0, 3)) glint(l, tx, ty, 2, 0.45);
}

export function diver(b, l, f, c) {
  const out = f === 0; // legs flung out in the leap, or tucked under
  for (let i = 0; i < 5; i++) bloom(l, 26 + i * 4, -18 - i * 4, 5 - i * 0.6, GOLD, 0.35 - i * 0.05); // the illusion fraying behind it
  leg(b, 10, 8, 3, out ? 22 : 14, out ? 18 : 20, out ? 34 : 18, out ? 22 : 30); // the far hind leg
  leg(b, -10, 8, 3, out ? -22 : -10, out ? 26 : 18, out ? -28 : -2, out ? 38 : 26); // the far fore leg
  b.beginPath(); // the body, arched in the leap, head low toward the ship
  b.moveTo(20, -6);
  b.bezierCurveTo(10, -14, -10, -10, -16, -4);
  b.bezierCurveTo(-22, 2, -18, 14, -6, 14);
  b.bezierCurveTo(6, 14, 20, 12, 24, 4);
  b.closePath();
  ink(b, lin(b, -10, -14, 10, 14, [[0, GOLD_P], [0.4, c], [1, GOLD_D]]), 2);
  for (const [x, y, r] of [[-6, -4, 2], [2, -6, 1.8], [10, -4, 2.2], [-2, 4, 1.6], [8, 4, 1.8], [16, 0, 1.6], [-10, 4, 1.4]]) {
    ellipse(b, x, y, r, r * 0.8); // the silver spots
    b.fillStyle = SILVER;
    b.fill();
  }
  path(b, [[22, -4], [30, -12], [28, -2]]); // the flicked tail
  ink(b, lin(b, 22, -12, 30, 0, [[0, GOLD_P], [1, '#ffffff']]), 1.2);
  b.beginPath(); // the neck, reaching down and forward
  b.moveTo(-14, -6);
  b.quadraticCurveTo(-22, -10, -28, -4);
  b.lineTo(-24, 6);
  b.quadraticCurveTo(-20, 4, -16, 6);
  b.closePath();
  ink(b, gilt(b, -28, -10, -14, 6), 1.6);
  antler(b, l, -27, -10, -1);
  antler(b, l, -23, -10, 1);
  b.beginPath(); // the head, a fine muzzle
  b.moveTo(-22, -8);
  b.quadraticCurveTo(-34, -10, -40, 0);
  b.quadraticCurveTo(-36, 4, -28, 3);
  b.quadraticCurveTo(-22, 2, -22, -8);
  b.closePath();
  ink(b, lin(b, -40, -10, -22, 4, [[0, GOLD_D], [0.5, c], [1, GOLD_P]]), 1.6);
  path(b, [[-22, -8], [-17, -16], [-20, -6]]); // the ear
  ink(b, gilt(b, -22, -16, -17, -6), 1);
  ellipse(b, -29, -3, 2.4, 1.6, -0.3); // the eye, dark and long
  b.fillStyle = BLACK;
  b.fill();
  circle(b, -40, 0, 1.4);
  b.fill();
  leg(b, 14, 10, 3.4, out ? 26 : 16, out ? 22 : 24, out ? 40 : 22, out ? 26 : 34); // the near hind leg
  leg(b, -12, 10, 3.4, out ? -26 : -14, out ? 24 : 22, out ? -36 : -6, out ? 34 : 30); // the near fore leg
  path(b, [[-8, -10], [14, -10]], true); // the line of light along its back
  line(b, rgba('#ffffff', 0.5), 1.2);
  for (const [x, y] of [[-4, -8], [12, -6], [-30, -6]]) glint(l, x, y, 2.6, 0.5);
  bloom(l, 0, 0, 30, GOLD, 0.18 + f * 0.06);
  glint(l, -29.4, -3.4, 1.4, 0.6);
  both((s) => glint(l, s * 4, 10 + s * 2, 1.4, 0.3));
  circle(l, -30, -3.6, 0.8);
  l.fillStyle = rgba(shade(GOLD, 0.8), 0.9);
  l.fill();
}
