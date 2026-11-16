// World 19's grunt knocked out (see w19-duck.js and bodies-view.js), drawn into a single context: the Squeakling dizzy.
import { lin, rgba, shade, mix, line, ellipse, circle, both, ink, INK, BILL, BILL_D, MOUTH, rubber, crossEyes, tongue, blush, seam, bez } from './w19-kit.js';
import { foot } from './w19-duck.js';

// Knocked silly: rolled onto its back into a ball, feet in the air and wings flung out, the head lolling at the lower left with a bump
// on it, cross-eyed, the bill hanging open and the tongue out.
export function dizzyDuck(g, c) {
  both((s) => {
    g.beginPath();
    g.moveTo(4 + s * 22, -2);
    g.bezierCurveTo(4 + s * 34, -12, 4 + s * 40, -2, 4 + s * 36, 8);
    g.bezierCurveTo(4 + s * 32, 10, 4 + s * 26, 8, 4 + s * 22, 6);
    g.closePath();
    ink(g, lin(g, 0, -10, 0, 10, [[0, shade(c, 0.25)], [1, mix(c, '#7a2e08', 0.35)]]), 1.8);
  });
  foot(g, -8, -22, Math.PI - 0.35, 1.1);
  foot(g, 16, -22, Math.PI + 0.4, 1.1);
  ellipse(g, 4, -4, 26, 21);
  ink(g, rubber(g, -2, -10, 32, c), 2.6);
  ellipse(g, 6, -2, 15, 11); // the paler belly, turned up
  g.fillStyle = rgba('#fff4c0', 0.35);
  g.fill();
  seam(g, bez([-18, -14], [-8, -26], [16, -26], [26, -12], 10));
  circle(g, -10, 15, 16);
  ink(g, rubber(g, -14, 10, 22, c), 2.6);
  circle(g, -22, 4, 5); // the bump, with its throb
  ink(g, rubber(g, -23, 2, 7, shade(c, 0.2)), 1.6);
  for (const a of [-2.6, -2.1, -1.6]) {
    g.beginPath();
    g.moveTo(-22 + Math.cos(a) * 7, 4 + Math.sin(a) * 7);
    g.lineTo(-22 + Math.cos(a) * 10, 4 + Math.sin(a) * 10);
    line(g, INK, 1.2);
  }
  crossEyes(g, -10, 10, 11, 4.4);
  g.beginPath(); // the upper bill, flat
  g.moveTo(-19, 18);
  g.bezierCurveTo(-16, 15, -4, 15, -1, 18);
  g.bezierCurveTo(-4, 21, -16, 21, -19, 18);
  ink(g, lin(g, 0, 15, 0, 21, [[0, shade(BILL, 0.4)], [1, BILL]]), 1.8);
  g.beginPath(); // the lower bill, hanging open
  g.moveTo(-17, 20);
  g.bezierCurveTo(-15, 28, -5, 28, -3, 20);
  ink(g, lin(g, 0, 20, 0, 28, [[0, MOUTH], [1, BILL_D]]), 1.6);
  tongue(g, -9, 22, 6, 6, 1.5);
  blush(g, -21, 14, 3.4, 2.2);
  blush(g, 1, 14, 3.4, 2.2);
}
