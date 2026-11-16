// World 19, Rubber Regatta, the carrier (see w19.js): THE PAPER BOAT, a boat folded from a sheet of blue-ruled exercise paper, the prize
// crate on its deck. The tall middle fold stands up as its sail, each facet shaded by how it faces the window, with the ruled lines and
// the red margin running over the folds and every crease pressed in; a pair of ballpoint eyes and a smile doodled on its bow; a little
// toothpick pennant on top; and in front of the sail a wooden crate with a gold star on it that twinkles, so it is plainly the prize.
// It rides a ripple of suds, rocking one way on beat 0 and the other on beat 1, the pennant flicking. Lights: the star, its twinkles,
// the paper's sheen and the suds' rims. Its knocked-out drawing is w19-boat-dizzy.js.
import { path, ink, lin, rgba, shade, mix, line, ellipse, circle, INK, hash, shine, suds, star5 } from './w19-kit.js';

export const RULE = '#4a78c8'; // the ruled lines
export const MARGIN = '#e8505a';
export const BIRO = '#2a4a9a'; // the doodles
const WOOD = '#c88a4a';
const GOLD = '#ffd23a';

// The paper's ruled lines over the clipped face pts (spacing 6 px, tilted by k), then the face outlined in edge, lw wide. The lines are cut
// to the face's box, so nothing reaches past the face even before the clip.
export function ruled(g, pts, fill, k = 0, margin = null, edge = INK, lw = 2.2) {
  path(g, pts);
  g.fillStyle = fill;
  g.fill();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const [cx, span] = [(x0 + x1) / 2, (x1 - x0) / 2];
  g.save();
  path(g, pts);
  g.clip();
  for (let yc = Math.ceil((y0 - Math.abs(k) * span) / 6) * 6; yc <= y1 + Math.abs(k) * span; yc += 6) {
    let [a, b] = [x0, x1];
    if (k) {
      const [p, q] = [cx + (y0 - yc) / k, cx + (y1 - yc) / k];
      [a, b] = [Math.max(x0, Math.min(p, q)), Math.min(x1, Math.max(p, q))];
    }
    if (b - a < 0.5) continue;
    g.beginPath();
    g.moveTo(a, yc + k * (a - cx));
    g.lineTo(b, yc + k * (b - cx));
    line(g, rgba(RULE, 0.45), 0.8);
  }
  if (margin !== null) {
    g.beginPath();
    g.moveTo(margin, y0);
    g.lineTo(margin + (y1 - y0) / 24, y1);
    line(g, rgba(MARGIN, 0.6), 1);
  }
  g.restore();
  path(g, pts);
  line(g, edge, lw);
}

function crease(g, x0, y0, x1, y1) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  line(g, rgba('#1a3060', 0.45), 1.1);
  g.beginPath();
  g.moveTo(x0 + 0.9, y0);
  g.lineTo(x1 + 0.9, y1);
  line(g, rgba('#ffffff', 0.55), 0.8);
}

function sail(b, l, c, f) {
  b.beginPath(); // the toothpick and its pennant
  b.moveTo(0, -33);
  b.lineTo(0, -44);
  line(b, INK, 3);
  line(b, '#e8c890', 1.5);
  const w = f ? 2.5 : -2;
  path(b, [[0.5, -44], [11, -42 + w], [0.5, -38.6]]);
  ink(b, MARGIN, 1.4);
  ruled(b, [[0, -36], [-23, 8], [0, 8]], lin(b, -20, -30, 0, 4, [[0, shade(c, 0.45)], [1, shade(c, 0.1)]]), 0, -12);
  ruled(b, [[0, -36], [0, 8], [23, 8]], lin(b, 0, -30, 20, 4, [[0, c], [1, mix(c, '#2a4a7a', 0.4)]]), 0.04);
  crease(b, 0, -35, 0, 6);
  shine(l, -7, -18, 2.4, 9, 0.5, 0.3);
  shine(l, 1.5, -30, 1, 3, 0, 0.4);
  circle(l, 10, -41 + w * 0.5, 1);
  l.fillStyle = rgba('#ffffff', 0.7);
  l.fill();
}

function hull(b, l, c) {
  ruled(b, [[-44, 0], [-27, 27], [27, 27], [44, 0], [24, 6], [-24, 6]], lin(b, 0, 2, 0, 27, [[0, shade(c, 0.32)], [0.6, c], [1, mix(c, '#2a4a7a', 0.35)]]), -0.02, -30);
  ruled(b, [[-44, 0], [-24, 6], [-20, 14]], shade(c, 0.5), 0.1); // the folded-down corners
  ruled(b, [[44, 0], [24, 6], [20, 14]], mix(c, '#2a4a7a', 0.25), -0.1);
  crease(b, -36, 13, 36, 13);
  crease(b, -24, 6, -20, 14);
  crease(b, 24, 6, 20, 14);
  for (const [x, y] of [[-30, 15], [-21, 15]]) { // the doodled eyes and smile
    ellipse(b, x, y, 3.6, 4.2);
    b.fillStyle = '#ffffff';
    b.fill();
    line(b, BIRO, 1.2);
    circle(b, x - 1, y + 1, 1.7);
    b.fillStyle = BIRO;
    b.fill();
  }
  b.beginPath();
  b.moveTo(-32, 21);
  b.quadraticCurveTo(-26, 25.5, -19, 21);
  line(b, BIRO, 1.2);
  shine(l, -10, 18, 12, 1.4, 0, 0.25);
  shine(l, 34, 4, 4, 1, -0.3, 0.3);
}

function crate(b, l, f) {
  const [x0, y0, s] = [-10, -15, 20];
  b.beginPath();
  b.rect(x0, y0, s, s);
  ink(b, lin(b, x0, y0, x0 + s, y0 + s, [[0, shade(WOOD, 0.35)], [0.5, WOOD], [1, mix(WOOD, '#3a1a06', 0.45)]]), 2);
  for (const y of [y0 + 5, y0 + 10, y0 + 15]) { // the planks
    b.beginPath();
    b.moveTo(x0 + 1, y);
    b.lineTo(x0 + s - 1, y);
    line(b, rgba('#4a2408', 0.6), 0.9);
  }
  for (let i = 0; i < 7; i++) { // grain
    b.beginPath();
    const y = y0 + 2 + hash(i * 3 + 1) * (s - 4);
    b.moveTo(x0 + 2 + hash(i * 3) * 6, y);
    b.lineTo(x0 + 8 + hash(i * 3 + 2) * 10, y + 0.4);
    line(b, rgba('#5a3010', 0.35), 0.6);
  }
  for (const [ax, ay, bx, by] of [[x0, y0, x0 + s, y0 + s], [x0 + s, y0, x0, y0 + s]]) { // the braces
    b.beginPath();
    b.moveTo(ax, ay);
    b.lineTo(bx, by);
    line(b, INK, 3.4);
    line(b, shade(WOOD, 0.2), 1.8);
  }
  for (const [nx, ny] of [[x0 + 2, y0 + 2], [x0 + s - 2, y0 + 2], [x0 + 2, y0 + s - 2], [x0 + s - 2, y0 + s - 2]]) {
    circle(b, nx, ny, 0.9);
    b.fillStyle = '#d8dce4';
    b.fill();
  }
  star5(b, 0, y0 + s / 2, 6.6, 0);
  ink(b, lin(b, -6, y0 + 4, 6, y0 + 16, [[0, '#fff6c0'], [0.5, GOLD], [1, '#d08a10']]), 1.4);
  star5(l, 0, y0 + s / 2, 5, 0);
  l.fillStyle = rgba(GOLD, 0.45);
  l.fill();
  for (const [tx, ty, r] of f ? [[9, -18, 3], [-12, -4, 2]] : [[-9, -19, 2.4], [12, -7, 3]]) { // twinkles
    l.beginPath();
    l.moveTo(tx - r, ty);
    l.lineTo(tx + r, ty);
    l.moveTo(tx, ty - r);
    l.lineTo(tx, ty + r);
    line(l, rgba('#fff8c0', 0.95), 1.1);
  }
}

export function carrier(b, l, f, c) {
  b.beginPath();
  b.ellipse(0, 28, 42, 5, 0, 0, Math.PI * 2);
  line(b, rgba('#ffffff', 0.45), 1.2);
  b.save();
  l.save();
  for (const g of [b, l]) {
    g.translate(0, 26);
    g.rotate(f ? 0.06 : -0.06);
    g.translate(0, -26);
  }
  sail(b, l, c, f);
  crate(b, l, f);
  hull(b, l, c);
  l.restore();
  b.restore();
  suds(b, l, -30, 29, 22, 4, 6, 13);
  suds(b, l, 31, 29, 20, 4, 5, 17 + f);
}
