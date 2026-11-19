// World 21's ship (ship-view.js draws it in place of the chrome hull, in the ship's own banked frame): a GOLDEN SKY CHARIOT, empty, seen
// from behind as it climbs: a hull of gold lotus petals tipped in vermilion, a small canopy stepped like a temple tower on
// it, two spoked wheels of gold at its sides and a vermilion pennant streaming back from a pole each side. It needs no engine, so no
// flames. Ornament only: no rider, no emblem on the pennants. Baked once; per frame it is one drawImage, no shadow blur.
import { cached } from './sprites.js';
import { path, ink, lin, line, circle, ellipse, rgba, mix, TAU, gilt, VERMILION, BLACK, GOLD, GOLD_D, GOLD_P } from './aliens/w21-kit.js';

export const CHARIOT = 112; // px, the baked chariot's canvas
const WHEEL = { x: 31, y: 15, r: 12, spokes: 6 }; // a wheel's centre (each side), radius and spokes: its rim near the hull's wing lights
const POLE = { x: 17, foot: 8, top: -36 }; // a pennant's pole
const TIERS = [[11, 9, -10, -16], [9, 7, -16, -22], [7, 5, -22, -28], [5, 3, -28, -33]]; // the canopy's tiers: half widths, bottom, top

// A lotus petal from its base (x, yb) up to its tip at yt, w wide each side.
function petal(g, x, yb, yt, w) {
  const h = yb - yt;
  g.beginPath();
  g.moveTo(x, yb);
  g.bezierCurveTo(x - w, yb - h * 0.15, x - w, yt + h * 0.4, x, yt);
  g.bezierCurveTo(x + w, yt + h * 0.4, x + w, yb - h * 0.15, x, yb);
  ink(g, lin(g, 0, yt, 0, yb, [[0, VERMILION], [0.25, '#f08a5a'], [0.5, GOLD_P], [0.75, GOLD], [1, GOLD_D]]), 1.3);
  g.beginPath(); // the midrib
  g.moveTo(x, yb - 2);
  g.lineTo(x, yt + 4);
  line(g, rgba(GOLD_D, 0.8), 0.9);
}

function pennant(g, s) {
  g.beginPath();
  g.moveTo(s * POLE.x, POLE.top + 1);
  g.quadraticCurveTo(s * 27, POLE.top - 3, s * 39, POLE.top + 7);
  g.lineTo(s * 32, POLE.top + 10); // the swallowtail's notch
  g.lineTo(s * 37, POLE.top + 17);
  g.quadraticCurveTo(s * 26, POLE.top + 9, s * POLE.x, POLE.top + 10);
  g.closePath();
  ink(g, lin(g, s * POLE.x, 0, s * 39, 0, [[0, VERMILION], [1, mix(VERMILION, BLACK, 0.35)]]), 1.1);
  g.beginPath(); // its gold hem
  g.moveTo(s * POLE.x, POLE.top + 4);
  g.quadraticCurveTo(s * 26, POLE.top + 1, s * 35, POLE.top + 9);
  line(g, GOLD, 1);
  g.beginPath(); // the pole and its knob
  g.moveTo(s * POLE.x, POLE.foot);
  g.lineTo(s * POLE.x, POLE.top);
  line(g, BLACK, 3.2);
  line(g, GOLD, 1.6);
  circle(g, s * POLE.x, POLE.top - 1, 2.2);
  ink(g, GOLD_P, 0.9);
}

function wheel(g, s) {
  const { x, y, r, spokes } = WHEEL;
  circle(g, s * x, y, r);
  ink(g, rgba(BLACK, 0.85), 5.5);
  g.beginPath();
  for (let i = 0; i < spokes; i++) {
    const a = (i * TAU) / spokes;
    g.moveTo(s * x, y);
    g.lineTo(s * x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  line(g, GOLD_D, 1.8);
  circle(g, s * x, y, r);
  line(g, gilt(g, s * x - r, y - r, s * x + r, y + r), 3.2);
  circle(g, s * x, y, 3.4); // the hub
  ink(g, VERMILION, 1.2);
}

function canopy(g) {
  path(g, [[-12, 2], [-12, -10], [12, -10], [12, 2]]); // its open bay, hung with a vermilion curtain
  ink(g, lin(g, 0, -10, 0, 2, [[0, mix(VERMILION, BLACK, 0.2)], [1, mix(VERMILION, BLACK, 0.6)]]), 1.4);
  g.beginPath();
  g.moveTo(-7, 2);
  g.lineTo(-7, -4);
  g.quadraticCurveTo(0, -11, 7, -4);
  g.lineTo(7, 2);
  ink(g, rgba(BLACK, 0.85), 1);
  for (const [wb, wt, yb, yt] of TIERS) {
    path(g, [[-wb, yb], [-wt, yt], [wt, yt], [wb, yb]]);
    ink(g, gilt(g, -wb, yt, wb, yb), 1.2);
    g.fillStyle = VERMILION;
    g.fillRect(-wb + 1, yb - 1.6, wb * 2 - 2, 1.4);
  }
  ellipse(g, 0, -35, 6, 2.6); // the ribbed disc, the knob and the spire on top
  ink(g, gilt(g, -6, -38, 6, -32), 1);
  circle(g, 0, -39.5, 2.6);
  ink(g, GOLD_P, 1);
  path(g, [[-1, -41.5], [0, -46], [1, -41.5]]);
  ink(g, GOLD, 0.8);
}

function paint(g) {
  g.lineJoin = 'round';
  for (const s of [-1, 1]) pennant(g, s);
  for (const s of [-1, 1]) wheel(g, s);
  canopy(g);
  for (const x of [-18, -6, 6, 18]) petal(g, x, 18, -6, 9); // the back row of the lotus hull
  for (const x of [-12, 0, 12]) petal(g, x, 27, 3, 9.5); // the front row
  ellipse(g, 0, 26, 13, 3.4); // the hull's gold keel
  ink(g, gilt(g, -13, 23, 13, 29), 1.2);
}

export const chariotSprite = () => cached('isleChariot', CHARIOT, CHARIOT, (g) => {
  g.translate(CHARIOT / 2, CHARIOT / 2);
  paint(g);
});

// The chariot in the ship's frame (centre at the origin); the wing lights' share of the hull's 38 px.
export function drawChariot(ctx, bank) {
  ctx.drawImage(chariotSprite(), -CHARIOT / 2, -CHARIOT / 2);
  const k = 1 - 0.14 * Math.abs(bank);
  return [k, k];
}
