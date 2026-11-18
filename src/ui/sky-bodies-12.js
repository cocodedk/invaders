// World 20's sky body (registry; BODIES12): presshall, the back wall of a great printing hall at night, baked once over the gradient the
// builder laid (look.sky, ink black to a warm lamp-brown at the floor). The iron lattice of the roof crosses the top under the HUD's band;
// three tall arched windows let in a cold moon through their glazing bars; a long drying line high across the hall carries far sheets,
// laid thin so the wall stays dark where the fight is; lamps hang on long cords in pools of warm light. Nothing here animates.
import { W, glow, hash, rgba, lin, addGlow } from './sprites.js';
import { PAL, HALL } from './press-kit.js';

function trusses(g) {
  const { truss, bay } = HALL;
  g.strokeStyle = PAL.iron;
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(0, truss);
  g.lineTo(W, truss);
  g.stroke();
  g.lineWidth = 5;
  g.beginPath();
  for (let x = 0; x < W; x += bay) {
    g.moveTo(x, truss);
    g.lineTo(x + bay / 2, 0);
    g.lineTo(x + bay, truss);
  }
  g.stroke();
}

function windows(g) {
  const { y, w, h } = HALL.window;
  for (const x of HALL.windows) {
    g.save();
    g.beginPath();
    g.moveTo(x - w / 2, y + h);
    g.arc(x, y + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w / 2, y + h);
    g.closePath();
    g.fillStyle = lin(g, 0, y, 0, y + h, [[0, PAL.glass], [1, PAL.glassLow]]);
    g.fill();
    g.clip();
    addGlow(g, glow(PAL.moon), x, y + h * 0.3, w, 0.16); // the moon, cold behind the glass
    g.strokeStyle = PAL.ink;
    g.lineWidth = 5;
    g.beginPath();
    for (let gx = x - w / 4; gx < x + w / 2; gx += w / 4) {
      g.moveTo(gx, y);
      g.lineTo(gx, y + h);
    }
    for (let gy = y + w / 2; gy < y + h; gy += HALL.pane) {
      g.moveTo(x - w / 2, gy);
      g.lineTo(x + w / 2, gy);
    }
    g.stroke();
    g.restore();
  }
}

function line(g) {
  const { y, span, sag, sheet, a } = HALL.line;
  const at = (x) => y + sag * 4 * ((x % span) / span) * (1 - (x % span) / span);
  g.strokeStyle = rgba(PAL.paperShade, 0.3);
  g.lineWidth = 1.5;
  g.beginPath();
  for (let x = 0; x <= W; x += 8) g.lineTo(x, at(x));
  g.stroke();
  for (let i = 0; i * sheet < W; i++) {
    const x = i * sheet + 8;
    const [sw, sh] = [sheet * (0.6 + 0.2 * hash(i + 70)), 50 + 34 * hash(i + 71)];
    g.fillStyle = rgba(PAL.paper, a);
    g.fillRect(x, at(x), sw, sh);
    g.fillStyle = rgba(hash(i + 72) < 0.25 ? PAL.vermilion : PAL.ink, a * 1.5); // the print on it, seen from afar
    for (let r = 10; r < sh - 8; r += 9) g.fillRect(x + 6, at(x) + r, sw - 12, 2);
  }
}

function lamps(g) {
  const { r, a } = HALL.lamp;
  for (const [x, y] of HALL.lamps) {
    g.strokeStyle = PAL.iron;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, HALL.truss);
    g.lineTo(x, y);
    g.stroke();
    addGlow(g, glow(PAL.lamp), x, y + 30, r, a, 0.8);
    g.fillStyle = PAL.ink; // the shade
    g.beginPath();
    g.moveTo(x - 10, y);
    g.lineTo(x + 10, y);
    g.lineTo(x + 30, y + 24);
    g.lineTo(x - 30, y + 24);
    g.fill();
  }
}

function presshall(g) {
  g.save();
  windows(g);
  trusses(g);
  line(g);
  lamps(g);
  g.restore();
}

export const BODIES12 = { presshall };
