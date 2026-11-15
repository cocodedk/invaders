// World 19's gunner knocked out (see w19-frog.js and bodies-view.js), drawn into a single context: the Squirt Frog puffed up round as a
// ball, its legs flung out flat and its hands limp, cross-eyed on its bumps, the cheeks gone slack and a long tongue lolling out.
import { lin, rgba, shade, line, ellipse, circle, both, rubber, crossEyes, tongue, blush } from './w19-kit.js';
import { BELLY, spotOf, merged, webFoot } from './w19-frog.js';

export function dizzyFrog(g, c) {
  both((s) => { // the legs, flung out flat
    g.beginPath();
    g.moveTo(s * 18, 14);
    g.quadraticCurveTo(s * 32, 10, s * 36, 22);
    line(g, '#0a0c16', 8);
    line(g, shade(c, -0.1), 5);
    webFoot(g, s * 36, 25, s, 0.9, c);
    g.beginPath(); // the hands, limp
    g.moveTo(s * 20, -2);
    g.quadraticCurveTo(s * 30, -8, s * 33, 2);
    line(g, '#0a0c16', 6);
    line(g, shade(c, -0.05), 3.4);
  });
  const ball = (q) => circle(q, 0, 4, 25);
  const bumps = [-1, 1].map((s) => (q) => circle(q, s * 10, -19, 8.5));
  merged(g, [ball, ...bumps], rubber(g, -8, -6, 40, c));
  ellipse(g, 0, 12, 15, 12);
  g.fillStyle = lin(g, 0, 0, 0, 24, [[0, shade(BELLY, 0.4)], [1, BELLY]]);
  g.fill();
  for (const [x, y, r] of [[-16, -4, 2.6], [15, -6, 2.2], [-18, 12, 1.8], [18, 10, 2.4]]) {
    ellipse(g, x, y, r, r * 0.8);
    g.fillStyle = rgba(spotOf(c), 0.75);
    g.fill();
  }
  crossEyes(g, 0, -19, 20, 5.6);
  g.beginPath(); // the grin gone slack
  g.moveTo(-14, -6);
  g.quadraticCurveTo(0, 2, 14, -6);
  line(g, '#0a0c16', 1.8);
  tongue(g, 5, -2.5, 6, 12, 4);
  blush(g, -15, -6, 4, 2.6);
  blush(g, 15, -6, 4, 2.6);
}
