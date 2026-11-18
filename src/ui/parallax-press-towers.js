// The far layer of Midnight Press (presstowers): the presses, standing as tall as towers. Each is two iron columns under a crown with a
// vermilion stripe, the great screw coming down to the platen, a heavy bed on the floor and a flywheel turning beside it, spoked; a lamp
// glows at each press's crown (out.lights).
import { rgba } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './press-kit.js';

export const TOWER = { pitch: 380, w: 160, col: 26, wheel: 66 }; // the spacing of the presses, a press's width, a column's, a flywheel's radius

function press(g, x, top, h, L) {
  const { w, col, wheel } = TOWER;
  const body = h - top;
  g.fillStyle = L.color;
  g.fillRect(x, top, col, body);
  g.fillRect(x + w - col, top, col, body);
  g.fillRect(x - 14, top - 24, w + 28, 34); // the crown
  g.fillRect(x + w / 2 - 9, top, 18, body * 0.42); // the screw
  g.fillRect(x + col, top + body * 0.42, w - 2 * col, 46); // the platen
  g.fillRect(x - 34, h - 96, w + 68, 96); // the bed
  g.fillStyle = rgba(PAL.vermilion, 0.45);
  g.fillRect(x - 14, top - 6, w + 28, 4);
  const [cx, cy] = [x + w + wheel + 6, top + body * 0.32];
  g.strokeStyle = L.color;
  g.lineWidth = 14;
  g.beginPath();
  g.arc(cx, cy, wheel, 0, TAU);
  g.stroke();
  g.lineWidth = 6;
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos((k * TAU) / 6) * wheel, cy + Math.sin((k * TAU) / 6) * wheel);
  }
  g.stroke();
  g.fillRect(cx - 6, cy, 12, h - cy); // its stand
}

export function presstowers(g, w, h, rng, L, out) {
  g.save();
  for (let x = 40 + rng() * 80; x < w; x += TOWER.pitch + rng() * 140) {
    const top = h * (0.12 + rng() * 0.22);
    press(g, x, top, h, L);
    out.lights.push({ x: x + TOWER.w / 2, y: top - 8, r: 30, color: PAL.lamp, mode: 'pulse', ph: rng(), a: 0.24 });
  }
  g.restore();
}
