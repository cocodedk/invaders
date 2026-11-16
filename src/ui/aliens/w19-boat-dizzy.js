// World 19's carrier knocked out (see w19-boat.js and bodies-view.js), drawn into a single context: the Paper Boat heeled right over onto
// its side, its sail gone soggy and the top half flopped over, the toothpick hanging from the limp tip with its pennant, drips running off
// the low side, and the ballpoint face on its bow cross-eyed with a wobbly mouth. It keeps the boat's outline (the hull under the sail),
// ruled paper, red margin and folded corners, so at a glance it is still the boat. Its crate is gone: the prize dropped when it was
// knocked out.
import { path, ink, lin, rgba, shade, mix, line, ellipse, circle, droplet, INK } from './w19-kit.js';
import { ruled, BIRO, MARGIN } from './w19-boat.js';

const TILT = -0.55; // rad: heeled over onto its left side
const DEEP = '#2a4a7a'; // the paper's shade
const FOLD = -14; // y where the soggy sail gives way (the live sail runs from -36 to 8)

function crease(g, x0, y0, x1, y1) {
  for (const [d, col, w] of [[0, rgba('#1a3060', 0.45), 1.1], [0.9, rgba('#ffffff', 0.55), 0.8]]) {
    g.beginPath();
    g.moveTo(x0 + d, y0);
    g.lineTo(x1 + d, y1);
    line(g, col, w);
  }
}

// The sail: its two faces up to the fold, and above it the top half flopped over to the low side, limp, the snapped toothpick hanging off it.
function sail(g, c) {
  const k = 23 * (FOLD + 36) / 44; // the sail's half-width at the fold
  ruled(g, [[0, FOLD], [-k, FOLD], [-23, 8], [0, 8]], lin(g, -20, FOLD, 0, 8, [[0, shade(c, 0.45)], [1, shade(c, 0.1)]]), 0, -12);
  ruled(g, [[0, FOLD], [0, 8], [23, 8], [k, FOLD]], lin(g, 0, FOLD, 20, 8, [[0, c], [1, mix(c, DEEP, 0.4)]]), 0.04);
  crease(g, 0, FOLD + 1, 0, 6);
  g.beginPath(); // the toothpick, hanging from the flopped tip
  g.moveTo(-25, -4);
  g.lineTo(-30, 5);
  line(g, INK, 3);
  line(g, '#e8c890', 1.5);
  path(g, [[-30, 5], [-24, 7], [-28, 1]]);
  ink(g, MARGIN, 1.3);
  g.beginPath(); // the top half, flopped over
  g.moveTo(k, FOLD);
  g.quadraticCurveTo(-4, -32, -25, -4);
  g.quadraticCurveTo(-16, -9, -k, FOLD);
  g.closePath();
  ink(g, lin(g, k, -26, -25, -4, [[0, shade(c, 0.5)], [0.6, shade(c, 0.18)], [1, mix(c, DEEP, 0.25)]]), 2.2);
  g.beginPath();
  g.moveTo(k - 3, FOLD - 2.5);
  g.quadraticCurveTo(-4, -26, -21, -7);
  line(g, rgba('#4a78c8', 0.45), 0.8);
  crease(g, -k + 1, FOLD, k - 1, FOLD);
}

// The hull as the live boat has it, its doodled face dizzy: crossed eyes, the left a touch bigger, and a wobbly mouth.
function hull(g, c) {
  ruled(g, [[-44, 0], [-27, 27], [27, 27], [44, 0], [24, 6], [-24, 6]], lin(g, 0, 2, 0, 27, [[0, shade(c, 0.32)], [0.6, c], [1, mix(c, DEEP, 0.35)]]), -0.02, 30);
  ruled(g, [[-44, 0], [-24, 6], [-20, 14]], shade(c, 0.5), 0.1);
  ruled(g, [[44, 0], [24, 6], [20, 14]], mix(c, DEEP, 0.25), -0.1);
  crease(g, -36, 13, 36, 13);
  for (const [s, x, r] of [[-1, -26, 4.9], [1, -16, 4.2]]) {
    ellipse(g, x, 15.5, r, r * 1.1);
    g.fillStyle = '#ffffff';
    g.fill();
    line(g, BIRO, 1.4);
    circle(g, x - s * r * 0.45, 16.1, r * 0.42);
    g.fillStyle = BIRO;
    g.fill();
  }
  g.beginPath();
  g.moveTo(-28, 23);
  for (let i = 1; i <= 5; i++) g.lineTo(-28 + i * 3, 23 + (i % 2 ? -2 : 0));
  line(g, BIRO, 1.4);
}

export function dizzyBoat(g, c) {
  g.save();
  g.translate(-3, -6);
  g.rotate(TILT);
  sail(g, c);
  hull(g, c);
  for (const [x, y, r] of [[-26, 33, 2.3], [-19, 37, 1.7], [-40, 7, 2]]) droplet(g, null, x, y, r); // drips off the low side
  g.restore();
}
