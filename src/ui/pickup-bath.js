// The pickup capsule's rim in Rubber Regatta (pickup-skins.js FRAMES[19]): a ring of soap bubbles round the dark middle. Fourteen suds,
// big and small in turn, each a pale foam bubble outlined in ink with a rim of the power's colour catching the light and a window glint,
// and a thin line of the power's colour round the inside of the ring, so the power still reads at a glance. Baked once into the 60 x 60
// sprite (pickups-view.js), centred on the origin, nothing past a radius of 29. A frame only: the six standard powers keep their icons.
import { INK, rgba, rad } from './sprites.js';
import { TAU } from '../core/math.js';

const SUDS = 14;
const RING = 24; // px: where the bubbles sit
const [BIG, SMALL] = [4.6, 3.4];

export function suds(g, color) {
  g.fillStyle = 'rgba(8,10,20,0.88)';
  g.beginPath();
  g.arc(0, 0, 21, 0, TAU);
  g.fill();
  g.lineWidth = 1.3; // the power's own line inside the suds
  g.strokeStyle = rgba(color, 0.95);
  g.beginPath();
  g.arc(0, 0, 20.4, 0, TAU);
  g.stroke();
  g.lineCap = 'round';
  for (let i = 0; i < SUDS; i++) {
    const a = (i * TAU) / SUDS - Math.PI / 2;
    const r = i % 2 ? SMALL : BIG;
    const d = RING + (i % 2 ? -0.6 : 0);
    const [x, y] = [Math.cos(a) * d, Math.sin(a) * d];
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fillStyle = rad(g, x, y, 0, r, [[0, '#fbf8ee'], [0.7, '#e4efe4'], [1, '#c9dccd']], x - r * 0.35, y - r * 0.4);
    g.fill();
    g.lineWidth = 1.1;
    g.strokeStyle = INK;
    g.stroke();
    g.beginPath(); // the power's colour catching the bubble's rim
    g.arc(x, y, r * 0.72, 0.2, 2.1);
    g.lineWidth = 1.2;
    g.strokeStyle = color;
    g.stroke();
    g.beginPath();
    g.arc(x - r * 0.35, y - r * 0.38, r * 0.26, 0, TAU);
    g.fillStyle = '#ffffff';
    g.fill();
  }
  g.lineCap = 'butt';
}
