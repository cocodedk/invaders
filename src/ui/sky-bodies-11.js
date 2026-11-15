// World 19's sky body (registry; BODIES11): bathwall, the wall of a sunlit bathroom at toy scale, baked once over the gradient the
// builder laid (look.sky, leaf-green to butter). Big glazed tiles in leaf green, each a shade apart, pillowed at its edges, a soft sheen
// on its glaze that grows toward the window, crazing or a shell in relief on a few (sky-bodies-11-tiles.js), set in dark grout; threads
// of condensation running down them, each with a bead at its foot; a small plain sash window high in the top-left corner in a coral tile
// surround, its four panes steamed over, the low sun a blur behind the lower two and runs where drops slid through the steam; and soft
// shafts of that sun falling from it down across the room. The wall is where the fight is, so it stays mid-value (the look's value rule): the pale colours are laid thin.
import { W, H, hash, soft, glow, rgba, lin, shade, makeCanvas, addGlow, roundRect } from './sprites.js';
import { smooth, TAU } from '../core/math.js';
import { PAL, TILE, GROUT, TILES_TO, SHEEN_A, WINDOW, SUN } from './sky-bodies-11-kit.js';
import { craze, scallop } from './sky-bodies-11-tiles.js';

const X0 = ((W / 2 - TILE / 2) % TILE) - TILE; // a tile sits centred on the frame's middle
const fadeAt = (y) => 1 - smooth((y - TILES_TO + 60) / 200); // the tiles thin into the steam over the water
const lit = (x, y) => Math.exp(-(((x - WINDOW.x - 380) / 760) ** 2) - ((y - WINDOW.y - 300) / 520) ** 2); // the window's light on the wall
export const THREADS = 34; // threads of condensation on the tiles
export const SHAFTS = [[0.04, 0.3, 0.21], [0.38, 0.6, 0.15], [0.68, 0.96, 0.14]]; // from, to (share of the window's height), peak alpha
const SLOPE = [0.86, 0.5]; // the sunlight's way through the room: low, down and to the right
const REACH = 1300;

function grout(g) {
  const c = PAL.wall.grout;
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, rgba(c, 0.72)], [TILES_TO / H, rgba(c, 0.6)], [Math.min(1, (TILES_TO + 170) / H), rgba(c, 0)]]);
  for (let x = X0; x < W; x += TILE) g.fillRect(x - GROUT / 2, 0, GROUT, H);
  for (let y = TILE; y < H; y += TILE) g.fillRect(0, y - GROUT / 2, W, GROUT);
}

function tiles(g) {
  const { dark, light, crack, sheen } = PAL.wall;
  const s = TILE - GROUT;
  for (let r = 0; r * TILE < H; r++) {
    const fade = fadeAt(r * TILE + TILE / 2);
    if (fade <= 0.01) break;
    for (let c = 0; X0 + c * TILE < W; c++) {
      const [x, y] = [X0 + c * TILE + GROUT / 2, r * TILE + GROUT / 2];
      const k = hash(r * 97 + c * 13 + 5);
      g.globalAlpha = (0.1 + 0.3 * Math.abs(k - 0.5)) * fade; // each tile glazed a shade apart
      g.fillStyle = k < 0.5 ? dark : light;
      g.fillRect(x, y, s, s);
      g.globalAlpha = 0.24 * fade; // pillowed edges: lit along the top and the left, shaded along the bottom and the right
      g.fillStyle = sheen;
      g.fillRect(x + 2, y, s - 4, 3);
      g.fillRect(x, y + 2, 3, s - 4);
      g.globalAlpha = 0.4 * fade;
      g.fillStyle = crack;
      g.fillRect(x + 2, y + s - 4, s - 4, 4);
      g.fillRect(x + s - 4, y + 2, 4, s - 4);
      g.globalAlpha = SHEEN_A * fade * (0.3 + 0.7 * lit(x, y)); // the glaze's sheen, brighter toward the window
      g.drawImage(soft(sheen), x + 8 + 22 * k, y + 8, s * 0.52, s * 0.36);
      if (k > 0.82) craze(g, x, y, s, r * 131 + c * 17, fade);
      else if (k > 0.4 && k < 0.5) scallop(g, x + s / 2, y + s * 0.56, s * 0.3, fade); // a shell in relief on a few
    }
  }
  g.globalAlpha = 1;
}

function threads(g) {
  const { x: wx, y: wy, w: ww, h: wh } = WINDOW;
  g.lineCap = 'round';
  for (let i = 0; i < THREADS; i++) {
    const x = hash(i * 3 + 400) * W;
    const y0 = hash(i * 3 + 401) * (TILES_TO - 160);
    if (x > wx - 40 && x < wx + ww + 40 && y0 < wy + wh + 50) continue; // the panes have runs of their own
    const len = 50 + 170 * hash(i * 3 + 402);
    const at = (s) => x + Math.sin(s * 0.07 + i) * 2.4;
    g.beginPath();
    for (let s = 0; s <= len; s += 10) g.lineTo(at(s), y0 + s);
    g.strokeStyle = rgba(PAL.wall.crack, 0.3);
    g.lineWidth = 3.2;
    g.stroke();
    g.strokeStyle = rgba(PAL.wall.sheen, 0.24);
    g.lineWidth = 1.2;
    g.stroke();
    g.globalAlpha = 0.5; // the bead at its foot
    g.drawImage(soft(PAL.wall.sheen), at(len) - 4, y0 + len - 4, 8, 10);
    g.globalAlpha = 1;
  }
}

function pane(g, px, py, pw, ph, i) {
  g.save();
  g.beginPath();
  g.rect(px, py, pw, ph);
  g.clip();
  const { y: wy, h: wh } = WINDOW; // cool steam at the top of the window, warming toward the low sun behind the lower panes
  g.fillStyle = lin(g, 0, wy, 0, wy + wh, [[0, shade(PAL.glass, -0.14)], [0.45, PAL.glass], [1, PAL.glassSun]]);
  g.fillRect(px, py, pw, ph);
  addGlow(g, glow(PAL.sun), SUN.x, SUN.y, SUN.r, SUN.a); // the low sun, blurred by the steam
  for (let k = 0; k < 6; k++) { // the steam, mottled
    g.globalAlpha = 0.08;
    g.drawImage(soft(PAL.wall.steam), px + hash(i * 20 + k) * pw - 30, py + hash(i * 20 + k + 7) * ph - 24, 60, 48);
  }
  g.globalAlpha = 1;
  g.lineCap = 'round';
  for (let k = 0; k < 4; k++) { // runs where drops slid down and cleared the steam, a bead at the foot of each
    const [rx, ry] = [px + 8 + hash(i * 31 + k) * (pw - 16), py + hash(i * 31 + k + 5) * ph * 0.4];
    const len = 18 + hash(i * 31 + k + 9) * ph * 0.55;
    g.beginPath();
    g.moveTo(rx, ry);
    g.quadraticCurveTo(rx + 3, ry + len / 2, rx - 1, ry + len);
    g.strokeStyle = rgba(shade(PAL.glass, -0.4), 0.5);
    g.lineWidth = 2.6;
    g.stroke();
    g.fillStyle = rgba(PAL.wall.sheen, 0.6);
    g.beginPath();
    g.arc(rx - 1, ry + len, 2.4, 0, TAU);
    g.fill();
  }
  g.restore();
}

// The sash window: a coral bullnose surround and sill, a painted frame, four steamed panes, the meeting rail and its brass catch.
function sash(g) {
  const { x, y, w, h } = WINDOW;
  g.fillStyle = lin(g, x - 18, 0, x + w + 18, 0, [[0, PAL.coralDark], [0.3, PAL.coral], [0.7, PAL.coral], [1, PAL.coralDark]]);
  roundRect(g, x - 18, y - 18, w + 36, h + 32, 12);
  g.fill();
  g.fillStyle = rgba('#000000', 0.28);
  g.fillRect(x - 30, y + h + 22, w + 60, 7);
  g.fillStyle = PAL.coral;
  g.fillRect(x - 30, y + h + 6, w + 60, 16);
  g.fillStyle = rgba(PAL.peach, 0.7);
  g.fillRect(x - 30, y + h + 6, w + 60, 2);
  g.fillStyle = PAL.frame;
  g.fillRect(x, y, w, h);
  const [b, rail] = [10, 8];
  const [pw, ph] = [(w - 3 * b) / 2, (h - 3 * b - rail) / 2];
  for (let i = 0; i < 4; i++) pane(g, x + b + (i % 2) * (pw + b), y + b + (i >> 1) * (ph + b + rail), pw, ph, i);
  g.fillStyle = rgba('#000000', 0.22); // the frame's inner shadow, over the panes' top and left edges
  for (let i = 0; i < 4; i++) {
    const [px, py] = [x + b + (i % 2) * (pw + b), y + b + (i >> 1) * (ph + b + rail)];
    g.fillRect(px, py, pw, 3);
    g.fillRect(px, py, 3, ph);
  }
  g.fillStyle = shade(PAL.frame, -0.2);
  g.fillRect(x, y + b + ph, w, b + rail);
  g.fillStyle = PAL.brass.light;
  g.fillRect(x + w / 2 - 10, y + b + ph + 3, 20, 6);
}

function shafts(g) {
  const c = makeCanvas(W, H);
  const s = c.getContext('2d');
  const [dx, dy] = SLOPE;
  const x = WINDOW.x + WINDOW.w;
  for (const [a, b, peak] of SHAFTS) {
    const [y0, y1] = [WINDOW.y + WINDOW.h * a, WINDOW.y + WINDOW.h * b];
    s.fillStyle = lin(s, x, y0, x + dx * REACH, y0 + dy * REACH, [[0, rgba(PAL.sun, peak)], [0.45, rgba(PAL.sun, peak * 0.4)], [1, rgba(PAL.sun, 0)]]);
    s.beginPath();
    s.moveTo(x - 30, y0);
    s.lineTo(x + dx * REACH, y0 + dy * REACH - 80);
    s.lineTo(x + dx * REACH, y1 + dy * REACH + 160);
    s.lineTo(x - 30, y1);
    s.fill();
  }
  g.globalCompositeOperation = 'lighter';
  g.filter = 'blur(18px)';
  g.drawImage(c, 0, 0);
  g.filter = 'none';
  g.globalCompositeOperation = 'source-over';
}

function bathwall(g) {
  g.save();
  grout(g);
  tiles(g);
  threads(g);
  shafts(g);
  sash(g);
  g.restore();
}

export const BODIES11 = { bathwall };
