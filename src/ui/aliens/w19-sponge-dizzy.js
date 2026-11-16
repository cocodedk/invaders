// World 19's armored knocked out (see w19-sponge.js and bodies-view.js), drawn into a single context: the Sponge squashed flat and round,
// its brows gone wavy, cross-eyed, its tongue out, wrung-out drops falling from it.
import { lin, rad, rgba, shade, mix, line, INK, crossEyes, tongue } from './w19-kit.js';
import { lumps, swell, pores } from './w19-sponge.js';

export function dizzySponge(g, c) {
  lumps(g, 37, 25, 6, 12, 9);
  g.fillStyle = rad(g, -8, -4, 2, 42, [[0, shade(c, 0.4)], [0.5, c], [1, mix(c, '#4a1604', 0.55)]]);
  g.fill();
  g.save();
  lumps(g, 37, 25, 6, 12, 9);
  g.clip();
  swell(g, c, 37, 25, 6, 12, 9);
  pores(g, c, 9, 35, 24, 6, 8, (x, y) => Math.abs(x) < 17 && y > -8 && y < 18);
  g.restore();
  lumps(g, 37, 25, 6, 12, 9);
  line(g, INK, 2.8);
  for (const s of [-1, 1]) { // the brows, gone wavy
    g.beginPath();
    g.moveTo(s * 4, -8);
    g.quadraticCurveTo(s * 8, -12, s * 11, -9);
    g.quadraticCurveTo(s * 14, -6, s * 18, -10);
    line(g, INK, 1.6);
  }
  crossEyes(g, 0, -1, 17, 5.2);
  g.beginPath();
  g.moveTo(-7, 10);
  g.quadraticCurveTo(0, 14, 7, 10);
  line(g, INK, 1.8);
  tongue(g, 2, 11, 5, 6, 1.5);
  for (const [x, y] of [[-14, 34], [10, 36]]) {
    g.beginPath();
    g.moveTo(x, y - 4);
    g.quadraticCurveTo(x + 2.4, y, x, y + 2);
    g.quadraticCurveTo(x - 2.4, y, x, y - 4);
    g.fillStyle = lin(g, 0, y - 4, 0, y + 2, [[0, rgba('#ffffff', 0.5)], [1, rgba('#7aa8d8', 0.7)]]);
    g.fill();
    line(g, rgba(INK, 0.5), 0.8);
  }
}
