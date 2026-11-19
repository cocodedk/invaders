// The near layer of Golden Isle (islesea): the swell of the sea, dark violet with gold catching its crests, great stones floating in it
// and brass lamps drifting with a flame in each (out.lights); on the left the near shore where the host masses (parallax-isle-shore.js);
// low on the right, floating on the water, the palm-leaf page that carries the maker's mark (parallax-isle-mark.js), with no lamp near it.
import { H, lin, rgba, shade } from './sprites.js';
import { profile } from './parallax-kit.js';
import { PAL, MARGIN, ISLE } from './isle-kit.js';
import { mark, LEAF } from './parallax-isle-mark.js';
import { shore, boulder, SHORE } from './parallax-isle-shore.js';
import { warrior } from './isle-host.js';

export const SWELL = { top: 912, amp: 14, rows: 9, lamps: 7, stones: 4, lotus: 6, rider: 1.1 }; // the swell's top (frame y) and height, its crest lines, lamps, big stones, lotus; how tall the warrior on a stone stands against it

function lamp(g, x, y, rng, out) {
  g.fillStyle = lin(g, x - 14, 0, x + 14, 0, [[0, shade(PAL.brass, -0.5)], [0.6, PAL.brass], [1, shade(PAL.brass, -0.2)]]);
  g.beginPath();
  g.ellipse(x, y, 14, 6, 0, 0, Math.PI); // the bowl
  g.fill();
  g.fillRect(x - 14, y - 2, 28, 3);
  g.fillStyle = PAL.flame;
  g.beginPath();
  g.ellipse(x, y - 8, 3, 7, 0, 0, Math.PI * 2);
  g.fill();
  out.lights.push({ x, y: y - 8, r: 22, color: PAL.flame, mode: 'flicker', ph: rng(), a: 0.35 });
}

// A lotus afloat on its pad: a few petals, rose fading to gold, cupped upward.
function lotus(g, x, y, s) {
  g.fillStyle = rgba(shade(PAL.sea, 0.25), 0.9);
  g.beginPath();
  g.ellipse(x, y + s * 0.2, s * 1.3, s * 0.32, 0, 0, Math.PI * 2);
  g.fill();
  for (const [a, k] of [[-0.9, 0.8], [0.9, 0.8], [-0.45, 1], [0.45, 1], [0, 1.1]]) {
    g.fillStyle = lin(g, 0, y - s, 0, y, [[0, '#d88a7a'], [1, '#7a3a44']]);
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.ellipse(0, -s * 0.45 * k, s * 0.22, s * 0.5 * k, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

// A great stone afloat, one of the host standing on it heaving a boulder, turned toward the island (mirrored right of its middle, so his lit
// side stays toward the sun).
function bigStone(g, x, y, r, frameX) {
  boulder(g, x, y, r);
  g.fillStyle = rgba(PAL.sea, 0.7);
  g.fillRect(x - r * 1.1, y + r * 0.12, r * 2.2, r * 0.3); // the water round its waist
  g.save();
  g.translate(x, 0);
  if (frameX > ISLE.peaks[1][0]) g.scale(-1, 1); // right of the middle peak
  warrior(g, 'heave', 0, y - r * 0.4, r * SWELL.rider);
  g.restore();
}

export function islesea(g, w, h, rng, L, out) {
  g.save();
  const X = (x) => x + MARGIN; // frame x and y to this layer's
  const Y = (y) => y - (H - h);
  const top = Y(SWELL.top);
  const { amp, rows } = SWELL;
  g.fillStyle = lin(g, 0, top - amp, 0, h, [[0, shade(L.color, 0.18)], [1, L.color]]);
  profile(g, w, h, (x) => top + amp * Math.sin(x * 0.011) * Math.cos(x * 0.004));
  for (let r = 1; r <= rows; r++) { // the crests, catching the gold
    const y0 = top + r * ((h - top) / (rows + 1));
    g.fillStyle = rgba(PAL.gold, 0.16 * (1 - r / (rows + 2)));
    for (let x = rng() * 60; x < w; x += 50 + rng() * 90) g.fillRect(x, y0 + Math.sin(x * 0.02 + r) * 4, 20 + rng() * 50, 2);
  }
  const at = [LEAF.x + MARGIN, LEAF.y - (H - h)]; // the leaf's centre in this layer
  const land = X(SHORE.edge.at(-1)[0]);
  const clear = (x) => Math.abs(x - at[0]) > LEAF.w / 2 + 80 && x > land + 40; // nothing under the leaf or the headland
  for (let i = 0; i < SWELL.stones; i++) {
    const x = ((i + 0.3 + rng() * 0.4) / SWELL.stones) * w;
    if (clear(x)) bigStone(g, x, top + 60 + rng() * 60, 40 + rng() * 40, x - MARGIN);
  }
  for (let i = 0; i < SWELL.lamps; i++) {
    const x = ((i + 0.2 + rng() * 0.6) / SWELL.lamps) * w;
    if (clear(x)) lamp(g, x, top + 40 + rng() * (h - top - 70), rng, out);
  }
  for (let i = 0; i < SWELL.lotus; i++) {
    const x = land + ((i + 0.3 + rng() * 0.4) / SWELL.lotus) * (w - land);
    if (clear(x)) lotus(g, x, top + 50 + rng() * (h - top - 90), 9 + rng() * 5);
  }
  shore(g, h, X, Y);
  mark(g, ...at);
  g.restore();
}
