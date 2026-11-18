// The pickup capsule's rim in Midnight Press (pickup-skins.js FRAMES[20]): a band of cream paper round the dark middle, inked on both
// edges and marked like a printer's rule with ink ticks, four vermilion registration marks (a circle and its cross) at the compass
// points, and a thin line of the power's colour round the inside, so the power still reads at a glance. Baked once into the 60 x 60
// sprite (pickups-view.js), centred on the origin, nothing past a radius of 29. A frame only: the six standard powers keep their icons.
import { rgba } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './press-kit.js';

const BAND = 24.5; // px: the paper band's middle
const WIDTH = 6; // px across the band
const TICKS = 24; // the rule's ticks round the band
const MARK = 3.6; // px: a registration mark's radius

function circle(g, r) {
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
}

export function type(g, color) {
  circle(g, BAND - WIDTH / 2);
  g.fillStyle = 'rgba(8,10,20,0.88)';
  g.fill();
  circle(g, BAND); // the paper band, inked at both edges
  g.lineWidth = WIDTH + 2;
  g.strokeStyle = PAL.ink;
  g.stroke();
  g.lineWidth = WIDTH;
  g.strokeStyle = PAL.paper;
  g.stroke();
  g.beginPath(); // the rule's ticks
  for (let i = 0; i < TICKS; i++) {
    const a = (i * TAU) / TICKS;
    const r0 = BAND + (i % 2 ? 0.5 : -1.5);
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * (BAND + WIDTH / 2), Math.sin(a) * (BAND + WIDTH / 2));
  }
  g.lineWidth = 0.9;
  g.strokeStyle = rgba(PAL.ink, 0.7);
  g.stroke();
  circle(g, BAND - WIDTH / 2 - 1.4); // the power's own line inside the band
  g.lineWidth = 1.4;
  g.strokeStyle = color;
  g.stroke();
  for (let i = 0; i < 4; i++) { // the registration marks
    const a = (i * TAU) / 4 - Math.PI / 4;
    const [x, y] = [Math.cos(a) * BAND, Math.sin(a) * BAND];
    g.beginPath();
    g.arc(x, y, MARK, 0, TAU);
    g.fillStyle = PAL.paper;
    g.fill();
    g.lineWidth = 1.2;
    g.strokeStyle = PAL.vermilion;
    g.stroke();
    g.beginPath();
    g.moveTo(x - MARK - 1, y);
    g.lineTo(x + MARK + 1, y);
    g.moveTo(x, y - MARK - 1);
    g.lineTo(x, y + MARK + 1);
    g.stroke();
  }
}
