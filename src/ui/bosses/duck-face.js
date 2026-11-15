// The Dowager Duck's face (World 19, Rubber Regatta; bosses/duck*.js): her long-lashed, indignant eyes beside the bill and under the cap's
// ruffle, and a dab of rouge on each cheek. An eye is a white oval in INK, a big dark pupil looking down at the ship with two catch-lights, and a
// heavy yellow lid lowered over it, sloping down toward the bill (the look of a dowager who has been splashed), its edge lined with lashes that
// sweep out long at the outer corner. Bonked, the same eyes cross (cross): the lids fly up and the pupils meet at the bill.
//   eyes(g, cross)  both eyes, boss coordinates: laid on the hull (duck-hull.js), and crossed on the live pass's sprite (duck-sprites.js)
//   cheeks(g)       the rouge, on the hull
import { PAL, rad, rgba, ellipse, circle, path, line, inked, shade } from './duck-kit.js';
import { EYE } from './duck-shape.js';

const [EX, EY, RX, RY] = EYE;

function lashes(g, s, x, y, cross) {
  const sweep = cross ? 1.25 : 1; // flung up and out when she is bonked
  [[0, 40, -0.85], [7, 34, -0.45], [-8, 30, -1.25]].forEach(([dy, len, a]) => {
    const [ox, oy] = [x + s * RX * 0.92, y + dy * 0.4 - RY * (cross ? 0.62 : 0.32)];
    const [ex, ey] = [ox + s * len * Math.cos(a * sweep) * 0.8, oy + len * Math.sin(a * sweep) * 0.75];
    g.beginPath();
    g.moveTo(ox, oy);
    g.quadraticCurveTo(ox + s * len * 0.55, oy + 2, ex, ey);
    line(g, PAL.pupil, 4.4);
  });
}

function eye(g, s, cross) {
  const [x, y] = [s * -EX, EY];
  ellipse(g, x, y + 3, RX + 2, RY + 1); // the socket's shade on the rubber
  g.fillStyle = rgba(PAL.yellowDD, 0.4);
  g.fill();
  ellipse(g, x, y, RX, RY);
  g.fillStyle = rad(g, x, y, 0, RY, [[0, PAL.eye], [0.75, '#f6f2f8'], [1, '#d8d0e6']], x - 6, y - 8);
  g.fill();
  g.save();
  ellipse(g, x, y, RX - 1, RY - 1);
  g.clip();
  const [px, py, pr] = cross ? [x - s * 13, y - 3, 9] : [x + s * 2, y + 9, 13];
  ellipse(g, px, py, pr, pr * 1.18);
  g.fillStyle = rad(g, px, py, 0, pr * 1.2, [[0, '#3a2440'], [0.6, PAL.pupil], [1, '#000000']], px - 3, py - 4);
  g.fill();
  circle(g, px - pr * 0.38, py - pr * 0.45, pr * 0.34);
  g.fillStyle = '#ffffff';
  g.fill();
  circle(g, px + pr * 0.35, py + pr * 0.4, pr * 0.15);
  g.fill();
  // The lid: everything above a line from the outer corner (high) to the inner (low); crossed, it flies up and out of the way.
  const [lo, li] = cross ? [y - RY * 0.86, y - RY * 0.8] : [y - RY * 0.4, y - RY * 0.02];
  path(g, [[x + s * (RX + 4), lo], [x - s * (RX + 4), li], [x - s * (RX + 4), y - RY - 4], [x + s * (RX + 4), y - RY - 4]]);
  g.fillStyle = rad(g, x, y - RY, 0, RY * 1.4, [[0, shade(PAL.yellow, 0.25)], [1, PAL.yellowD]]);
  g.fill();
  g.restore();
  ellipse(g, x, y, RX, RY);
  inked(g, 3.6);
  path(g, [[x + s * (RX + 1), lo], [x - s * (RX - 1), li]], true);
  line(g, PAL.pupil, 4.4);
  lashes(g, s, x, y, cross);
}

export function eyes(g, cross = false) {
  g.save();
  eye(g, -1, cross);
  eye(g, 1, cross);
  g.restore();
}

export function cheeks(g) {
  g.save();
  for (const s of [-1, 1]) {
    const [x, y] = [s * 138, -54];
    g.fillStyle = rad(g, x, y, 0, 24, [[0, rgba(PAL.blush, 0.5)], [1, rgba(PAL.blush, 0)]]);
    ellipse(g, x, y, 24, 14);
    g.fill();
  }
  g.restore();
}
