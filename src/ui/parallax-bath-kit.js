// What Rubber Regatta's three parallax layers share (parallax-bath.js, -taps, -dolphin, -frieze, -shelf, -props, -foam) and the
// flourishes that stand on them (flourish-bath.js): where the tub's far rim, the water and the two dolphin taps are in the far layer,
// the brass's gradients, and a painter of heaps of foam.
import { rgba, lin, soft } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './sky-bodies-11-kit.js';

export const MARGIN = 160; // parallax.js's: a layer is this much wider than the frame on each side (not imported: parallax.js imports the painters)
export const RIM = { y: 304, h: 32 }; // the tub's far rim in the far layer (700 tall, top at frame y 380: the rim is at frame 684..716)
export const WATER_Y = RIM.y + RIM.h; // the far water's surface in the far layer
// A tap: the top of its dome, the column's half-width, and its dolphin's mouth (x along the tap's dir from the column's axis, y).
export const TAP = { top: 52, hw: 34, mouth: [158, 214] };
// The two taps (layer x; dir: which way the dolphin faces; button: the enamel of the handle, hot and cold). Their waterfalls fall at
// frame x about 616 and 1326 with the ship at the middle; the middle layer leaves those feet clear (parallax-bath-shelf.js).
export const TAPS = [{ x: 600, dir: 1, button: '#d8463a' }, { x: 1660, dir: -1, button: '#4a74c8' }];
export const mouthOf = (T) => [T.x + T.dir * TAP.mouth[0], TAP.mouth[1]];
export const BEND = 16; // px a waterfall carries outward from the mouth before it lands

const STOPS = [[0, PAL.brass.dark], [0.2, PAL.brass.body], [0.4, PAL.brass.light], [0.46, PAL.brass.spec], [0.52, PAL.brass.light], [0.64, PAL.brass.body], [1, PAL.brass.dark]];
// Brass turned on a lathe, lit from the upper left: a cylinder standing from x0 to x1, or lying from y0 to y1.
export const brass = (g, x0, x1) => lin(g, x0, 0, x1, 0, STOPS);
export const brassLying = (g, y0, y1) => lin(g, 0, y0, 0, y1, STOPS);

// A heap of foam standing on `base`, about `w` wide and `h` tall round cx: a crowd of soft discs under a dome, each with its foot in
// shade and its upper left lit (the window is up there), then a few bubbles on its skin. Seeded by rng.
export function foamHeap(g, rng, cx, base, w, h) {
  const discs = [];
  const n = Math.max(6, Math.round((w * h) / 700));
  for (let i = 0; i < n; i++) {
    const u = rng() * 2 - 1;
    const top = base - h * Math.sqrt(1 - u * u) * (0.8 + 0.2 * rng());
    const r = 9 + rng() * Math.min(44, h * 0.36);
    discs.push([cx + (u * w) / 2, top + r * 0.85 + rng() * Math.max(0, base - top - r) * 0.7, r]);
  }
  discs.sort((a, b) => a[1] - a[2] - (b[1] - b[2]));
  const lay = (color, x, y, r, a) => {
    g.globalAlpha = a;
    g.drawImage(soft(color), x - r, y - r, r * 2, r * 2);
  };
  for (const [x, y, r] of discs) {
    lay(PAL.foam.lo, x + r * 0.12, y + r * 0.22, r * 1.12, 0.9);
    lay(PAL.foam.mid, x, y, r, 0.96);
    lay(PAL.foam.hi, x - r * 0.28, y - r * 0.34, r * 0.62, 0.9);
  }
  g.globalAlpha = 1;
  g.lineWidth = 1.3;
  for (let i = 0; i < n / 3; i++) {
    const [x, y, r] = discs[Math.floor(rng() * discs.length)];
    const [bx, by, br] = [x + (rng() - 0.5) * r, y - r * 0.6 * rng(), 2.5 + rng() * 6];
    g.strokeStyle = rgba(PAL.foam.lo, 0.8);
    g.beginPath();
    g.arc(bx, by, br, 0, TAU);
    g.stroke();
    g.fillStyle = rgba('#ffffff', 0.95);
    g.fillRect(bx - br * 0.5, by - br * 0.55, Math.max(1.2, br * 0.35), Math.max(1.2, br * 0.35));
  }
}
