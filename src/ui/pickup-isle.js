// The pickup capsule's rim in Golden Isle (pickup-skins.js FRAMES[21]): a lotus round the dark middle. Ten gold petals tipped in
// vermilion stand out from a band of gold leaf, ten vermilion ones behind them in the gaps, and a thin line of the power's colour runs
// round the inside, so the power still reads at a glance. Baked once into the 60 x 60 sprite (pickups-view.js), centred on the origin,
// nothing past a radius of 29. A frame only: the six standard powers keep their icons.
import { rgba, lin } from './sprites.js';
import { TAU } from '../core/math.js';
import { ink, VERMILION, BLACK, GOLD, GOLD_D, GOLD_P, mix } from './aliens/w21-kit.js';

const PETALS = 10;
const [BASE, TIP, BACK_TIP] = [19, 28.4, 26]; // px: where a petal starts, and where a front and a back one end
const BAND = 21; // px: the gold band's middle

function petal(g, a, tip, w, fill) {
  g.save();
  g.rotate(a);
  g.beginPath();
  g.moveTo(BASE, 0);
  const h = tip - BASE;
  g.bezierCurveTo(BASE + h * 0.15, -w, tip - h * 0.4, -w, tip, 0);
  g.bezierCurveTo(tip - h * 0.4, w, BASE + h * 0.15, w, BASE, 0);
  ink(g, fill(g, tip), 1);
  g.restore();
}

const ring = (g, r, style, w) => {
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.lineWidth = w;
  g.strokeStyle = style;
  g.stroke();
};

export function lotus(g, color) {
  const back = (c, tip) => lin(c, BASE, 0, tip, 0, [[0, mix(VERMILION, BLACK, 0.5)], [1, VERMILION]]);
  const front = (c, tip) => lin(c, BASE, 0, tip, 0, [[0, GOLD_D], [0.4, GOLD], [0.65, GOLD_P], [0.85, '#f08a5a'], [1, VERMILION]]);
  for (let i = 0; i < PETALS; i++) petal(g, ((i + 0.5) * TAU) / PETALS, BACK_TIP, 6, back);
  for (let i = 0; i < PETALS; i++) petal(g, (i * TAU) / PETALS, TIP, 6.5, front);
  g.beginPath();
  g.arc(0, 0, BAND, 0, TAU);
  g.fillStyle = 'rgba(8,10,20,0.88)';
  g.fill();
  ring(g, BAND, BLACK, 4);
  ring(g, BAND, GOLD, 2.4);
  ring(g, BAND - 0.6, rgba(GOLD_P, 0.7), 0.8);
  ring(g, BAND - 3, color, 1.4); // the power's own line inside the band
}
