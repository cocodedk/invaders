// The near layer of Rubber Regatta (bathfoam): the near side of the tub. Heaving crests of foam along the water with the waterline
// glinting in the troughs between them (out.lights), the tub's rolled rim in cream enamel with a long shine along it and foam spilling
// over it here and there, and below the rim the tub's flank, painted butter-cream with a coral pinstripe, the maker's brass plate screwed
// to it (parallax-bath-plate.js). This is the waterline, under the fight: the one place the room is pale.
import { H, rgba, lin, shade, soft } from './sprites.js';
import { PAL } from './sky-bodies-11-kit.js';
import { foamHeap, MARGIN } from './parallax-bath-kit.js';
import { makerPlate, PLATE } from './parallax-bath-plate.js';

export const ROLL = { y: 150, h: 46 }; // the rolled rim in the layer (320 tall: frame 910..956)
export const GLINTS = 9; // glints winking on the water between the crests
const SURFACE = 92; // the water's mean surface in the layer, under the crests' tops

export function bathfoam(g, w, h, rng, L, out) {
  g.save();
  const surf = (x) => SURFACE + 7 * Math.sin(x * 0.012) + 4 * Math.sin(x * 0.037 + 1.3); // the water between the crests, swelling
  g.fillStyle = lin(g, 0, SURFACE - 12, 0, ROLL.y + 10, [[0, PAL.water.mid], [1, PAL.water.lo]]);
  g.beginPath();
  for (let x = 0; x <= w + 16; x += 16) g.lineTo(x, surf(x));
  g.lineTo(w, ROLL.y + 20);
  g.lineTo(0, ROLL.y + 20);
  g.fill();
  g.strokeStyle = rgba(PAL.water.hi, 0.7);
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= w + 16; x += 16) g.lineTo(x, surf(x) + 5);
  g.stroke();
  const crests = [];
  for (let x = -40; x < w + 80; ) { // the crests, with the water showing between them
    const cw = 170 + rng() * 150;
    crests.push([x, cw, 64 + rng() * 76]);
    x += cw * (0.78 + rng() * 0.32);
  }
  for (const [x, cw, ch] of crests) foamHeap(g, rng, x, ROLL.y + 12, cw, ch);
  for (let i = 0; i < GLINTS; i++) { // in the troughs, where one crest gives way to the next
    const [x, cw] = crests[1 + Math.floor((i / GLINTS) * (crests.length - 2))];
    out.lights.push({ x: Math.min(w - 20, x + cw * 0.42), y: ROLL.y - 18 - rng() * 30, r: 18 + rng() * 10, color: '#ffffff', mode: 'flicker', ph: rng(), a: 0.28 });
  }
  const { y, h: rh } = ROLL;
  g.fillStyle = lin(g, 0, y, 0, y + rh, [[0, PAL.enamel.hi], [0.3, PAL.enamel.mid], [0.75, PAL.enamel.lo], [1, shade(PAL.enamel.lo, -0.25)]]);
  g.fillRect(0, y, w, rh);
  g.fillStyle = rgba('#ffffff', 0.9); // the shine along the roll
  g.fillRect(0, y + 7, w, 3);
  for (let i = 0; i < 3; i++) foamHeap(g, rng, 300 + i * 760 + rng() * 200, y + 14, 120 + rng() * 80, 40 + rng() * 20); // foam spilling over
  g.fillStyle = lin(g, 0, y + rh, 0, h, [[0, shade(PAL.enamel.flank, -0.22)], [0.18, PAL.enamel.flank], [1, shade(PAL.enamel.flank, -0.08)]]);
  g.fillRect(0, y + rh, w, h - y - rh);
  g.fillStyle = PAL.coral; // the pinstripe
  g.fillRect(0, y + rh + 12, w, 3);
  g.fillRect(0, y + rh + 19, w, 1);
  for (let i = 0; i < 6; i++) { // the window's light, long and soft on the enamel
    g.globalAlpha = 0.3;
    g.drawImage(soft('#ffffff'), rng() * w - 150, y + rh + 34 + rng() * 40, 300, 16);
  }
  g.globalAlpha = 1;
  makerPlate(g, PLATE.x + MARGIN, PLATE.y - (H - h));
  g.restore();
}
