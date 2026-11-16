// The Dowager Duck's live sprites (World 19, Rubber Regatta; drawn by duck-fx.js, painted once by warm, which warmBoss calls): each a cached
// canvas with where its top-left corner goes in boss coordinates, { img, x, y }.
//   crest()    the foam crest across her waist (duck-shape.js FOAM_FRONT, duck-foam.js): laid over the parts, so that the feet, the squeaker
//              and the foot of the tum paddle under it
//   plaster()  two sticking plasters crossed over the leak in her tum, from the hover on: pale pink-tan strips with a padded middle and rows of
//              air holes, their corners rounded, a little crumpled where they cross
//   crossed()  her eyes crossed (duck-face.js eyes(g, true)), laid over the hull's for a moment when she is bonked
//   bubble()   a soap bubble: a thin rim in the colours of soap film and a catch-light, for the bubbles rising off the foam (64 x 64)
import { cached } from '../sprites.js';
import { PAL, PART, rgba, rad, lin, line, circle, ellipse, inked, glint, TAU } from './duck-kit.js';
import { FOAM_FRONT, EYE } from './duck-shape.js';
import { foam } from './duck-foam.js';
import { eyes } from './duck-face.js';

const span = (lumps) => {
  const x0 = Math.min(...lumps.map(([x, , r]) => x - r)) - 4;
  const y0 = Math.min(...lumps.map(([, y, r]) => y - r)) - 4;
  return [Math.floor(x0), Math.floor(y0), Math.ceil(Math.max(...lumps.map(([x, , r]) => x + r)) + 4), Math.ceil(Math.max(...lumps.map(([, y, r]) => y + r)) + 4)];
};
const CREST = span(FOAM_FRONT);

export const crest = () => ({
  img: cached('duckCrest', CREST[2] - CREST[0], CREST[3] - CREST[1], (g) => {
    g.translate(-CREST[0], -CREST[1]);
    foam(g, FOAM_FRONT, 11);
  }),
  x: CREST[0],
  y: CREST[1],
});

function strip(g, a) {
  g.save();
  g.rotate(a);
  g.beginPath();
  g.roundRect(-74, -17, 148, 34, 16);
  g.fillStyle = lin(g, 0, -17, 0, 17, [[0, '#ffe3cc'], [0.5, PAL.plaster], [1, PAL.plasterD]]);
  g.fill();
  inked(g, 3);
  g.beginPath();
  g.roundRect(-22, -12, 44, 24, 6); // the pad
  g.fillStyle = '#fff6ec';
  g.fill();
  line(g, rgba(PAL.plasterD, 0.8), 1.6);
  for (const x of [-60, -50, -40, 40, 50, 60]) {
    for (const y of [-7, 0, 7]) {
      circle(g, x, y, 1.6);
      g.fillStyle = rgba('#8a5034', 0.6);
      g.fill();
    }
  }
  g.restore();
}

export const plaster = () => ({
  img: cached('duckPlaster', 170, 170, (g) => {
    g.translate(85, 85);
    strip(g, -0.55);
    strip(g, 0.55);
    glint(g, -20, -26, 22, 4, 0.5, -0.55);
  }),
  x: PART.belly.x + 18 - 85,
  y: PART.belly.y - 6 - 85,
});

const EYES = [Math.floor(EYE[0] * 1.6), Math.floor(EYE[1] - EYE[3] * 2.1), Math.ceil(-EYE[0] * 3.2), Math.ceil(EYE[3] * 3.4)];

export const crossed = () => ({
  img: cached('duckCrossed', EYES[2], EYES[3], (g) => {
    g.translate(-EYES[0], -EYES[1]);
    eyes(g, true);
  }),
  x: EYES[0],
  y: EYES[1],
});

export const bubble = () => cached('duckBubble', 64, 64, (g) => {
  g.translate(32, 32);
  circle(g, 0, 0, 28);
  g.fillStyle = rad(g, 0, 0, 18, 29, [[0, rgba('#ffffff', 0)], [0.7, rgba('#d8f0ff', 0.25)], [1, rgba('#ffffff', 0)]]);
  g.fill();
  ['#ff9ad0', '#ffe36a', '#9ad8ff', '#c0ffb0'].forEach((c, i) => {
    g.beginPath();
    g.arc(0, 0, 27, (i / 4) * TAU, ((i + 1) / 4) * TAU);
    line(g, rgba(c, 0.85), 2.4);
  });
  ellipse(g, -11, -12, 7, 4, -0.7);
  g.fillStyle = rgba('#ffffff', 0.9);
  g.fill();
});
