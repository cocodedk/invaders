// One brass dolphin tap of Rubber Regatta's far layer (parallax-bath-taps.js), as tall as a tower beside the toys: a fluted column on a
// stepped plinth standing on the tub's far rim, collared at four heights, a dome on top and a cross-head handle with ball ends and an
// enamel button (red for hot, blue for cold); and from the column's upper side a dolphin curls out for the spout, its tail flukes up
// against the column, its scaly body arching over and its open mouth turned down to pour. The brass is mid-value with thin bright
// highlights, since the taps stand behind the alien rows (the look's value rule). The dolphin faces T.dir; the column is lit from the
// upper left whichever way it faces.
import { rgba, rad, roundRect } from './sprites.js';
import { TAU, smooth } from '../core/math.js';
import { PAL } from './sky-bodies-11-kit.js';
import { TAP, RIM, brass, brassLying } from './parallax-bath-kit.js';

const COLLARS = [122, 182, 240, 268]; // layer y of the column's collars
const PLINTH = RIM.y - 26; // the plinth's top
// The dolphin's spine from tail root to mouth, in the tap's frame (x along T.dir from the column's axis): a cubic.
const SPINE = [[28, 108], [120, 58], [206, 126], [TAP.mouth[0], TAP.mouth[1] - 14]];
const girth = (t) => (t < 0.45 ? 12 + 40 * smooth(t / 0.45) // the tail stock swelling to the body,
  : t < 0.86 ? 52 - 11 * smooth((t - 0.45) / 0.3) + 9 * smooth((t - 0.7) / 0.16) // the neck and the bulging brow,
    : 50 - 22 * smooth((t - 0.86) / 0.14)); // the snout
const at = (t) => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * SPINE[0][k] + 3 * u * u * t * SPINE[1][k] + 3 * u * t * t * SPINE[2][k] + t * t * t * SPINE[3][k]);
};
const out = (t) => { // the unit normal on the outer side of the arch
  const u = 1 - t;
  const [tx, ty] = [0, 1].map((k) => 3 * u * u * (SPINE[1][k] - SPINE[0][k]) + 6 * u * t * (SPINE[2][k] - SPINE[1][k]) + 3 * t * t * (SPINE[3][k] - SPINE[2][k]));
  const l = Math.hypot(tx, ty);
  return [ty / l, -tx / l];
};
const side = (t, k) => { // the point k girths out from the spine (k > 0 outer, k < 0 inner)
  const [x, y] = at(t);
  const [nx, ny] = out(t);
  return [x + nx * girth(t) * k, y + ny * girth(t) * k];
};
const N = 30;

function column(g, x, T) {
  const hw = TAP.hw;
  g.fillStyle = brass(g, x - 62, x + 62);
  roundRect(g, x - 62, PLINTH + 14, 124, 18, 6);
  g.fill();
  g.fillStyle = brass(g, x - 48, x + 48);
  roundRect(g, x - 48, PLINTH, 96, 18, 6);
  g.fill();
  g.fillStyle = brass(g, x - hw, x + hw);
  g.fillRect(x - hw, TAP.top + 30, hw * 2, PLINTH - TAP.top - 28);
  g.fillStyle = rgba(PAL.brass.dark, 0.35); // the flutes
  for (const f of [-0.62, -0.22, 0.22, 0.62]) g.fillRect(x + f * hw - 1, TAP.top + 44, 2, PLINTH - TAP.top - 52);
  for (const cy of COLLARS) {
    g.fillStyle = brass(g, x - hw - 8, x + hw + 8);
    roundRect(g, x - hw - 8, cy - 8, (hw + 8) * 2, 16, 7);
    g.fill();
    g.fillStyle = rgba(PAL.brass.spec, 0.55);
    g.fillRect(x - hw - 3, cy - 7, (hw + 3) * 2, 2);
    g.fillStyle = rgba(PAL.brass.dark, 0.5);
    g.fillRect(x - hw - 3, cy + 6, (hw + 3) * 2, 2);
  }
  g.fillStyle = brass(g, x - hw - 6, x + hw + 6); // the dome
  g.beginPath();
  g.ellipse(x, TAP.top + 32, hw + 6, 9, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.arc(x, TAP.top + 32, hw - 2, Math.PI, 0);
  g.fill();
  g.fillRect(x - 6, TAP.top - 18, 12, 22); // the handle: a stem, a bar with ball ends, a boss and its enamel button
  g.fillStyle = brassLying(g, TAP.top - 26, TAP.top - 14);
  roundRect(g, x - 70, TAP.top - 26, 140, 12, 6);
  g.fill();
  for (const [bx, r, fill] of [[x - 72, 10, null], [x + 72, 10, null], [x, 15, null], [x, 8, T.button]]) {
    g.fillStyle = fill ?? rad(g, bx - r * 0.35, TAP.top - 20 - r * 0.4, 1, r * 1.3, [[0, PAL.brass.spec], [0.35, PAL.brass.light], [0.8, PAL.brass.body], [1, PAL.brass.dark]]);
    g.beginPath();
    g.arc(bx, TAP.top - 20, r, 0, TAU);
    g.fill();
  }
  g.fillStyle = rgba('#ffffff', 0.75);
  g.beginPath();
  g.arc(x - 3, TAP.top - 23, 2.5, 0, TAU);
  g.fill();
}

function bodyPath(g) {
  g.beginPath();
  for (let i = 0; i <= N; i++) g.lineTo(...side(i / N, 0.5));
  for (let i = N; i >= 0; i--) g.lineTo(...side(i / N, -0.5));
  g.closePath();
}

// A band along the spine k girths out, w girths wide, stroked segment by segment so it narrows with the body.
function band(g, k, w, color, from = 0.04, to = 0.97) {
  g.strokeStyle = color;
  g.lineCap = 'round';
  for (let i = Math.ceil(from * N); i < to * N; i++) {
    g.lineWidth = girth(i / N) * w;
    g.beginPath();
    g.moveTo(...side(i / N, k));
    g.lineTo(...side((i + 1) / N, k));
    g.stroke();
  }
}

function dolphin(g) {
  const ink = PAL.brass.dark;
  g.fillStyle = PAL.brass.body; // the flukes, up against the column
  g.beginPath();
  g.moveTo(22, 118);
  g.quadraticCurveTo(-2, 74, 10, 40);
  g.quadraticCurveTo(26, 72, 36, 92);
  g.quadraticCurveTo(44, 56, 70, 40);
  g.quadraticCurveTo(62, 86, 40, 118);
  g.closePath();
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = 2;
  g.stroke();
  const [f0, f1, tip] = [side(0.26, 0.45), side(0.42, 0.45), side(0.3, 1.25)]; // the dorsal fin
  g.beginPath();
  g.moveTo(...f0);
  g.quadraticCurveTo(tip[0] + 6, tip[1] + 10, ...tip);
  g.lineTo(...f1);
  g.fill();
  g.stroke();
  bodyPath(g);
  g.fill();
  g.save();
  g.clip();
  band(g, -0.32, 0.42, rgba(ink, 0.55)); // the shade under the arch, the light along its back
  band(g, 0.24, 0.16, rgba(PAL.brass.light, 0.85));
  band(g, 0.27, 0.05, rgba(PAL.brass.spec, 0.9), 0.1, 0.9);
  g.strokeStyle = rgba(ink, 0.45); // scales
  g.lineWidth = 1.3;
  g.beginPath();
  for (let t = 0.16; t < 0.72; t += 0.055) {
    for (const k of [-0.22, 0, 0.22]) {
      const [sx, sy] = side(t + (k ? 0.027 : 0), k);
      const [nx, ny] = out(t);
      const a = Math.atan2(nx, -ny) + Math.PI;
      g.moveTo(sx + Math.cos(a - 1.1) * 5, sy + Math.sin(a - 1.1) * 5);
      g.arc(sx, sy, 5, a - 1.1, a + 1.1);
    }
  }
  g.stroke();
  g.restore();
  bodyPath(g);
  g.strokeStyle = ink;
  g.lineWidth = 2;
  g.stroke();
  const [fa, fb, ft] = [side(0.7, -0.45), side(0.78, -0.45), side(0.66, -1.05)]; // a flipper
  g.beginPath();
  g.moveTo(...fa);
  g.quadraticCurveTo(ft[0] - 4, ft[1] - 6, ...ft);
  g.lineTo(...fb);
  g.fillStyle = PAL.brass.body;
  g.fill();
  g.stroke();
  const [ex, ey] = side(0.83, 0.14); // the eye under a heavy brow
  g.fillStyle = PAL.brass.spec;
  g.beginPath();
  g.arc(ex, ey, 8, 0, TAU);
  g.fill();
  g.fillStyle = ink;
  g.beginPath();
  g.arc(ex + 1.5, ey + 1, 4.4, 0, TAU);
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(ex, ey, 12, -2.6, -0.6);
  g.stroke();
  const [mx, my] = at(1); // the open mouth, turned down: the spout
  g.fillStyle = ink;
  g.beginPath();
  g.ellipse(mx, my + 10, 13, 8, 0, 0, TAU);
  g.fill();
  g.strokeStyle = PAL.brass.light;
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(mx, my + 10, 15, 9.5, 0, 0.2, Math.PI - 0.2);
  g.stroke();
}

// One tap at layer x T.x, its dolphin facing T.dir; its dome's glint goes in out.lights.
export function tap(g, T, o, rng) {
  column(g, T.x, T);
  g.save();
  g.translate(T.x, 0);
  g.scale(T.dir, 1);
  dolphin(g);
  g.restore();
  o.lights.push({ x: T.x - 12, y: TAP.top + 18, r: 30, color: PAL.brass.spec, mode: 'pulse', ph: rng(), a: 0.22 });
}
