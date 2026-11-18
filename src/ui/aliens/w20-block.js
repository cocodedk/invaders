// World 20, Midnight Press, the gunner and the armored (see w20.js). THE NIB, a piece of wooden type standing on end, a vermilion T
// cut in relief on its face for a brow, with a steel pen nib for a gun under its chin that drips a bead of ink on beat 1; and THE SLUG,
// a heavy line of cast lead type, grey metal with a full line of reversed letters along its face and two narrow eyes under a beetling
// brow, its ink-black feet shuffling on each beat. Lights: the lamp's catch on the metal and the wet ink, the spot colour glowing.
import { path, ink, lin, rgba, shade, mix, line, ellipse, circle, both, INKY, PAPER, SPOT, inked, paperEye, textLines, wet, spot, legs } from './w20-kit.js';

// A block with rounded corners as the current path.
function block(g, x, y, w, h, r = 5) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

// The Nib: a tall block of type, its side in shade, the T on its face, a pen nib below.
export function gunner(b, l, f, c) {
  const [w, h, top] = [44, 52, -42];
  block(b, -w / 2 + 6, top + 6, w, h); // the block's side
  ink(b, mix(c, INKY, 0.6), 2.4);
  block(b, -w / 2, top, w, h);
  ink(b, inked(b, c, -w / 2, top, w / 2, top + h), 2.8);
  for (let i = 0; i < 6; i++) { // the grain of the end wood
    b.beginPath();
    b.ellipse(-4, top + h / 2, 6 + i * 4, 4 + i * 4.4, 0.2, 0, Math.PI * 2);
    line(b, rgba(mix(c, INKY, 0.5), 0.22), 1);
  }
  path(b, [[-17, top + 6], [17, top + 6], [17, top + 14], [5, top + 14], [5, top + 22], [-5, top + 22], [-5, top + 14], [-17, top + 14]]);
  ink(b, lin(b, 0, top + 6, 0, top + 22, [[0, shade(SPOT, 0.3)], [1, mix(SPOT, INKY, 0.3)]]), 1.6); // the T in relief, a brow
  both((s) => paperEye(b, l, s * 11, top + 27, 5.4, 0, 0.5));
  b.beginPath();
  b.moveTo(-8, top + 39);
  b.quadraticCurveTo(0, top + 35, 8, top + 39);
  line(b, INKY, 2);
  const ny = top + h; // the nib under its chin
  path(b, [[-9, ny - 2], [9, ny - 2], [6, ny + 12], [0, ny + 26], [-6, ny + 12]]);
  ink(b, lin(b, -9, 0, 9, 0, [[0, '#c9c4cc'], [0.45, '#f2eef0'], [1, '#6a6470']]), 1.8);
  circle(b, 0, ny + 8, 2.2);
  b.fillStyle = INKY;
  b.fill();
  path(b, [[0, ny + 10], [0, ny + 25]], true);
  line(b, INKY, 1.2);
  if (f) {
    ellipse(b, 0, ny + 32, 2.6, 3.6); // a bead of ink
    b.fillStyle = INKY;
    b.fill();
  }
  both((s) => { // stubby arms bracing it
    path(b, [[s * w / 2, top + 30], [s * (w / 2 + 9), top + 36], [s * (w / 2 + 6), top + 44]], true);
    line(b, INKY, 3.4);
  });
  wet(l, -12, top + 8, 6, 3, -0.3, 0.35);
  wet(l, -2, ny + 4, 2, 5, 0, 0.6);
  spot(l, 0, top + 10, 3, 0.3 + f * 0.15);
  if (f) spot(l, 0, ny + 30, 1.6, 0.4);
}

// The Slug: a long bar of lead, reversed letters on its face, a brow of ink over two slit eyes.
export function armored(b, l, f, c) {
  const [w, h, top] = [74, 40, -24];
  legs(b, 0, top + h, 52, 4, 12, f);
  block(b, -w / 2 + 4, top + 5, w, h, 4); // the underside
  ink(b, mix(c, INKY, 0.65), 2.4);
  block(b, -w / 2, top, w, h, 4);
  ink(b, lin(b, 0, top, 0, top + h, [[0, shade(c, 0.45)], [0.3, c], [0.7, mix(c, INKY, 0.3)], [1, mix(c, INKY, 0.6)]]), 3);
  block(b, -w / 2 + 5, top + 21, w - 10, 13, 2); // the line of type on its face
  ink(b, mix(c, INKY, 0.45), 1.4);
  textLines(b, -w / 2 + 8, top + 23, w - 16, 2, 5, 11, PAPER, 0.55);
  for (let i = 0; i < 5; i++) { // the nicks a caster leaves along its edge
    path(b, [[-w / 2 + 10 + i * 14, top + h], [-w / 2 + 13 + i * 14, top + h - 4], [-w / 2 + 16 + i * 14, top + h]]);
    b.fillStyle = mix(c, INKY, 0.5);
    b.fill();
  }
  path(b, [[-30, top + 4], [30, top + 4], [26, top + 12], [-26, top + 12]]); // the brow, a bar of ink
  ink(b, INKY, 1);
  both((s) => {
    ellipse(b, s * 13, top + 15, 7, 3);
    ink(b, PAPER, 1.2);
    circle(b, s * 11, top + 15.4, 2.2);
    b.fillStyle = INKY;
    b.fill();
    circle(l, s * 12, top + 14.4, 0.9);
    l.fillStyle = '#ffffff';
    l.fill();
  });
  for (const [x, y] of [[-30, top + 34], [30, top + 34]]) { // rivets where the bar is clamped
    circle(b, x, y, 2.6);
    ink(b, shade(c, 0.3), 1);
  }
  path(b, [[-w / 2 + 3, top + 2], [w / 2 - 6, top + 2]], true);
  line(b, rgba('#ffffff', 0.45), 1.6);
  wet(l, -20, top + 6, 12, 2.4, 0, 0.35);
  wet(l, 24, top + 30, 5, 2, 0, 0.25);
  spot(l, 0, top + 8, 2.4, 0.25 + f * 0.1);
}
