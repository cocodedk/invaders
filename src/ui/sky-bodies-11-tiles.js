// The reliefs on a few of Rubber Regatta's wall tiles (sky-bodies-11.js), cut in the glaze and so the glaze's own green: crazing, a
// few hairline cracks across an old tile; and a scallop shell, its ribs fanning from the hinge under a scalloped rim, each line a shade
// under a light (the window is up and to the left). Both are thin and mid-value: the wall is where the fight is.
import { hash } from './sprites.js';
import { clamp } from '../core/math.js';
import { PAL } from './sky-bodies-11-kit.js';

export const RIBS = 7; // a scallop's ribs
const FAN = 0.36; // radians between two ribs

export function craze(g, x, y, s, seed, fade) {
  g.globalAlpha = 0.18 * fade;
  g.strokeStyle = PAL.wall.crack;
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    let [px, py] = [x + s * hash(seed + i), y + s * hash(seed + i + 9)];
    g.moveTo(px, py);
    for (let j = 0; j < 3; j++) {
      px = clamp(px + (hash(seed + i * 7 + j + 20) - 0.5) * 36, x, x + s);
      py = clamp(py + (hash(seed + i * 7 + j + 40) - 0.5) * 36, y, y + s);
      g.lineTo(px, py);
    }
  }
  g.stroke();
}

export function scallop(g, cx, cy, r, fade) {
  const half = ((RIBS - 1) / 2) * FAN;
  const at = (a, k, d) => [cx + Math.sin(a) * r * k + d, cy - Math.cos(a) * r * 0.85 * k + d];
  g.lineWidth = 2.4;
  for (const [color, alpha, d] of [[PAL.wall.crack, 0.45, 1.3], [PAL.wall.sheen, 0.3, -0.9]]) {
    g.beginPath();
    for (let i = 0; i < RIBS; i++) {
      g.moveTo(cx + d, cy + r * 0.55 + d);
      g.lineTo(...at(i * FAN - half, 1, d));
    }
    g.moveTo(...at(-half, 1, d));
    for (let i = 0; i < RIBS - 1; i++) g.quadraticCurveTo(...at((i + 0.5) * FAN - half, 1.14, d), ...at((i + 1) * FAN - half, 1, d));
    g.globalAlpha = alpha * fade;
    g.strokeStyle = color;
    g.stroke();
  }
}
