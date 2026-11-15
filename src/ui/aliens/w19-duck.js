// World 19, Rubber Regatta, the grunt (see w19.js): THE SQUEAKLING, a rubber duckling afloat in a collar of suds, in profile and facing
// left. A round glossy body with an up-turned tail, an embossed wing and the moulding seam along its back; a big head with a cowlick
// curl, an eager eye under a raised brow, a rosy cheek and a fat orange bill; little webbed feet paddling under the foam and beads of
// bath water on its rubber. It bobs in time: on beat 1 it dips, squeezes and squeaks (the bill opens and three squeak lines leave it),
// and the feet swap. Lights: the wet shine, the eye's glint, the beads and the suds' rims. Its knocked-out drawing is w19-duck-dizzy.js.
import { path, ink, lin, rgba, shade, mix, line, ellipse, circle, both, INK, BILL, BILL_D, MOUTH, rubber, shine, eyeball, droplet, suds, blush, seam, bez } from './w19-kit.js';

function bodyPath(g) {
  g.beginPath();
  g.moveTo(-20, -8);
  g.bezierCurveTo(-34, -2, -34, 20, -16, 26);
  g.bezierCurveTo(0, 31, 22, 29, 30, 18);
  g.bezierCurveTo(35, 11, 37, 2, 41, -11);
  g.bezierCurveTo(33, -9, 26, -6, 18, -6);
  g.bezierCurveTo(8, -6, 0, -9, -6, -10);
  g.closePath();
}

// A webbed foot of three toes, its heel at (x, y), pointing along angle a.
export function foot(g, x, y, a, s = 1) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(-4, 3, -7, 8, -6, 11);
  g.quadraticCurveTo(-4, 9.5, -2.4, 11.6);
  g.quadraticCurveTo(0, 9.6, 2.4, 11.6);
  g.quadraticCurveTo(4, 9.5, 6, 11);
  g.bezierCurveTo(7, 8, 4, 3, 0, 0);
  ink(g, lin(g, -6, 0, 6, 11, [[0, shade(BILL, 0.35)], [1, BILL_D]]), 1.6);
  for (const k of [-2.4, 2.4]) {
    g.beginPath();
    g.moveTo(0, 1.5);
    g.lineTo(k, 10);
    line(g, rgba(BILL_D, 0.7), 0.8);
  }
  g.restore();
}

function wing(b, l, c) {
  const trace = () => {
    b.beginPath();
    b.moveTo(1, 4);
    b.bezierCurveTo(10, -3, 24, -1, 29, 8);
    b.bezierCurveTo(24, 17, 12, 20, 4, 15);
    b.bezierCurveTo(-1, 12, -1, 7, 1, 4);
  };
  trace();
  b.fillStyle = lin(b, 2, 0, 26, 18, [[0, shade(c, 0.3)], [0.5, mix(c, '#c8640a', 0.18)], [1, mix(c, '#7a2e08', 0.4)]]);
  b.fill();
  line(b, rgba('#5a2406', 0.75), 1.5);
  for (const [x0, y0, x1, y1] of [[13, 16, 19, 10], [18, 15.5, 23, 9.5], [22.5, 14, 26.5, 9]]) { // the feather notches
    b.beginPath();
    b.moveTo(x0, y0);
    b.quadraticCurveTo((x0 + x1) / 2 + 2, (y0 + y1) / 2 + 1, x1, y1);
    line(b, rgba('#5a2406', 0.55), 1);
  }
  b.beginPath();
  b.moveTo(3, 5);
  b.bezierCurveTo(11, -1, 22, 0, 27, 7);
  line(b, rgba('#fff6c8', 0.6), 1.1);
  shine(l, 12, 3, 6, 1.6, -0.2, 0.32);
}

function bill(b, f) {
  if (f) { // open: the lower bill drops, the mouth and the tongue show
    b.save();
    b.translate(-24, -17);
    b.rotate(-0.42);
    b.beginPath();
    b.moveTo(0, 0);
    b.bezierCurveTo(-7, 0, -15, 0, -17, 2);
    b.bezierCurveTo(-12, 5, -4, 5, 1, 3);
    ink(b, lin(b, 0, 0, 0, 5, [[0, BILL], [1, BILL_D]]), 1.8);
    b.restore();
    path(b, [[-24, -17], [-39, -18], [-36, -10], [-25, -12]]);
    b.fillStyle = MOUTH;
    b.fill();
    ellipse(b, -30, -13, 5, 2.2, -0.3);
    b.fillStyle = '#ff6f7a';
    b.fill();
  } else {
    b.beginPath();
    b.moveTo(-25, -18);
    b.bezierCurveTo(-32, -17, -40, -17, -41, -15);
    b.bezierCurveTo(-36, -12, -28, -12, -24, -14);
    ink(b, lin(b, 0, -18, 0, -12, [[0, BILL], [1, BILL_D]]), 1.8);
  }
  b.beginPath();
  b.moveTo(-24, -25);
  b.bezierCurveTo(-34, -29, -44, -24, -43, -19);
  b.bezierCurveTo(-38, -17, -30, -17, -25, -18);
  b.closePath();
  ink(b, lin(b, -40, -28, -30, -16, [[0, shade(BILL, 0.45)], [0.5, BILL], [1, mix(BILL, '#7a2a04', 0.35)]]), 2);
  ellipse(b, -36, -23.6, 1.3, 0.7, -0.3); // the nostril
  b.fillStyle = rgba(MOUTH, 0.8);
  b.fill();
  b.beginPath();
  b.moveTo(-26, -25);
  b.bezierCurveTo(-33, -27, -39, -25, -41, -22);
  line(b, rgba('#fff2c0', 0.7), 1);
}

function head(b, l, f, c) {
  circle(b, -12, -21, 16);
  ink(b, rubber(b, -14, -25, 22, c), 2.6);
  b.beginPath(); // the cowlick
  b.moveTo(-14, -36);
  b.bezierCurveTo(-16, -43, -8, -46, -6, -41);
  b.bezierCurveTo(-5, -38, -9, -38, -9, -40);
  b.bezierCurveTo(-10, -42, -12, -40, -11, -36);
  b.closePath();
  ink(b, lin(b, -14, -45, -6, -36, [[0, shade(c, 0.4)], [1, mix(c, '#a0480a', 0.3)]]), 1.6);
  seam(b, bez([-26, -14], [-30, -30], [-14, -40], [2, -30], 10));
  blush(b, -6, -15, 5.4, 3.2);
  eyeball(b, l, -15, -25, 4.6, 5.6, -0.5, 0.2, 0, c);
  b.beginPath(); // a brow raised, eager
  b.moveTo(-21, -33);
  b.quadraticCurveTo(-15, -37, -9, -33.4);
  line(b, INK, 1.8);
  bill(b, f);
  shine(l, -18, -31, 5, 2.6, -0.5, 0.55);
}

export function grunt(b, l, f, c) {
  b.beginPath(); // the ripple the duck sits in
  b.ellipse(3, 31, 38, 5, 0, 0, Math.PI * 2);
  line(b, rgba('#ffffff', 0.4), 1.2);
  for (const [x, a] of f ? [[-8, 0.5], [12, -0.3]] : [[-8, -0.2], [12, 0.45]]) foot(b, x, 27, a, 0.95);
  b.save();
  b.translate(0, f ? 1.5 : 0);
  b.rotate(f ? -0.04 : 0);
  l.save();
  l.translate(0, f ? 1.5 : 0);
  l.rotate(f ? -0.04 : 0);
  bodyPath(b);
  b.fillStyle = rubber(b, -6, 0, 42, c);
  b.fill();
  b.save();
  bodyPath(b);
  b.clip();
  b.beginPath(); // the foam's light bouncing up under the belly
  b.moveTo(-30, 18);
  b.bezierCurveTo(-18, 30, 18, 30, 34, 14);
  line(b, rgba('#fff8e0', 0.45), 3);
  b.fillStyle = lin(b, 0, -10, 0, 30, [[0, rgba('#ffffff', 0)], [0.7, rgba('#ffffff', 0)], [1, rgba('#a04008', 0.25)]]);
  b.fillRect(-36, -12, 80, 44);
  b.restore();
  bodyPath(b);
  line(b, INK, 2.6);
  seam(b, bez([-4, -8], [8, -5], [26, -3], [38, -8], 10));
  wing(b, l, c);
  head(b, l, f, c);
  for (const [x, y, r] of [[-26, 8, 1.8], [10, 21, 1.6], [26, 4, 1.4], [-21, -33, 1.5], [-3, -31, 1.3]]) droplet(b, l, x, y, r);
  shine(l, 8, -3, 10, 3, -0.12, 0.45);
  shine(l, 35, -6, 2.4, 1.2, -0.9, 0.5);
  shine(l, -27, 4, 2, 5, 0.3, 0.3);
  if (f) {
    for (const [x0, y0, x1, y1] of [[-43.5, -27.5, -45.5, -31], [-44.5, -19, -46.6, -19], [-43.5, -12, -45.5, -8.5]]) { // squeak!
      l.beginPath();
      l.moveTo(x0, y0);
      l.lineTo(x1, y1);
      line(l, rgba('#ffffff', 0.9), 1.4);
    }
  }
  l.restore();
  b.restore();
  suds(b, l, 2, 31 + f, 66, 6, 13, 3);
}
