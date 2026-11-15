// The wooden toy steamer that crosses the back of the bath (flourish-bath.js bathsteamer), painted once into its sprite
// (flourish-bath-sprites.js): a varnished plank hull with a raised bow, a red boot stripe at the waterline and a lighter gunwale, a cream
// deckhouse with brass-rimmed portholes under a dark roof, a red funnel with a black top, and a mast at the bow flying a coral pennant.
// Bow to the right; the flourish flips it to sail left.
import { rgba, lin, shade, roundRect } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './sky-bodies-11-kit.js';

export const BOAT = { w: 250, h: 150, water: 128, funnel: [132, 12] }; // the canvas, the waterline's y in it, the funnel's mouth

function hullPath(g, wl) {
  g.beginPath();
  g.moveTo(20, 92);
  g.lineTo(212, 86);
  g.quadraticCurveTo(236, 82, 240, 76);
  g.quadraticCurveTo(238, 108, 214, wl + 8);
  g.lineTo(46, wl + 8);
  g.quadraticCurveTo(18, wl + 2, 20, 92);
  g.closePath();
}

export function paintSteamer(g) {
  const wl = BOAT.water;
  const ink = shade(PAL.wood, -0.6);
  g.lineJoin = 'round';
  g.fillStyle = lin(g, 0, 50, 0, 92, [[0, shade(PAL.cream, 0.1)], [1, shade(PAL.cream, -0.12)]]); // the deckhouse
  roundRect(g, 70, 52, 112, 40, 6);
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = 2;
  g.stroke();
  for (let i = 0; i < 4; i++) { // portholes
    const px = 88 + i * 26;
    g.fillStyle = '#3a4e7a';
    g.beginPath();
    g.arc(px, 74, 7, 0, TAU);
    g.fill();
    g.strokeStyle = PAL.brass.light;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = rgba('#ffffff', 0.7);
    g.fillRect(px - 4, 70, 3, 3);
  }
  g.fillStyle = shade(PAL.wood, -0.35); // the roof
  roundRect(g, 64, 46, 124, 9, 4);
  g.fill();
  g.fillStyle = lin(g, 118, 0, 148, 0, [[0, shade(PAL.red, -0.35)], [0.4, shade(PAL.red, 0.15)], [1, shade(PAL.red, -0.4)]]); // the funnel
  g.beginPath();
  g.moveTo(120, 48);
  g.lineTo(122, BOAT.funnel[1]);
  g.lineTo(144, BOAT.funnel[1]);
  g.lineTo(146, 48);
  g.fill();
  g.fillStyle = '#1c140e';
  g.fillRect(121, BOAT.funnel[1], 24, 10);
  g.strokeStyle = ink;
  g.lineWidth = 2;
  g.strokeRect(121, BOAT.funnel[1], 24, 36);
  g.strokeStyle = shade(PAL.wood, -0.3); // the mast and its pennant
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(206, 86);
  g.lineTo(210, 26);
  g.stroke();
  g.fillStyle = PAL.coral;
  g.beginPath();
  g.moveTo(210, 26);
  g.lineTo(238, 33);
  g.lineTo(210, 41);
  g.fill();
  hullPath(g, wl);
  g.fillStyle = lin(g, 0, 80, 0, wl + 8, [[0, shade(PAL.wood, 0.3)], [0.45, PAL.wood], [1, shade(PAL.wood, -0.4)]]);
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = rgba(ink, 0.35); // the planks
  for (const py of [100, 110, 120]) g.fillRect(0, py, BOAT.w, 1.5);
  g.fillStyle = PAL.red; // the boot stripe
  g.fillRect(0, wl - 4, BOAT.w, 12);
  g.fillStyle = shade(PAL.wood, 0.45); // the gunwale
  g.fillRect(0, 82, BOAT.w, 8);
  g.restore();
  hullPath(g, wl);
  g.strokeStyle = ink;
  g.lineWidth = 2.2;
  g.stroke();
}
